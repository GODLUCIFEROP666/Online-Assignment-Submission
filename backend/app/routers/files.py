from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.core.dependencies import get_current_claims, find_assignment_by_id_or_objectid
from app.db.session import get_mongodb_db
from app.services.file_service import load_stored_file

router = APIRouter()


@router.get("/{file_id}", status_code=status.HTTP_200_OK)
async def get_file(
    file_id: str,
    claims: dict = Depends(get_current_claims),
    db = Depends(get_mongodb_db),
) -> Response:
    assignment = await find_assignment_by_id_or_objectid(db, file_id)
    if not assignment:
        assignment = await db.assignments.find_one({"file_name": file_id})
    if not assignment:
        assignment = await db.assignments.find_one({"file_original_name": file_id})

    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment record not found")

    role = claims.get("role")
    if role == "student":
        student_user_id = str(claims.get("user_id"))
        ass_user_id = str(assignment.get("user_id")) if assignment.get("user_id") is not None else ""
        if ass_user_id != student_user_id and assignment.get("seat_no") != claims.get("seat_no"):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only access your own files")
    elif role in {"teacher", "superadmin"}:
        # Faculty Teachers and SuperAdmins have access to download assignment files in their portal
        pass
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized")



    file_name = assignment.get("file_name")
    gridfs_id = assignment.get("file_gridfs_id")
    download_name = assignment.get("file_original_name") or assignment.get("file_name") or f"assignment_{assignment.get('id', 'doc')}.txt"
    download_type = assignment.get("file_content_type")

    stored = await load_stored_file(db, file_name=file_name, gridfs_id=gridfs_id) if file_name else None
    
    if stored and stored.get("content"):
        content = stored["content"]
        filename = Path(download_name or stored.get("filename") or "download.bin").name
        media_type = download_type or stored.get("content_type") or "application/octet-stream"
    else:
        # Fallback for seeded assignments or text submissions: Synthesize a clean, downloadable submission report
        title = assignment.get("title") or "Assignment Submission"
        student = assignment.get("student_name") or "Student"
        seat = assignment.get("seat_no") or "N/A"
        subject = assignment.get("subject") or "General"
        date_str = str(assignment.get("submit_date") or "")
        details = assignment.get("details") or "No text details provided for this submission."
        
        report_text = f"========================================\nASSIGNMENT SUBMISSION REPORT\n========================================\nTitle: {title}\nStudent: {student} (Seat No: {seat})\nSubject: {subject}\nSubmitted Date: {date_str}\nStatus: {assignment.get('status', 'Pending')}\n----------------------------------------\nSUBMISSION DETAILS / CONTENT:\n\n{details}\n========================================\n"
        content = report_text.encode("utf-8")
        stem = Path(download_name).stem if download_name else f"assignment_{assignment.get('id', 'report')}"
        filename = f"{stem}_report.txt"
        media_type = "text/plain; charset=utf-8"

    headers = {
        "Content-Disposition": f'attachment; filename="{filename}"',
        "Access-Control-Expose-Headers": "Content-Disposition",
    }
    return Response(content=content, media_type=media_type, headers=headers)


