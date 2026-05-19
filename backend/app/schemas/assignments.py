from pydantic import BaseModel


class AssignmentCreate(BaseModel):
    subject: str
    title: str
    details: str | None = None


class AssignmentReview(BaseModel):
    status: str
    marks: float = 0
    teacher_note: str | None = None
