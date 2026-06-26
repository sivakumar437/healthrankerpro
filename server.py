from __future__ import annotations

import json
import os
import re
import secrets
import sqlite3
import tempfile
import base64
import hashlib
import hmac
from io import BytesIO
from datetime import datetime, timedelta
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlparse
from zipfile import ZIP_DEFLATED, ZipFile
from xml.sax.saxutils import escape as xml_escape

try:
    import psycopg
    from psycopg.rows import dict_row
except ImportError:  # PostgreSQL is optional for local SQLite runs.
    psycopg = None
    dict_row = None


ROOT = Path(__file__).resolve().parent
DATABASE_URL = os.environ.get("DATABASE_URL", "").strip()
DB_PATH = Path(os.environ.get("HEALTHRANK_DB", Path(tempfile.gettempdir()) / "healthrank-pro" / "app.db"))
HOST = os.environ.get("HOST", "0.0.0.0")
PORT = int(os.environ.get("PORT", "4173"))
AUTH_SESSION_COOKIE = "healthrank_session"
AUTH_SESSION_DAYS = 7
PASSWORD_HASH_PREFIX = "pbkdf2_sha256$"
PASSWORD_HASH_ITERATIONS = 600_000


class AuthenticationError(Exception):
    pass


def is_password_hashed(stored: str) -> bool:
    return str(stored).startswith(PASSWORD_HASH_PREFIX)


def hash_password(plain: str) -> str:
    password = str(plain)
    if not password:
        raise ValueError("Password is required.")
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        PASSWORD_HASH_ITERATIONS,
    )
    salt_b64 = base64.urlsafe_b64encode(salt).decode("ascii").rstrip("=")
    hash_b64 = base64.urlsafe_b64encode(digest).decode("ascii").rstrip("=")
    return f"{PASSWORD_HASH_PREFIX}{PASSWORD_HASH_ITERATIONS}${salt_b64}${hash_b64}"


def verify_password(plain: str, stored: str) -> bool:
    password = str(plain)
    stored_value = str(stored or "")
    if not password or not stored_value:
        return False
    if not is_password_hashed(stored_value):
        return hmac.compare_digest(password, stored_value)
    try:
        scheme, iterations_text, salt_b64, hash_b64 = stored_value.split("$", 3)
        if scheme != PASSWORD_HASH_PREFIX.rstrip("$"):
            return False
        iterations = int(iterations_text)
        salt = base64.urlsafe_b64decode(salt_b64 + "=" * (-len(salt_b64) % 4))
        expected = base64.urlsafe_b64decode(hash_b64 + "=" * (-len(hash_b64) % 4))
        actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False

SCORING_FORMULA = {
    "items": [
        {"label": "Muscle Gain", "points": "40 x kg gained", "note": "Compared to previous measurement", "width": 40},
        {"label": "Fat Loss", "points": "20 x fat % reduced", "note": "Compared to previous measurement", "width": 20},
        {"label": "Visceral Fat Loss", "points": "20 x VF reduced", "note": "Single digit gives 10 if no weekly loss", "width": 20},
        {"label": "BMI Reduced", "points": "10 x BMI reduced", "note": "Compared to previous measurement", "width": 10},
    ],
    "summary": "Score = 40 x muscle gain + 20 x fat % reduced + 20 x visceral fat reduced, or 10 default for single-digit VF if no VF loss + 10 x BMI reduced.",
}


def database_dialect() -> str:
    if DATABASE_URL.startswith(("postgres://", "postgresql://")):
        return "postgres"
    return "sqlite"


def normalize_database_url(url: str) -> str:
    if url.startswith("postgres://"):
        return "postgresql://" + url[len("postgres://") :]
    return url


def seed_demo_data_enabled() -> bool:
    return os.environ.get("SEED_DEMO_DATA", "").strip().lower() in {"1", "true", "yes", "on"}


def now_label() -> str:
    return datetime.now().strftime("%d %b %Y %H:%M")


def current_week() -> str:
    today = datetime.now().date()
    iso_year, iso_week, _ = today.isocalendar()
    return f"{iso_year}-W{iso_week:02d}"


def week_for_date(date_value: str | None) -> str:
    if not date_value:
        return current_week()
    try:
        parsed = datetime.fromisoformat(str(date_value)[:10]).date()
    except ValueError:
        return current_week()
    iso_year, iso_week, _ = parsed.isocalendar()
    return f"{iso_year}-W{iso_week:02d}"


def current_saturday() -> str:
    today = datetime.now().date()
    saturday = today + timedelta(days=(5 - today.weekday()) % 7)
    return saturday.isoformat()


class DbCursor:
    def __init__(self, cursor: Any, dialect: str, lastrowid: int | None = None):
        self.cursor = cursor
        self.dialect = dialect
        self.lastrowid = lastrowid if lastrowid is not None else getattr(cursor, "lastrowid", None)

    def fetchone(self) -> Any:
        return self.cursor.fetchone()

    def fetchall(self) -> list[Any]:
        return self.cursor.fetchall()


class DbConnection:
    def __init__(self, connection: Any, dialect: str):
        self.connection = connection
        self.dialect = dialect

    def __enter__(self) -> "DbConnection":
        return self

    def __exit__(self, exc_type: Any, exc: Any, traceback: Any) -> None:
        if exc_type:
            self.connection.rollback()
        else:
            self.connection.commit()
        self.connection.close()

    def _sql(self, sql: str) -> str:
        if self.dialect != "postgres":
            return sql
        converted = sql.replace("?", "%s")
        stripped = converted.strip()
        if stripped.upper().startswith("INSERT OR IGNORE INTO"):
            converted = re.sub(r"^\s*INSERT\s+OR\s+IGNORE\s+INTO", "INSERT INTO", converted, flags=re.IGNORECASE)
            converted = f"{converted.rstrip()} ON CONFLICT DO NOTHING"
        return converted

    def execute(self, sql: str, params: tuple[Any, ...] | list[Any] = ()) -> DbCursor:
        cursor = self.connection.execute(self._sql(sql), params)
        lastrowid = getattr(cursor, "lastrowid", None)
        if self.dialect == "postgres" and re.match(r"^\s*INSERT\s+INTO\s+(membership_cards|attendance|payments)\b", sql, re.IGNORECASE):
            id_cursor = self.connection.execute("SELECT LASTVAL() AS id")
            row = id_cursor.fetchone()
            lastrowid = row["id"] if isinstance(row, dict) else row[0]
        return DbCursor(cursor, self.dialect, lastrowid)

    def executemany(self, sql: str, params: list[tuple[Any, ...]]) -> DbCursor:
        if self.dialect == "postgres":
            cursor = None
            for item in params:
                cursor = self.connection.execute(self._sql(sql), item)
            return DbCursor(cursor or self.connection.execute("SELECT 1"), self.dialect)
        cursor = self.connection.executemany(self._sql(sql), params)
        return DbCursor(cursor, self.dialect)

    def executescript(self, script: str) -> None:
        if self.dialect == "sqlite":
            self.connection.executescript(script)
            return
        for statement in [part.strip() for part in script.split(";") if part.strip()]:
            self.execute(statement)

    def table_columns(self, table: str) -> set[str]:
        if self.dialect == "sqlite":
            return {row["name"] for row in self.execute(f"PRAGMA table_info({table})").fetchall()}
        rows = self.execute(
            """
            SELECT column_name FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = ?
            """,
            (table,),
        ).fetchall()
        return {row["column_name"] for row in rows}

    def table_headers(self, table: str) -> list[str]:
        if self.dialect == "sqlite":
            return [row["name"] for row in self.execute(f"PRAGMA table_info({table})").fetchall()]
        rows = self.execute(
            """
            SELECT column_name FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = ?
            ORDER BY ordinal_position
            """,
            (table,),
        ).fetchall()
        return [row["column_name"] for row in rows]


def connect() -> DbConnection:
    dialect = database_dialect()
    if dialect == "postgres":
        if psycopg is None:
            raise RuntimeError("PostgreSQL requires installing psycopg. Run pip install -r requirements.txt.")
        db = psycopg.connect(normalize_database_url(DATABASE_URL), row_factory=dict_row)
        return DbConnection(db, "postgres")
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys = ON")
    db.execute("PRAGMA journal_mode = DELETE")
    db.execute("PRAGMA synchronous = NORMAL")
    return DbConnection(db, "sqlite")


def row_to_dict(row: sqlite3.Row | None) -> dict[str, Any] | None:
    return dict(row) if row else None


def rows_to_list(rows: list[sqlite3.Row]) -> list[dict[str, Any]]:
    return [dict(row) for row in rows]


def first_value(row: Any) -> Any:
    if isinstance(row, dict):
        return next(iter(row.values()))
    return row[0]


def redact_member_phones(members: list[dict[str, Any]], user: dict[str, Any]) -> list[dict[str, Any]]:
    if user["role"] in {"admin", "super_admin"}:
        return members
    for member in members:
        if user["role"] == "member" and user.get("member_id") == member.get("id"):
            continue
        member["phone"] = ""
    return members


def schema_sql(dialect: str) -> str:
    auto_pk = "SERIAL PRIMARY KEY" if dialect == "postgres" else "INTEGER PRIMARY KEY AUTOINCREMENT"
    return f"""
            CREATE TABLE IF NOT EXISTS users (
              id TEXT PRIMARY KEY,
              username TEXT UNIQUE NOT NULL,
              password TEXT NOT NULL,
              name TEXT NOT NULL,
              role TEXT NOT NULL,
              member_id INTEGER,
              nutrition_club TEXT NOT NULL DEFAULT 'Main Nutrition Club'
            );

            CREATE TABLE IF NOT EXISTS members (
              id INTEGER PRIMARY KEY,
              member_code TEXT UNIQUE,
              name TEXT NOT NULL,
              phone TEXT NOT NULL,
              gender TEXT DEFAULT '',
              age INTEGER,
              dob TEXT DEFAULT '',
              height REAL DEFAULT 0,
              nutrition_club TEXT NOT NULL DEFAULT 'Main Nutrition Club',
              coach_id TEXT DEFAULT '',
              supervisor_id TEXT NOT NULL DEFAULT '',
              be_coach INTEGER NOT NULL DEFAULT 0,
              card_type TEXT DEFAULT '',
              notes TEXT DEFAULT '',
              goal TEXT NOT NULL,
              score REAL NOT NULL,
              rank INTEGER NOT NULL,
              measured INTEGER NOT NULL DEFAULT 0,
              marathon INTEGER NOT NULL DEFAULT 0,
              marathon_month TEXT NOT NULL DEFAULT '',
              last_measured TEXT NOT NULL,
              active INTEGER NOT NULL DEFAULT 1,
              created_date TEXT DEFAULT ''
            );

            CREATE TABLE IF NOT EXISTS sessions (
              id TEXT PRIMARY KEY,
              week TEXT NOT NULL UNIQUE,
              status TEXT NOT NULL,
              session_date TEXT NOT NULL,
              opened_by TEXT,
              opened_on TEXT,
              closed_by TEXT,
              closed_on TEXT,
              reopened_by TEXT,
              reopened_on TEXT
            );

            CREATE TABLE IF NOT EXISTS measurements (
              id TEXT PRIMARY KEY,
              member_id INTEGER NOT NULL,
              member_name TEXT NOT NULL,
              week_number TEXT NOT NULL,
              session_id TEXT NOT NULL,
              supervisor_id TEXT NOT NULL,
              measurement_date TEXT NOT NULL,
              weight REAL NOT NULL,
              body_fat REAL NOT NULL,
              muscle_mass REAL NOT NULL,
              visceral_fat REAL NOT NULL,
              waist REAL NOT NULL,
              hip REAL NOT NULL,
              chest REAL NOT NULL,
              height REAL NOT NULL,
              bmi REAL NOT NULL,
              bma REAL DEFAULT 0,
              bmr REAL DEFAULT 0,
              water REAL NOT NULL,
              metabolic_age INTEGER NOT NULL,
              subcutaneous_fat REAL DEFAULT 0,
              muscle_percent REAL,
              fat_mass REAL,
              lean_body_mass REAL,
              ideal_weight REAL,
              healthy_weight_min REAL,
              healthy_weight_max REAL,
              weight_difference REAL,
              weight_status TEXT DEFAULT '',
              body_fat_category TEXT DEFAULT '',
              visceral_fat_status TEXT DEFAULT '',
              muscle_is_estimated INTEGER NOT NULL DEFAULT 0,
              calculation_source TEXT NOT NULL DEFAULT 'SCAN',
              scan_values TEXT DEFAULT '{{}}',
              calculated_values TEXT DEFAULT '{{}}',
              estimated_values TEXT DEFAULT '{{}}',
              notes TEXT,
              updated_by TEXT,
              updated_on TEXT,
              FOREIGN KEY(member_id) REFERENCES members(id),
              FOREIGN KEY(session_id) REFERENCES sessions(id)
            );

            CREATE TABLE IF NOT EXISTS audit (
              id {auto_pk},
              action TEXT NOT NULL,
              actor TEXT NOT NULL,
              created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS notifications (
              id {auto_pk},
              message TEXT NOT NULL,
              created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS leads (
              id {auto_pk},
              lead_code TEXT UNIQUE NOT NULL,
              name TEXT NOT NULL,
              phone TEXT NOT NULL,
              area TEXT DEFAULT '',
              place TEXT DEFAULT '',
              city TEXT DEFAULT '',
              health_challenge TEXT DEFAULT '',
              activity TEXT DEFAULT '',
              nutrition_club TEXT NOT NULL DEFAULT 'Main Nutrition Club',
              created_date TEXT NOT NULL,
              next_follow_up_date TEXT NOT NULL,
              status TEXT NOT NULL DEFAULT 'New',
              followups TEXT NOT NULL DEFAULT '[]',
              created_by TEXT NOT NULL,
              updated_by TEXT,
              updated_on TEXT
            );

            CREATE TABLE IF NOT EXISTS auth_sessions (
              token TEXT PRIMARY KEY,
              user_id TEXT NOT NULL,
              created_at TEXT NOT NULL,
              expires_at TEXT NOT NULL,
              FOREIGN KEY(user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS membership_cards (
              id {auto_pk},
              member_id INTEGER NOT NULL,
              member_name TEXT NOT NULL,
              club TEXT NOT NULL,
              card_number TEXT NOT NULL,
              card_type TEXT NOT NULL,
              start_date TEXT NOT NULL,
              completion_date TEXT,
              days_taken INTEGER DEFAULT 0,
              target_visits INTEGER NOT NULL,
              completed_visits INTEGER NOT NULL DEFAULT 0,
              remaining_visits INTEGER NOT NULL,
              status TEXT NOT NULL DEFAULT 'Active',
              override_count INTEGER NOT NULL DEFAULT 0,
              created_by TEXT NOT NULL,
              created_date TEXT NOT NULL,
              updated_by TEXT,
              updated_date TEXT,
              FOREIGN KEY(member_id) REFERENCES members(id)
            );

            CREATE TABLE IF NOT EXISTS attendance (
              id {auto_pk},
              member_id INTEGER NOT NULL,
              member_name TEXT NOT NULL,
              club TEXT NOT NULL,
              card_id INTEGER,
              attendance_date TEXT NOT NULL,
              attendance_type TEXT NOT NULL,
              count_value INTEGER NOT NULL DEFAULT 0,
              ranking_eligible INTEGER NOT NULL DEFAULT 0,
              streak_eligible INTEGER NOT NULL DEFAULT 0,
              neutral_day INTEGER NOT NULL DEFAULT 0,
              reason TEXT,
              marked_by TEXT NOT NULL,
              marked_on TEXT NOT NULL,
              updated_by TEXT,
              updated_on TEXT,
              UNIQUE(member_id, attendance_date),
              FOREIGN KEY(member_id) REFERENCES members(id),
              FOREIGN KEY(card_id) REFERENCES membership_cards(id)
            );

            CREATE TABLE IF NOT EXISTS payments (
              id {auto_pk},
              member_id INTEGER NOT NULL,
              member_name TEXT NOT NULL,
              club TEXT NOT NULL,
              attendance_id INTEGER,
              card_id INTEGER,
              payment_date TEXT NOT NULL,
              amount REAL NOT NULL,
              benefit_value REAL NOT NULL DEFAULT 0,
              is_benefit INTEGER NOT NULL DEFAULT 0,
              payment_mode TEXT NOT NULL,
              notes TEXT,
              created_by TEXT NOT NULL,
              created_by_user_id TEXT,
              created_date TEXT NOT NULL,
              FOREIGN KEY(member_id) REFERENCES members(id)
            );

            """


