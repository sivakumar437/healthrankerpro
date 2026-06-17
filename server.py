from __future__ import annotations

import json
import os
import sqlite3
import tempfile
from datetime import datetime, timedelta
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlparse


ROOT = Path(__file__).resolve().parent
DB_PATH = Path(os.environ.get("HEALTHRANK_DB", Path(tempfile.gettempdir()) / "healthrank-pro" / "app.db"))
HOST = os.environ.get("HOST", "0.0.0.0")
PORT = int(os.environ.get("PORT", "4173"))


def now_label() -> str:
    return datetime.now().strftime("%d %b %Y %H:%M")


def current_week() -> str:
    today = datetime.now().date()
    iso_year, iso_week, _ = today.isocalendar()
    return f"{iso_year}-W{iso_week:02d}"


def current_saturday() -> str:
    today = datetime.now().date()
    saturday = today + timedelta(days=(5 - today.weekday()) % 7)
    return saturday.isoformat()


def connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys = ON")
    db.execute("PRAGMA journal_mode = DELETE")
    db.execute("PRAGMA synchronous = NORMAL")
    return db


def row_to_dict(row: sqlite3.Row | None) -> dict[str, Any] | None:
    return dict(row) if row else None


def rows_to_list(rows: list[sqlite3.Row]) -> list[dict[str, Any]]:
    return [dict(row) for row in rows]


def init_db() -> None:
    with connect() as db:
        db.executescript(
            """
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
              supervisor_id TEXT NOT NULL
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
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              action TEXT NOT NULL,
              actor TEXT NOT NULL,
              created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS notifications (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              message TEXT NOT NULL,
              created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS membership_cards (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
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
              id INTEGER PRIMARY KEY AUTOINCREMENT,
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
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              member_id INTEGER NOT NULL,
              member_name TEXT NOT NULL,
              club TEXT NOT NULL,
              attendance_id INTEGER,
              payment_date TEXT NOT NULL,
              amount REAL NOT NULL,
              payment_mode TEXT NOT NULL,
              notes TEXT,
              created_by TEXT NOT NULL,
              created_date TEXT NOT NULL,
              FOREIGN KEY(member_id) REFERENCES members(id)
            );
            """
        )
        migrate_schema(db)
        seed(db)
        seed_cards(db)
        ensure_current_session(db)


def migrate_schema(db: sqlite3.Connection) -> None:
    ensure_columns(
        db,
        "members",
        {
            "gender": "TEXT DEFAULT ''",
            "age": "INTEGER",
            "dob": "TEXT DEFAULT ''",
            "height": "REAL DEFAULT 0",
            "nutrition_club": "TEXT NOT NULL DEFAULT 'Main Nutrition Club'",
            "card_type": "TEXT DEFAULT 'Trial Card'",
            "notes": "TEXT DEFAULT ''",
        },
    )
    ensure_columns(
        db,
        "measurements",
        {
            "bmr": "REAL DEFAULT 0",
            "subcutaneous_fat": "REAL DEFAULT 0",
        },
    )


def ensure_columns(db: sqlite3.Connection, table: str, columns: dict[str, str]) -> None:
    existing = {row["name"] for row in db.execute(f"PRAGMA table_info({table})").fetchall()}
    for name, definition in columns.items():
        if name not in existing:
            db.execute(f"ALTER TABLE {table} ADD COLUMN {name} {definition}")


