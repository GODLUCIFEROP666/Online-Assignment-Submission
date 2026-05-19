from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_claims
from app.db.models import Assignment
from app.db.session import get_db
from app.services.file_service import uploads_dir

router = APIRouter()


@router.get("/{file_id}", status_code=status.HTTP_200_OK)
async def get_file(
    file_id: str,
    claims: dict = Depends(get_current_claims),
    db: Session = Depends(get_db),
) -> FileResponse:
    upload_root = uploads_dir()
    file_name = file_id

    if file_id.isdigit():
        assignment = db.query(Assignment).filter(Assignment.id == int(file_id)).first()
        if not assignment:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
        if claims.get("role") == "student" and assignment.user_id != claims.get("user_id"):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only access your own files")
        if assignment.file_name:
            file_name = assignment.file_name
        else:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    file_path = upload_root / Path(file_name).name
    if not file_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    return FileResponse(path=file_path, filename=file_path.name)
