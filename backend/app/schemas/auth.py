from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    identifier: str = Field(min_length=1)
    password: str = Field(min_length=1)


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2)
    username: str = Field(min_length=3)
    seat_no: str = Field(min_length=2)
    email: EmailStr
    phone: str = Field(min_length=7)
    college: str = Field(min_length=2)
    course: str = Field(min_length=2)
    sem: str = Field(min_length=1)
    password: str = Field(min_length=8)


class RegistrationCompleteRequest(BaseModel):
    registration_id: int


class OTPVerifyRequest(BaseModel):
    registration_id: int
    contact: str = Field(min_length=3)
    otp: str = Field(min_length=4)


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirmRequest(BaseModel):
    email: EmailStr
    otp: str = Field(min_length=4)
    new_password: str = Field(min_length=8)