def seed(db: sqlite3.Connection) -> None:
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

    members = [
        (1, "Aarav Mehta", "+91 98765 43210", "Weight Loss", 94.2, 1, 1, 1, "Today", "u-supervisor"),
        (2, "Priya Nair", "+91 99887 77665", "Health & Fitness", 88.7, 2, 1, 0, "Yesterday", "u-supervisor"),
        (3, "Rohan Iyer", "+91 91234 56780", "Weight Gain", 81.9, 3, 0, 1, "8 days ago", "u-supervisor"),
        (4, "Sneha Rao", "+91 90000 11122", "Weight Loss", 78.4, 4, 0, 0, "10 days ago", "u-supervisor"),
        (5, "Vikram Shah", "+91 95555 88990", "Health & Fitness", 72.6, 5, 1, 0, "Today", "u-supervisor"),
        (6, "Meera Kapoor", "+91 94444 22233", "Weight Gain", 69.1, 6, 0, 1, "14 days ago", "u-supervisor"),
    ]
    db.executemany(
        """
        INSERT OR IGNORE INTO members
        (id, name, phone, goal, score, rank, measured, marathon, last_measured, supervisor_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        members,
    )


def seed_cards(db: sqlite3.Connection) -> None:
    if db.execute("SELECT COUNT(*) FROM membership_cards").fetchone()[0]:
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
    elif user["role"] == "super_admin":
        rows = db.execute("SELECT * FROM members ORDER BY rank").fetchall()
    else:
        rows = db.execute("SELECT * FROM members WHERE nutrition_club = ? ORDER BY rank", (current_club(user),)).fetchall()
    return rows_to_list(rows)


def scoped_measurements(db: sqlite3.Connection, user: dict[str, Any]) -> list[dict[str, Any]]:
    params: tuple[Any, ...]
    if user["role"] == "member":
        sql = "SELECT * FROM measurements WHERE member_id = ? ORDER BY measurement_date DESC"
        params = (user["member_id"],)
    elif user["role"] == "supervisor":
        sql = "SELECT * FROM measurements WHERE supervisor_id = ? ORDER BY measurement_date DESC"
        params = (user["id"],)
    elif user["role"] == "super_admin":
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
            ORDER BY c.status, c.remaining_visits, c.id DESC
            """,
            (user["id"],),
        ).fetchall()
    else:
        rows = db.execute("SELECT * FROM membership_cards ORDER BY status, remaining_visits, id DESC").fetchall()
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
        rows = db.execute("SELECT * FROM payments WHERE member_id = ? ORDER BY payment_date DESC, id DESC LIMIT 80", (user["member_id"],)).fetchall()
    elif user["role"] == "supervisor":
        rows = db.execute(
            """
            SELECT p.* FROM payments p
            JOIN members m ON m.id = p.member_id
            WHERE m.supervisor_id = ?
            ORDER BY p.payment_date DESC, p.id DESC LIMIT 80
            """,
            (user["id"],),
        ).fetchall()
    else:
        rows = db.execute("SELECT * FROM payments ORDER BY payment_date DESC, id DESC LIMIT 120").fetchall()
    return rows_to_list(rows)


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


def require_role(user: dict[str, Any] | None, *roles: str) -> None:
    if not user or user["role"] not in roles:
        raise PermissionError("You do not have access to perform this action.")


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
    return 30


