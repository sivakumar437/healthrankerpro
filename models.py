from __future__ import annotations

from sqlalchemy import Column, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True)
    username = Column(String, unique=True, nullable=False, index=True)
    password = Column(String, nullable=False)
    name = Column(String, nullable=False)
    role = Column(String, nullable=False)
    member_id = Column(Integer, ForeignKey("members.id"))


class Member(Base):
    __tablename__ = "members"

    id = Column(Integer, primary_key=True)
    member_code = Column(String, unique=True, index=True)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=False, index=True)
    gender = Column(String, default="")
    age = Column(Integer)
    dob = Column(String, default="")
    height = Column(Float, default=0)
    nutrition_club = Column(String, nullable=False, default="Main Nutrition Club", index=True)
    card_type = Column(String, default="Trial Card")
    notes = Column(Text, default="")
    goal = Column(String, nullable=False)
    score = Column(Float, nullable=False, default=0)
    rank = Column(Integer, nullable=False)
    measured = Column(Integer, nullable=False, default=0)
    marathon = Column(Integer, nullable=False, default=0)
    last_measured = Column(String, nullable=False)
    supervisor_id = Column(String, nullable=False, index=True)
    active = Column(Integer, nullable=False, default=1)


class Session(Base):
    __tablename__ = "sessions"

    id = Column(String, primary_key=True)
    week = Column(String, unique=True, nullable=False, index=True)
    status = Column(String, nullable=False)
    session_date = Column(String, nullable=False)
    opened_by = Column(String)
    opened_on = Column(String)
    closed_by = Column(String)
    closed_on = Column(String)
    reopened_by = Column(String)
    reopened_on = Column(String)


class Measurement(Base):
    __tablename__ = "measurements"

    id = Column(String, primary_key=True)
    member_id = Column(Integer, ForeignKey("members.id"), nullable=False, index=True)
    member_name = Column(String, nullable=False)
    week_number = Column(String, nullable=False)
    session_id = Column(String, ForeignKey("sessions.id"), nullable=False)
    supervisor_id = Column(String, nullable=False, index=True)
    measurement_date = Column(String, nullable=False, index=True)
    weight = Column(Float, nullable=False)
    body_fat = Column(Float, nullable=False)
    muscle_mass = Column(Float, nullable=False)
    visceral_fat = Column(Float, nullable=False)
    waist = Column(Float, nullable=False)
    hip = Column(Float, nullable=False)
    chest = Column(Float, nullable=False)
    height = Column(Float, nullable=False)
    bmi = Column(Float, nullable=False)
    bma = Column(Float, default=0)
    bmr = Column(Float, default=0)
    water = Column(Float, nullable=False)
    metabolic_age = Column(Integer, nullable=False)
    subcutaneous_fat = Column(Float, default=0)
    notes = Column(Text)
    updated_by = Column(String)
    updated_on = Column(String)


class MembershipCard(Base):
    __tablename__ = "membership_cards"

    id = Column(Integer, primary_key=True, autoincrement=True)
    member_id = Column(Integer, ForeignKey("members.id"), nullable=False, index=True)
    member_name = Column(String, nullable=False)
    club = Column(String, nullable=False, index=True)
    card_number = Column(String, nullable=False)
    card_type = Column(String, nullable=False, index=True)
    start_date = Column(String, nullable=False)
    completion_date = Column(String)
    days_taken = Column(Integer, default=0)
    target_visits = Column(Integer, nullable=False)
    completed_visits = Column(Integer, nullable=False, default=0)
    remaining_visits = Column(Integer, nullable=False)
    status = Column(String, nullable=False, default="Active", index=True)
    override_count = Column(Integer, nullable=False, default=0)
    created_by = Column(String, nullable=False)
    created_date = Column(String, nullable=False)
    updated_by = Column(String)
    updated_date = Column(String)


class Attendance(Base):
    __tablename__ = "attendance"
    __table_args__ = (UniqueConstraint("member_id", "attendance_date", name="uq_attendance_member_date"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    member_id = Column(Integer, ForeignKey("members.id"), nullable=False, index=True)
    member_name = Column(String, nullable=False)
    club = Column(String, nullable=False)
    card_id = Column(Integer, ForeignKey("membership_cards.id"))
    attendance_date = Column(String, nullable=False, index=True)
    attendance_type = Column(String, nullable=False)
    count_value = Column(Integer, nullable=False, default=0)
    ranking_eligible = Column(Integer, nullable=False, default=0)
    streak_eligible = Column(Integer, nullable=False, default=0)
    neutral_day = Column(Integer, nullable=False, default=0)
    reason = Column(Text)
    marked_by = Column(String, nullable=False)
    marked_on = Column(String, nullable=False)
    updated_by = Column(String)
    updated_on = Column(String)


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    member_id = Column(Integer, ForeignKey("members.id"), nullable=False, index=True)
    member_name = Column(String, nullable=False)
    club = Column(String, nullable=False)
    attendance_id = Column(Integer, ForeignKey("attendance.id"))
    card_id = Column(Integer, ForeignKey("membership_cards.id"))
    payment_date = Column(String, nullable=False, index=True)
    amount = Column(Float, nullable=False)
    payment_mode = Column(String, nullable=False)
    notes = Column(Text)
    created_by = Column(String, nullable=False)
    created_date = Column(String, nullable=False)


class Audit(Base):
    __tablename__ = "audit"

    id = Column(Integer, primary_key=True, autoincrement=True)
    action = Column(String, nullable=False)
    actor = Column(String, nullable=False)
    created_at = Column(String, nullable=False, index=True)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, autoincrement=True)
    message = Column(Text, nullable=False)
    created_at = Column(String, nullable=False, index=True)
