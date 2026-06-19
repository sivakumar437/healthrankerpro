from __future__ import annotations

import json
import os
import re
import sqlite3
import tempfile
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
              member_id INTEGER
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
              card_type TEXT DEFAULT 'Trial Card',
              notes TEXT DEFAULT '',
              goal TEXT NOT NULL,
              score REAL NOT NULL,
              rank INTEGER NOT NULL,
              measured INTEGER NOT NULL DEFAULT 0,
              marathon INTEGER NOT NULL DEFAULT 0,
              last_measured TEXT NOT NULL,
              supervisor_id TEXT NOT NULL,
              active INTEGER NOT NULL DEFAULT 1
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
              payment_mode TEXT NOT NULL,
              notes TEXT,
              created_by TEXT NOT NULL,
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
        if seed_demo_data_enabled():
            seed_cards(db)
        ensure_current_session(db)


def migrate_schema(db: DbConnection) -> None:
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
            "card_type": "TEXT DEFAULT 'Trial Card'",
            "notes": "TEXT DEFAULT ''",
            "active": "INTEGER NOT NULL DEFAULT 1",
        },
    )
    ensure_columns(
        db,
        "measurements",
        {
            "bma": "REAL DEFAULT 0",
            "bmr": "REAL DEFAULT 0",
            "subcutaneous_fat": "REAL DEFAULT 0",
        },
    )
    ensure_columns(
        db,
        "payments",
        {
            "card_id": "INTEGER",
        },
    )
    backfill_member_codes(db)


def ensure_columns(db: DbConnection, table: str, columns: dict[str, str]) -> None:
    existing = db.table_columns(table)
    for name, definition in columns.items():
        if name not in existing:
            db.execute(f"ALTER TABLE {table} ADD COLUMN {name} {definition}")


def create_indexes(db: DbConnection) -> None:
    db.executescript(
        """
        CREATE INDEX IF NOT EXISTS idx_members_member_code ON members(member_code);
        CREATE INDEX IF NOT EXISTS idx_members_club_phone ON members(nutrition_club, phone);
        CREATE INDEX IF NOT EXISTS idx_measurements_member_date ON measurements(member_id, measurement_date);
        CREATE INDEX IF NOT EXISTS idx_attendance_member_date ON attendance(member_id, attendance_date);
        CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(attendance_date);
        CREATE INDEX IF NOT EXISTS idx_payments_member_date ON payments(member_id, payment_date);
        CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
        """
    )


def generate_member_code(member_id: int) -> str:
    return f"HRP-{member_id:06d}"


def backfill_member_codes(db: DbConnection) -> None:
    rows = db.execute("SELECT id FROM members WHERE member_code IS NULL OR member_code = ''").fetchall()
    for row in rows:
        db.execute("UPDATE members SET member_code = ? WHERE id = ?", (generate_member_code(int(row["id"])), row["id"]))


