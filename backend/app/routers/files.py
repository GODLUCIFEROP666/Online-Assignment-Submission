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
    file_name = file_id
    gridfs_id = None
    download_name = None
    download_type = None

    assignment = await find_assignment_by_id_or_objectid(db, file_id)
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    role = claims.get("role")
    if role == "student" and str(assignment.get("user_id")) != str(claims.get("user_id")):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only access your own files")
    if role == "teacher":
        # Teacher dashboard is globally visible; teachers can download any listed submission.
        pass
    elif role == "superadmin":
        # SuperAdmin can access all assignment files.
        pass
    elif role != "student":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized")

    if assignment.get("file_name"):
        file_name = assignment.get("file_name")
    else:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    gridfs_id = assignment.get("file_gridfs_id")
    download_name = assignment.get("file_original_name") or assignment.get("file_name")
    download_type = assignment.get("file_content_type")

    stored = await load_stored_file(db, file_name=file_name, gridfs_id=gridfs_id)
    if not stored:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Uploaded file is missing from GridFS and local storage")

    filename = Path(download_name or stored.get("filename") or file_name).name
    media_type = download_type or stored.get("content_type") or "application/octet-stream"
    content = stored.get("content") or b""
    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
    return Response(content=content, media_type=media_type, headers=headers)
