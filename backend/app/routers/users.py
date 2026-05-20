from fastapi import APIRouter, Depends, HTTPException, status

from app.core.dependencies import get_current_claims
from app.core.security import hash_password
from app.db.session import get_mongodb_db
from app.schemas.users import UserEmailUpdate, UserPasswordUpdate, UserPhoneUpdate, UserProfileUpdate

router = APIRouter()


async def _has_duplicate_student(
    db,
    *,
    user_id: int,
    seat_no: str | None = None,
    email: str | None = None,
    phone: str | None = None,
) -> bool:
    predicates = []
    if seat_no:
        predicates.append({"seat_no": seat_no})
    if email:
        predicates.append({"email": email})
    if phone:
        predicates.append({"phone": phone})
    if not predicates:
        return False
    
    query = {
        "id": {"$ne": user_id},
        "$or": predicates
    }
    existing = await db.users.find_one(query, {"id": 1})
    return existing is not None


@router.get("/me", status_code=status.HTTP_200_OK)
async def read_me(claims: dict = Depends(get_current_claims), db = Depends(get_mongodb_db)) -> dict[str, object]:
    role = claims.get("role")
    if role == "student":
        user = await db.users.find_one({"id": claims.get("user_id")})
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        return {
            "status": "success",
            "role": role,
            "data": {
                "id": user.get("id"),
                "full_name": user.get("full_name"),
                "username": user.get("username"),
                "email": user.get("email"),
                "phone": user.get("phone"),
                "college": user.get("college"),
                "course_year": user.get("course_year"),
                "seat_no": user.get("seat_no"),
                "is_email_verified": bool(user.get("is_email_verified")),
                "is_phone_verified": bool(user.get("is_phone_verified")),
            },
        }

    admin = await db.admins.find_one({"id": claims.get("admin_id")})
    if not admin:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admin not found")
    return {
        "status": "success",
        "role": role,
        "data": {
            "id": admin.get("id"),
            "name": admin.get("name"),
            "username": admin.get("username"),
            "email": admin.get("email"),
            "college": admin.get("college"),
            "course": admin.get("course"),
        },
    }


@router.put("/me", status_code=status.HTTP_200_OK)
async def update_me(payload: UserProfileUpdate, claims: dict = Depends(get_current_claims), db = Depends(get_mongodb_db)) -> dict[str, object]:
    user = await db.users.find_one({"id": claims.get("user_id")})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if await _has_duplicate_student(db, user_id=user.get("id"), seat_no=payload.seat_no):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Seat number already in use")
    
    course_year = f"{payload.course} - {payload.sem}"
    await db.users.update_one(
        {"id": user.get("id")},
        {"$set": {
            "full_name": payload.full_name,
            "seat_no": payload.seat_no,
            "college": payload.college,
            "course_year": course_year
        }}
    )
    return {"status": "success", "message": "Profile updated", "data": {"seat_no": payload.seat_no, "course_year": course_year}}


@router.put("/me/password", status_code=status.HTTP_200_OK)
async def update_password(payload: UserPasswordUpdate, claims: dict = Depends(get_current_claims), db = Depends(get_mongodb_db)) -> dict[str, object]:
    user = await db.users.find_one({"id": claims.get("user_id")})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    await db.users.update_one(
        {"id": user.get("id")},
        {"$set": {"password": hash_password(payload.new_password)}}
    )
    return {"status": "success", "message": "Password updated"}


@router.put("/me/email", status_code=status.HTTP_200_OK)
async def update_email(payload: UserEmailUpdate, claims: dict = Depends(get_current_claims), db = Depends(get_mongodb_db)) -> dict[str, object]:
    user = await db.users.find_one({"id": claims.get("user_id")})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if payload.email == user.get("email"):
        return {"status": "success", "message": "Email unchanged"}
    if await _has_duplicate_student(db, user_id=user.get("id"), email=payload.email):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already in use")
    
    await db.users.update_one(
        {"id": user.get("id")},
        {"$set": {"email": payload.email, "is_email_verified": 0}}
    )
    return {"status": "success", "message": "Email updated"}


@router.put("/me/phone", status_code=status.HTTP_200_OK)
async def update_phone(payload: UserPhoneUpdate, claims: dict = Depends(get_current_claims), db = Depends(get_mongodb_db)) -> dict[str, object]:
    user = await db.users.find_one({"id": claims.get("user_id")})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if payload.phone == user.get("phone"):
        return {"status": "success", "message": "Phone unchanged"}
    if await _has_duplicate_student(db, user_id=user.get("id"), phone=payload.phone):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Phone already in use")
    
    await db.users.update_one(
        {"id": user.get("id")},
        {"$set": {"phone": payload.phone, "is_phone_verified": 0}}
    )
    return {"status": "success", "message": "Phone updated"}

