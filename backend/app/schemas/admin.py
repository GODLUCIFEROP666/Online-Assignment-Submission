from pydantic import BaseModel, EmailStr, Field


class AdminLoginRequest(BaseModel):
    username: str
    password: str


class TeacherCreateRequest(BaseModel):
    name: str = Field(min_length=2)
    username: str = Field(min_length=3)
    email: EmailStr
    password: str = Field(min_length=8)
    college: str = Field(min_length=2)
    course: str = Field(min_length=2)


class TeacherPasswordUpdateRequest(BaseModel):
    new_password: str = Field(min_length=8)


class TeacherUpdateRequest(BaseModel):
    name: str = Field(min_length=2)
    username: str = Field(min_length=3)
    email: EmailStr
    college: str = Field(min_length=2)
    course: str = Field(min_length=2)


class CollegeCreateRequest(BaseModel):
    name: str = Field(min_length=2)


class CollegeUpdateRequest(BaseModel):
    name: str = Field(min_length=2)