def seed(db: DbConnection) -> None:
    users = [
        ("u-admin", "admin", "admin", "Admin User", "admin", None),
        ("u-supervisor", "supervisor", "supervisor", "Supervisor", "supervisor", None),
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
    return row_to_dict(db.execute("SELECT id, username, name, role, member_id FROM users WHERE id = ?", (user_id,)).fetchone())


def scoped_members(db: sqlite3.Connection, user: dict[str, Any]) -> list[dict[str, Any]]:
    if user["role"] == "member":
        rows = db.execute("SELECT * FROM members WHERE id = ?", (user["member_id"],)).fetchall()
    elif user["role"] == "supervisor":
        rows = db.execute("SELECT * FROM members WHERE supervisor_id = ? AND nutrition_club = ? ORDER BY rank", (user["id"], current_club(user))).fetchall()
    elif user["role"] in {"admin", "super_admin"}:
        rows = db.execute("SELECT * FROM members ORDER BY rank").fetchall()
    else:
        rows = db.execute("SELECT * FROM members WHERE nutrition_club = ? ORDER BY rank", (current_club(user),)).fetchall()
    return redact_member_phones(rows_to_list(rows), user)


def scoped_measurements(db: sqlite3.Connection, user: dict[str, Any]) -> list[dict[str, Any]]:
    params: tuple[Any, ...]
    if user["role"] == "member":
        sql = "SELECT * FROM measurements WHERE member_id = ? ORDER BY measurement_date DESC"
        params = (user["member_id"],)
    elif user["role"] == "supervisor":
        sql = "SELECT * FROM measurements WHERE supervisor_id = ? ORDER BY measurement_date DESC"
        params = (user["id"],)
    elif user["role"] in {"admin", "super_admin"}:
        sql = "SELECT * FROM measurements ORDER BY measurement_date DESC"
        params = ()
    else:
        sql = """
        SELECT measurements.* FROM measurements
        JOIN members ON members.id = measurements.member_id
        WHERE members.nutrition_club = ?
        ORDER BY measurement_date DESC
        """
        params = (current_club(user),)
    return rows_to_list(db.execute(sql, params).fetchall())


def scoped_cards(db: sqlite3.Connection, user: dict[str, Any]) -> list[dict[str, Any]]:
    if user["role"] == "member":
        rows = db.execute("SELECT * FROM membership_cards WHERE member_id = ? ORDER BY id DESC", (user["member_id"],)).fetchall()
    elif user["role"] == "supervisor":
        rows = db.execute(
            """
            SELECT c.* FROM membership_cards c
            JOIN members m ON m.id = c.member_id
            WHERE m.supervisor_id = ?
            ORDER BY CASE WHEN c.status = 'Active' THEN 0 ELSE 1 END, c.start_date, c.id
            """,
            (user["id"],),
        ).fetchall()
    else:
        rows = db.execute(
            "SELECT * FROM membership_cards ORDER BY CASE WHEN status = 'Active' THEN 0 ELSE 1 END, start_date, id"
        ).fetchall()
    return rows_to_list(rows)


def scoped_attendance(db: sqlite3.Connection, user: dict[str, Any]) -> list[dict[str, Any]]:
    if user["role"] == "member":
        rows = db.execute("SELECT * FROM attendance WHERE member_id = ? ORDER BY attendance_date DESC, id DESC LIMIT 80", (user["member_id"],)).fetchall()
    elif user["role"] == "supervisor":
        rows = db.execute(
            """
            SELECT a.* FROM attendance a
            JOIN members m ON m.id = a.member_id
            WHERE m.supervisor_id = ?
            ORDER BY a.attendance_date DESC, a.id DESC LIMIT 80
            """,
            (user["id"],),
        ).fetchall()
    else:
        rows = db.execute("SELECT * FROM attendance ORDER BY attendance_date DESC, id DESC LIMIT 120").fetchall()
    return rows_to_list(rows)


def scoped_payments(db: sqlite3.Connection, user: dict[str, Any]) -> list[dict[str, Any]]:
    if user["role"] == "member":
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
            (user["member_id"],),
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
            WHERE m.supervisor_id = ?
            ORDER BY p.payment_date DESC, p.id DESC LIMIT 80
            """,
            (user["id"],),
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


def payment_entries(user_id: str | None, params: dict[str, list[str]]) -> dict[str, Any]:
    with connect() as db:
        user = get_user(db, user_id)
        require_role(user, "admin", "super_admin")
        clauses: list[str] = []
        values: list[Any] = []

        member_id = (params.get("memberId", [""])[0] or "").strip()
        date_from = (params.get("from", [""])[0] or "").strip()
        date_to = (params.get("to", [""])[0] or "").strip()
        card_type = (params.get("cardType", [""])[0] or "").strip()

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
        limit = "" if clauses else "LIMIT 20"
        rows = db.execute(
            f"""
            SELECT p.*, COALESCE(c.card_type, ac.card_type, '') AS card_type,
                   COALESCE(c.card_number, ac.card_number, '') AS card_number
            FROM payments p
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


def bootstrap(user_id: str | None) -> dict[str, Any]:
    with connect() as db:
        session = ensure_current_session(db)
        user = get_user(db, user_id)
        users = rows_to_list(db.execute("SELECT id, username, name, role, member_id FROM users ORDER BY role, name").fetchall())
        audit = rows_to_list(db.execute("SELECT action, actor, created_at FROM audit ORDER BY id DESC LIMIT 30").fetchall())
        notifications = rows_to_list(db.execute("SELECT message, created_at FROM notifications ORDER BY id DESC LIMIT 30").fetchall())
        return {
            "user": user,
            "users": users,
            "members": scoped_members(db, user) if user else [],
            "measurements": scoped_measurements(db, user) if user else [],
            "cards": scoped_cards(db, user) if user else [],
            "attendance": scoped_attendance(db, user) if user else [],
            "payments": scoped_payments(db, user) if user else [],
            "session": session,
            "audit": audit,
            "notifications": notifications,
            "week": current_week(),
        }


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
            rows = rows_to_list(db.execute(f"SELECT * FROM {table}").fetchall())
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
    return "Main Nutrition Club"


def card_target(card_type: str) -> int:
    if card_type == "Complimentary Card":
        return 1
    if card_type == "Trial Card":
        return 3
    if card_type == "10 Days Card / NMS":
        return 10
    if card_type == "26 Days Card":
        return 26
    if card_type == "Marathon":
        return 30
    return 30


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
    card_type = str(data.get("cardType", "")).strip() or "Trial Card"
    marathon = bool_flag(data.get("marathon", 0))
    stamp = now_label()
    supervisor_id = user["id"] if user["role"] == "supervisor" else "u-supervisor"
    db.execute(
        """
        INSERT INTO members
        (id, member_code, name, phone, gender, age, dob, height, nutrition_club, card_type, notes,
         goal, score, rank, measured, marathon, last_measured, supervisor_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 0, ?, 'New', ?)
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
            card_type,
            str(data.get("notes", "")).strip(),
            goal,
            new_id,
            marathon,
            supervisor_id,
        ),
    )
    target = card_target(card_type)
    db.execute(
        """
        INSERT INTO membership_cards
        (member_id, member_name, club, card_number, card_type, start_date, target_visits,
         completed_visits, remaining_visits, created_by, created_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
        """,
        (new_id, full_name, club, f"NC-{new_id:03d}-{target}D", card_type, datetime.now().date().isoformat(), target, target, user["name"], stamp),
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
            "card_type": str(data.get("cardType", "")).strip() or "Trial Card",
            "goal": str(data.get("goal", "")).strip() or "Health & Fitness",
            "marathon": bool_flag(data.get("marathon", 0)),
            "notes": str(data.get("notes", "")).strip(),
        }
        db.execute(
            """
            UPDATE members SET
              name=:name, phone=:phone, gender=:gender, age=:age, dob=:dob, height=:height,
              nutrition_club=:nutrition_club, card_type=:card_type, goal=:goal, marathon=:marathon, notes=:notes
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
        require_role(user, "admin", "supervisor")
        data = payload.get("payment", {})
        member_id = int(data.get("memberId") or 0)
        member = db.execute("SELECT * FROM members WHERE id = ?", (member_id,)).fetchone()
        if not member:
            raise ValueError("Member not found.")

        card_type = str(data.get("cardType", "")).strip() or "Trial Card"
        amount = float(data.get("amount") or 0)
        if amount <= 0:
            raise ValueError("Payment amount must be greater than zero.")
        payment_mode = str(data.get("paymentMode", "")).strip() or "Cash"
        payment_date = str(data.get("paymentDate", "")).strip() or datetime.now().date().isoformat()
        notes = str(data.get("notes", "")).strip()
        stamp = now_label()
        club = member["nutrition_club"] or current_club(user)
        target = card_target(card_type)
        cursor = db.execute(
            """
            INSERT INTO membership_cards
            (member_id, member_name, club, card_number, card_type, start_date, target_visits,
             completed_visits, remaining_visits, created_by, created_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
            """,
            (
                member["id"],
                member["name"],
                club,
                f"NC-{member['id']:03d}-{target}D-{int(datetime.now().timestamp())}",
                card_type,
                payment_date,
                target,
                target,
                user["name"],
                stamp,
            ),
        )
        card_id = cursor.lastrowid
        db.execute("UPDATE members SET card_type = ? WHERE id = ?", (card_type, member["id"]))
        db.execute("INSERT INTO audit (action, actor, created_at) VALUES (?, ?, ?)", (f"Card Purchased - {member['name']} {card_type}", user["name"], stamp))
        payment_cursor = db.execute(
            """
            INSERT INTO payments
            (member_id, member_name, club, attendance_id, card_id, payment_date, amount, payment_mode, notes, created_by, created_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (member["id"], member["name"], club, None, card_id, payment_date, amount, payment_mode, notes, user["name"], stamp),
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
        db.execute("INSERT INTO audit (action, actor, created_at) VALUES (?, ?, ?)", (f"Payment Added - {member['name']} {amount:.2f} {card_type}", user["name"], stamp))
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
        if not username or not password or not name:
            raise ValueError("Username, display name, and password are required.")
        if role not in {"admin", "supervisor", "viewer", "member"}:
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
            "INSERT INTO users (id, username, password, name, role, member_id) VALUES (?, ?, ?, ?, ?, NULL)",
            (user_id, username, password, name, role),
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
        require_role(user, "admin")
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
        if user["role"] == "supervisor" and member["supervisor_id"] != user["id"]:
            raise PermissionError("Supervisor can only add measurements for assigned members.")

        height = float(data["height"])
        weight = float(data["weight"])
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
            "body_fat": float(data["bodyFat"]),
            "muscle_mass": float(data["muscleMass"]),
            "visceral_fat": float(data["visceralFat"]),
            "waist": float(data["waist"]),
            "hip": float(data["hip"]),
            "chest": float(data["chest"]),
            "height": height,
            "bmi": bmi,
            "bma": float(data.get("bma") or 0),
            "bmr": float(data.get("bmr") or 0),
            "water": float(data["water"]),
            "metabolic_age": int(data["metabolicAge"]),
            "subcutaneous_fat": float(data.get("subcutaneousFat") or 0),
            "notes": data.get("notes", ""),
            "updated_by": user["name"] if existing else "",
            "updated_on": stamp if existing else "",
        }
        if existing:
            require_role(user, "admin")
            db.execute(
                """
                UPDATE measurements SET
                member_id=:member_id, member_name=:member_name, weight=:weight, body_fat=:body_fat,
                week_number=:week_number, measurement_date=:measurement_date,
                muscle_mass=:muscle_mass, visceral_fat=:visceral_fat, waist=:waist, hip=:hip,
                chest=:chest, height=:height, bmi=:bmi, bma=:bma, bmr=:bmr, water=:water, metabolic_age=:metabolic_age,
                subcutaneous_fat=:subcutaneous_fat, notes=:notes, updated_by=:updated_by, updated_on=:updated_on
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
                 weight, body_fat, muscle_mass, visceral_fat, waist, hip, chest, height, bmi, bma, bmr, water,
                 metabolic_age, subcutaneous_fat, notes, updated_by, updated_on)
                VALUES
                 (:id, :member_id, :member_name, :week_number, :session_id, :supervisor_id, :measurement_date,
                 :weight, :body_fat, :muscle_mass, :visceral_fat, :waist, :hip, :chest, :height, :bmi, :bma, :bmr, :water,
                 :metabolic_age, :subcutaneous_fat, :notes, :updated_by, :updated_on)
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
    paid_card_ids = [
        row["card_id"]
        for row in db.execute("SELECT DISTINCT card_id FROM payments WHERE member_id = ? AND card_id IS NOT NULL", (member_id,)).fetchall()
    ]
    if paid_card_ids:
        placeholders = ", ".join("?" for _ in paid_card_ids)
        return db.execute(
            f"""
            SELECT * FROM membership_cards
            WHERE member_id = ? AND status = 'Active' AND id IN ({placeholders})
            ORDER BY start_date, id LIMIT 1
            """,
            (member_id, *paid_card_ids),
        ).fetchone()
    return db.execute(
        "SELECT * FROM membership_cards WHERE member_id = ? AND status = 'Active' ORDER BY start_date, id LIMIT 1",
        (member_id,),
    ).fetchone()


def recalculate_member_cards(db: DbConnection, member_id: int, actor_name: str = "") -> list[dict[str, Any]]:
    paid_card_ids = [
        row["card_id"]
        for row in db.execute("SELECT DISTINCT card_id FROM payments WHERE member_id = ? AND card_id IS NOT NULL", (member_id,)).fetchall()
    ]
    if paid_card_ids:
        placeholders = ", ".join("?" for _ in paid_card_ids)
        cards = rows_to_list(
            db.execute(
                f"SELECT * FROM membership_cards WHERE member_id = ? AND id IN ({placeholders}) ORDER BY start_date, id",
                (member_id, *paid_card_ids),
            ).fetchall()
        )
    else:
        cards = rows_to_list(
            db.execute(
                "SELECT * FROM membership_cards WHERE member_id = ? ORDER BY start_date, id",
                (member_id,),
            ).fetchall()
        )
    if not cards:
        return []
    eligible_ids = {int(card["id"]) for card in cards}
    db.execute(
        "UPDATE attendance SET card_id = NULL WHERE member_id = ? AND card_id IS NOT NULL",
        (member_id,),
    )
    if paid_card_ids:
        placeholders = ", ".join("?" for _ in paid_card_ids)
        db.execute(
            f"""
            UPDATE membership_cards SET completed_visits = 0, remaining_visits = target_visits,
            status = 'Active', completion_date = NULL, days_taken = 0, override_count = 0,
            updated_by = ?, updated_date = ?
            WHERE member_id = ? AND id NOT IN ({placeholders})
            """,
            (actor_name, now_label(), member_id, *paid_card_ids),
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
        require_role(user, "admin", "supervisor")
        data = payload.get("attendance", {})
        member_id = int(data.get("memberId") or 0)
        member = db.execute("SELECT * FROM members WHERE id = ?", (member_id,)).fetchone()
        if not member:
            raise ValueError("Member not found.")
        if user["role"] == "supervisor" and member["supervisor_id"] != user["id"]:
            raise PermissionError("Supervisor can only mark attendance for assigned members.")

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
        has_any_card = bool(db.execute("SELECT id FROM membership_cards WHERE member_id = ? LIMIT 1", (member_id,)).fetchone())
        if not has_any_card and attendance_type not in {"STS", "Public Holiday", "Training Session", "Club Holiday", "Absent"}:
            raise ValueError("No active membership card found for this member.")
        if attendance_type == "Override Attendance" and card and int(card["override_count"]) >= 3:
            raise ValueError("Maximum 3 overrides are allowed per card.")

        existing = db.execute(
            "SELECT * FROM attendance WHERE member_id = ? AND attendance_date = ?",
            (member_id, attendance_date),
        ).fetchone()
        if existing and user["role"] != "admin":
            raise ValueError("Attendance already exists for this member today. Ask Admin to confirm an update.")
        if existing and not data.get("confirmUpdate"):
            raise ValueError("Duplicate attendance found. Admin must confirm update before replacing it.")

        rule = attendance_rule(attendance_type, int(data.get("countValue") or 1))
        stamp = now_label()
        club = card["club"] if card else member["nutrition_club"] or "Main Nutrition Club"

        if existing:
            updated_count = int(existing["count_value"] or 0) + rule["count"] if guest_name else rule["count"]
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
            if updated_card.get("status") == "Completed" and completed_before.get(int(updated_card["id"])) != "Completed":
                db.execute("INSERT INTO audit (action, actor, created_at) VALUES (?, ?, ?)", (f"Card Completed - {member['name']} {updated_card['card_number']}", user["name"], stamp))

        amount = float(data.get("paymentAmount") or 0)
        if amount > 0:
            attendance_card_id = first_value(
                db.execute("SELECT card_id FROM attendance WHERE id = ?", (attendance_id,)).fetchone()
            )
            db.execute(
                """
                INSERT INTO payments
                (member_id, member_name, club, attendance_id, card_id, payment_date, amount, payment_mode, notes, created_by, created_date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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

    def send_json(self, data: dict[str, Any], status: int = 200) -> None:
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
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
                params = parse_qs(parsed.query)
                self.send_json(bootstrap(params.get("userId", [""])[0] or None))
                return
            if parsed.path == "/api/audit":
                params = parse_qs(parsed.query)
                self.send_json(audit_entries(params.get("userId", [""])[0] or None, params))
                return
            if parsed.path == "/api/payments":
                params = parse_qs(parsed.query)
                self.send_json(payment_entries(params.get("userId", [""])[0] or None, params))
                return
            if parsed.path == "/api/export":
                params = parse_qs(parsed.query)
                body, filename = export_backup(params.get("userId", [""])[0] or None)
                self.send_file(
                    body,
                    filename,
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                )
                return
            if parsed.path == "/health":
                self.send_json({"ok": True, "database": database_dialect(), "database_url": "DATABASE_URL" if DATABASE_URL else str(DB_PATH)})
                return
            super().do_GET()
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
                        "SELECT id, username, name, role, member_id FROM users WHERE username = ? AND password = ?",
                        (username, password),
                    ).fetchone()
                if not user:
                    self.send_json({"error": "Invalid credentials."}, 401)
                    return
                self.send_json(bootstrap(user["id"]))
                return
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
            if parsed.path == "/api/users":
                self.send_json(save_user(payload))
                return
            if parsed.path == "/api/users/delete":
                self.send_json(delete_user(payload))
                return
            if parsed.path == "/api/attendance":
                self.send_json(save_attendance(payload))
                return
            self.send_json({"error": "Route not found."}, 404)
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
