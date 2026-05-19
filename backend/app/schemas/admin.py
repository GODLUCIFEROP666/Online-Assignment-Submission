from pydantic import BaseModel, EmailStr


class AdminLoginRequest(BaseModel):
    username: str
    password: str


class TeacherCreateRequest(BaseModel):
    name: str
    username: str
    email: EmailStr
    password: str
    college: str
    course: str


class TeacherPasswordUpdateRequest(BaseModel):
    new_password: str
