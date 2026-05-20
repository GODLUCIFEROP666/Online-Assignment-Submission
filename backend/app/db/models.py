from datetime import datetime
from pydantic import BaseModel, Field

class User(BaseModel):
    id: int
    full_name: str
    username: str
    email: str
    phone: str | None = None
    college: str | None = None
    course_year: str | None = None
    seat_no: str
    password: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    otp: str | None = None
    otp_expiry: datetime | None = None
    is_email_verified: int = 0
    is_phone_verified: int = 0
    email_otp: str | None = None
    phone_otp: str | None = None
    teacher_note: str | None = None

class Assignment(BaseModel):
    id: int
    user_id: int | None = None
    student_name: str | None = None
    college_name: str | None = None
    year: str | None = None
    seat_no: str | None = None
    subject: str | None = None
    title: str | None = None
    details: str | None = None
    file_name: str | None = None
    status: str = "Pending"
    submit_date: datetime | None = None
    submit_time: datetime | None = None
    teacher_note: str | None = None
    marks: float = 0.00
    graded_by: str | None = None
    graded_at: datetime | None = None

class Admin(BaseModel):
    id: int
    name: str
    username: str
    email: str
    password: str
    role: str = "teacher"
    college: str | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    course: str | None = None

class PendingRegistration(BaseModel):
    id: int
    full_name: str
    username: str
    seat_no: str
    email: str
    phone: str
    college: str
    course: str
    sem: str
    password_hash: str
    email_otp: str
    phone_otp: str
    email_verified: int = 0
    phone_verified: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime | None = None
