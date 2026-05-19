from io import StringIO

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_claims
from app.core.security import auth_cookie_kwargs
from app.core.security import hash_password
from app.db.models import Admin, Assignment, User
from app.db.session import get_db
from app.schemas.admin import AdminLoginRequest, TeacherCreateRequest, TeacherPasswordUpdateRequest
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


@router.post("/auth/login", status_code=status.HTTP_200_OK)
async def login(payload: AdminLoginRequest, response: Response, db: Session = Depends(get_db)) -> dict[str, object]:
    admin = db.query(Admin).filter(or_(Admin.username == payload.username, Admin.email == payload.username)).first()
    if not admin or admin.role not in {"teacher", "superadmin"}:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin credentials")

    from app.core.security import verify_password

    if not verify_password(payload.password, admin.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin credentials")

    claims = {"role": admin.role, "admin_id": admin.id, "username": admin.username, "college": admin.college, "course": admin.course}
    tokens = build_token_pair(str(admin.id), claims)
    response.set_cookie("refresh_token", tokens["refresh_token"], **auth_cookie_kwargs())
    return {
        "status": "success",
        "role": admin.role,
        "admin": {"id": admin.id, "username": admin.username, "name": admin.name},
        "access_token": tokens["access_token"],
    }


@router.post("/auth/logout", status_code=status.HTTP_200_OK)
async def logout(response: Response) -> dict[str, str]:
    response.delete_cookie("refresh_token", path="/")
    return {"status": "success", "message": "Logged out"}


@router.get("/overview", status_code=status.HTTP_200_OK)
async def overview(claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)) -> dict[str, object]:
    _require_admin(claims)
    user_count = db.query(func.count(User.id)).scalar() or 0
    teacher_count = db.query(func.count(Admin.id)).filter(Admin.role == "teacher").scalar() or 0
    assignment_count = db.query(func.count(Assignment.id)).scalar() or 0
    pending_count = db.query(func.count(Assignment.id)).filter(Assignment.status == "Pending").scalar() or 0
    return {
        "status": "success",
        "data": {
            "students": int(user_count),
            "teachers": int(teacher_count),
            "assignments": int(assignment_count),
            "pending": int(pending_count),
        },
    }


@router.get("/students", status_code=status.HTTP_200_OK)
async def students(claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)) -> dict[str, object]:
    _require_admin(claims)
    items = [
        {
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
        }
        for user in db.query(User).order_by(User.id.desc()).all()
    ]
    return {"status": "success", "items": items, "count": len(items)}


@router.get("/teachers", status_code=status.HTTP_200_OK)
async def teachers(claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)) -> dict[str, object]:
    _require_admin(claims)
    items = [
        {
            "id": admin.id,
            "name": admin.name,
            "username": admin.username,
            "email": admin.email,
            "role": admin.role,
            "college": admin.college,
            "course": admin.course,
        }
        for admin in db.query(Admin).filter(Admin.role.in_(["teacher", "superadmin"])).order_by(Admin.id.desc()).all()
    ]
    return {"status": "success", "items": items, "count": len(items)}


@router.post("/teachers", status_code=status.HTTP_201_CREATED)
async def create_teacher(
    payload: TeacherCreateRequest,
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
) -> dict[str, object]:
    _require_superadmin(claims)
    duplicate = db.query(Admin.id).filter(or_(Admin.username == payload.username, Admin.email == payload.email)).first()
    if duplicate:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Teacher username or email already exists")

    admin = Admin(
        name=payload.name,
        username=payload.username,
        email=payload.email,
        password=hash_password(payload.password),
        role="teacher",
        college=payload.college,
        course=payload.course,
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return {
        "status": "success",
        "message": "Teacher created",
        "teacher": {"id": admin.id, "username": admin.username, "email": admin.email},
    }


@router.delete("/teachers/{teacher_id}", status_code=status.HTTP_200_OK)
async def delete_teacher(
    teacher_id: int,
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
) -> dict[str, object]:
    _require_superadmin(claims)
    teacher = db.query(Admin).filter(Admin.id == teacher_id, Admin.role == "teacher").first()
    if not teacher:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher not found")
    db.delete(teacher)
    db.commit()
    return {"status": "success", "message": "Teacher deleted"}


@router.patch("/teachers/{teacher_id}/password", status_code=status.HTTP_200_OK)
async def reset_teacher_password(
    teacher_id: int,
    payload: TeacherPasswordUpdateRequest,
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
) -> dict[str, object]:
    _require_superadmin(claims)
    teacher = db.query(Admin).filter(Admin.id == teacher_id, Admin.role == "teacher").first()
    if not teacher:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher not found")
    teacher.password = hash_password(payload.new_password)
    db.commit()
    return {"status": "success", "message": "Teacher password updated"}


@router.get("/assignments", status_code=status.HTTP_200_OK)
async def assignments(claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)) -> dict[str, object]:
    admin_claims = _require_admin(claims)
    query = db.query(Assignment)
    if admin_claims.get("role") == "teacher":
        query = query.filter(Assignment.college_name == admin_claims.get("college"))
    items = [
        {
            "id": assignment.id,
            "student_name": assignment.student_name,
            "college_name": assignment.college_name,
            "year": assignment.year,
            "seat_no": assignment.seat_no,
            "subject": assignment.subject,
            "title": assignment.title,
            "file_name": assignment.file_name,
            "status": assignment.status,
            "marks": float(assignment.marks or 0),
            "teacher_note": assignment.teacher_note,
            "graded_by": assignment.graded_by,
            "graded_at": assignment.graded_at.isoformat() if assignment.graded_at else None,
        }
        for assignment in query.order_by(Assignment.id.desc()).all()
    ]
    return {"status": "success", "items": items, "count": len(items)}


@router.get("/export/students.csv", status_code=status.HTTP_200_OK)
async def export_students(claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)) -> Response:
    _require_superadmin(claims)
    buffer = StringIO()
    buffer.write("id,full_name,username,email,phone,college,course_year,seat_no\n")
    for user in db.query(User).order_by(User.id.asc()).all():
        buffer.write(
            f'{user.id},"{user.full_name}","{user.username}","{user.email}","{user.phone or ""}","{user.college or ""}","{user.course_year or ""}","{user.seat_no}"\n'
        )
    return Response(
        content=buffer.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="students.csv"'},
    )
