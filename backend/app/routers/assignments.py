from datetime import date, datetime, time

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from app.core.config import get_settings
from app.core.dependencies import find_assignment_by_id_or_objectid, get_current_claims
from app.db.session import get_mongodb_db, get_next_sequence_value
from app.schemas.assignments import AssignmentReview
from app.services.assignment_scope import build_teacher_assignment_scope, combine_filters
from app.services.file_service import gridfs_bucket, store_upload, uploads_dir
from app.services.notification_service import create_notification
from app.analytics.plagiarism import analyze_plagiarism
from app.analytics.auto_grader import auto_grade_submission

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
    filters: list[dict[str, object]] = []

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
        filters.append(
            {
                "$or": [
                    {"user_id": {"$in": ids_to_match}},
                    {"seat_no": student.get("seat_no")},
                ]
            }
        )
    elif role == "teacher":
        scope = await build_teacher_assignment_scope(db, claims)
        if scope:
            filters.append(scope)
    elif role != "superadmin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized")

    if status_filter:
        filters.append({"status": status_filter})
    if subject:
        filters.append({"subject": subject})
    if search:
        filters.append(
            {
                "$or": [
                    {"title": {"$regex": search, "$options": "i"}},
                    {"subject": {"$regex": search, "$options": "i"}},
                ]
            }
        )
    if from_date or to_date:
        date_query = {}
        if from_date:
            date_query["$gte"] = datetime.combine(date.fromisoformat(from_date), time.min)
        if to_date:
            date_query["$lte"] = datetime.combine(date.fromisoformat(to_date), time.max)
        filters.append({"submit_date": date_query})

    query = combine_filters(filters)
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

    course_year = user.get("course_year") or ""
    parts = course_year.split(" - ")
    doc_course = parts[0].strip() if len(parts) >= 1 else course_year
    doc_sem = parts[1].strip() if len(parts) >= 2 else ""

    assignment_doc = {
        "id": assignment_id,
        "user_id": user.get("id"),
        "student_name": user.get("full_name"),
        "college_name": user.get("college"),
        "year": user.get("course_year"),
        "course": doc_course,
        "semester": doc_sem,
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


@router.get("/{assignment_id}", status_code=status.HTTP_200_OK)
async def get_assignment_detail(
    assignment_id: str,
    claims: dict = Depends(get_current_claims),
    db = Depends(get_mongodb_db),
) -> dict[str, object]:
    assignment = await find_assignment_by_id_or_objectid(db, assignment_id)
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")

    role = claims.get("role")
    if role == "student":
        student = await _current_student(db, claims)
        if str(assignment.get("user_id")) != str(student.get("id")) and str(assignment.get("user_id")) != str(student.get("_id")) and assignment.get("seat_no") != student.get("seat_no"):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only view your own assignments")
    elif role == "teacher":
        scope = await build_teacher_assignment_scope(db, claims)
        if not scope or not await db.assignments.find_one({"_id": assignment["_id"], **scope}):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Teachers can only view assignments matching their assigned Course, Semester, and Subject.",
            )
    elif role == "superadmin":
        pass
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized")

    return {"status": "success", "assignment": _assignment_payload(assignment)}


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
            detail="Assignment grading is restricted to Teacher/Admin accounts only. SuperAdmin cannot grade submissions.",
        )

    if payload.status not in ALLOWED_STATUSES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid assignment status")

    admin = await _current_admin(db, claims)
    assignment = await find_assignment_by_id_or_objectid(db, assignment_id)
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")

    # Enforce strict Course, Semester, Subject teacher assignment scope
    scope = await build_teacher_assignment_scope(db, claims)
    if not scope or not await db.assignments.find_one({"_id": assignment["_id"], **scope}):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Teachers can only review assignments matching their assigned Course, Semester, and Subject.",
        )

    normalized_status = payload.status
    if normalized_status == "Pending":
        normalized_status = "Checked"

    update_doc = {
        "status": normalized_status,
        "marks": payload.marks,
        "teacher_note": payload.teacher_note,
        "graded_by": admin.get("username"),
        "graded_at": datetime.utcnow(),
    }

    await db.assignments.update_one({"_id": assignment["_id"]}, {"$set": update_doc})

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


