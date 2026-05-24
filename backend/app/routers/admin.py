from io import StringIO
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.core.dependencies import get_current_claims
from app.core.security import auth_cookie_kwargs, hash_password
from app.db.session import get_mongodb_db, get_next_sequence_value
from app.schemas.admin import (
    AdminLoginRequest,
    CollegeCreateRequest,
    CollegeUpdateRequest,
    TeacherCreateRequest,
    TeacherPasswordUpdateRequest,
    TeacherUpdateRequest,
)
from app.services.auth_service import build_token_pair

router = APIRouter()


def _require_admin(claims: dict) -> dict:
    role = claims.get("role")
    if role not in {"teacher", "superadmin"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return claims


def _require_superadmin(claims: dict) -> dict:
    if claims.get("role") != "superadmin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Superadmin access required")
    return claims


def _college_key(name: str) -> str:
    return name.strip().lower()


@router.post("/auth/login", status_code=status.HTTP_200_OK)
async def login(payload: AdminLoginRequest, response: Response, db = Depends(get_mongodb_db)) -> dict[str, object]:
    admin = await db.admins.find_one({"$or": [{"username": payload.username}, {"email": payload.username}]})
    if not admin or admin.get("role") not in {"teacher", "superadmin"}:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin credentials")

    from app.core.security import verify_password

    if not verify_password(payload.password, admin.get("password")):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin credentials")

    claims = {"role": admin.get("role"), "admin_id": admin.get("id"), "username": admin.get("username"), "college": admin.get("college"), "course": admin.get("course")}
    tokens = build_token_pair(str(admin.get("id")), claims)
    response.set_cookie("refresh_token", tokens["refresh_token"], **auth_cookie_kwargs())
    return {
        "status": "success",
        "role": admin.get("role"),
        "admin": {"id": admin.get("id"), "username": admin.get("username"), "name": admin.get("name")},
        "access_token": tokens["access_token"],
    }


@router.post("/auth/logout", status_code=status.HTTP_200_OK)
async def logout(response: Response) -> dict[str, str]:
    response.delete_cookie("refresh_token", path="/")
    return {"status": "success", "message": "Logged out"}


@router.get("/overview", status_code=status.HTTP_200_OK)
async def overview(claims: dict = Depends(get_current_claims), db = Depends(get_mongodb_db)) -> dict[str, object]:
    admin_claims = _require_admin(claims)
    query: dict[str, object] = {}
    if admin_claims.get("role") == "teacher":
        query["college_name"] = admin_claims.get("college")

    user_count = await db.users.count_documents({"college": admin_claims.get("college")} if admin_claims.get("role") == "teacher" else {})
    teacher_count = await db.admins.count_documents({"role": "teacher"} if admin_claims.get("role") == "superadmin" else {"role": "teacher", "college": admin_claims.get("college")})
    assignment_count = await db.assignments.count_documents(query)
    pending_count = await db.assignments.count_documents({**query, "status": "Pending"})
    college_count = await db.colleges.count_documents({}) if admin_claims.get("role") == "superadmin" else 0
    return {
        "status": "success",
        "data": {
            "students": int(user_count),
            "teachers": int(teacher_count),
            "assignments": int(assignment_count),
            "pending": int(pending_count),
            "colleges": int(college_count),
        },
    }


@router.get("/students", status_code=status.HTTP_200_OK)
async def students(claims: dict = Depends(get_current_claims), db = Depends(get_mongodb_db)) -> dict[str, object]:
    admin_claims = _require_admin(claims)
    query: dict[str, object] = {}
    if admin_claims.get("role") == "teacher":
        query["college"] = admin_claims.get("college")

    cursor = db.users.find(query).sort("id", -1)
    users = await cursor.to_list(length=None)
    items = [
        {
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
        }
        for user in users
    ]
    return {"status": "success", "items": items, "count": len(items)}


@router.get("/teachers", status_code=status.HTTP_200_OK)
async def teachers(claims: dict = Depends(get_current_claims), db = Depends(get_mongodb_db)) -> dict[str, object]:
    _require_superadmin(claims)
    cursor = db.admins.find({"role": "teacher"}).sort("id", -1)
    admins = await cursor.to_list(length=None)
    items = [
        {
            "id": admin.get("id"),
            "name": admin.get("name"),
            "username": admin.get("username"),
            "email": admin.get("email"),
            "role": admin.get("role"),
            "college": admin.get("college"),
            "course": admin.get("course"),
        }
        for admin in admins
    ]
    return {"status": "success", "items": items, "count": len(items)}


