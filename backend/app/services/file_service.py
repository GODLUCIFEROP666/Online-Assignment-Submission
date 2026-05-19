from pathlib import Path

from app.core.config import get_settings


def uploads_dir() -> Path:
    path = Path(get_settings().upload_dir)
    path.mkdir(parents=True, exist_ok=True)
    return path