def init_db() -> None:
    with connect() as db:
        db.executescript(schema_sql(db.dialect))
        migrate_schema(db)
        create_indexes(db)
        seed(db)
        backfill_password_hashes(db)
        if seed_demo_data_enabled():
            seed_cards(db)
        reconcile_all_card_usage(db)
        ensure_current_session(db)


def migrate_schema(db: DbConnection) -> None:
    user_club_was_missing = "nutrition_club" not in db.table_columns("users")
    ensure_columns(
        db,
        "users",
        {
            "nutrition_club": "TEXT NOT NULL DEFAULT 'Main Nutrition Club'",
        },
    )
    if user_club_was_missing:
        backfill_user_clubs(db)
    ensure_columns(
        db,
        "members",
        {
            "member_code": "TEXT",
            "gender": "TEXT DEFAULT ''",
            "age": "INTEGER",
            "dob": "TEXT DEFAULT ''",
            "height": "REAL DEFAULT 0",
            "nutrition_club": "TEXT NOT NULL DEFAULT 'Main Nutrition Club'",
            "coach_id": "TEXT DEFAULT ''",
            "supervisor_id": "TEXT NOT NULL DEFAULT ''",
            "be_coach": "INTEGER NOT NULL DEFAULT 0",
            "card_type": "TEXT DEFAULT ''",
            "notes": "TEXT DEFAULT ''",
            "active": "INTEGER NOT NULL DEFAULT 1",
            "created_date": "TEXT DEFAULT ''",
            "marathon_month": "TEXT NOT NULL DEFAULT ''",
        },
    )
    backfill_marathon_months(db)
    normalize_marathon_cards(db)
    ensure_columns(
        db,
        "measurements",
        {
            "bma": "REAL DEFAULT 0",
            "bmr": "REAL DEFAULT 0",
            "subcutaneous_fat": "REAL DEFAULT 0",
            "muscle_percent": "REAL",
            "fat_mass": "REAL",
            "lean_body_mass": "REAL",
            "ideal_weight": "REAL",
            "healthy_weight_min": "REAL",
            "healthy_weight_max": "REAL",
            "weight_difference": "REAL",
            "weight_status": "TEXT DEFAULT ''",
            "body_fat_category": "TEXT DEFAULT ''",
            "visceral_fat_status": "TEXT DEFAULT ''",
            "muscle_is_estimated": "INTEGER NOT NULL DEFAULT 0",
            "calculation_source": "TEXT NOT NULL DEFAULT 'SCAN'",
            "scan_values": "TEXT DEFAULT '{}'",
            "calculated_values": "TEXT DEFAULT '{}'",
            "estimated_values": "TEXT DEFAULT '{}'",
        },
    )
    db.execute(
        "UPDATE measurements SET bma = metabolic_age WHERE (bma IS NULL OR bma = 0) AND metabolic_age IS NOT NULL AND metabolic_age <> 0"
    )
    backfill_body_composition(db)
    ensure_columns(
        db,
        "payments",
        {
            "card_id": "INTEGER",
            "created_by_user_id": "TEXT",
            "benefit_value": "REAL NOT NULL DEFAULT 0",
            "is_benefit": "INTEGER NOT NULL DEFAULT 0",
        },
    )
    backfill_complimentary_benefits(db)
    backfill_payment_creator_ids(db)
    backfill_member_codes(db)
    backfill_member_created_dates(db)
    ensure_columns(
        db,
        "leads",
        {
            "lead_code": "TEXT UNIQUE",
            "area": "TEXT DEFAULT ''",
            "place": "TEXT DEFAULT ''",
            "city": "TEXT DEFAULT ''",
            "health_challenge": "TEXT DEFAULT ''",
            "activity": "TEXT DEFAULT ''",
            "nutrition_club": "TEXT NOT NULL DEFAULT 'Main Nutrition Club'",
            "created_date": "TEXT NOT NULL DEFAULT ''",
            "next_follow_up_date": "TEXT NOT NULL DEFAULT ''",
            "status": "TEXT NOT NULL DEFAULT 'New'",
            "followups": "TEXT NOT NULL DEFAULT '[]'",
            "created_by": "TEXT NOT NULL DEFAULT ''",
            "updated_by": "TEXT",
            "updated_on": "TEXT",
        },
    )


def ensure_columns(db: DbConnection, table: str, columns: dict[str, str]) -> None:
    existing = db.table_columns(table)
    for name, definition in columns.items():
        if name not in existing:
            db.execute(f"ALTER TABLE {table} ADD COLUMN {name} {definition}")


def backfill_user_clubs(db: DbConnection) -> None:
    users = rows_to_list(db.execute("SELECT id, role, member_id FROM users").fetchall())
    for user in users:
        club_row = None
        if user["role"] == "member" and user.get("member_id"):
            club_row = db.execute("SELECT nutrition_club FROM members WHERE id = ?", (user["member_id"],)).fetchone()
        elif user["role"] in {"supervisor", "coach", "nc_organiser"}:
            club_row = db.execute(
                """
                SELECT nutrition_club, COUNT(*) AS total FROM members
                WHERE (supervisor_id = ? OR coach_id = ?) AND active = 1
                GROUP BY nutrition_club ORDER BY total DESC, nutrition_club LIMIT 1
                """,
                (user["id"], user["id"]),
            ).fetchone()
        elif user["role"] != "super_admin":
            club_row = db.execute(
                """
                SELECT nutrition_club, COUNT(*) AS total FROM members
                WHERE active = 1 GROUP BY nutrition_club
                ORDER BY total DESC, nutrition_club LIMIT 1
                """
            ).fetchone()
        if club_row and club_row["nutrition_club"]:
            db.execute("UPDATE users SET nutrition_club = ? WHERE id = ?", (club_row["nutrition_club"], user["id"]))


def backfill_payment_creator_ids(db: DbConnection) -> None:
    rows = db.execute(
        "SELECT id, created_by FROM payments WHERE created_by_user_id IS NULL OR created_by_user_id = ''"
    ).fetchall()
    for row in rows:
        user = db.execute(
            "SELECT id FROM users WHERE name = ? ORDER BY id LIMIT 1",
            (row["created_by"],),
        ).fetchone()
        if user:
            db.execute("UPDATE payments SET created_by_user_id = ? WHERE id = ?", (user["id"], row["id"]))


def backfill_marathon_months(db: DbConnection) -> None:
    db.execute(
        """
        UPDATE members
        SET marathon_month = COALESCE((
          SELECT SUBSTR(MAX(p.payment_date), 1, 7)
          FROM payments p
          JOIN membership_cards c ON c.id = p.card_id
          WHERE p.member_id = members.id AND c.card_type = 'Marathon'
        ), '')
        WHERE marathon_month IS NULL OR marathon_month = ''
        """
    )


def normalize_marathon_cards(db: DbConnection) -> None:
    db.execute(
        "UPDATE attendance SET card_id = NULL WHERE card_id IN (SELECT id FROM membership_cards WHERE card_type = 'Marathon')"
    )
    db.execute(
        """
        UPDATE membership_cards
        SET target_visits = 0, completed_visits = 0, remaining_visits = 0,
            status = 'Program', completion_date = NULL, days_taken = 0, override_count = 0
        WHERE card_type = 'Marathon'
        """
    )


def backfill_complimentary_benefits(db: DbConnection) -> None:
    db.execute(
        """
        UPDATE payments
        SET benefit_value = CASE WHEN COALESCE(benefit_value, 0) > 0 THEN benefit_value ELSE amount END,
            amount = 0,
            is_benefit = 1
        WHERE COALESCE(is_benefit, 0) = 0
          AND (
            payment_mode = 'Complimentary'
            OR card_id IN (SELECT id FROM membership_cards WHERE card_type = 'Complimentary Card')
          )
        """
    )


def backfill_member_created_dates(db: DbConnection) -> None:
    members = rows_to_list(db.execute("SELECT id FROM members WHERE created_date IS NULL OR created_date = ''").fetchall())
    sources = (
        ("measurements", "measurement_date"),
        ("membership_cards", "start_date"),
        ("attendance", "attendance_date"),
        ("payments", "payment_date"),
    )
    today = datetime.now().date().isoformat()
    for member in members:
        dates: list[str] = []
        for table, column in sources:
            row = db.execute(f"SELECT MIN({column}) AS first_date FROM {table} WHERE member_id = ?", (member["id"],)).fetchone()
            if row and row["first_date"]:
                dates.append(str(row["first_date"])[:10])
        db.execute("UPDATE members SET created_date = ? WHERE id = ?", (min(dates) if dates else today, member["id"]))


def create_indexes(db: DbConnection) -> None:
    db.executescript(
        """
        CREATE INDEX IF NOT EXISTS idx_members_member_code ON members(member_code);
        CREATE INDEX IF NOT EXISTS idx_members_club_phone ON members(nutrition_club, phone);
        CREATE INDEX IF NOT EXISTS idx_members_coach ON members(coach_id);
        CREATE INDEX IF NOT EXISTS idx_members_supervisor ON members(supervisor_id);
        CREATE INDEX IF NOT EXISTS idx_measurements_member_date ON measurements(member_id, measurement_date);
        CREATE INDEX IF NOT EXISTS idx_attendance_member_date ON attendance(member_id, attendance_date);
        CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(attendance_date);
        CREATE INDEX IF NOT EXISTS idx_payments_member_date ON payments(member_id, payment_date);
        CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
        CREATE INDEX IF NOT EXISTS idx_payments_creator ON payments(created_by_user_id);
        CREATE INDEX IF NOT EXISTS idx_payments_benefit ON payments(is_benefit);
        CREATE INDEX IF NOT EXISTS idx_leads_club_phone ON leads(nutrition_club, phone);
        CREATE INDEX IF NOT EXISTS idx_leads_created_date ON leads(created_date);
        CREATE INDEX IF NOT EXISTS idx_leads_followup_date ON leads(next_follow_up_date);
        CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires ON auth_sessions(expires_at);
        """
    )


def generate_member_code(member_id: int) -> str:
    return f"HRP-{member_id:06d}"


def backfill_member_codes(db: DbConnection) -> None:
    rows = db.execute("SELECT id FROM members WHERE member_code IS NULL OR member_code = ''").fetchall()
    for row in rows:
        db.execute("UPDATE members SET member_code = ? WHERE id = ?", (generate_member_code(int(row["id"])), row["id"]))


def backfill_password_hashes(db: DbConnection) -> None:
    rows = db.execute("SELECT id, password FROM users").fetchall()
    for row in rows:
        stored = str(row["password"] or "")
        if stored and not is_password_hashed(stored):
            db.execute("UPDATE users SET password = ? WHERE id = ?", (hash_password(stored), row["id"]))


