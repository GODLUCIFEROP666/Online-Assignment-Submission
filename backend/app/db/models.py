from datetime import datetime

from sqlalchemy import Date, DateTime, DECIMAL, ForeignKey, Integer, String, Text, Time, TIMESTAMP, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    full_name: Mapped[str] = mapped_column(String(100))
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(15), nullable=True)
    college: Mapped[str | None] = mapped_column(String(100), nullable=True)
    course_year: Mapped[str | None] = mapped_column(String(20), nullable=True)
    seat_no: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    password: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=text("CURRENT_TIMESTAMP"))
    otp: Mapped[str | None] = mapped_column(String(10), nullable=True)
    otp_expiry: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    is_email_verified: Mapped[int | None] = mapped_column(Integer, server_default=text("0"))
    is_phone_verified: Mapped[int | None] = mapped_column(Integer, server_default=text("0"))
    email_otp: Mapped[str | None] = mapped_column(String(10), nullable=True)
    phone_otp: Mapped[str | None] = mapped_column(String(10), nullable=True)
    teacher_note: Mapped[str | None] = mapped_column(Text, nullable=True)

    assignments = relationship("Assignment", back_populates="student")


class Assignment(Base):
    __tablename__ = "assignments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    student_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    college_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    year: Mapped[str | None] = mapped_column(String(20), nullable=True)
    seat_no: Mapped[str | None] = mapped_column(String(50), nullable=True)
    subject: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    file_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str | None] = mapped_column(String(50), server_default=text("'Pending'"))
    submit_date: Mapped[datetime | None] = mapped_column(Date, nullable=True)
    submit_time: Mapped[datetime | None] = mapped_column(Time, nullable=True)
    teacher_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    marks: Mapped[float | None] = mapped_column(DECIMAL(5, 2), server_default=text("0.00"))
    graded_by: Mapped[str | None] = mapped_column(String(60), nullable=True)
    graded_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    student = relationship("User", back_populates="assignments")


class Admin(Base):
    __tablename__ = "admins"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100))
    username: Mapped[str] = mapped_column(String(60), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(150), unique=True, index=True)
    password: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20), server_default=text("'teacher'"))
    college: Mapped[str | None] = mapped_column(String(150), nullable=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=text("CURRENT_TIMESTAMP"))
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=text("CURRENT_TIMESTAMP"))
    course: Mapped[str | None] = mapped_column(String(100), nullable=True)


class PendingRegistration(Base):
    __tablename__ = "pending_registrations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    full_name: Mapped[str] = mapped_column(String(100))
    username: Mapped[str] = mapped_column(String(50), index=True)
    seat_no: Mapped[str] = mapped_column(String(50), index=True)
    email: Mapped[str] = mapped_column(String(100), index=True)
    phone: Mapped[str] = mapped_column(String(15))
    college: Mapped[str] = mapped_column(String(100))
    course: Mapped[str] = mapped_column(String(20))
    sem: Mapped[str] = mapped_column(String(20))
    password_hash: Mapped[str] = mapped_column(String(255))
    email_otp: Mapped[str] = mapped_column(String(10))
    phone_otp: Mapped[str] = mapped_column(String(10))
    email_verified: Mapped[int] = mapped_column(Integer, server_default=text("0"))
    phone_verified: Mapped[int] = mapped_column(Integer, server_default=text("0"))
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=text("CURRENT_TIMESTAMP"))
    expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
