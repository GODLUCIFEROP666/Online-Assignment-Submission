from pydantic import BaseModel


class Envelope(BaseModel):
    status: str = "success"
    message: str | None = None