def seed(db: DbConnection) -> None:
    users = [
        ("u-admin", "admin", "admin", "Admin User", "admin", None),
        ("u-supervisor", "supervisor", "supervisor", "Supervisor", "supervisor", None),
        ("u-coach", "coach", "coach", "Coach", "coach", None),
        ("u-organiser", "organiser", "organiser", "NC Organiser", "nc_organiser", None),
        ("u-viewer", "viewer", "viewer", "Viewer", "viewer", None),
        ("u-member", "member", "member", "Aarav Mehta", "member", 1),
    ]
    db.executemany(
        """
        INSERT OR IGNORE INTO users (id, username, password, name, role, member_id)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        users,
    )
    if not seed_demo_data_enabled():
        return

    members = [
        (1, generate_member_code(1), "Aarav Mehta", "+91 98765 43210", "Weight Loss", 94.2, 1, 1, 1, "Today", "u-supervisor"),
        (2, generate_member_code(2), "Priya Nair", "+91 99887 77665", "Health & Fitness", 88.7, 2, 1, 0, "Yesterday", "u-supervisor"),
        (3, generate_member_code(3), "Rohan Iyer", "+91 91234 56780", "Weight Gain", 81.9, 3, 0, 1, "8 days ago", "u-supervisor"),
        (4, generate_member_code(4), "Sneha Rao", "+91 90000 11122", "Weight Loss", 78.4, 4, 0, 0, "10 days ago", "u-supervisor"),
        (5, generate_member_code(5), "Vikram Shah", "+91 95555 88990", "Health & Fitness", 72.6, 5, 1, 0, "Today", "u-supervisor"),
        (6, generate_member_code(6), "Meera Kapoor", "+91 94444 22233", "Weight Gain", 69.1, 6, 0, 1, "14 days ago", "u-supervisor"),
    ]
    db.executemany(
        """
        INSERT OR IGNORE INTO members
        (id, member_code, name, phone, goal, score, rank, measured, marathon, last_measured, supervisor_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        members,
    )


def seed_cards(db: DbConnection) -> None:
    if first_value(db.execute("SELECT COUNT(*) FROM membership_cards").fetchone()):
        return
    stamp = now_label()
    today = datetime.now().date().isoformat()
    card_rows = [
        (1, "Aarav Mehta", "Main Nutrition Club", "NC-001-30D", "30 Days Card", today, 30, 23, 7, "Admin User", stamp),
        (2, "Priya Nair", "Main Nutrition Club", "NC-002-26D", "26 Days Card", today, 26, 18, 8, "Admin User", stamp),
        (3, "Rohan Iyer", "Main Nutrition Club", "NC-003-30D", "30 Days Card", today, 30, 28, 2, "Admin User", stamp),
        (4, "Sneha Rao", "Main Nutrition Club", "NC-004-10D", "10 Days Card / NMS", today, 10, 7, 3, "Admin User", stamp),
        (5, "Vikram Shah", "Main Nutrition Club", "NC-005-26D", "26 Days Card", today, 26, 25, 1, "Admin User", stamp),
        (6, "Meera Kapoor", "Main Nutrition Club", "NC-006-TR", "Trial Card", today, 3, 1, 2, "Admin User", stamp),
    ]
    db.executemany(
        """
        INSERT INTO membership_cards
        (member_id, member_name, club, card_number, card_type, start_date, target_visits,
         completed_visits, remaining_visits, created_by, created_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        card_rows,
    )


def ensure_current_session(db: sqlite3.Connection) -> dict[str, Any]:
    week = current_week()
    session_id = f"MS-{week.replace('-', '')}"
    db.execute(
        """
        INSERT OR IGNORE INTO sessions
        (id, week, status, session_date)
        VALUES (?, ?, 'CLOSED', ?)
        """,
        (session_id, week, current_saturday()),
    )
    session = db.execute("SELECT * FROM sessions WHERE week = ?", (week,)).fetchone()
    return row_to_dict(session) or {}


def get_user(db: sqlite3.Connection, user_id: str | None) -> dict[str, Any] | None:
    if not user_id:
        return None
    return row_to_dict(
        db.execute(
            "SELECT id, username, name, role, member_id, nutrition_club FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
    )


def create_auth_session(db: DbConnection, user_id: str) -> str:
    token = secrets.token_urlsafe(32)
    created_at = datetime.now()
    expires_at = created_at + timedelta(days=AUTH_SESSION_DAYS)
    db.execute(
        "INSERT INTO auth_sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
        (token, user_id, created_at.isoformat(), expires_at.isoformat()),
    )
    return token


def delete_auth_session(db: DbConnection, token: str) -> None:
    db.execute("DELETE FROM auth_sessions WHERE token = ?", (token,))


def user_id_from_auth_session(db: DbConnection, token: str | None) -> str | None:
    if not token:
        return None
    row = db.execute(
        "SELECT user_id, expires_at FROM auth_sessions WHERE token = ?",
        (token,),
    ).fetchone()
    if not row:
        return None
    try:
        expires_at = datetime.fromisoformat(str(row["expires_at"]))
    except ValueError:
        delete_auth_session(db, token)
        return None
    if datetime.now() > expires_at:
        delete_auth_session(db, token)
        return None
    return str(row["user_id"])


def resolve_authenticated_user_id(token: str | None, *, required: bool = True) -> str | None:
    with connect() as db:
        user_id = user_id_from_auth_session(db, token)
    if required and not user_id:
        raise AuthenticationError("You must sign in to continue.")
    return user_id


def dashboard_clubs(db: DbConnection, user: dict[str, Any]) -> list[str]:
    if user["role"] != "super_admin":
        return [current_club(user)]
    rows = db.execute(
        """
        SELECT nutrition_club FROM members WHERE nutrition_club <> ''
        UNION
        SELECT nutrition_club FROM users WHERE nutrition_club <> ''
        ORDER BY nutrition_club
        """
    ).fetchall()
    return [str(row["nutrition_club"]) for row in rows]


def missed_measurement_summary(
    members: list[dict[str, Any]],
    by_member: dict[int, list[dict[str, Any]]],
    today: Any = None,
) -> dict[str, Any]:
    current_date = today or datetime.now().date()
    current_sunday = current_date - timedelta(days=(current_date.weekday() + 1) % 7)
    last_week_start = current_sunday - timedelta(days=7)
    last_week_end = current_sunday - timedelta(days=1)
    groups: dict[str, list[dict[str, Any]]] = {
        "oneWeek": [],
        "twoWeeks": [],
        "threeWeeks": [],
        "fourToNineWeeks": [],
        "moreThanNineWeeks": [],
    }

    for member in members:
        member_id = int(member["id"])
        try:
            joined_date = datetime.fromisoformat(str(member.get("created_date") or current_date.isoformat())[:10]).date()
        except ValueError:
            joined_date = current_date
        history = by_member.get(member_id, [])
        measured_dates: set[Any] = set()
        for measurement in history:
            try:
                measured_dates.add(datetime.fromisoformat(str(measurement["measurement_date"])[:10]).date())
            except (TypeError, ValueError):
                continue

        missed_weeks = 0
        for offset in range(10):
            week_start = last_week_start - timedelta(weeks=offset)
            week_end = week_start + timedelta(days=6)
            if joined_date > week_end:
                break
            if any(week_start <= measured <= week_end for measured in measured_dates):
                break
            missed_weeks += 1

        if missed_weeks == 0:
            continue
        item = {
            "memberId": member_id,
            "memberCode": member.get("member_code") or generate_member_code(member_id),
            "name": member.get("name") or "Member",
            "weeksMissed": missed_weeks,
            "lastMeasurement": history[0]["measurement_date"] if history else None,
        }
        if missed_weeks == 1:
            groups["oneWeek"].append(item)
        elif missed_weeks == 2:
            groups["twoWeeks"].append(item)
        elif missed_weeks == 3:
            groups["threeWeeks"].append(item)
        elif missed_weeks <= 9:
            groups["fourToNineWeeks"].append(item)
        else:
            groups["moreThanNineWeeks"].append(item)

    for items in groups.values():
        items.sort(key=lambda item: (-int(item["weeksMissed"]), str(item["name"]).lower()))
    return {
        "periodStart": last_week_start.isoformat(),
        "periodEnd": last_week_end.isoformat(),
        "trackingWeeks": 9,
        **groups,
    }


def dashboard_summary(db: DbConnection, user: dict[str, Any], requested_club: str = "") -> dict[str, Any]:
    role = user["role"]
    selected_club = requested_club.strip() if role == "super_admin" else current_club(user)
    clauses = ["active = 1"]
    values: list[Any] = []
    if role == "member":
        clauses.append("id = ?")
        values.append(user["member_id"])
    elif role == "supervisor":
        clauses.append("nutrition_club = ?")
        values.append(current_club(user))
    elif selected_club:
        clauses.append("nutrition_club = ?")
        values.append(selected_club)

    members = rows_to_list(
        db.execute(
            f"SELECT id, member_code, name, height, gender, nutrition_club, created_date FROM members WHERE {' AND '.join(clauses)} ORDER BY id",
            values,
        ).fetchall()
    )
    member_ids = [int(member["id"]) for member in members]
    measurements: list[dict[str, Any]] = []
    if member_ids:
        placeholders = ", ".join("?" for _ in member_ids)
        measurements = rows_to_list(
            db.execute(
                f"""
                SELECT * FROM measurements
                WHERE member_id IN ({placeholders})
                ORDER BY member_id, measurement_date DESC, id DESC
                """,
                member_ids,
            ).fetchall()
        )

    by_member: dict[int, list[dict[str, Any]]] = {}
    for measurement in measurements:
        by_member.setdefault(int(measurement["member_id"]), []).append(measurement)

    weight_losses: list[float] = []
    muscle_gains: list[float] = []
    body_fat_reductions: list[float] = []
    ideal_count = 0
    measured_this_week: set[int] = set()
    for member in members:
        member_id = int(member["id"])
        history = by_member.get(member_id, [])
        if history and history[0].get("week_number") == current_week():
            measured_this_week.add(member_id)
        if len(history) >= 2:
            latest, previous = history[0], history[1]
            weight_losses.append(max(float(previous["weight"]) - float(latest["weight"]), 0.0))
            muscle_gains.append(max(float(latest["muscle_mass"]) - float(previous["muscle_mass"]), 0.0))
            body_fat_reductions.append(max(float(previous["body_fat"]) - float(latest["body_fat"]), 0.0))
        if history:
            latest = history[0]
            ideal_weight = latest.get("ideal_weight")
            if ideal_weight is None:
                height_cm = float(latest.get("height") or member.get("height") or 0)
                gender = str(member.get("gender") or "").strip().lower()
                if height_cm > 0 and gender in {"male", "female"}:
                    ideal_weight = height_cm - (100 if gender == "male" else 105)
            if ideal_weight is not None and abs(float(latest["weight"]) - float(ideal_weight)) <= 2.0:
                ideal_count += 1

    scoped_clubs = {str(member["nutrition_club"]) for member in members}
    import_rows = rows_to_list(db.execute("SELECT action, actor FROM audit WHERE action LIKE '%Import%'").fetchall())
    if role != "super_admin" or selected_club:
        actor_rows = rows_to_list(db.execute("SELECT name, nutrition_club FROM users").fetchall())
        actor_clubs = {str(row["name"]): str(row["nutrition_club"]) for row in actor_rows}
        import_rows = [row for row in import_rows if actor_clubs.get(str(row["actor"])) in scoped_clubs]

    distinct_weeks = {str(row["week_number"]) for row in measurements if row.get("week_number")}

    def mean(items: list[float]) -> float | None:
        return round(sum(items) / len(items), 1) if items else None

    return {
        "club": selected_club,
        "totalMembers": len(members),
        "avgWeightLoss": mean(weight_losses),
        "avgMuscleGain": mean(muscle_gains),
        "avgBodyFat": mean(body_fat_reductions),
        "atIdealWeight": ideal_count,
        "needAttention": len(member_ids) - len(measured_this_week),
        "totalWeeks": len(distinct_weeks),
        "imports": len(import_rows),
        "measurementMisses": missed_measurement_summary(members, by_member),
    }


def dashboard_data(user_id: str | None, params: dict[str, list[str]]) -> dict[str, Any]:
    with connect() as db:
        user = get_user(db, user_id)
        if not user:
            raise PermissionError("You must sign in to view dashboard data.")
        requested_club = (params.get("club", [""])[0] or "").strip()
        return {
            "summary": dashboard_summary(db, user, requested_club),
            "clubs": dashboard_clubs(db, user) if user["role"] == "super_admin" else [],
        }


def member_report_data(user_id: str | None, params: dict[str, list[str]]) -> dict[str, Any]:
    with connect() as db:
        user = get_user(db, user_id)
        require_role(user, "admin", "super_admin")
        member_id = int((params.get("memberId", ["0"])[0] or "0"))
        through_date = str(params.get("throughDate", [datetime.now().date().isoformat()])[0])[:10]
        try:
            datetime.fromisoformat(through_date)
        except ValueError as exc:
            raise ValueError("Select a valid report date.") from exc
        member = db.execute("SELECT * FROM members WHERE id = ?", (member_id,)).fetchone()
        if not member:
            raise ValueError("Select a valid member.")
        rows = rows_to_list(
            db.execute(
                """
                SELECT * FROM measurements
                WHERE member_id = ? AND measurement_date <= ?
                ORDER BY measurement_date DESC, id DESC
                LIMIT 12
                """,
                (member_id, through_date),
            ).fetchall()
        )
        rows.reverse()
        supervisor = db.execute("SELECT name FROM users WHERE id = ?", (member["supervisor_id"],)).fetchone()
        return {
            "member": row_to_dict(member),
            "measurements": rows,
            "throughDate": through_date,
            "generatedOn": now_label(),
            "invitedBy": supervisor["name"] if supervisor else "",
        }


def scoped_members(db: sqlite3.Connection, user: dict[str, Any], mode: str = "club") -> list[dict[str, Any]]:
    clause, values = member_scope_clause(user, mode)
    rows = db.execute(
        f"SELECT * FROM members WHERE {clause} ORDER BY rank",
        values,
    ).fetchall()
    members = rows_to_list(rows)
    month_start, next_month_start = current_month_bounds()
    active_rows = db.execute(
        """
        SELECT p.member_id, MAX(p.payment_date) AS marathon_payment_date
        FROM payments p
        JOIN membership_cards c ON c.id = p.card_id
        WHERE c.card_type = 'Marathon' AND p.payment_date >= ? AND p.payment_date < ?
        GROUP BY p.member_id
        """,
        (month_start, next_month_start),
    ).fetchall()
    active_by_member = {int(row["member_id"]): row["marathon_payment_date"] for row in active_rows}
    for member in members:
        payment_date = active_by_member.get(int(member["id"]))
        member["marathon_active"] = 1 if payment_date else 0
        member["marathon_payment_date"] = payment_date or ""
    return redact_member_phones(members, user)


def current_month_bounds() -> tuple[str, str]:
    today = datetime.now().date()
    month_start = today.replace(day=1)
    if month_start.month == 12:
        next_month = month_start.replace(year=month_start.year + 1, month=1)
    else:
        next_month = month_start.replace(month=month_start.month + 1)
    return month_start.isoformat(), next_month.isoformat()


def marathon_data(user_id: str | None) -> dict[str, Any]:
    with connect() as db:
        user = get_user(db, user_id)
        require_role(user, "admin")
        month_start, next_month_start = current_month_bounds()
        current_rows = db.execute(
            """
            SELECT m.id AS member_id, m.member_code, m.name, m.phone, m.nutrition_club,
                   MAX(p.payment_date) AS payment_date
            FROM payments p
            JOIN membership_cards c ON c.id = p.card_id
            JOIN members m ON m.id = p.member_id
            WHERE c.card_type = 'Marathon' AND p.payment_date >= ? AND p.payment_date < ?
            GROUP BY m.id, m.member_code, m.name, m.phone, m.nutrition_club
            ORDER BY m.name
            """,
            (month_start, next_month_start),
        ).fetchall()
        previous_rows = db.execute(
            """
            SELECT m.id AS member_id, m.member_code, m.name, m.phone, m.nutrition_club,
                   (
                     SELECT MAX(p.payment_date) FROM payments p
                     JOIN membership_cards c ON c.id = p.card_id
                     WHERE p.member_id = m.id AND c.card_type = 'Marathon' AND p.payment_date < ?
                   ) AS payment_date
            FROM members m
            WHERE COALESCE(m.marathon_month, '') <> '' AND m.marathon_month <> ?
              AND NOT EXISTS (
                SELECT 1 FROM payments p
                JOIN membership_cards c ON c.id = p.card_id
                WHERE p.member_id = m.id AND c.card_type = 'Marathon'
                  AND p.payment_date >= ? AND p.payment_date < ?
              )
            ORDER BY m.name
            """,
            (month_start, month_start[:7], month_start, next_month_start),
        ).fetchall()
    return {
        "month": month_start[:7],
        "current": rows_to_list(current_rows),
        "previous": rows_to_list(previous_rows),
    }


def reset_marathon(payload: dict[str, Any]) -> dict[str, Any]:
    with connect() as db:
        user = get_user(db, payload.get("userId"))
        require_role(user, "admin")
        month_start, next_month_start = current_month_bounds()
        reset_rows = db.execute(
            """
            SELECT m.id, m.name FROM members m
            WHERE COALESCE(m.marathon_month, '') <> '' AND m.marathon_month <> ?
              AND NOT EXISTS (
                SELECT 1 FROM payments p
                JOIN membership_cards c ON c.id = p.card_id
                WHERE p.member_id = m.id AND c.card_type = 'Marathon'
                  AND p.payment_date >= ? AND p.payment_date < ?
              )
            """,
            (month_start[:7], month_start, next_month_start),
        ).fetchall()
        if reset_rows:
            ids = [int(row["id"]) for row in reset_rows]
            placeholders = ",".join("?" for _ in ids)
            db.execute(f"UPDATE members SET marathon_month = '', marathon = 0 WHERE id IN ({placeholders})", ids)
        stamp = now_label()
        db.execute(
            "INSERT INTO audit (action, actor, created_at) VALUES (?, ?, ?)",
            (f"Marathon Reset - {len(reset_rows)} previous-month member(s)", user["name"], stamp),
        )
    return bootstrap(payload.get("userId"))


def scoped_measurements(db: sqlite3.Connection, user: dict[str, Any], mode: str = "club") -> list[dict[str, Any]]:
    params: tuple[Any, ...]
    if mode == "personal":
        member_id = personal_member_id(user)
        if member_id:
            sql = "SELECT * FROM measurements WHERE member_id = ? ORDER BY measurement_date DESC"
            params = (member_id,)
        else:
            return []
    else:
        clause, values = member_scope_clause(user, mode)
        sql = f"""
        SELECT measurements.* FROM measurements
        JOIN members ON members.id = measurements.member_id
        WHERE {clause.replace('nutrition_club', 'members.nutrition_club').replace('supervisor_id', 'members.supervisor_id').replace('coach_id', 'members.coach_id').replace('id = ?', 'members.id = ?')}
        ORDER BY measurement_date DESC
        """
        params = values
    return rows_to_list(db.execute(sql, params).fetchall())

def scoped_cards(db: sqlite3.Connection, user: dict[str, Any], mode: str = "club") -> list[dict[str, Any]]:
    if mode == "personal":
        member_id = personal_member_id(user)
        if not member_id:
            return []
        rows = db.execute("SELECT * FROM membership_cards WHERE member_id = ? ORDER BY id DESC", (member_id,)).fetchall()
    else:
        clause, values = member_scope_clause(user, mode)
        rows = db.execute(
            f"""
            SELECT c.* FROM membership_cards c
            JOIN members m ON m.id = c.member_id
            WHERE {clause.replace('nutrition_club', 'm.nutrition_club').replace('supervisor_id', 'm.supervisor_id').replace('coach_id', 'm.coach_id').replace('id = ?', 'm.id = ?')}
            ORDER BY CASE WHEN c.status = 'Active' THEN 0 ELSE 1 END, c.start_date, c.id
            """,
            values,
        ).fetchall()
    return rows_to_list(rows)

def scoped_attendance(db: sqlite3.Connection, user: dict[str, Any], mode: str = "club") -> list[dict[str, Any]]:
    if mode == "personal":
        member_id = personal_member_id(user)
        if not member_id:
            return []
        rows = db.execute("SELECT * FROM attendance WHERE member_id = ? ORDER BY attendance_date DESC, id DESC LIMIT 80", (member_id,)).fetchall()
    else:
        clause, values = member_scope_clause(user, mode)
        rows = db.execute(
            f"""
            SELECT a.* FROM attendance a
            JOIN members m ON m.id = a.member_id
            WHERE {clause.replace('nutrition_club', 'm.nutrition_club').replace('supervisor_id', 'm.supervisor_id').replace('coach_id', 'm.coach_id').replace('id = ?', 'm.id = ?')}
            ORDER BY a.attendance_date DESC, a.id DESC LIMIT 120
            """,
            values,
        ).fetchall()
    return rows_to_list(rows)

def scoped_payments(db: sqlite3.Connection, user: dict[str, Any], mode: str = "club") -> list[dict[str, Any]]:
    if mode == "personal":
        member_id = personal_member_id(user)
        if not member_id:
            return []
        rows = db.execute(
            """
            SELECT p.*, COALESCE(c.card_type, ac.card_type, '') AS card_type,
                   COALESCE(c.card_number, ac.card_number, '') AS card_number
            FROM payments p
            LEFT JOIN membership_cards c ON p.card_id = c.id
            LEFT JOIN attendance a ON p.attendance_id = a.id
            LEFT JOIN membership_cards ac ON a.card_id = ac.id
            WHERE p.member_id = ?
            ORDER BY p.payment_date DESC, p.id DESC LIMIT 80
            """,
            (member_id,),
        ).fetchall()
    elif user["role"] == "supervisor":
        rows = db.execute(
            """
            SELECT p.*, COALESCE(c.card_type, ac.card_type, '') AS card_type,
                   COALESCE(c.card_number, ac.card_number, '') AS card_number
            FROM payments p
            JOIN members m ON m.id = p.member_id
            LEFT JOIN membership_cards c ON p.card_id = c.id
            LEFT JOIN attendance a ON p.attendance_id = a.id
            LEFT JOIN membership_cards ac ON a.card_id = ac.id
            WHERE m.nutrition_club = ?
            ORDER BY p.payment_date DESC, p.id DESC LIMIT 80
            """,
            (current_club(user),),
        ).fetchall()
    else:
        rows = db.execute(
            """
            SELECT p.*, COALESCE(c.card_type, ac.card_type, '') AS card_type,
                   COALESCE(c.card_number, ac.card_number, '') AS card_number
            FROM payments p
            LEFT JOIN membership_cards c ON p.card_id = c.id
            LEFT JOIN attendance a ON p.attendance_id = a.id
            LEFT JOIN membership_cards ac ON a.card_id = ac.id
            ORDER BY p.payment_date DESC, p.id DESC LIMIT 120
            """
        ).fetchall()
    return rows_to_list(rows)


def scoped_leads(db: sqlite3.Connection, user: dict[str, Any], mode: str = "club") -> list[dict[str, Any]]:
    if mode == "personal":
        return []
    if user["role"] == "super_admin":
        rows = db.execute("SELECT * FROM leads ORDER BY created_date DESC, id DESC LIMIT 100").fetchall()
    else:
        rows = db.execute(
            "SELECT * FROM leads WHERE nutrition_club = ? ORDER BY created_date DESC, id DESC LIMIT 100",
            (current_club(user),),
        ).fetchall()
    leads = rows_to_list(rows)
    for lead in leads:
        lead["followups"] = parse_followups(lead.get("followups"))
    return leads


def weekly_review_data(db: sqlite3.Connection, user: dict[str, Any], start_date: str, end_date: str, mode: str = "club") -> dict[str, Any]:
    if mode == "personal":
        return {"startDate": start_date, "endDate": end_date, "tiles": [], "details": {}}
    members = scoped_members(db, user, mode)
    member_ids = [int(member["id"]) for member in members]
    lead_rows = scoped_leads(db, user, mode)
    card_rows = scoped_cards(db, user, mode)

    def within(date_value: str) -> bool:
        return start_date <= str(date_value)[:10] <= end_date

    lead_items = [
        {
            "id": lead["id"],
            "name": lead["name"],
            "phone": lead["phone"],
            "place": lead.get("place", ""),
            "activity": lead.get("activity", ""),
            "createdDate": lead.get("created_date", ""),
            "status": lead.get("status", "New"),
        }
        for lead in lead_rows
        if within(lead.get("created_date", ""))
    ]
    walkins = [card for card in card_rows if card.get("card_type") == "Complimentary Card" and within(card.get("created_date", ""))]
    trials = [card for card in card_rows if card.get("card_type") == "Trial Card" and within(card.get("created_date", ""))]
    ums = [card for card in card_rows if card.get("card_type") in {"26 Days Card", "30 Days Card"} and within(card.get("created_date", ""))]

    return {
        "startDate": start_date,
        "endDate": end_date,
        "tiles": [
            {"key": "leads", "title": "Leads", "count": len(lead_items), "items": lead_items},
            {"key": "walkins", "title": "Walk-ins", "count": len(walkins), "items": walkins},
            {"key": "trials", "title": "Trials", "count": len(trials), "items": trials},
            {"key": "ums", "title": "UMS", "count": len(ums), "items": ums},
        ],
        "details": {
            "leads": lead_items,
            "walkins": walkins,
            "trials": trials,
            "ums": ums,
        },
        "memberCount": len(member_ids),
    }


def payment_entries(user_id: str | None, params: dict[str, list[str]]) -> dict[str, Any]:
    with connect() as db:
        user = get_user(db, user_id)
        require_role(user, "admin", "supervisor", "super_admin")
        clauses: list[str] = []
        values: list[Any] = []
        joins = "JOIN members m ON m.id = p.member_id"

        if user["role"] == "supervisor":
            clauses.extend([
                "m.nutrition_club = ?",
                "m.supervisor_id = ?",
                "(p.created_by_user_id = ? OR ((p.created_by_user_id IS NULL OR p.created_by_user_id = '') AND p.created_by = ?))",
            ])
            values.extend([current_club(user), user["id"], user["id"], user["name"]])
        elif user["role"] == "coach":
            clauses.extend([
                "m.nutrition_club = ?",
                "m.coach_id = ?",
                "(p.created_by_user_id = ? OR ((p.created_by_user_id IS NULL OR p.created_by_user_id = '') AND p.created_by = ?))",
            ])
            values.extend([current_club(user), user["id"], user["id"], user["name"]])
        elif user["role"] == "nc_organiser":
            clauses.append("m.nutrition_club = ?")
            values.append(current_club(user))
        elif user["role"] == "admin":
            clauses.append("m.nutrition_club = ?")
            values.append(current_club(user))

        member_id = (params.get("memberId", [""])[0] or "").strip()
        date_from = (params.get("from", [""])[0] or "").strip()
        date_to = (params.get("to", [""])[0] or "").strip()
        card_type = (params.get("cardType", [""])[0] or "").strip()
        has_requested_filters = bool(member_id or date_from or date_to or card_type)

        if member_id:
            clauses.append("p.member_id = ?")
            values.append(member_id)
        if date_from:
            clauses.append("p.payment_date >= ?")
            values.append(date_from)
        if date_to:
            clauses.append("p.payment_date <= ?")
            values.append(date_to)
        if card_type:
            clauses.append("COALESCE(c.card_type, ac.card_type, '') = ?")
            values.append(card_type)

        where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        limit = "" if has_requested_filters else "LIMIT 20"
        rows = db.execute(
            f"""
            SELECT p.*, COALESCE(c.card_type, ac.card_type, '') AS card_type,
                   COALESCE(c.card_number, ac.card_number, '') AS card_number
            FROM payments p
            {joins}
            LEFT JOIN membership_cards c ON p.card_id = c.id
            LEFT JOIN attendance a ON p.attendance_id = a.id
            LEFT JOIN membership_cards ac ON a.card_id = ac.id
            {where}
            ORDER BY p.payment_date DESC, p.id DESC
            {limit}
            """,
            values,
        ).fetchall()
        card_types = [
            row["card_type"]
            for row in db.execute("SELECT DISTINCT card_type FROM membership_cards WHERE card_type <> '' ORDER BY card_type").fetchall()
        ]
        total = sum(float(row["amount"] or 0) for row in rows)
    return {"entries": rows_to_list(rows), "cardTypes": card_types, "total": total}


def member_attendance_entries(user_id: str | None, params: dict[str, list[str]]) -> dict[str, Any]:
    with connect() as db:
        user = get_user(db, user_id)
        if not user or user["role"] not in {"admin", "super_admin", "member"}:
            raise PermissionError("You do not have access to this member attendance history.")
        member_id = int((params.get("memberId", ["0"])[0] or "0"))
        month = str(params.get("month", [datetime.now().date().isoformat()[:7]])[0]).strip()
        if not re.fullmatch(r"\d{4}-\d{2}", month):
            raise ValueError("Select a valid month and year.")
        try:
            month_start = datetime.strptime(f"{month}-01", "%Y-%m-%d").date()
        except ValueError as exc:
            raise ValueError("Select a valid month and year.") from exc
        if month_start.month == 12:
            next_month = month_start.replace(year=month_start.year + 1, month=1)
        else:
            next_month = month_start.replace(month=month_start.month + 1)
        if user["role"] == "member" and int(user["member_id"] or 0) != member_id:
            raise PermissionError("Members can view only their own attendance history.")
        member = db.execute("SELECT id FROM members WHERE id = ?", (member_id,)).fetchone()
        if not member:
            raise ValueError("Member not found.")
        rows = db.execute(
            """
            SELECT a.*, c.card_type, c.card_number, c.target_visits
            FROM attendance a
            LEFT JOIN membership_cards c ON c.id = a.card_id
            WHERE a.member_id = ? AND a.attendance_date >= ? AND a.attendance_date < ?
            ORDER BY a.attendance_date, a.id
            """,
            (member_id, month_start.isoformat(), next_month.isoformat()),
        ).fetchall()
        entries = rows_to_list(rows)
        for entry in entries:
            count_value = int(entry.get("count_value") or 0)
            guest_match = re.search(r"Guest:\s*([^|]+)", str(entry.get("reason") or ""), re.IGNORECASE)
            entry["guest_name"] = guest_match.group(1).strip() if guest_match else ""
            entry["guest_count"] = max(count_value - 1, 1) if guest_match else 0
            entry["member_visit_count"] = 1 if count_value > 0 and not int(entry.get("neutral_day") or 0) else 0
            if entry.get("card_id") and entry.get("target_visits") is not None:
                used_row = db.execute(
                    """
                    SELECT COALESCE(SUM(CASE WHEN neutral_day = 1 THEN 0 ELSE count_value END), 0) AS used
                    FROM attendance
                    WHERE card_id = ? AND attendance_date <= ?
                    """,
                    (entry["card_id"], entry["attendance_date"]),
                ).fetchone()
                used = int(used_row["used"] or 0) if used_row else 0
                target = int(entry.get("target_visits") or 0)
                entry["card_used_as_of"] = used
                entry["card_remaining_as_of"] = max(target - used, 0)
            else:
                entry["card_used_as_of"] = None
                entry["card_remaining_as_of"] = None
    return {"month": month, "entries": entries}


def bootstrap(user_id: str | None, requested_view: str = "personal") -> dict[str, Any]:
    with connect() as db:
        session = ensure_current_session(db)
        user = get_user(db, user_id)
        view_mode = view_mode_allowed(user, requested_view)
        users = rows_to_list(db.execute("SELECT id, username, name, role, member_id, nutrition_club FROM users ORDER BY role, name").fetchall()) if user and user["role"] in {"admin", "super_admin"} and view_mode == "club" else []
        audit = rows_to_list(db.execute("SELECT action, actor, created_at FROM audit ORDER BY id DESC LIMIT 30").fetchall()) if user and user["role"] in {"admin", "super_admin"} and view_mode == "club" else []
        notifications = rows_to_list(db.execute("SELECT message, created_at FROM notifications ORDER BY id DESC LIMIT 30").fetchall())
        return {
            "user": user,
            "viewMode": view_mode,
            "users": users,
            "members": scoped_members(db, user, view_mode) if user else [],
            "measurements": scoped_measurements(db, user, view_mode) if user else [],
            "cards": scoped_cards(db, user, view_mode) if user else [],
            "attendance": scoped_attendance(db, user, view_mode) if user else [],
            "payments": scoped_payments(db, user, view_mode) if user else [],
            "leads": scoped_leads(db, user, view_mode) if user else [],
            "session": session,
            "audit": audit,
            "notifications": notifications,
            "scoringFormula": SCORING_FORMULA if user and user["role"] in {"admin", "supervisor", "super_admin"} else None,
            "dashboardSummary": dashboard_summary(db, user) if user else None,
            "dashboardClubs": dashboard_clubs(db, user) if user and user["role"] == "super_admin" else [],
            "week": current_week(),
        }


def dmo_leads(user_id: str | None, params: dict[str, list[str]]) -> dict[str, Any]:
    with connect() as db:
        user = get_user(db, user_id)
        require_role(user, "coach", "supervisor", "admin", "nc_organiser", "super_admin")
        view_mode = view_mode_allowed(user, params.get("view", ["club"])[0])
        leads = scoped_leads(db, user, view_mode)
        date_from = (params.get("from", [""])[0] or "").strip()
        date_to = (params.get("to", [""])[0] or "").strip()
        place = (params.get("place", [""])[0] or "").strip().lower()

        def match(lead: dict[str, Any]) -> bool:
            created = str(lead.get("created_date", ""))[:10]
            if date_from and created < date_from:
                return False
            if date_to and created > date_to:
                return False
            if place and place not in str(lead.get("place", "")).strip().lower():
                return False
            return True

        filtered = [lead for lead in leads if match(lead)]
        latest = filtered[:20]
        today = datetime.now().date().isoformat()
        reminders = []
        tomorrow = (datetime.now().date() + timedelta(days=1)).isoformat()
        for lead in filtered:
            followups = lead.get("followups") or []
            for followup in followups:
                due_date = str(followup.get("nextFollowUpDate") or followup.get("followUpDate") or "").strip()
                status = str(followup.get("status") or "").lower()
                if not due_date:
                    continue
                item = {
                    "leadId": lead.get("id"),
                    "leadName": lead.get("name"),
                    "phone": lead.get("phone"),
                    "followupNumber": followup.get("number"),
                    "dueDate": due_date,
                    "notes": followup.get("notes", ""),
                    "status": followup.get("status", ""),
                    "place": lead.get("place", ""),
                }
                if due_date == today:
                    reminders.append({**item, "bucket": "today"})
                elif due_date == tomorrow:
                    reminders.append({**item, "bucket": "tomorrow"})
                elif due_date < today and status not in {"done", "completed"}:
                    reminders.append({**item, "bucket": "missed"})
                elif due_date <= (datetime.now().date() + timedelta(days=1)).isoformat():
                    reminders.append({**item, "bucket": "upcoming-1-day"})
                elif due_date <= (datetime.now().date() + timedelta(hours=4)).date().isoformat():
                    reminders.append({**item, "bucket": "upcoming-4-hours"})
                elif due_date <= (datetime.now().date() + timedelta(minutes=15)).date().isoformat():
                    reminders.append({**item, "bucket": "upcoming-15-min"})
        return {
            "leads": latest,
            "allLeads": filtered,
            "reminders": reminders,
            "filters": {"from": date_from, "to": date_to, "place": place},
        }


def save_lead(payload: dict[str, Any]) -> dict[str, Any]:
    with connect() as db:
        user = get_user(db, payload.get("userId"))
        require_role(user, "coach", "supervisor", "admin", "nc_organiser", "super_admin")
        data = payload.get("lead", {})
        name = str(data.get("name", "")).strip()
        phone = str(data.get("phone", "")).strip()
        place = str(data.get("place", "")).strip()
        next_follow_up_date = str(data.get("nextFollowUpDate", "")).strip()
        if not name or not phone or not next_follow_up_date:
            raise ValueError("Name, phone number, and next follow-up date are required.")
        club = current_club(user)
        duplicate = db.execute("SELECT id, name FROM leads WHERE phone = ? AND nutrition_club = ?", (phone, club)).fetchone()
        if duplicate:
            raise ValueError(f"Lead already exists for this phone number: {duplicate['name']}")
        lead_id = int(first_value(db.execute("SELECT COALESCE(MAX(id), 0) + 1 FROM leads").fetchone()))
        lead_code_value = lead_code(lead_id)
        followups = lead_followups_template(next_follow_up_date)
        stamp = now_label()
        db.execute(
            """
            INSERT INTO leads
            (id, lead_code, name, phone, area, place, city, health_challenge, activity, nutrition_club,
             created_date, next_follow_up_date, status, followups, created_by, updated_by, updated_on)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                lead_id,
                lead_code_value,
                name,
                phone,
                str(data.get("area", "")).strip(),
                place,
                str(data.get("city", "")).strip(),
                str(data.get("healthChallenge", "")).strip(),
                str(data.get("activity", "")).strip(),
                club,
                datetime.now().date().isoformat(),
                next_follow_up_date,
                "New",
                serialise_followups(followups),
                user["name"],
                user["name"],
                stamp,
            ),
        )
        db.execute("INSERT INTO audit (action, actor, created_at) VALUES (?, ?, ?)", (f"Lead Created - {name}", user["name"], stamp))
    return bootstrap(payload.get("userId"), payload.get("viewMode") or "club")