@router.post("/teachers", status_code=status.HTTP_201_CREATED)
async def create_teacher(
    payload: TeacherCreateRequest,
    claims: dict = Depends(get_current_claims),
    db = Depends(get_mongodb_db),
) -> dict[str, object]:
    _require_superadmin(claims)
    duplicate = await db.admins.find_one({"$or": [{"username": payload.username}, {"email": payload.email}]})
    if duplicate:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Teacher username or email already exists")

    teacher_id = await get_next_sequence_value(db, "admins")
    admin = {
        "id": teacher_id,
        "name": payload.name,
        "username": payload.username,
        "email": payload.email,
        "password": hash_password(payload.password),
        "role": "teacher",
        "college": payload.college,
        "course": payload.course,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    await db.admins.insert_one(admin)
    return {
        "status": "success",
        "message": "Teacher created",
        "teacher": {
            "id": admin.get("id"),
            "name": admin.get("name"),
            "username": admin.get("username"),
            "email": admin.get("email"),
            "role": admin.get("role"),
            "college": admin.get("college"),
            "course": admin.get("course"),
        },
    }


@router.put("/teachers/{teacher_id}", status_code=status.HTTP_200_OK)
async def update_teacher(
    teacher_id: int,
    payload: TeacherUpdateRequest,
    claims: dict = Depends(get_current_claims),
    db = Depends(get_mongodb_db),
) -> dict[str, object]:
    _require_superadmin(claims)
    teacher = await db.admins.find_one({"id": teacher_id, "role": "teacher"})
    if not teacher:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher not found")

    duplicate = await db.admins.find_one(
        {
            "id": {"$ne": teacher_id},
            "$or": [{"username": payload.username}, {"email": payload.email}],
        }
    )
    if duplicate:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Teacher username or email already exists")

    await db.admins.update_one(
        {"id": teacher_id},
        {
            "$set": {
                "name": payload.name,
                "username": payload.username,
                "email": payload.email,
                "college": payload.college,
                "course": payload.course,
                "updated_at": datetime.utcnow(),
            }
        },
    )
    updated = await db.admins.find_one({"id": teacher_id})
    return {
        "status": "success",
        "message": "Teacher updated",
        "teacher": {
            "id": updated.get("id"),
            "name": updated.get("name"),
            "username": updated.get("username"),
            "email": updated.get("email"),
            "role": updated.get("role"),
            "college": updated.get("college"),
            "course": updated.get("course"),
        },
    }


@router.delete("/teachers/{teacher_id}", status_code=status.HTTP_200_OK)
async def delete_teacher(
    teacher_id: int,
    claims: dict = Depends(get_current_claims),
    db = Depends(get_mongodb_db),
) -> dict[str, object]:
    _require_superadmin(claims)
    teacher = await db.admins.find_one({"id": teacher_id, "role": "teacher"})
    if not teacher:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher not found")
    await db.admins.delete_one({"id": teacher_id})
    return {"status": "success", "message": "Teacher deleted"}


@router.patch("/teachers/{teacher_id}/password", status_code=status.HTTP_200_OK)
async def reset_teacher_password(
    teacher_id: int,
    payload: TeacherPasswordUpdateRequest,
    claims: dict = Depends(get_current_claims),
    db = Depends(get_mongodb_db),
) -> dict[str, object]:
    _require_superadmin(claims)
    teacher = await db.admins.find_one({"id": teacher_id, "role": "teacher"})
    if not teacher:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher not found")
    await db.admins.update_one({"id": teacher_id}, {"$set": {"password": hash_password(payload.new_password)}})
    return {"status": "success", "message": "Teacher password updated"}


@router.get("/colleges", status_code=status.HTTP_200_OK)
async def colleges(claims: dict = Depends(get_current_claims), db = Depends(get_mongodb_db)) -> dict[str, object]:
    _require_superadmin(claims)
    cursor = db.colleges.find().sort("name", 1)
    colleges_list = await cursor.to_list(length=None)
    items = [
        {
            "id": college.get("id"),
            "name": college.get("name"),
            "created_at": college.get("created_at").isoformat() if hasattr(college.get("created_at"), "isoformat") else college.get("created_at"),
            "updated_at": college.get("updated_at").isoformat() if hasattr(college.get("updated_at"), "isoformat") else college.get("updated_at"),
        }
        for college in colleges_list
    ]
    return {"status": "success", "items": items, "count": len(items)}


@router.post("/colleges", status_code=status.HTTP_201_CREATED)
async def create_college(
    payload: CollegeCreateRequest,
    claims: dict = Depends(get_current_claims),
    db = Depends(get_mongodb_db),
) -> dict[str, object]:
    _require_superadmin(claims)
    normalized = _college_key(payload.name)
    duplicate = await db.colleges.find_one({"name_normalized": normalized})
    if duplicate:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="College already exists")

    college_id = await get_next_sequence_value(db, "colleges")
    college = {
        "id": college_id,
        "name": payload.name.strip(),
        "name_normalized": normalized,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    await db.colleges.insert_one(college)
    return {
        "status": "success",
        "message": "College created",
        "college": {"id": college["id"], "name": college["name"], "created_at": college["created_at"], "updated_at": college["updated_at"]},
    }


@router.put("/colleges/{college_id}", status_code=status.HTTP_200_OK)
async def update_college(
    college_id: int,
    payload: CollegeUpdateRequest,
    claims: dict = Depends(get_current_claims),
    db = Depends(get_mongodb_db),
) -> dict[str, object]:
    _require_superadmin(claims)
    college = await db.colleges.find_one({"id": college_id})
    if not college:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="College not found")

    normalized = _college_key(payload.name)
    duplicate = await db.colleges.find_one({"id": {"$ne": college_id}, "name_normalized": normalized})
    if duplicate:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="College already exists")

    await db.colleges.update_one(
        {"id": college_id},
        {"$set": {"name": payload.name.strip(), "name_normalized": normalized, "updated_at": datetime.utcnow()}},
    )
    updated = await db.colleges.find_one({"id": college_id})
    return {
        "status": "success",
        "message": "College updated",
        "college": {
            "id": updated.get("id"),
            "name": updated.get("name"),
            "created_at": updated.get("created_at"),
            "updated_at": updated.get("updated_at"),
        },
    }


