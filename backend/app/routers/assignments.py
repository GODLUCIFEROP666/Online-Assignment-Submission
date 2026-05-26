from datetime import date, datetime, time

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from app.core.dependencies import get_current_claims, find_assignment_by_id_or_objectid
from app.core.config import get_settings
from app.db.session import get_mongodb_db, get_next_sequence_value
from app.schemas.assignments import AssignmentReview
from app.services.file_service import gridfs_bucket, store_upload, uploads_dir
from app.services.notification_service import create_notification

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


def _assignment_payload(assignment: dict) -> dict[str, object]:
    submit_date = assignment.get("submit_date")
    submit_time = assignment.get("submit_time")
    graded_at = assignment.get("graded_at")
    
    if isinstance(submit_date, datetime):
        submit_date_str = submit_date.date().isoformat()
    elif hasattr(submit_date, "isoformat"):
        submit_date_str = submit_date.isoformat()
    else:
        submit_date_str = submit_date

    if isinstance(submit_time, datetime):
        submit_time_str = submit_time.time().isoformat()
    elif hasattr(submit_time, "isoformat"):
        submit_time_str = submit_time.isoformat()
    else:
        submit_time_str = submit_time

    if isinstance(graded_at, datetime):
        graded_at_str = graded_at.isoformat()
    elif hasattr(graded_at, "isoformat"):
        graded_at_str = graded_at.isoformat()
    else:
        graded_at_str = graded_at

    return {
        "id": assignment.get("id") or str(assignment.get("_id")),
        "user_id": str(assignment.get("user_id")) if assignment.get("user_id") is not None else None,
        "student_name": assignment.get("student_name"),
        "college_name": assignment.get("college_name"),
        "year": assignment.get("year"),
        "seat_no": assignment.get("seat_no"),
        "subject": assignment.get("subject"),
        "title": assignment.get("title"),
        "details": assignment.get("details"),
        "file_name": assignment.get("file_name"),
        "file_original_name": assignment.get("file_original_name"),
        "file_content_type": assignment.get("file_content_type"),
        "status": assignment.get("status"),
        "submit_date": submit_date_str,
        "submit_time": submit_time_str,
        "teacher_note": assignment.get("teacher_note"),
        "marks": float(assignment.get("marks") or 0.0),
        "graded_by": assignment.get("graded_by"),
        "graded_at": graded_at_str,
    }


async def _current_student(db, claims: dict) -> dict:
    user_id = claims.get("user_id")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Student access required")
    # Query student by ID or ObjectId
    from bson import ObjectId
    user = None
    try:
        val = int(user_id)
        user = await db.users.find_one({"id": val})
    except (ValueError, TypeError):
        pass
    if not user:
        try:
            user = await db.users.find_one({"_id": ObjectId(str(user_id))})
        except Exception:
            pass
    if not user:
        user = await db.users.find_one({"id": str(user_id)})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    return user


async def _current_admin(db, claims: dict) -> dict:
    admin_id = claims.get("admin_id")
    if not admin_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    # Query admin by ID or ObjectId
    from bson import ObjectId
    admin = None
    try:
        val = int(admin_id)
        admin = await db.admins.find_one({"id": val})
    except (ValueError, TypeError):
        pass
    if not admin:
        try:
            admin = await db.admins.find_one({"_id": ObjectId(str(admin_id))})
        except Exception:
            pass
    if not admin:
        admin = await db.admins.find_one({"id": str(admin_id)})
    if not admin:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admin not found")
    return admin