def update_lead_followup(payload: dict[str, Any]) -> dict[str, Any]:
    with connect() as db:
        user = get_user(db, payload.get("userId"))
        require_role(user, "coach", "supervisor", "admin", "nc_organiser", "super_admin")
        lead_id = int(payload.get("leadId") or 0)
        lead = db.execute("SELECT * FROM leads WHERE id = ?", (lead_id,)).fetchone()
        if not lead:
            raise ValueError("Lead not found.")
        if user["role"] != "super_admin" and str(lead["nutrition_club"] or "") != current_club(user):
            raise PermissionError("You can only update leads in your Nutrition Club.")
        followups = parse_followups(lead.get("followups"))
        followup_number = int(payload.get("followupNumber") or 0)
        if followup_number < 1 or followup_number > 10:
            raise ValueError("Follow-up number must be between 1 and 10.")
        followup = next((item for item in followups if int(item.get("number") or 0) == followup_number), None)
        if not followup:
            raise ValueError("Follow-up record not found.")
        if payload.get("followupDate"):
            followup["followUpDate"] = str(payload.get("followupDate"))[:10]
        if payload.get("notes") is not None:
            followup["notes"] = str(payload.get("notes", "")).strip()
        if payload.get("nextFollowUpDate"):
            followup["nextFollowUpDate"] = str(payload.get("nextFollowUpDate"))[:10]
        if payload.get("status"):
            followup["status"] = str(payload.get("status"))
        lead_status = "Follow-up Due"
        if any(str(item.get("status", "")).lower() in {"done", "completed"} for item in followups):
            lead_status = "In Progress"
        if all(str(item.get("status", "")).lower() in {"done", "completed"} for item in followups if item.get("followUpDate")):
            lead_status = "Converted"
        stamp = now_label()
        db.execute(
            "UPDATE leads SET followups = ?, status = ?, updated_by = ?, updated_on = ? WHERE id = ?",
            (serialise_followups(followups), lead_status, user["name"], stamp, lead_id),
        )
        db.execute("INSERT INTO audit (action, actor, created_at) VALUES (?, ?, ?)", (f"Lead Follow-up Updated - {lead['name']}", user["name"], stamp))
    return bootstrap(payload.get("userId"), payload.get("viewMode") or "club")


