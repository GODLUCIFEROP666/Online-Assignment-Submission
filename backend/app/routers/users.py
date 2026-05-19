from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_claims
from app.core.security import hash_password
from app.db.models import Admin, User
from app.db.session import get_db
from app.schemas.users import UserEmailUpdate, UserPasswordUpdate, UserPhoneUpdate, UserProfileUpdate

router = APIRouter()


def _has_duplicate_student(
    db: Session,
    *,
    user_id: int,
    seat_no: str | None = None,
    email: str | None = None,
    phone: str | None = None,
) -> bool:
    query = db.query(User.id).filter(User.id != user_id)
    predicates = []
    if seat_no:
        predicates.append(User.seat_no == seat_no)
    if email:
        predicates.append(User.email == email)
    if phone:
        predicates.append(User.phone == phone)
    if not predicates:
        return False
    return query.filter(or_(*predicates)).first() is not None


@router.get("/me", status_code=status.HTTP_200_OK)
async def read_me(claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)) -> dict[str, object]:
    role = claims.get("role")
    if role == "student":
        user = db.query(User).filter(User.id == claims.get("user_id")).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        return {
            "status": "success",
            "role": role,
            "data": {
                "id": user.id,
                "full_name": user.full_name,
                "username": user.username,
                "email": user.email,
                "phone": user.phone,
                "college": user.college,
                "course_year": user.course_year,
                "seat_no": user.seat_no,
                "is_email_verified": bool(user.is_email_verified),
                "is_phone_verified": bool(user.is_phone_verified),
            },
        }

    admin = db.query(Admin).filter(Admin.id == claims.get("admin_id")).first()
    if not admin:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admin not found")
    return {
        "status": "success",
        "role": role,
        "data": {
            "id": admin.id,
            "name": admin.name,
            "username": admin.username,
            "email": admin.email,
            "college": admin.college,
            "course": admin.course,
        },
    }


@router.put("/me", status_code=status.HTTP_200_OK)
async def update_me(payload: UserProfileUpdate, claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)) -> dict[str, object]:
    user = db.query(User).filter(User.id == claims.get("user_id")).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if _has_duplicate_student(db, user_id=user.id, seat_no=payload.seat_no):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Seat number already in use")
    user.full_name = payload.full_name
    user.seat_no = payload.seat_no
    user.college = payload.college
    user.course_year = f"{payload.course} - {payload.sem}"
    db.commit()
    return {"status": "success", "message": "Profile updated", "data": {"seat_no": user.seat_no, "course_year": user.course_year}}


@router.put("/me/password", status_code=status.HTTP_200_OK)
async def update_password(payload: UserPasswordUpdate, claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)) -> dict[str, object]:
    user = db.query(User).filter(User.id == claims.get("user_id")).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.password = hash_password(payload.new_password)
    db.commit()
    return {"status": "success", "message": "Password updated"}


@router.put("/me/email", status_code=status.HTTP_200_OK)
async def update_email(payload: UserEmailUpdate, claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)) -> dict[str, object]:
    user = db.query(User).filter(User.id == claims.get("user_id")).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if payload.email == user.email:
        return {"status": "success", "message": "Email unchanged"}
    if _has_duplicate_student(db, user_id=user.id, email=payload.email):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already in use")
    user.email = payload.email
    user.is_email_verified = 0
    db.commit()
    return {"status": "success", "message": "Email updated"}


@router.put("/me/phone", status_code=status.HTTP_200_OK)
async def update_phone(payload: UserPhoneUpdate, claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)) -> dict[str, object]:
    user = db.query(User).filter(User.id == claims.get("user_id")).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if payload.phone == user.phone:
        return {"status": "success", "message": "Phone unchanged"}
    if _has_duplicate_student(db, user_id=user.id, phone=payload.phone):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Phone already in use")
    user.phone = payload.phone
    user.is_phone_verified = 0
    db.commit()
    return {"status": "success", "message": "Phone updated"}
