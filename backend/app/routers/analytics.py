from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.analytics import AnalyticsQuery
from app.services.analytics_service import (
    analytics_module_ready,
    analytics_overview,
    performance_predictions,
    student_analytics,
    student_clusters,
    teacher_analytics,
)

router = APIRouter()


@router.get("/dashboard", status_code=status.HTTP_200_OK)
async def dashboard(
    college: str | None = Query(default=None),
    course: str | None = Query(default=None),
    subject: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> dict[str, object]:
    query = AnalyticsQuery(college=college, course=course, subject=subject)
    return analytics_overview(db, college=query.college, course=query.course, subject=query.subject)


@router.get("/predict", status_code=status.HTTP_200_OK)
async def predict(
    college: str | None = Query(default=None),
    course: str | None = Query(default=None),
    subject: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> dict[str, object]:
    query = AnalyticsQuery(college=college, course=course, subject=subject)
    return performance_predictions(db, college=query.college, course=query.course, subject=query.subject)


@router.get("/cluster", status_code=status.HTTP_200_OK)
async def cluster(
    college: str | None = Query(default=None),
    course: str | None = Query(default=None),
    subject: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> dict[str, object]:
    query = AnalyticsQuery(college=college, course=course, subject=subject)
    return student_clusters(db, college=query.college, course=query.course, subject=query.subject)


@router.get("/student/{username}", status_code=status.HTTP_200_OK)
async def student(username: str, db: Session = Depends(get_db)) -> dict[str, object]:
    return student_analytics(db, username)


@router.get("/teacher/{username}", status_code=status.HTTP_200_OK)
async def teacher(username: str, db: Session = Depends(get_db)) -> dict[str, object]:
    return teacher_analytics(db, username)


@router.get("/module", status_code=status.HTTP_200_OK)
async def module_ready() -> dict[str, object]:
    return analytics_module_ready()
