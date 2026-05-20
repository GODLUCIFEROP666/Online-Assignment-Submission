from app.repositories.base import BaseRepository


class AssignmentsRepository(BaseRepository):
    def __init__(self, db) -> None:
        super().__init__(db)

