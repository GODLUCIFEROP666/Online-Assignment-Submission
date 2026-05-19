from pydantic import BaseModel, EmailStr, Field


class UserProfileUpdate(BaseModel):
    full_name: str = Field(min_length=2)
    seat_no: str = Field(min_length=2)
    college: str = Field(min_length=2)
    course: str = Field(min_length=2)
    sem: str = Field(min_length=1)


class UserEmailUpdate(BaseModel):
    email: EmailStr


class UserPhoneUpdate(BaseModel):
    phone: str = Field(min_length=7)


class UserPasswordUpdate(BaseModel):
    new_password: str = Field(min_length=8)