def create_or_select_member(db: sqlite3.Connection, user: dict[str, Any], data: dict[str, Any]) -> sqlite3.Row:
    club = str(data.get("nutritionClub") or current_club(user)).strip() or current_club(user)
    phone = str(data.get("phone", "")).strip()
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

    new_id = int(db.execute("SELECT COALESCE(MAX(id), 0) + 1 FROM members").fetchone()[0])
    goal = str(data.get("goal", "")).strip() or "Health & Fitness"
    card_type = str(data.get("cardType", "")).strip() or "Trial Card"
    stamp = now_label()
    supervisor_id = user["id"] if user["role"] == "supervisor" else "u-supervisor"
    db.execute(
        """
        INSERT INTO members
        (id, name, phone, gender, age, dob, height, nutrition_club, card_type, notes,
         goal, score, rank, measured, marathon, last_measured, supervisor_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 0, 0, 'New', ?)
        """,
        (
            new_id,
            full_name,
            phone,
            str(data.get("gender", "")).strip(),
            int(data["age"]) if str(data.get("age", "")).strip() else None,
            str(data.get("dob", "")).strip(),
            float(data["height"]) if str(data.get("height", "")).strip() else 0,
            club,
            card_type,
            str(data.get("notes", "")).strip(),
            goal,
            new_id,
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
        if user["role"] != "super_admin" and member["nutrition_club"] != current_club(user):
            raise PermissionError("You can only add measurements for members in your nutrition club.")
        if user["role"] == "supervisor" and member["supervisor_id"] != user["id"]:
            raise PermissionError("Supervisor can only add measurements for assigned members.")

        height = float(data["height"])
        weight = float(data["weight"])
        bmi = round(weight / ((height / 100) ** 2), 1)
        measurement_id = data.get("measurementId") or f"MEAS-{int(datetime.now().timestamp() * 1000)}"
        existing = db.execute("SELECT * FROM measurements WHERE id = ?", (measurement_id,)).fetchone()
        stamp = now_label()
        values = {
            "id": measurement_id,
            "member_id": member["id"],
            "member_name": member["name"],
            "week_number": current_week(),
            "session_id": session["id"],
            "supervisor_id": existing["supervisor_id"] if existing else user["id"],
            "measurement_date": existing["measurement_date"] if existing else stamp,
            "weight": weight,
            "body_fat": float(data["bodyFat"]),
            "muscle_mass": float(data["muscleMass"]),
            "visceral_fat": float(data["visceralFat"]),
            "waist": float(data["waist"]),
            "hip": float(data["hip"]),
            "chest": float(data["chest"]),
            "height": height,
            "bmi": bmi,
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
                muscle_mass=:muscle_mass, visceral_fat=:visceral_fat, waist=:waist, hip=:hip,
                chest=:chest, height=:height, bmi=:bmi, bmr=:bmr, water=:water, metabolic_age=:metabolic_age,
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
                 weight, body_fat, muscle_mass, visceral_fat, waist, hip, chest, height, bmi, bmr, water,
                 metabolic_age, subcutaneous_fat, notes, updated_by, updated_on)
                VALUES
                (:id, :member_id, :member_name, :week_number, :session_id, :supervisor_id, :measurement_date,
                 :weight, :body_fat, :muscle_mass, :visceral_fat, :waist, :hip, :chest, :height, :bmi, :bmr, :water,
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
    return db.execute(
        "SELECT * FROM membership_cards WHERE member_id = ? AND status = 'Active' ORDER BY id DESC LIMIT 1",
        (member_id,),
    ).fetchone()


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
        if attendance_type == "Override Attendance" and not reason:
            raise ValueError("Override Attendance requires a reason.")

        card = active_card_for(db, member_id)
        if not card and attendance_type not in {"STS", "Public Holiday", "Training Session", "Club Holiday", "Absent"}:
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

        old_count = int(existing["count_value"]) if existing and int(existing["card_id"] or 0) == int(card["id"] if card else 0) else 0
        old_override = 1 if existing and existing["attendance_type"] == "Override Attendance" and int(existing["card_id"] or 0) == int(card["id"] if card else 0) else 0
        rule = attendance_rule(attendance_type, int(data.get("countValue") or 1))
        stamp = now_label()
        club = card["club"] if card else "Main Nutrition Club"

        if existing:
            db.execute(
                """
                UPDATE attendance SET card_id = ?, club = ?, attendance_type = ?, count_value = ?,
                ranking_eligible = ?, streak_eligible = ?, neutral_day = ?, reason = ?,
                updated_by = ?, updated_on = ?
                WHERE id = ?
                """,
                (
                    card["id"] if card else None,
                    club,
                    attendance_type,
                    rule["count"],
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
                    card["id"] if card else None,
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

        if card:
            completed = max(0, int(card["completed_visits"]) - old_count + int(rule["count"]))
            override_count = max(0, int(card["override_count"]) - old_override + (1 if attendance_type == "Override Attendance" else 0))
            status = "Completed" if completed >= int(card["target_visits"]) else "Active"
            completion_date = attendance_date if status == "Completed" and not card["completion_date"] else card["completion_date"]
            days_taken = (datetime.fromisoformat(completion_date).date() - datetime.fromisoformat(card["start_date"]).date()).days + 1 if completion_date else 0
            db.execute(
                """
                UPDATE membership_cards SET completed_visits = ?, remaining_visits = ?, status = ?,
                completion_date = ?, days_taken = ?, override_count = ?, updated_by = ?, updated_date = ?
                WHERE id = ?
                """,
                (
                    completed,
                    max(int(card["target_visits"]) - completed, 0),
                    status,
                    completion_date,
                    days_taken,
                    override_count,
                    user["name"],
                    stamp,
                    card["id"],
                ),
            )
            if status == "Completed":
                db.execute("INSERT INTO audit (action, actor, created_at) VALUES (?, ?, ?)", (f"Card Completed - {member['name']} {card['card_number']}", user["name"], stamp))

        amount = float(data.get("paymentAmount") or 0)
        if amount > 0:
            db.execute(
                """
                INSERT INTO payments
                (member_id, member_name, club, attendance_id, payment_date, amount, payment_mode, notes, created_by, created_date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    member["id"],
                    member["name"],
                    club,
                    attendance_id,
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
            if parsed.path == "/health":
                self.send_json({"ok": True, "database": str(DB_PATH.name)})
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
    print(f"SQLite database: {DB_PATH}")
    server.serve_forever()