def weekly_review_entries(user_id: str | None, params: dict[str, list[str]]) -> dict[str, Any]:
    with connect() as db:
        user = get_user(db, user_id)
        require_role(user, "coach", "supervisor", "admin", "nc_organiser", "super_admin")
        start_date = (params.get("from", [""])[0] or "").strip()
        end_date = (params.get("to", [""])[0] or "").strip()
        if not start_date or not end_date:
            today = datetime.now().date()
            end_date = end_date or today.isoformat()
            start_date = start_date or (today - timedelta(days=6)).isoformat()
        mode = view_mode_allowed(user, params.get("view", ["club"])[0])
        return weekly_review_data(db, user, start_date, end_date, mode)


def audit_entries(user_id: str | None, params: dict[str, list[str]]) -> dict[str, Any]:
    with connect() as db:
        user = get_user(db, user_id)
        require_role(user, "admin", "super_admin")
        transaction_type = (params.get("type", [""])[0] or "").strip()
        date_from = (params.get("from", [""])[0] or "").strip()
        date_to = (params.get("to", [""])[0] or "").strip()
        limit = int((params.get("limit", ["20"])[0] or "20"))
        limit = max(1, min(limit, 200))
        clauses: list[str] = []
        values: list[Any] = []
        if transaction_type:
            clauses.append("action LIKE ?")
            values.append(f"%{transaction_type}%")
        where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        rows = rows_to_list(db.execute(f"SELECT id, action, actor, created_at FROM audit {where} ORDER BY id DESC", values).fetchall())
        if date_from or date_to:
            start = datetime.fromisoformat(date_from).date() if date_from else None
            end = datetime.fromisoformat(date_to).date() if date_to else None
            filtered = []
            for row in rows:
                try:
                    row_date = datetime.strptime(row["created_at"], "%d %b %Y %H:%M").date()
                except ValueError:
                    continue
                if start and row_date < start:
                    continue
                if end and row_date > end:
                    continue
                filtered.append(row)
            rows = filtered
        rows = rows[:limit]
        types = rows_to_list(db.execute("SELECT DISTINCT action FROM audit ORDER BY action").fetchall())
        return {"entries": rows, "types": sorted({row["action"].split(" - ")[0] for row in types})}


EXPORT_TABLES = [
    "users",
    "members",
    "sessions",
    "measurements",
    "membership_cards",
    "attendance",
    "payments",
    "audit",
    "notifications",
]


def xlsx_column_name(index: int) -> str:
    name = ""
    while index:
        index, remainder = divmod(index - 1, 26)
        name = chr(65 + remainder) + name
    return name


def xlsx_cell(row_index: int, column_index: int, value: Any) -> str:
    ref = f"{xlsx_column_name(column_index)}{row_index}"
    if value is None:
        return f'<c r="{ref}" t="inlineStr"><is><t></t></is></c>'
    if isinstance(value, bool):
        text = "TRUE" if value else "FALSE"
        return f'<c r="{ref}" t="inlineStr"><is><t>{text}</t></is></c>'
    if isinstance(value, (int, float)):
        return f'<c r="{ref}"><v>{value}</v></c>'
    text = xml_escape(str(value), {'"': "&quot;"})
    return f'<c r="{ref}" t="inlineStr"><is><t>{text}</t></is></c>'


def xlsx_sheet_xml(headers: list[str], rows: list[dict[str, Any]]) -> str:
    xml_rows = []
    header_cells = "".join(xlsx_cell(1, column_index, header) for column_index, header in enumerate(headers, 1))
    xml_rows.append(f'<row r="1">{header_cells}</row>')
    for row_index, row in enumerate(rows, 2):
        cells = "".join(xlsx_cell(row_index, column_index, row.get(header)) for column_index, header in enumerate(headers, 1))
        xml_rows.append(f'<row r="{row_index}">{cells}</row>')
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        f'<sheetData>{"".join(xml_rows)}</sheetData>'
        "</worksheet>"
    )


def build_xlsx_workbook(sheets: list[tuple[str, list[str], list[dict[str, Any]]]]) -> bytes:
    output = BytesIO()
    with ZipFile(output, "w", ZIP_DEFLATED) as workbook:
        workbook.writestr(
            "[Content_Types].xml",
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            '<Default Extension="xml" ContentType="application/xml"/>'
            '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>'
            '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>'
            '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
            '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
            + "".join(
                f'<Override PartName="/xl/worksheets/sheet{index}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
                for index in range(1, len(sheets) + 1)
            )
            + "</Types>",
        )
        workbook.writestr(
            "_rels/.rels",
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
            '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>'
            '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>'
            "</Relationships>",
        )
        sheet_refs = "".join(
            f'<sheet name="{xml_escape(name)}" sheetId="{index}" r:id="rId{index}"/>'
            for index, (name, _, _) in enumerate(sheets, 1)
        )
        workbook.writestr(
            "xl/workbook.xml",
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
            'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            f"<sheets>{sheet_refs}</sheets>"
            "</workbook>",
        )
        workbook_rels = "".join(
            f'<Relationship Id="rId{index}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet{index}.xml"/>'
            for index in range(1, len(sheets) + 1)
        )
        workbook_rels += (
            f'<Relationship Id="rId{len(sheets) + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
        )
        workbook.writestr(
            "xl/_rels/workbook.xml.rels",
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            f"{workbook_rels}</Relationships>",
        )
        workbook.writestr(
            "xl/styles.xml",
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            '<fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>'
            '<fills count="1"><fill><patternFill patternType="none"/></fill></fills>'
            '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
            '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
            '<cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>'
            "</styleSheet>",
        )
        created = datetime.now().isoformat(timespec="seconds")
        workbook.writestr(
            "docProps/core.xml",
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" '
            'xmlns:dc="http://purl.org/dc/elements/1.1/" '
            'xmlns:dcterms="http://purl.org/dc/terms/" '
            'xmlns:dcmitype="http://purl.org/dc/dcmitype/" '
            'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'
            "<dc:title>HealthRank Pro Backup</dc:title>"
            "<dc:creator>HealthRank Pro</dc:creator>"
            f'<dcterms:created xsi:type="dcterms:W3CDTF">{created}</dcterms:created>'
            f'<dcterms:modified xsi:type="dcterms:W3CDTF">{created}</dcterms:modified>'
            "</cp:coreProperties>",
        )
        workbook.writestr(
            "docProps/app.xml",
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" '
            'xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">'
            "<Application>HealthRank Pro</Application>"
            "</Properties>",
        )
        for index, (_, headers, rows) in enumerate(sheets, 1):
            workbook.writestr(f"xl/worksheets/sheet{index}.xml", xlsx_sheet_xml(headers, rows))
    return output.getvalue()


def export_backup(user_id: str | None) -> tuple[bytes, str]:
    with connect() as db:
        user = get_user(db, user_id)
        require_role(user, "admin", "super_admin")
        sheets: list[tuple[str, list[str], list[dict[str, Any]]]] = []
        for table in EXPORT_TABLES:
            headers = db.table_headers(table)
            if table == "users":
                headers = [header for header in headers if header != "password"]
            rows = rows_to_list(db.execute(f"SELECT * FROM {table}").fetchall())
            if table == "users":
                rows = [{key: value for key, value in row.items() if key != "password"} for row in rows]
            sheets.append((table[:31], headers, rows))
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    return build_xlsx_workbook(sheets), f"healthrank-backup-{timestamp}.xlsx"


def require_role(user: dict[str, Any] | None, *roles: str) -> None:
    if not user or user["role"] not in roles:
        raise PermissionError("You do not have access to perform this action.")


def bool_flag(value: Any) -> int:
    return 1 if str(value).strip().lower() in {"1", "true", "yes", "on"} else 0


def age_from_dob(dob_value: str | None) -> int | None:
    dob_text = str(dob_value or "").strip()
    if not dob_text:
        return None
    try:
        dob = datetime.fromisoformat(dob_text[:10]).date()
    except ValueError:
        return None
    today = datetime.now().date()
    age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
    return age if age >= 0 else None


def resolved_age(data: dict[str, Any]) -> int | None:
    calculated = age_from_dob(data.get("dob"))
    if calculated is not None:
        return calculated
    age_text = str(data.get("age", "")).strip()
    return int(age_text) if age_text else None


def current_club(user: dict[str, Any] | None) -> str:
    if not user:
        return "Main Nutrition Club"
    return str(user.get("nutrition_club") or "Main Nutrition Club")


def club_view_roles() -> set[str]:
    return {"coach", "supervisor", "admin", "nc_organiser", "super_admin"}


def view_mode_allowed(user: dict[str, Any] | None, requested: str | None) -> str:
    mode = str(requested or "personal").strip().lower()
    if mode == "club" and user and user.get("role") in club_view_roles():
        return "club"
    return "personal"


def personal_member_id(user: dict[str, Any] | None) -> int | None:
    if not user:
        return None
    member_id = int(user.get("member_id") or 0)
    return member_id or None


def member_scope_clause(user: dict[str, Any], mode: str) -> tuple[str, tuple[Any, ...]]:
    role = user["role"]
    if mode == "personal":
        if role == "member" and user.get("member_id"):
            return "id = ?", (user["member_id"],)
        if user.get("member_id"):
            return "id = ?", (user["member_id"],)
        return "1 = 0", ()
    if role == "super_admin":
        return "1 = 1", ()
    if role in {"admin", "nc_organiser"}:
        return "nutrition_club = ?", (current_club(user),)
    if role == "supervisor":
        return "nutrition_club = ? AND supervisor_id = ?", (current_club(user), user["id"])
    if role == "coach":
        return "nutrition_club = ? AND coach_id = ?", (current_club(user), user["id"])
    if role == "member" and user.get("member_id"):
        return "id = ?", (user["member_id"],)
    return "nutrition_club = ?", (current_club(user),)


def member_scope_join_clause(user: dict[str, Any], mode: str, member_alias: str = "members") -> tuple[str, tuple[Any, ...]]:
    clause, values = member_scope_clause(user, mode)
    if clause == "1 = 1":
        return "", ()
    if member_alias == "members":
        return clause, values
    clause = clause.replace("nutrition_club", f"{member_alias}.nutrition_club")
    clause = clause.replace("supervisor_id", f"{member_alias}.supervisor_id")
    clause = clause.replace("coach_id", f"{member_alias}.coach_id")
    clause = clause.replace("id", f"{member_alias}.id") if clause == "id = ?" else clause
    return clause, values


def selected_view_user(user: dict[str, Any], mode: str) -> dict[str, Any]:
    if mode == "personal" and user.get("member_id"):
        return {**user, "member_id": user.get("member_id")}
    return user


def can_access_member(user: dict[str, Any], member: dict[str, Any]) -> bool:
    role = user["role"]
    if role == "super_admin":
        return True
    if role in {"admin", "nc_organiser"}:
        return str(member.get("nutrition_club") or "") == current_club(user)
    if role == "supervisor":
        return str(member.get("nutrition_club") or "") == current_club(user) and str(member.get("supervisor_id") or "") == user["id"]
    if role == "coach":
        return str(member.get("nutrition_club") or "") == current_club(user) and str(member.get("coach_id") or "") == user["id"]
    if role == "member":
        return int(user.get("member_id") or 0) == int(member.get("id") or 0)
    return False


def card_target(card_type: str) -> int:
    if card_type == "Complimentary Card":
        return 1
    if card_type == "Coupon":
        return 1
    if card_type == "Trial Card":
        return 3
    if card_type == "10 Days Card / NMS":
        return 10
    if card_type == "26 Days Card":
        return 26
    if card_type == "Marathon":
        return 0
    return 30


def card_standard_amount(card_type: str) -> float | None:
    return {
        "Complimentary Card": 250.0,
        "Coupon": 250.0,
        "Trial Card": 700.0,
        "10 Days Card / NMS": 2400.0,
        "26 Days Card": 5400.0,
        "30 Days Card": 6200.0,
        "Marathon": 300.0,
    }.get(card_type)


def lead_code(lead_id: int) -> str:
    return f"LEAD-{lead_id:06d}"


def lead_followups_template(first_follow_up_date: str = "") -> list[dict[str, Any]]:
    followups = []
    for index in range(1, 11):
        followups.append(
            {
                "number": index,
                "followUpDate": first_follow_up_date if index == 1 else "",
                "notes": "",
                "nextFollowUpDate": "",
                "status": "Pending" if index == 1 and first_follow_up_date else "Not Scheduled",
            }
        )
    return followups


def parse_followups(raw: Any) -> list[dict[str, Any]]:
    if not raw:
        return lead_followups_template()
    try:
        followups = json.loads(str(raw))
        if isinstance(followups, list):
            return followups
    except json.JSONDecodeError:
        pass
    return lead_followups_template()


def serialise_followups(followups: list[dict[str, Any]]) -> str:
    return json.dumps(followups, separators=(",", ":"), ensure_ascii=False)