@router.delete("/colleges/{college_id}", status_code=status.HTTP_200_OK)
async def delete_college(
    college_id: int,
    claims: dict = Depends(get_current_claims),
    db = Depends(get_mongodb_db),
) -> dict[str, object]:
    _require_superadmin(claims)
    college = await db.colleges.find_one({"id": college_id})
    if not college:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="College not found")
    await db.colleges.delete_one({"id": college_id})
    return {"status": "success", "message": "College deleted"}


@router.get("/assignments", status_code=status.HTTP_200_OK)
async def assignments(claims: dict = Depends(get_current_claims), db = Depends(get_mongodb_db)) -> dict[str, object]:
    admin_claims = _require_admin(claims)
    query = {}
    if admin_claims.get("role") == "teacher":
        query["college_name"] = admin_claims.get("college")
        
    cursor = db.assignments.find(query).sort("id", -1)
    assignments_list = await cursor.to_list(length=None)
    items = []
    for assignment in assignments_list:
        graded_at = assignment.get("graded_at")
        if isinstance(graded_at, datetime):
            graded_at_str = graded_at.isoformat()
        elif hasattr(graded_at, "isoformat"):
            graded_at_str = graded_at.isoformat()
        else:
            graded_at_str = graded_at

        items.append({
            "id": assignment.get("id"),
            "student_name": assignment.get("student_name"),
            "college_name": assignment.get("college_name"),
            "year": assignment.get("year"),
            "seat_no": assignment.get("seat_no"),
            "subject": assignment.get("subject"),
            "title": assignment.get("title"),
            "file_name": assignment.get("file_name"),
            "status": assignment.get("status"),
            "marks": float(assignment.get("marks") or 0.0),
            "teacher_note": assignment.get("teacher_note"),
            "graded_by": assignment.get("graded_by"),
            "graded_at": graded_at_str,
        })
    return {"status": "success", "items": items, "count": len(items)}


@router.get("/export/students.csv", status_code=status.HTTP_200_OK)
async def export_students(claims: dict = Depends(get_current_claims), db = Depends(get_mongodb_db)) -> Response:
    _require_superadmin(claims)
    cursor = db.users.find().sort("id", 1)
    users = await cursor.to_list(length=None)
    buffer = StringIO()
    buffer.write("id,full_name,username,email,phone,college,course_year,seat_no\n")
    for user in users:
        buffer.write(
            f'{user.get("id")},"{user.get("full_name")}","{user.get("username")}","{user.get("email")}","{user.get("phone") or ""}","{user.get("college") or ""}","{user.get("course_year") or ""}","{user.get("seat_no")}"\n'
        )
    return Response(
        content=buffer.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="students.csv"'},
    )