@router.get("/{assignment_id}/auto-grade", status_code=status.HTTP_200_OK)
async def auto_grade_single(
    assignment_id: str,
    claims: dict = Depends(get_current_claims),
    db = Depends(get_mongodb_db),
) -> dict[str, object]:
    """100% Free Local AI Auto-Grading recommendation for a submission."""
    if claims.get("role") not in {"teacher", "superadmin"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Teacher access required")

    assignment = await find_assignment_by_id_or_objectid(db, assignment_id)
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")

    content = assignment.get("details") or assignment.get("title") or ""

    # Check peer plagiarism similarity score for this assignment
    peer_cursor = db.assignments.find({"subject": assignment.get("subject")})
    peer_docs = await peer_cursor.to_list(length=None)
    
    submissions_payload = [
        {
            "submission_id": str(d.get("id") or d.get("_id")),
            "username": d.get("student_name") or str(d.get("user_id")),
            "student_name": d.get("student_name"),
            "content": d.get("details") or d.get("title") or "",
        }
        for d in peer_docs
    ]
    
    plagiarism_report = analyze_plagiarism(submissions_payload)
    
    target_sub_id = str(assignment.get("id") or assignment.get("_id"))
    sub_similarity = 0.0
    for comp in plagiarism_report.get("pairwise_comparisons", []):
        if comp["student1_id"] == target_sub_id or comp["student2_id"] == target_sub_id:
            if comp["similarity_percentage"] > sub_similarity:
                sub_similarity = comp["similarity_percentage"]

    auto_res = auto_grade_submission(
        submission_text=content,
        assignment_title=assignment.get("title", ""),
        plagiarism_similarity=sub_similarity,
    )

    return {
        "status": "success",
        "assignment_id": assignment_id,
        "plagiarism_similarity": sub_similarity,
        "recommendation": auto_res,
    }


@router.post("/batch-auto-grade", status_code=status.HTTP_200_OK)
async def batch_auto_grade_pending(
    claims: dict = Depends(get_current_claims),
    db = Depends(get_mongodb_db),
) -> dict[str, object]:
    """Batch auto-grades pending submissions in the teacher's subject scope."""
    if claims.get("role") != "teacher":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Teacher access required")

    admin = await _current_admin(db, claims)
    scope = await build_teacher_assignment_scope(db, claims)
    if not scope:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No assigned scope for teacher")

    query = combine_filters([scope, {"status": "Pending"}])
    pending_assignments = await db.assignments.find(query).to_list(length=None)

    if not pending_assignments:
        return {"status": "success", "message": "No pending assignments to auto-grade", "count": 0}

    graded_count = 0
    for assignment in pending_assignments:
        content = assignment.get("details") or assignment.get("title") or ""
        auto_res = auto_grade_submission(submission_text=content, assignment_title=assignment.get("title", ""))
        
        ass_id = assignment.get("id") or str(assignment.get("_id"))
        update_doc = {
            "status": "Checked",
            "marks": auto_res["suggested_marks"],
            "teacher_note": f"[Auto-Graded] {auto_res['suggested_feedback']}",
            "graded_by": admin.get("username"),
            "graded_at": datetime.utcnow(),
        }
        await db.assignments.update_one({"_id": assignment["_id"]}, {"$set": update_doc})
        graded_count += 1

        if assignment.get("user_id"):
            await create_notification(
                db,
                recipient_user_id=assignment.get("user_id"),
                title="Assignment auto-graded",
                body=f"Your assignment '{assignment.get('title')}' was graded ({auto_res['suggested_marks']} marks).",
                category="assignment",
                entity_type="assignment",
                entity_id=str(ass_id),
            )

    return {
        "status": "success",
        "message": f"Successfully auto-graded {graded_count} pending assignment(s).",
        "count": graded_count,
    }


@router.get("/plagiarism-scan/{subject_name}", status_code=status.HTTP_200_OK)
async def scan_subject_plagiarism(
    subject_name: str,
    claims: dict = Depends(get_current_claims),
    db = Depends(get_mongodb_db),
) -> dict[str, object]:
    """100% Free Local Plagiarism scan for all submissions in a subject."""
    if claims.get("role") not in {"teacher", "superadmin"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Teacher or Superadmin access required")

    cursor = db.assignments.find({"subject": subject_name})
    assignments = await cursor.to_list(length=None)

    submissions_payload = [
        {
            "submission_id": str(d.get("id") or d.get("_id")),
            "username": d.get("seat_no") or d.get("student_name") or str(d.get("user_id")),
            "student_name": d.get("student_name"),
            "content": d.get("details") or d.get("title") or "",
        }
        for d in assignments
    ]

    report = analyze_plagiarism(submissions_payload)
    return {"status": "success", "subject": subject_name, "report": report}