def create_or_select_member(db: DbConnection, user: dict[str, Any], data: dict[str, Any]) -> Any:
    club = str(data.get("nutritionClub") or current_club(user)).strip() or current_club(user)
    phone = str(data.get("phone", "")).strip()
    member_code = str(data.get("memberCode", "")).strip().upper()
    if member_code:
        existing = db.execute(
            "SELECT * FROM members WHERE member_code = ? AND nutrition_club = ?",
            (member_code, club),
        ).fetchone()
        if existing:
            return existing
    if phone:
        existing = db.execute(
            "SELECT * FROM members WHERE phone = ? AND nutrition_club = ?",
            (phone, club),
        ).fetchone()
        if existing:
            return existing

    first_name = str(data.get("firstName", "")).strip()
    last_name = str(data.get("lastName", "")).strip()
    full_name = str(data.get("name", "")).strip()
    if not full_name:
        full_name = f"{first_name} {last_name}".strip()
    if not full_name or not phone:
        raise ValueError("Enter first name and mobile number for a new member.")

    new_id = int(first_value(db.execute("SELECT COALESCE(MAX(id), 0) + 1 FROM members").fetchone()))
    member_code = generate_member_code(new_id)
    goal = str(data.get("goal", "")).strip() or "Health & Fitness"
    stamp = now_label()
    supervisor_id = str(data.get("supervisorId") or (user["id"] if user["role"] == "supervisor" else "u-supervisor")).strip() or "u-supervisor"
    coach_id = str(data.get("coachId") or "").strip()
    be_coach = bool_flag(data.get("beCoach", 0))
    db.execute(
        """
        INSERT INTO members
        (id, member_code, name, phone, gender, age, dob, height, nutrition_club, coach_id, supervisor_id, be_coach, card_type, notes,
         goal, score, rank, measured, marathon, last_measured, created_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 0, ?, 'New', ?)
        """,
        (
            new_id,
            member_code,
            full_name,
            phone,
            str(data.get("gender", "")).strip(),
            resolved_age(data),
            str(data.get("dob", "")).strip(),
            float(data["height"]) if str(data.get("height", "")).strip() else 0,
            club,
            coach_id,
            supervisor_id,
            be_coach,
            "",
            str(data.get("notes", "")).strip(),
            goal,
            new_id,
            0,
            datetime.now().date().isoformat(),
        ),
    )
    db.execute("INSERT INTO audit (action, actor, created_at) VALUES (?, ?, ?)", (f"Member Created - {full_name}", user["name"], stamp))
    return db.execute("SELECT * FROM members WHERE id = ?", (new_id,)).fetchone()


def save_member(payload: dict[str, Any]) -> dict[str, Any]:
    with connect() as db:
        user = get_user(db, payload.get("userId"))
        require_role(user, "admin", "supervisor")
        create_or_select_member(db, user, payload.get("member", {}))
    return bootstrap(payload.get("userId"))


def update_member(payload: dict[str, Any]) -> dict[str, Any]:
    with connect() as db:
        user = get_user(db, payload.get("userId"))
        require_role(user, "admin")
        data = payload.get("member", {})
        member_id = int(data.get("memberId") or 0)
        member = db.execute("SELECT * FROM members WHERE id = ?", (member_id,)).fetchone()
        if not member:
            raise ValueError("Member not found.")

        club = str(data.get("nutritionClub") or current_club(user)).strip() or current_club(user)
        first_name = str(data.get("firstName", "")).strip()
        last_name = str(data.get("lastName", "")).strip()
        full_name = f"{first_name} {last_name}".strip()
        phone = str(data.get("phone", "")).strip()
        if not full_name:
            raise ValueError("Enter member name.")
        if not phone:
            raise ValueError("Enter mobile number.")

        duplicate = db.execute(
            "SELECT id, name FROM members WHERE phone = ? AND nutrition_club = ? AND id <> ?",
            (phone, club, member_id),
        ).fetchone()
        if duplicate:
            raise ValueError(f"Mobile number already belongs to {duplicate['name']} in this Nutrition Club.")

        height_text = str(data.get("height", "")).strip()
        values = {
            "id": member_id,
            "name": full_name,
            "phone": phone,
            "gender": str(data.get("gender", "")).strip(),
            "age": resolved_age(data),
            "dob": str(data.get("dob", "")).strip(),
            "height": float(height_text) if height_text else 0,
            "nutrition_club": club,
            "coach_id": str(data.get("coachId", member["coach_id"] or "")).strip(),
            "supervisor_id": str(data.get("supervisorId", member["supervisor_id"] or "")).strip() or member["supervisor_id"],
            "be_coach": bool_flag(data.get("beCoach", member["be_coach"] or 0)),
            "card_type": str(data.get("cardType", member["card_type"] or "")).strip(),
            "goal": str(data.get("goal", "")).strip() or "Health & Fitness",
            "marathon": bool_flag(data.get("marathon", member["marathon"] or 0)),
            "notes": str(data.get("notes", "")).strip(),
        }
        db.execute(
            """
            UPDATE members SET
              name=:name, phone=:phone, gender=:gender, age=:age, dob=:dob, height=:height,
              nutrition_club=:nutrition_club, coach_id=:coach_id, supervisor_id=:supervisor_id, be_coach=:be_coach,
              card_type=:card_type, goal=:goal, marathon=:marathon, notes=:notes
            WHERE id=:id
            """,
            values,
        )
        for table in ("measurements", "attendance", "payments", "membership_cards"):
            db.execute(f"UPDATE {table} SET member_name = ? WHERE member_id = ?", (full_name, member_id))
        db.execute("UPDATE membership_cards SET club = ? WHERE member_id = ?", (club, member_id))
        db.execute("UPDATE attendance SET club = ? WHERE member_id = ?", (club, member_id))
        db.execute("UPDATE payments SET club = ? WHERE member_id = ?", (club, member_id))
        stamp = now_label()
        db.execute(
            "INSERT INTO audit (action, actor, created_at) VALUES (?, ?, ?)",
            (f"Member Updated - {full_name}", user["name"], stamp),
        )
    return bootstrap(payload.get("userId"))


def update_member_status(payload: dict[str, Any]) -> dict[str, Any]:
    with connect() as db:
        user = get_user(db, payload.get("userId"))
        require_role(user, "admin")
        member_id = int(payload.get("memberId") or 0)
        active = 1 if payload.get("active") else 0
        member = db.execute("SELECT * FROM members WHERE id = ?", (member_id,)).fetchone()
        if not member:
            raise ValueError("Member not found.")
        stamp = now_label()
        db.execute("UPDATE members SET active = ? WHERE id = ?", (active, member_id))
        action = "Member Reactivated" if active else "Member Hidden"
        db.execute("INSERT INTO audit (action, actor, created_at) VALUES (?, ?, ?)", (f"{action} - {member['name']}", user["name"], stamp))
    return bootstrap(payload.get("userId"))


