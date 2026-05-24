from __future__ import annotations

from typing import Any
from pathlib import Path
from uuid import uuid4

from motor.motor_asyncio import AsyncIOMotorGridFSBucket

from app.core.config import get_settings


def uploads_dir() -> Path:
    path = Path(get_settings().upload_dir)
    path.mkdir(parents=True, exist_ok=True)
    return path


def gridfs_bucket(db) -> AsyncIOMotorGridFSBucket:
    return AsyncIOMotorGridFSBucket(db, bucket_name="assignment_files")


def guess_media_type(filename: str) -> str:
    suffix = Path(filename).suffix.lower()
    if suffix == ".pdf":
        return "application/pdf"
    if suffix in {".doc", ".docx"}:
        return (
            "application/msword"
            if suffix == ".doc"
            else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )
    if suffix in {".jpg", ".jpeg"}:
        return "image/jpeg"
    if suffix == ".png":
        return "image/png"
    if suffix == ".zip":
        return "application/zip"
    return "application/octet-stream"


async def store_upload(db, upload, *, max_bytes: int) -> dict[str, Any]:
    if not upload or not upload.filename:
        return {"file_name": None, "gridfs_id": None, "content_type": None}

    content = await upload.read()
    if len(content) > max_bytes:
        raise ValueError(f"Upload must be {max_bytes // (1024 * 1024)} MB or smaller")

    stem = Path(upload.filename).stem[:40].replace(" ", "_") or "upload"
    file_name = f"{uuid4().hex}_{stem}_{Path(upload.filename).name}"
    file_path = uploads_dir() / file_name

    try:
        file_path.write_bytes(content)
    except Exception:
        # Local disk is best-effort. GridFS is the durable source of truth.
        pass

    bucket = gridfs_bucket(db)
    gridfs_id = await bucket.upload_from_stream(
        file_name,
        content,
        metadata={
            "original_name": Path(upload.filename).name,
            "content_type": upload.content_type or guess_media_type(upload.filename),
        },
    )

    return {
        "file_name": file_name,
        "gridfs_id": gridfs_id,
        "content_type": upload.content_type or guess_media_type(upload.filename),
        "original_name": Path(upload.filename).name,
    }


async def load_stored_file(db, *, file_name: str | None = None, gridfs_id: Any | None = None) -> dict[str, Any] | None:
    bucket = gridfs_bucket(db)
    if gridfs_id is not None:
        try:
            stream = await bucket.open_download_stream(gridfs_id)
            content = await stream.read()
            return {
                "content": content,
                "filename": file_name or getattr(stream, "filename", None) or "download.bin",
                "content_type": getattr(stream, "metadata", {}).get("content_type") if getattr(stream, "metadata", None) else None,
            }
        except Exception:
            pass

    if file_name:
        file_path = uploads_dir() / Path(file_name).name
        if file_path.exists():
            return {
                "content": file_path.read_bytes(),
                "filename": file_path.name,
                "content_type": guess_media_type(file_path.name),
            }

    return None