@router.get("/", status_code=status.HTTP_200_OK)
async def list_assignments(
    claims: dict = Depends(get_current_claims),
    mine: bool = True,
    status_filter: str | None = None,
    subject: str | None = None,
    search: str | None = None,
    from_date: str | None = None,
    to_date: str | None = None,
    db = Depends(get_mongodb_db),
) -> dict[str, object]:
    role = claims.get("role")
    query = {}

    if role == "student":
        student = await _current_student(db, claims)
        from bson import ObjectId
        ids_to_match = [student.get("id")]
        try:
            ids_to_match.append(ObjectId(str(student.get("_id"))))
        except Exception:
            pass
        ids_to_match.append(str(student.get("_id")))
        ids_to_match = [x for x in ids_to_match if x is not None]
        query["$or"] = [
            {"user_id": {"$in": ids_to_match}},
            {"seat_no": student.get("seat_no")}
        ]
    elif role == "teacher":
        admin = await _current_admin(db, claims)
        teacher_college = admin.get("college")
        teacher_course = admin.get("course")
        if teacher_college:
            # Case-insensitive match so data entry differences don't break scoping
            import re as _re
            query["college_name"] = {"$regex": f"^{_re.escape(teacher_college)}$", "$options": "i"}
        if teacher_course:
            query["year"] = {"$regex": f"^{_re.escape(teacher_course)}", "$options": "i"}
    elif role != "superadmin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized")

    if status_filter:
        query["status"] = status_filter
    if subject:
        query["subject"] = subject
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"subject": {"$regex": search, "$options": "i"}},
        ]
    if from_date or to_date:
        date_query = {}
        if from_date:
            date_query["$gte"] = datetime.combine(date.fromisoformat(from_date), time.min)
        if to_date:
            date_query["$lte"] = datetime.combine(date.fromisoformat(to_date), time.max)
        query["submit_date"] = date_query

    cursor = db.assignments.find(query).sort([("submit_date", -1), ("submit_time", -1), ("id", -1)])
    assignments = await cursor.to_list(length=None)
    items = [_assignment_payload(assignment) for assignment in assignments]
    return {"status": "success", "items": items, "count": len(items)}


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_assignment(
    subject: str = Form(...),
    title: str = Form(...),
    details: str | None = Form(default=None),
    upload: UploadFile | None = File(default=None),
    claims: dict = Depends(get_current_claims),
    db = Depends(get_mongodb_db),
) -> dict[str, object]:
    user = await _current_student(db, claims)
    saved_name = None
    file_gridfs_id = None
    file_content_type = None
    file_original_name = None
    if upload and upload.filename:
        suffix = upload.filename and upload.filename.lower().rpartition(".")[2]
        extension = f".{suffix}" if suffix else ""
        if extension not in ALLOWED_UPLOAD_EXTENSIONS:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported upload file type")
        if upload.content_type and upload.content_type not in ALLOWED_UPLOAD_TYPES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported upload content type")
        max_bytes = get_settings().max_upload_mb * 1024 * 1024
        try:
            stored = await store_upload(db, upload, max_bytes=max_bytes)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
        saved_name = stored["file_name"]
        file_gridfs_id = stored["gridfs_id"]
        file_content_type = stored["content_type"]
        file_original_name = stored["original_name"]

    assignment_id = await get_next_sequence_value(db, "assignments")
    
    submit_date = datetime.combine(date.today(), datetime.min.time())
    submit_time = datetime.now().replace(microsecond=0)

    assignment_doc = {
        "id": assignment_id,
        "user_id": user.get("id"),
        "student_name": user.get("full_name"),
        "college_name": user.get("college"),
        "year": user.get("course_year"),
        "seat_no": user.get("seat_no"),
        "subject": subject,
        "title": title,
        "details": details,
        "file_name": saved_name,
        "file_gridfs_id": file_gridfs_id,
        "file_content_type": file_content_type,
        "file_original_name": file_original_name,
        "status": "Pending",
        "submit_date": submit_date,
        "submit_time": submit_time,
        "teacher_note": None,
        "marks": 0.0,
        "graded_by": None,
        "graded_at": None,
    }
    
    await db.assignments.insert_one(assignment_doc)
    await create_notification(
        db,
        recipient_role="teacher",
        college=user.get("college"),
        title="New assignment submitted",
        body=f"{user.get('full_name')} submitted {subject} - {title}.",
        category="assignment",
        entity_type="assignment",
        entity_id=assignment_id,
    )
    return {"status": "success", "message": "Assignment submitted", "assignment": _assignment_payload(assignment_doc)}


@router.delete("/{assignment_id}", status_code=status.HTTP_200_OK)
async def delete_assignment(
    assignment_id: str,
    claims: dict = Depends(get_current_claims),
    db = Depends(get_mongodb_db),
) -> dict[str, object]:
    user = await _current_student(db, claims)
    assignment = await find_assignment_by_id_or_objectid(db, assignment_id)
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    if assignment.get("user_id") not in (None, user.get("id")) and str(assignment.get("user_id")) != str(user.get("_id")) and assignment.get("seat_no") != user.get("seat_no"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only delete your own submission")
    
    if assignment.get("file_name"):
        if assignment.get("file_gridfs_id") is not None:
            try:
                await gridfs_bucket(db).delete(assignment.get("file_gridfs_id"))
            except Exception:
                pass
        file_path = uploads_dir() / assignment.get("file_name")
        if file_path.exists():
            file_path.unlink()
            
    await db.assignments.delete_one({"_id": assignment["_id"]})
    return {"status": "success", "message": "Assignment deleted"}


@router.patch("/{assignment_id}/review", status_code=status.HTTP_200_OK)
async def review_assignment(
    assignment_id: str,
    payload: AssignmentReview,
    claims: dict = Depends(get_current_claims),
    db = Depends(get_mongodb_db),
) -> dict[str, object]:
    # Only teacher/admin role may grade. SuperAdmin is a global manager, not a grader.
    if claims.get("role") != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Assignment grading is restricted to Teacher/Admin accounts only. SuperAdmin cannot grade submissions."
        )

    if payload.status not in ALLOWED_STATUSES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid assignment status")

    admin = await _current_admin(db, claims)
    assignment = await find_assignment_by_id_or_objectid(db, assignment_id)
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")

    # Enforce teacher college scope — teacher can only grade their own college's submissions
    import re as _re
    teacher_college = admin.get("college") or ""
    assign_college = assignment.get("college_name") or ""
    if teacher_college and assign_college and not _re.match(f"^{_re.escape(teacher_college)}$", assign_college, _re.IGNORECASE):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Teacher can only review assignments from their assigned college")

    normalized_status = payload.status
    if normalized_status == "Pending":
        normalized_status = "Checked"

    update_doc = {
        "status": normalized_status,
        "marks": payload.marks,
        "teacher_note": payload.teacher_note,
        "graded_by": admin.get("username"),
        "graded_at": datetime.utcnow()
    }

    await db.assignments.update_one(
        {"_id": assignment["_id"]},
        {"$set": update_doc}
    )
    
    updated_assignment = await db.assignments.find_one({"_id": assignment["_id"]})
    if updated_assignment and updated_assignment.get("user_id"):
        recipient_user_id = updated_assignment.get("user_id")
        await create_notification(
            db,
            recipient_user_id=recipient_user_id,
            title="Assignment reviewed",
            body=f"Your assignment {updated_assignment.get('title')} was marked {normalized_status}.",
            category="assignment",
            entity_type="assignment",
            entity_id=assignment_id,
        )
    return {"status": "success", "message": "Assignment reviewed", "assignment": _assignment_payload(updated_assignment)}