def save_card_payment(payload: dict[str, Any]) -> dict[str, Any]:
    with connect() as db:
        user = get_user(db, payload.get("userId"))
        require_role(user, "admin", "supervisor", "coach", "nc_organiser", "super_admin")
        data = payload.get("payment", {})
        member_id = int(data.get("memberId") or 0)
        member = db.execute("SELECT * FROM members WHERE id = ?", (member_id,)).fetchone()
        if not member:
            raise ValueError("Member not found.")
        if not can_access_member(user, member):
            raise PermissionError("You can only add card payments for members you are assigned to.")

        card_type = str(data.get("cardType", "")).strip() or "Trial Card"
        if card_type in {"Complimentary Card", "Trial Card"}:
            previous_card = db.execute(
                "SELECT id FROM membership_cards WHERE member_id = ? AND card_type = ? LIMIT 1",
                (member_id, card_type),
            ).fetchone()
            if previous_card:
                label = "Complimentary" if card_type == "Complimentary Card" else "Trial"
                raise ValueError(f"{label} is available only once per member and has already been used.")
        standard_amount = card_standard_amount(card_type)
        complimentary = card_type == "Complimentary Card"
        amount = float(data.get("amount") or (standard_amount if complimentary else 0))
        if complimentary and amount <= 0:
            amount = standard_amount or 250.0
        benefit_value = amount if complimentary else 0.0
        financial_amount = 0.0 if complimentary else amount
        notes = str(data.get("notes", "")).strip()
        if not complimentary and amount <= 0:
            raise ValueError("Payment amount must be greater than zero.")
        if card_type == "Marathon" and amount != 300.0 and not notes:
            raise ValueError("Please add a note because the Marathon amount is different from the default ₹300.")
        if card_type != "Marathon" and standard_amount is not None and not complimentary and amount < standard_amount and not notes:
            raise ValueError(f"Add notes explaining why the amount is below Rs {standard_amount:.0f}.")
        payment_mode = str(data.get("paymentMode", "")).strip()
        if not complimentary and not payment_mode:
            raise ValueError("Select a payment type for this card.")
        payment_mode = payment_mode or "Complimentary"
        payment_date = str(data.get("paymentDate", "")).strip() or datetime.now().date().isoformat()
        stamp = now_label()
        club = member["nutrition_club"] or current_club(user)
        target = card_target(card_type)
        card_status = "Program" if card_type == "Marathon" else "Active"
        cursor = db.execute(
            """
            INSERT INTO membership_cards
            (member_id, member_name, club, card_number, card_type, start_date, target_visits,
             completed_visits, remaining_visits, status, created_by, created_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
            """,
            (
                member["id"],
                member["name"],
                club,
                f"NC-{member['id']:03d}-{'MAR' if card_type == 'Marathon' else f'{target}D'}-{int(datetime.now().timestamp())}",
                card_type,
                payment_date,
                target,
                target,
                card_status,
                user["name"],
                stamp,
            ),
        )
        card_id = cursor.lastrowid
        marathon_month = payment_date[:7] if card_type == "Marathon" else str(member["marathon_month"] or "")
        db.execute(
            "UPDATE members SET card_type = ?, marathon_month = ? WHERE id = ?",
            (card_type, marathon_month, member["id"]),
        )
        purchase_action = "Marathon Registered" if card_type == "Marathon" else "Card Purchased"
        db.execute("INSERT INTO audit (action, actor, created_at) VALUES (?, ?, ?)", (f"{purchase_action} - {member['name']} {card_type}", user["name"], stamp))
        payment_cursor = db.execute(
            """
            INSERT INTO payments
            (member_id, member_name, club, attendance_id, card_id, payment_date, amount, benefit_value, is_benefit,
             payment_mode, notes, created_by, created_by_user_id, created_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (member["id"], member["name"], club, None, card_id, payment_date, financial_amount, benefit_value,
             1 if complimentary else 0, payment_mode, notes, user["name"], user["id"], stamp),
        )
        payment_id = payment_cursor.lastrowid
        recalculate_member_cards(db, int(member["id"]), user["name"])
        linked_attendance = db.execute(
            """
            SELECT id FROM attendance
            WHERE member_id = ? AND card_id = ?
            ORDER BY attendance_date, id LIMIT 1
            """,
            (member["id"], card_id),
        ).fetchone()
        if linked_attendance and payment_id:
            db.execute("UPDATE payments SET attendance_id = ? WHERE id = ?", (linked_attendance["id"], payment_id))
        transaction_label = "Benefit Added" if complimentary else "Payment Added"
        db.execute("INSERT INTO audit (action, actor, created_at) VALUES (?, ?, ?)", (f"{transaction_label} - {member['name']} {amount:.2f} {card_type}", user["name"], stamp))
    return bootstrap(payload.get("userId"))


def save_user(payload: dict[str, Any]) -> dict[str, Any]:
    with connect() as db:
        actor = get_user(db, payload.get("userId"))
        require_role(actor, "admin")
        data = payload.get("account", {})
        username = str(data.get("username", "")).strip().lower()
        password = str(data.get("password", "")).strip()
        name = str(data.get("name", "")).strip()
        role = str(data.get("role", "")).strip()
        nutrition_club = str(data.get("nutritionClub") or current_club(actor)).strip() or current_club(actor)
        if not username or not password or not name:
            raise ValueError("Username, display name, and password are required.")
        if role not in {"admin", "supervisor", "coach", "nc_organiser", "viewer", "member", "super_admin"}:
            raise ValueError("Invalid user role.")
        if db.execute("SELECT 1 FROM users WHERE username = ?", (username,)).fetchone():
            raise ValueError("Username already exists.")
        user_id = f"u-{username}"
        suffix = 1
        while db.execute("SELECT 1 FROM users WHERE id = ?", (user_id,)).fetchone():
            suffix += 1
            user_id = f"u-{username}-{suffix}"
        stamp = now_label()
        db.execute(
            "INSERT INTO users (id, username, password, name, role, member_id, nutrition_club) VALUES (?, ?, ?, ?, ?, NULL, ?)",
            (user_id, username, hash_password(password), name, role, nutrition_club),
        )
        db.execute("INSERT INTO audit (action, actor, created_at) VALUES (?, ?, ?)", (f"User Created - {username}", actor["name"], stamp))
    return bootstrap(payload.get("userId"))


def delete_user(payload: dict[str, Any]) -> dict[str, Any]:
    with connect() as db:
        actor = get_user(db, payload.get("userId"))
        require_role(actor, "admin")
        target_id = str(payload.get("targetUserId", "")).strip()
        if not target_id:
            raise ValueError("User id is required.")
        if target_id == actor["id"]:
            raise ValueError("You cannot delete your own user account.")
        target = db.execute("SELECT * FROM users WHERE id = ?", (target_id,)).fetchone()
        if not target:
            raise ValueError("User not found.")
        stamp = now_label()
        db.execute("DELETE FROM users WHERE id = ?", (target_id,))
        db.execute("INSERT INTO audit (action, actor, created_at) VALUES (?, ?, ?)", (f"User Deleted - {target['username']}", actor["name"], stamp))
    return bootstrap(payload.get("userId"))


def session_action(payload: dict[str, Any], status: str, message: str, audit_action: str) -> dict[str, Any]:
    with connect() as db:
        user = get_user(db, payload.get("userId"))
        require_role(user, "admin", "supervisor", "super_admin")
        session = ensure_current_session(db)
        stamp = now_label()
        if status == "ACTIVE":
            fields = {
                "status": "ACTIVE",
                "opened_by": user["name"],
                "opened_on": stamp,
                "closed_by": None,
                "closed_on": None,
            }
            if audit_action == "Session Reopened":
                fields["reopened_by"] = user["name"]
                fields["reopened_on"] = stamp
        else:
            fields = {"status": "CLOSED", "closed_by": user["name"], "closed_on": stamp}
        assignments = ", ".join(f"{key} = ?" for key in fields)
        db.execute(f"UPDATE sessions SET {assignments} WHERE id = ?", (*fields.values(), session["id"]))
        db.execute("INSERT INTO audit (action, actor, created_at) VALUES (?, ?, ?)", (audit_action, user["name"], stamp))
        db.execute("INSERT INTO notifications (message, created_at) VALUES (?, ?)", (message, stamp))
    return bootstrap(payload.get("userId"))


def body_composition_values(data: dict[str, Any], member: Any) -> dict[str, Any]:
    def required_number(key: str, label: str) -> float:
        raw = data.get(key)
        if raw is None or str(raw).strip() == "":
            raise ValueError(f"{label} is required.")
        value = float(raw)
        if value < 0:
            raise ValueError(f"{label} cannot be negative.")
        return value

    gender = str(data.get("gender") or member["gender"] or "").strip().lower()
    if gender not in {"male", "female"}:
        raise ValueError("Gender must be Male or Female for body composition calculations.")

    weight = required_number("weight", "Weight")
    height = required_number("height", "Height")
    body_fat = required_number("bodyFat", "Body Fat")
    visceral_fat = required_number("visceralFat", "Visceral Fat")
    if weight <= 0 or height <= 0:
        raise ValueError("Weight and height must be greater than zero.")
    if body_fat > 100:
        raise ValueError("Body Fat cannot exceed 100%.")

    raw_muscle_percent = data.get("musclePercent")
    legacy_muscle_mass = data.get("muscleMass")
    muscle_is_estimated = raw_muscle_percent is None or str(raw_muscle_percent).strip() == ""
    legacy_scan = False
    if not muscle_is_estimated:
        muscle_percent = float(raw_muscle_percent)
        if muscle_percent < 0 or muscle_percent > 100:
            raise ValueError("Muscle Percentage must be between 0 and 100.")
        muscle_mass = weight * muscle_percent / 100
    elif legacy_muscle_mass is not None and str(legacy_muscle_mass).strip() != "":
        muscle_mass = float(legacy_muscle_mass)
        muscle_percent = muscle_mass / weight * 100
        muscle_is_estimated = False
        legacy_scan = True
    else:
        muscle_percent = 50.0 if gender == "male" else 40.0
        muscle_mass = weight * muscle_percent / 100

    fat_mass = weight * body_fat / 100
    lean_body_mass = weight - fat_mass
    ideal_weight = height - (100 if gender == "male" else 105)
    healthy_weight_min = ideal_weight - 2
    healthy_weight_max = ideal_weight + 2
    if healthy_weight_min <= weight <= healthy_weight_max:
        weight_difference = 0.0
        weight_status = "Within Healthy Range"
    elif weight > ideal_weight:
        weight_difference = weight - ideal_weight
        weight_status = f"Need to Lose {round(weight_difference, 1):.1f} kg"
    else:
        weight_difference = ideal_weight - weight
        weight_status = f"Need to Gain {round(weight_difference, 1):.1f} kg"

    if gender == "male":
        body_fat_category = "Athlete" if body_fat < 14 else "Fitness" if body_fat < 18 else "Normal" if body_fat < 25 else "Overweight" if body_fat < 30 else "Obese"
        estimated_range = "45-55%"
    else:
        body_fat_category = "Athlete" if body_fat < 21 else "Fitness" if body_fat < 25 else "Normal" if body_fat < 32 else "Overweight" if body_fat < 40 else "Obese"
        estimated_range = "35-45%"
    visceral_fat_status = "Normal" if visceral_fat < 10 else "High" if visceral_fat < 15 else "Very High"

    rounded = lambda value: round(float(value), 1)
    scan_values = {
        "gender": gender.title(),
        "age": int(data["age"]) if str(data.get("age", "")).strip() else member["age"],
        "height_cm": rounded(height),
        "weight_kg": rounded(weight),
        "body_fat_percent": rounded(body_fat),
        "muscle_percent": None if muscle_is_estimated or legacy_scan else rounded(muscle_percent),
        "muscle_mass_kg": rounded(muscle_mass) if legacy_scan else None,
        "visceral_fat": rounded(visceral_fat),
        "bmr": rounded(float(data.get("bmr") or 0)),
    }
    calculated_values = {
        "fat_mass_kg": rounded(fat_mass),
        "lean_body_mass_kg": rounded(lean_body_mass),
        "muscle_mass_kg": rounded(muscle_mass),
        "ideal_weight_kg": rounded(ideal_weight),
        "healthy_weight_min_kg": rounded(healthy_weight_min),
        "healthy_weight_max_kg": rounded(healthy_weight_max),
        "weight_difference_kg": rounded(weight_difference),
        "weight_status": weight_status,
        "body_fat_category": body_fat_category,
        "visceral_fat_status": visceral_fat_status,
    }
    estimated_values = {
        "muscle_percent": rounded(muscle_percent),
        "recommended_range": estimated_range,
        "is_estimated": True,
        "display_label": "Approximate value",
    } if muscle_is_estimated else {}
    return {
        "weight": rounded(weight),
        "height": rounded(height),
        "body_fat": rounded(body_fat),
        "visceral_fat": rounded(visceral_fat),
        "muscle_percent": rounded(muscle_percent),
        "muscle_mass": rounded(muscle_mass),
        "fat_mass": rounded(fat_mass),
        "lean_body_mass": rounded(lean_body_mass),
        "ideal_weight": rounded(ideal_weight),
        "healthy_weight_min": rounded(healthy_weight_min),
        "healthy_weight_max": rounded(healthy_weight_max),
        "weight_difference": rounded(weight_difference),
        "weight_status": weight_status,
        "body_fat_category": body_fat_category,
        "visceral_fat_status": visceral_fat_status,
        "muscle_is_estimated": 1 if muscle_is_estimated else 0,
        "calculation_source": "ESTIMATED" if muscle_is_estimated else "CALCULATED",
        "scan_values": json.dumps(scan_values, separators=(",", ":")),
        "calculated_values": json.dumps(calculated_values, separators=(",", ":")),
        "estimated_values": json.dumps(estimated_values, separators=(",", ":")),
    }


def backfill_body_composition(db: DbConnection) -> None:
    rows = rows_to_list(
        db.execute(
            """
            SELECT measurements.*, members.gender, members.age
            FROM measurements
            JOIN members ON members.id = measurements.member_id
            WHERE calculated_values IS NULL OR calculated_values = '' OR calculated_values = '{}'
            """
        ).fetchall()
    )
    for row in rows:
        try:
            composition = body_composition_values(
                {
                    "gender": row.get("gender"),
                    "age": row.get("age"),
                    "height": row.get("height"),
                    "weight": row.get("weight"),
                    "bodyFat": row.get("body_fat"),
                    "muscleMass": row.get("muscle_mass"),
                    "visceralFat": row.get("visceral_fat"),
                    "bmr": row.get("bmr"),
                },
                row,
            )
        except (TypeError, ValueError):
            continue
        db.execute(
            """
            UPDATE measurements SET
              muscle_percent=?, fat_mass=?, lean_body_mass=?, ideal_weight=?,
              healthy_weight_min=?, healthy_weight_max=?, weight_difference=?, weight_status=?,
              body_fat_category=?, visceral_fat_status=?, muscle_is_estimated=?, calculation_source=?,
              scan_values=?, calculated_values=?, estimated_values=?
            WHERE id=?
            """,
            (
                composition["muscle_percent"], composition["fat_mass"], composition["lean_body_mass"],
                composition["ideal_weight"], composition["healthy_weight_min"], composition["healthy_weight_max"],
                composition["weight_difference"], composition["weight_status"], composition["body_fat_category"],
                composition["visceral_fat_status"], composition["muscle_is_estimated"],
                composition["calculation_source"], composition["scan_values"], composition["calculated_values"],
                composition["estimated_values"], row["id"],
            ),
        )


def save_measurement(payload: dict[str, Any]) -> dict[str, Any]:
    with connect() as db:
        user = get_user(db, payload.get("userId"))
        require_role(user, "admin", "supervisor")
        session = ensure_current_session(db)
        if session["status"] != "ACTIVE":
            raise ValueError("Measurement session has not been opened by the Admin for this week.")

        data = payload.get("measurement", {})
        member_id = int(data.get("memberId") or 0)
        member = db.execute("SELECT * FROM members WHERE id = ?", (member_id,)).fetchone() if member_id else None
        if not member:
            member = create_or_select_member(db, user, data)
        if not member:
            raise ValueError("Member not found.")
        if user["role"] not in {"admin", "super_admin"} and member["nutrition_club"] != current_club(user):
            raise PermissionError("You can only add measurements for members in your nutrition club.")

        composition = body_composition_values(data, member)
        height = composition["height"]
        weight = composition["weight"]
        bmi = float(data.get("bmi") or 0)
        measurement_id = data.get("measurementId") or f"MEAS-{int(datetime.now().timestamp() * 1000)}"
        existing = db.execute("SELECT * FROM measurements WHERE id = ?", (measurement_id,)).fetchone()
        stamp = now_label()
        measurement_date = str(data.get("measurementDate") or datetime.now().date().isoformat())[:10]
        week_number = week_for_date(measurement_date)
        values = {
            "id": measurement_id,
            "member_id": member["id"],
            "member_name": member["name"],
            "week_number": week_number,
            "session_id": session["id"],
            "supervisor_id": existing["supervisor_id"] if existing else user["id"],
            "measurement_date": measurement_date,
            "weight": weight,
            "body_fat": composition["body_fat"],
            "muscle_mass": composition["muscle_mass"],
            "muscle_percent": composition["muscle_percent"],
            "visceral_fat": composition["visceral_fat"],
            "waist": float(data["waist"]),
            "hip": float(data["hip"]),
            "chest": float(data["chest"]),
            "height": height,
            "bmi": bmi,
            "bma": float(data.get("bma") or 0),
            "bmr": float(data.get("bmr") or 0),
            "water": float(data["water"]),
            "legacy_metabolic_age": 0,
            "subcutaneous_fat": float(data.get("subcutaneousFat") or 0),
            "fat_mass": composition["fat_mass"],
            "lean_body_mass": composition["lean_body_mass"],
            "ideal_weight": composition["ideal_weight"],
            "healthy_weight_min": composition["healthy_weight_min"],
            "healthy_weight_max": composition["healthy_weight_max"],
            "weight_difference": composition["weight_difference"],
            "weight_status": composition["weight_status"],
            "body_fat_category": composition["body_fat_category"],
            "visceral_fat_status": composition["visceral_fat_status"],
            "muscle_is_estimated": composition["muscle_is_estimated"],
            "calculation_source": composition["calculation_source"],
            "scan_values": composition["scan_values"],
            "calculated_values": composition["calculated_values"],
            "estimated_values": composition["estimated_values"],
            "notes": data.get("notes", ""),
            "updated_by": user["name"] if existing else "",
            "updated_on": stamp if existing else "",
        }
        if existing:
            require_role(user, "admin", "supervisor", "super_admin")
            db.execute(
                """
                UPDATE measurements SET
                member_id=:member_id, member_name=:member_name, weight=:weight, body_fat=:body_fat,
                week_number=:week_number, measurement_date=:measurement_date,
                muscle_mass=:muscle_mass, muscle_percent=:muscle_percent, visceral_fat=:visceral_fat, waist=:waist, hip=:hip,
                chest=:chest, height=:height, bmi=:bmi, bma=:bma, bmr=:bmr, water=:water,
                subcutaneous_fat=:subcutaneous_fat, fat_mass=:fat_mass, lean_body_mass=:lean_body_mass,
                ideal_weight=:ideal_weight, healthy_weight_min=:healthy_weight_min, healthy_weight_max=:healthy_weight_max,
                weight_difference=:weight_difference, weight_status=:weight_status,
                body_fat_category=:body_fat_category, visceral_fat_status=:visceral_fat_status,
                muscle_is_estimated=:muscle_is_estimated, calculation_source=:calculation_source,
                scan_values=:scan_values, calculated_values=:calculated_values, estimated_values=:estimated_values,
                notes=:notes, updated_by=:updated_by, updated_on=:updated_on
                WHERE id=:id
                """,
                values,
            )
            action = f"Measurement Edited - {member['name']}"
        else:
            db.execute(
                """
                INSERT INTO measurements
                (id, member_id, member_name, week_number, session_id, supervisor_id, measurement_date,
                 weight, body_fat, muscle_mass, muscle_percent, visceral_fat, waist, hip, chest, height, bmi, bma, bmr, water,
                 metabolic_age, subcutaneous_fat, fat_mass, lean_body_mass, ideal_weight,
                 healthy_weight_min, healthy_weight_max, weight_difference, weight_status,
                 body_fat_category, visceral_fat_status, muscle_is_estimated, calculation_source,
                 scan_values, calculated_values, estimated_values, notes, updated_by, updated_on)
                VALUES
                 (:id, :member_id, :member_name, :week_number, :session_id, :supervisor_id, :measurement_date,
                 :weight, :body_fat, :muscle_mass, :muscle_percent, :visceral_fat, :waist, :hip, :chest, :height, :bmi, :bma, :bmr, :water,
                 :legacy_metabolic_age, :subcutaneous_fat, :fat_mass, :lean_body_mass, :ideal_weight,
                 :healthy_weight_min, :healthy_weight_max, :weight_difference, :weight_status,
                 :body_fat_category, :visceral_fat_status, :muscle_is_estimated, :calculation_source,
                 :scan_values, :calculated_values, :estimated_values, :notes, :updated_by, :updated_on)
                """,
                values,
            )
            action = f"Measurement Added - {member['name']}"
        db.execute("UPDATE members SET measured = 1, last_measured = 'Today' WHERE id = ?", (member["id"],))
        db.execute(
            "UPDATE members SET height = COALESCE(NULLIF(?, 0), height), gender = COALESCE(NULLIF(?, ''), gender), age = COALESCE(?, age), goal = COALESCE(NULLIF(?, ''), goal) WHERE id = ?",
            (
                height,
                str(data.get("gender", "")).strip(),
                int(data["age"]) if str(data.get("age", "")).strip() else None,
                str(data.get("goal", "")).strip(),
                member["id"],
            ),
        )
        db.execute("INSERT INTO audit (action, actor, created_at) VALUES (?, ?, ?)", (action, user["name"], stamp))
    return bootstrap(payload.get("userId"))


def attendance_rule(attendance_type: str, count_value: int) -> dict[str, Any]:
    neutral = {"STS", "Public Holiday", "Training Session", "Club Holiday"}
    eligible = {"Present", "Mega Club", "Lifestyle Day", "Family Day", "Override Attendance"}
    if attendance_type in neutral:
        return {"count": 0, "ranking": 0, "streak": 0, "neutral": 1}
    if attendance_type == "Absent":
        return {"count": 0, "ranking": 0, "streak": 0, "neutral": 0}
    if attendance_type in {"Lifestyle Day", "Family Day"}:
        return {"count": 2 if int(count_value) == 2 else 1, "ranking": 1, "streak": 1, "neutral": 0}
    if attendance_type in eligible:
        return {"count": 1, "ranking": 1, "streak": 1, "neutral": 0}
    raise ValueError("Invalid attendance type.")


def active_card_for(db: sqlite3.Connection, member_id: int) -> sqlite3.Row | None:
    return db.execute(
        "SELECT * FROM membership_cards WHERE member_id = ? AND status = 'Active' AND card_type <> 'Marathon' ORDER BY start_date, id LIMIT 1",
        (member_id,),
    ).fetchone()


def recalculate_member_cards(db: DbConnection, member_id: int, actor_name: str = "") -> list[dict[str, Any]]:
    cards = rows_to_list(
        db.execute(
            "SELECT * FROM membership_cards WHERE member_id = ? AND card_type <> 'Marathon' ORDER BY start_date, id",
            (member_id,),
        ).fetchall()
    )
    if not cards:
        return []
    db.execute(
        "UPDATE attendance SET card_id = NULL WHERE member_id = ? AND card_id IS NOT NULL",
        (member_id,),
    )
    usage = {
        int(card["id"]): {
            "completed": 0,
            "completion_date": None,
            "override_count": 0,
            "target": int(card["target_visits"]),
        }
        for card in cards
    }
    countable_rows = db.execute(
        """
        SELECT * FROM attendance
        WHERE member_id = ? AND count_value > 0
        ORDER BY attendance_date, id
        """,
        (member_id,),
    ).fetchall()
    for attendance in countable_rows:
        remaining_count = int(attendance["count_value"] or 0)
        assigned_card_id = None
        for card in cards:
            card_id = int(card["id"])
            capacity_left = usage[card_id]["target"] - usage[card_id]["completed"]
            if capacity_left <= 0:
                continue
            take = min(remaining_count, capacity_left)
            if take <= 0:
                continue
            usage[card_id]["completed"] += take
            assigned_card_id = card_id
            if attendance["attendance_type"] == "Override Attendance":
                usage[card_id]["override_count"] += 1
            if usage[card_id]["completed"] >= usage[card_id]["target"]:
                usage[card_id]["completion_date"] = attendance["attendance_date"]
            remaining_count -= take
            if remaining_count <= 0:
                break
        db.execute("UPDATE attendance SET card_id = ? WHERE id = ?", (assigned_card_id, attendance["id"]))

    updated_cards: list[dict[str, Any]] = []
    stamp = now_label()
    for card in cards:
        card_id = int(card["id"])
        completed = usage[card_id]["completed"]
        target = usage[card_id]["target"]
        remaining = max(target - completed, 0)
        status = "Completed" if remaining == 0 else "Active"
        completion_date = usage[card_id]["completion_date"] if status == "Completed" else None
        days_taken = 0
        if completion_date:
            days_taken = (datetime.fromisoformat(str(completion_date)).date() - datetime.fromisoformat(card["start_date"]).date()).days + 1
        db.execute(
            """
            UPDATE membership_cards SET completed_visits = ?, remaining_visits = ?, status = ?,
            completion_date = ?, days_taken = ?, override_count = ?, updated_by = ?, updated_date = ?
            WHERE id = ?
            """,
            (completed, remaining, status, completion_date, days_taken, usage[card_id]["override_count"], actor_name, stamp, card_id),
        )
        updated_cards.append(row_to_dict(db.execute("SELECT * FROM membership_cards WHERE id = ?", (card_id,)).fetchone()) or {})
    return updated_cards


def reconcile_all_card_usage(db: DbConnection) -> None:
    member_ids = db.execute("SELECT DISTINCT member_id FROM membership_cards ORDER BY member_id").fetchall()
    for row in member_ids:
        recalculate_member_cards(db, int(row["member_id"]), "System Reconciliation")


def recalculate_card_usage(db: DbConnection, card_id: int | None, actor_name: str = "") -> sqlite3.Row | None:
    if not card_id:
        return None
    card = db.execute("SELECT * FROM membership_cards WHERE id = ?", (card_id,)).fetchone()
    if not card:
        return None
    recalculate_member_cards(db, int(card["member_id"]), actor_name)
    return db.execute("SELECT * FROM membership_cards WHERE id = ?", (card_id,)).fetchone()


def save_attendance(payload: dict[str, Any]) -> dict[str, Any]:
    with connect() as db:
        user = get_user(db, payload.get("userId"))
        require_role(user, "admin", "supervisor", "coach", "nc_organiser", "super_admin")
        data = payload.get("attendance", {})
        member_id = int(data.get("memberId") or 0)
        member = row_to_dict(db.execute("SELECT * FROM members WHERE id = ?", (member_id,)).fetchone())
        if not member:
            raise ValueError("Member not found.")
        if not can_access_member(user, member):
            raise PermissionError("You can only mark attendance for members you are assigned to.")

        attendance_type = data.get("attendanceType", "Present")
        attendance_date = data.get("attendanceDate") or datetime.now().date().isoformat()
        reason = data.get("reason", "").strip()
        guest_name = data.get("guestName", "").strip()
        if guest_name:
            guest_note = f"Guest: {guest_name}"
            reason = f"{reason} | {guest_note}" if reason else guest_note
        if attendance_type == "Override Attendance" and not reason:
            raise ValueError("Override Attendance requires a reason.")

        card = active_card_for(db, member_id)
        has_any_card = bool(
            db.execute(
                "SELECT id FROM membership_cards WHERE member_id = ? AND card_type <> 'Marathon' LIMIT 1",
                (member_id,),
            ).fetchone()
        )
        if not has_any_card and attendance_type not in {"STS", "Public Holiday", "Training Session", "Club Holiday", "Absent"}:
            raise ValueError("No active membership card found for this member.")
        if attendance_type == "Override Attendance" and card and int(card["override_count"]) >= 3:
            raise ValueError("Maximum 3 overrides are allowed per card.")

        existing = db.execute(
            "SELECT * FROM attendance WHERE member_id = ? AND attendance_date = ?",
            (member_id, attendance_date),
        ).fetchone()
        if existing and user["role"] not in {"admin", "supervisor", "super_admin"}:
            raise ValueError("Attendance already exists for this member today. An authorized user must confirm the update.")
        if existing and not data.get("confirmUpdate"):
            raise ValueError("Duplicate attendance found. Confirm the update before replacing it.")

        rule = attendance_rule(attendance_type, int(data.get("countValue") or 1))
        stamp = now_label()
        club = card["club"] if card else member["nutrition_club"] or "Main Nutrition Club"

        if existing:
            updated_count = int(existing["count_value"] or 0) + rule["count"] if guest_name else rule["count"]
            if guest_name:
                existing_reason = str(existing["reason"] or "").strip()
                guest_reason = f"Guest: {guest_name}"
                combined_reason = f"{existing_reason} | {guest_reason}" if existing_reason else guest_reason
                db.execute(
                    """
                    UPDATE attendance SET count_value = ?, reason = ?, updated_by = ?, updated_on = ?
                    WHERE id = ?
                    """,
                    (updated_count, combined_reason, user["name"], stamp, existing["id"]),
                )
            else:
                db.execute(
                    """
                    UPDATE attendance SET card_id = ?, club = ?, attendance_type = ?, count_value = ?,
                    ranking_eligible = ?, streak_eligible = ?, neutral_day = ?, reason = ?,
                    updated_by = ?, updated_on = ?
                    WHERE id = ?
                    """,
                    (
                        existing["card_id"],
                        club,
                        attendance_type,
                        updated_count,
                        rule["ranking"],
                        rule["streak"],
                        rule["neutral"],
                        reason,
                        user["name"],
                        stamp,
                        existing["id"],
                    ),
                )
            attendance_id = existing["id"]
            audit_action = f"Attendance Updated - {member['name']}"
        else:
            cursor = db.execute(
                """
                INSERT INTO attendance
                (member_id, member_name, club, card_id, attendance_date, attendance_type, count_value,
                 ranking_eligible, streak_eligible, neutral_day, reason, marked_by, marked_on)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    member["id"],
                    member["name"],
                    club,
                    None,
                    attendance_date,
                    attendance_type,
                    rule["count"],
                    rule["ranking"],
                    rule["streak"],
                    rule["neutral"],
                    reason,
                    user["name"],
                    stamp,
                ),
            )
            attendance_id = cursor.lastrowid
            audit_action = f"{'Override Added' if attendance_type == 'Override Attendance' else 'Attendance Added'} - {member['name']}"

        completed_before = {
            int(row["id"]): row["status"]
            for row in db.execute("SELECT id, status FROM membership_cards WHERE member_id = ?", (member_id,)).fetchall()
        }
        updated_cards = recalculate_member_cards(db, member_id, user["name"])
        for updated_card in updated_cards:
            if updated_card["status"] == "Completed" and completed_before.get(int(updated_card["id"])) != "Completed":
                db.execute("INSERT INTO audit (action, actor, created_at) VALUES (?, ?, ?)", (f"Card Completed - {member['name']} {updated_card['card_number']}", user["name"], stamp))

        amount = float(data.get("paymentAmount") or 0)
        if amount > 0:
            attendance_card_id = first_value(
                db.execute("SELECT card_id FROM attendance WHERE id = ?", (attendance_id,)).fetchone()
            )
            db.execute(
                """
                INSERT INTO payments
                (member_id, member_name, club, attendance_id, card_id, payment_date, amount, payment_mode, notes,
                 created_by, created_by_user_id, created_date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    member["id"],
                    member["name"],
                    club,
                    attendance_id,
                    attendance_card_id,
                    attendance_date,
                    amount,
                    data.get("paymentMode") or "Cash",
                    data.get("paymentNotes", ""),
                    user["name"],
                    user["id"],
                    stamp,
                ),
            )
            db.execute("INSERT INTO audit (action, actor, created_at) VALUES (?, ?, ?)", (f"Payment Added - {member['name']} {amount:.2f}", user["name"], stamp))

        db.execute("INSERT INTO audit (action, actor, created_at) VALUES (?, ?, ?)", (audit_action, user["name"], stamp))
        for row in db.execute("SELECT * FROM membership_cards WHERE status = 'Active' AND remaining_visits BETWEEN 1 AND 3").fetchall():
            db.execute(
                "INSERT INTO notifications (message, created_at) VALUES (?, ?)",
                (f"{row['member_name']} has {row['remaining_visits']} visits remaining on {row['card_number']}.", stamp),
            )
    return bootstrap(payload.get("userId"))


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, format: str, *args: Any) -> None:
        return

    def session_token(self) -> str | None:
        cookie_header = self.headers.get("Cookie", "")
        if not cookie_header:
            return None
        prefix = f"{AUTH_SESSION_COOKIE}="
        for part in cookie_header.split(";"):
            part = part.strip()
            if part.startswith(prefix):
                return part[len(prefix) :]
        return None

    def is_request_secure(self) -> bool:
        if os.environ.get("HTTPS", "").strip().lower() in {"1", "true", "yes", "on"}:
            return True
        proto = self.headers.get("X-Forwarded-Proto", "").strip().lower()
        if proto == "https":
            return True
        ssl = self.headers.get("X-Forwarded-Ssl", "").strip().lower()
        if ssl == "on":
            return True
        return False

    def session_cookie_value(self, token: str) -> str:
        parts = [
            f"{AUTH_SESSION_COOKIE}={token}",
            "Path=/",
            "HttpOnly",
            "SameSite=Strict",
            f"Max-Age={AUTH_SESSION_DAYS * 86400}",
        ]
        if self.is_request_secure():
            parts.append("Secure")
        return "; ".join(parts)

    def clear_session_cookie_value(self) -> str:
        parts = [
            f"{AUTH_SESSION_COOKIE}=",
            "Path=/",
            "HttpOnly",
            "SameSite=Strict",
            "Max-Age=0",
        ]
        if self.is_request_secure():
            parts.append("Secure")
        return "; ".join(parts)

    def authenticated_user_id(self, *, required: bool = True) -> str | None:
        return resolve_authenticated_user_id(self.session_token(), required=required)

    def send_json(
        self,
        data: dict[str, Any],
        status: int = 200,
        *,
        set_cookie: str | None = None,
        clear_session: bool = False,
    ) -> None:
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        if set_cookie:
            self.send_header("Set-Cookie", set_cookie)
        if clear_session:
            self.send_header("Set-Cookie", self.clear_session_cookie_value())
        self.end_headers()
        self.wfile.write(body)

    def send_file(self, body: bytes, filename: str, content_type: str) -> None:
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def read_json(self) -> dict[str, Any]:
        length = int(self.headers.get("Content-Length", "0"))
        if not length:
            return {}
        return json.loads(self.rfile.read(length).decode("utf-8"))

    def do_GET(self) -> None:
        try:
            parsed = urlparse(self.path)
            if parsed.path == "/api/bootstrap":
                user_id = self.authenticated_user_id(required=False)
                params = parse_qs(parsed.query)
                self.send_json(bootstrap(user_id, (params.get("view", ["personal"])[0] or "personal")))
                return
            if parsed.path == "/api/dashboard":
                params = parse_qs(parsed.query)
                user_id = self.authenticated_user_id()
                self.send_json(dashboard_data(user_id, params))
                return
            if parsed.path == "/api/member-report":
                params = parse_qs(parsed.query)
                user_id = self.authenticated_user_id()
                self.send_json(member_report_data(user_id, params))
                return
            if parsed.path == "/api/audit":
                params = parse_qs(parsed.query)
                user_id = self.authenticated_user_id()
                self.send_json(audit_entries(user_id, params))
                return
            if parsed.path == "/api/payments":
                params = parse_qs(parsed.query)
                user_id = self.authenticated_user_id()
                self.send_json(payment_entries(user_id, params))
                return
            if parsed.path == "/api/member-attendance":
                params = parse_qs(parsed.query)
                user_id = self.authenticated_user_id()
                self.send_json(member_attendance_entries(user_id, params))
                return
            if parsed.path == "/api/marathon":
                user_id = self.authenticated_user_id()
                self.send_json(marathon_data(user_id))
                return
            if parsed.path == "/api/export":
                user_id = self.authenticated_user_id()
                body, filename = export_backup(user_id)
                self.send_file(
                    body,
                    filename,
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                )
                return
            if parsed.path == "/api/weekly-review":
                params = parse_qs(parsed.query)
                user_id = self.authenticated_user_id()
                self.send_json(weekly_review_entries(user_id, params))
                return
            if parsed.path == "/api/dmo/leads":
                params = parse_qs(parsed.query)
                user_id = self.authenticated_user_id()
                self.send_json(dmo_leads(user_id, params))
                return
            if parsed.path == "/health":
                self.send_json({"ok": True, "database": database_dialect(), "database_url": "DATABASE_URL" if DATABASE_URL else str(DB_PATH)})
                return
            # Serve static JS files with no-cache so module updates reach the browser
            if parsed.path.endswith(".js"):
                file_path = ROOT / parsed.path.lstrip("/")
                if file_path.exists():
                    content = file_path.read_bytes()
                    self.send_response(200)
                    self.send_header("Content-Type", "application/javascript")
                    self.send_header("Cache-Control", "no-store")
                    self.send_header("Content-Length", str(len(content)))
                    self.end_headers()
                    self.wfile.write(content)
                    return
            super().do_GET()
        except AuthenticationError as exc:
            self.send_json({"error": str(exc)}, 401)
        except PermissionError as exc:
            self.send_json({"error": str(exc)}, 403)
        except Exception as exc:
            self.send_json({"error": str(exc)}, 400)

    def do_POST(self) -> None:
        try:
            payload = self.read_json()
            parsed = urlparse(self.path)
            if parsed.path == "/api/login":
                username = payload.get("username", "").strip().lower()
                password = payload.get("password", "")
                with connect() as db:
                    user = db.execute(
                        "SELECT id, username, name, role, member_id, password FROM users WHERE username = ?",
                        (username,),
                    ).fetchone()
                    if not user or not verify_password(password, user["password"]):
                        self.send_json({"error": "Invalid credentials."}, 401)
                        return
                    if not is_password_hashed(user["password"]):
                        db.execute(
                            "UPDATE users SET password = ? WHERE id = ?",
                            (hash_password(password), user["id"]),
                        )
                    token = create_auth_session(db, user["id"])
                self.send_json(bootstrap(user["id"]), set_cookie=self.session_cookie_value(token))
                return
            if parsed.path == "/api/logout":
                token = self.session_token()
                with connect() as db:
                    if token:
                        delete_auth_session(db, token)
                self.send_json({"ok": True}, clear_session=True)
                return

            user_id = self.authenticated_user_id()
            payload["userId"] = user_id

            if parsed.path == "/api/session/start":
                self.send_json(session_action(payload, "ACTIVE", "Weekly Measurement Session is now open. You may begin recording member measurements.", "Session Created"))
                return
            if parsed.path == "/api/session/close":
                self.send_json(session_action(payload, "CLOSED", "Weekly Measurement Session has been closed. New measurement entries are no longer allowed.", "Session Closed"))
                return
            if parsed.path == "/api/session/reopen":
                self.send_json(session_action(payload, "ACTIVE", "Weekly Measurement Session has been reopened for corrections.", "Session Reopened"))
                return
            if parsed.path == "/api/measurements":
                self.send_json(save_measurement(payload))
                return
            if parsed.path == "/api/members":
                self.send_json(save_member(payload))
                return
            if parsed.path == "/api/members/update":
                self.send_json(update_member(payload))
                return
            if parsed.path == "/api/members/status":
                self.send_json(update_member_status(payload))
                return
            if parsed.path == "/api/card-payment":
                self.send_json(save_card_payment(payload))
                return
            if parsed.path == "/api/marathon/reset":
                self.send_json(reset_marathon(payload))
                return
            if parsed.path == "/api/users":
                self.send_json(save_user(payload))
                return
            if parsed.path == "/api/users/delete":
                self.send_json(delete_user(payload))
                return
            if parsed.path == "/api/dmo/leads":
                self.send_json(save_lead(payload))
                return
            if parsed.path == "/api/dmo/leads/followup":
                self.send_json(update_lead_followup(payload))
                return
            if parsed.path == "/api/attendance":
                self.send_json(save_attendance(payload))
                return
            self.send_json({"error": "Route not found."}, 404)
        except AuthenticationError as exc:
            self.send_json({"error": str(exc)}, 401)
        except PermissionError as exc:
            self.send_json({"error": str(exc)}, 403)
        except Exception as exc:
            self.send_json({"error": str(exc)}, 400)


if __name__ == "__main__":
    init_db()
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"HealthRank Pro running on {HOST}:{PORT}")
    print(f"Database: {database_dialect()} ({'DATABASE_URL' if DATABASE_URL else DB_PATH})")
    server.serve_forever()
