from sqlalchemy.orm import Session

from app.repositories.base import BaseRepository


class AuthRepository(BaseRepository):
    def __init__(self, db: Session) -> None:
        super().__init__(db)
