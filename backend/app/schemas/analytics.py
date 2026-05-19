from pydantic import BaseModel


class AnalyticsQuery(BaseModel):
    college: str | None = None
    course: str | None = None
    subject: str | None = None
