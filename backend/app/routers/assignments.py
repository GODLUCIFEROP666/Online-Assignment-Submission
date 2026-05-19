from datetime import date, datetime
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_claims
from app.core.config import get_settings
from app.db.models import Admin, Assignment, User
from app.db.session import get_db
from app.schemas.assignments import AssignmentReview
from app.services.file_service import uploads_dir

router = APIRouter()

ALLOWED_STATUSES = {"Pending", "Checked", "Rejected"}
ALLOWED_UPLOAD_EXTENSIONS = {".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png", ".zip"}
ALLOWED_UPLOAD_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/jpeg",
    "image/png",
    "application/zip",
    "application/x-zip-compressed",
    "application/octet-stream",
}


def _assignment_payload(assignment: Assignment) -> dict[str, object]:
    return {
        "id": assignment.id,
        "user_id": assignment.user_id,
        "student_name": assignment.student_name,
        "college_name": assignment.college_name,
        "year": assignment.year,
        "seat_no": assignment.seat_no,
        "subject": assignment.subject,
        "title": assignment.title,
        "details": assignment.details,
        "file_name": assignment.file_name,
        "status": assignment.status,
        "submit_date": assignment.submit_date.isoformat() if assignment.submit_date else None,
        "submit_time": assignment.submit_time.isoformat() if assignment.submit_time else None,
        "teacher_note": assignment.teacher_note,
        "marks": float(assignment.marks or 0),
        "graded_by": assignment.graded_by,
        "graded_at": assignment.graded_at.isoformat() if assignment.graded_at else None,
    }


def _current_student(db: Session, claims: dict) -> User:
    user_id = claims.get("user_id")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Student access required")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    return user


def _current_admin(db: Session, claims: dict) -> Admin:
    admin_id = claims.get("admin_id")
    if not admin_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    admin = db.query(Admin).filter(Admin.id == admin_id).first()
    if not admin:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admin not found")
    return admin


@router.get("/", status_code=status.HTTP_200_OK)
async def list_assignments(
    claims: dict = Depends(get_current_claims),
    mine: bool = True,
    status_filter: str | None = None,
    subject: str | None = None,
    db: Session = Depends(get_db),
) -> dict[str, object]:
    role = claims.get("role")
    query = db.query(Assignment)

    if role == "student":
        user = _current_student(db, claims)
        query = query.filter(or_(Assignment.user_id == user.id, Assignment.seat_no == user.seat_no))
    elif role == "teacher":
        admin = _current_admin(db, claims)
        if mine:
            query = query.filter(Assignment.college_name == admin.college)
        else:
            query = query.filter(Assignment.college_name == admin.college)
    elif role != "superadmin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized")

    if status_filter:
        query = query.filter(Assignment.status == status_filter)
    if subject:
        query = query.filter(Assignment.subject == subject)

    items = [_assignment_payload(assignment) for assignment in query.order_by(Assignment.id.desc()).all()]
    return {"status": "success", "items": items, "count": len(items)}


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_assignment(
    subject: str = Form(...),
    title: str = Form(...),
    details: str | None = Form(default=None),
    upload: UploadFile | None = File(default=None),
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
) -> dict[str, object]:
    user = _current_student(db, claims)
    saved_name = None
    if upload and upload.filename:
        suffix = Path(upload.filename).suffix.lower()
        if suffix not in ALLOWED_UPLOAD_EXTENSIONS:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported upload file type")
        if upload.content_type and upload.content_type not in ALLOWED_UPLOAD_TYPES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported upload content type")
        base_dir = uploads_dir()
        safe_name = f"{uuid4().hex}_{Path(upload.filename).name}"
        file_path = base_dir / safe_name
        content = await upload.read()
        max_bytes = get_settings().max_upload_mb * 1024 * 1024
        if len(content) > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Upload must be {get_settings().max_upload_mb} MB or smaller",
            )
        file_path.write_bytes(content)
        saved_name = safe_name

    assignment = Assignment(
        user_id=user.id,
        student_name=user.full_name,
        college_name=user.college,
        year=user.course_year,
        seat_no=user.seat_no,
        subject=subject,
        title=title,
        details=details,
        file_name=saved_name,
        status="Pending",
        submit_date=date.today(),
        submit_time=datetime.now().time().replace(microsecond=0),
        teacher_note=None,
        marks=0,
        graded_by=None,
        graded_at=None,
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return {"status": "success", "message": "Assignment submitted", "assignment": _assignment_payload(assignment)}


@router.delete("/{assignment_id}", status_code=status.HTTP_200_OK)
async def delete_assignment(
    assignment_id: int,
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
) -> dict[str, object]:
    user = _current_student(db, claims)
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    if assignment.user_id not in (None, user.id) and assignment.seat_no != user.seat_no:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only delete your own submission")
    if assignment.file_name:
        file_path = uploads_dir() / assignment.file_name
        if file_path.exists():
            file_path.unlink()
    db.delete(assignment)
    db.commit()
    return {"status": "success", "message": "Assignment deleted"}


@router.patch("/{assignment_id}/review", status_code=status.HTTP_200_OK)
async def review_assignment(
    assignment_id: int,
    payload: AssignmentReview,
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
) -> dict[str, object]:
    if payload.status not in ALLOWED_STATUSES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid assignment status")

    admin = _current_admin(db, claims)
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")

    if admin.role == "teacher" and admin.college and assignment.college_name and assignment.college_name != admin.college:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Teacher can only review assignments from assigned college")

    assignment.status = payload.status
    assignment.marks = payload.marks
    assignment.teacher_note = payload.teacher_note
    assignment.graded_by = admin.username
    assignment.graded_at = datetime.utcnow()
    db.commit()
    db.refresh(assignment)
    return {"status": "success", "message": "Assignment reviewed", "assignment": _assignment_payload(assignment)}
