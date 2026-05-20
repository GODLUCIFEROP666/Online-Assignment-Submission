from app.repositories.base import BaseRepository


class AdminsRepository(BaseRepository):
    def __init__(self, db) -> None:
        super().__init__(db)

