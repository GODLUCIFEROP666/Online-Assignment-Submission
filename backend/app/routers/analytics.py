from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.dependencies import get_current_claims
from app.db.session import get_mongodb_db
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
    claims: dict = Depends(get_current_claims),
    college: str | None = Query(default=None),
    course: str | None = Query(default=None),
    subject: str | None = Query(default=None),
    db = Depends(get_mongodb_db),
) -> dict[str, object]:
    if claims.get("role") not in {"teacher", "superadmin"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Analytics access required")
    if claims.get("role") == "teacher" and not college:
        college = claims.get("college")
    query = AnalyticsQuery(college=college, course=course, subject=subject)
    return await analytics_overview(db, college=query.college, course=query.course, subject=query.subject)


@router.get("/predict", status_code=status.HTTP_200_OK)
async def predict(
    claims: dict = Depends(get_current_claims),
    college: str | None = Query(default=None),
    course: str | None = Query(default=None),
    subject: str | None = Query(default=None),
    db = Depends(get_mongodb_db),
) -> dict[str, object]:
    if claims.get("role") not in {"teacher", "superadmin"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Analytics access required")
    if claims.get("role") == "teacher" and not college:
        college = claims.get("college")
    query = AnalyticsQuery(college=college, course=course, subject=subject)
    return await performance_predictions(db, college=query.college, course=query.course, subject=query.subject)


@router.get("/cluster", status_code=status.HTTP_200_OK)
async def cluster(
    claims: dict = Depends(get_current_claims),
    college: str | None = Query(default=None),
    course: str | None = Query(default=None),
    subject: str | None = Query(default=None),
    db = Depends(get_mongodb_db),
) -> dict[str, object]:
    if claims.get("role") not in {"teacher", "superadmin"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Analytics access required")
    if claims.get("role") == "teacher" and not college:
        college = claims.get("college")
    query = AnalyticsQuery(college=college, course=course, subject=subject)
    return await student_clusters(db, college=query.college, course=query.course, subject=query.subject)


@router.get("/student/{username}", status_code=status.HTTP_200_OK)
async def student(
    username: str,
    claims: dict = Depends(get_current_claims),
    db = Depends(get_mongodb_db),
) -> dict[str, object]:
    if claims.get("role") not in {"student", "teacher", "superadmin"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Analytics access required")
    if claims.get("role") == "student" and claims.get("username") != username:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only view your own analytics")
    return await student_analytics(db, username)


@router.get("/teacher/{username}", status_code=status.HTTP_200_OK)
async def teacher(
    username: str,
    claims: dict = Depends(get_current_claims),
    db = Depends(get_mongodb_db),
) -> dict[str, object]:
    if claims.get("role") not in {"teacher", "superadmin"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Analytics access required")
    if claims.get("role") == "teacher" and claims.get("username") != username:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only view your own analytics")
    return await teacher_analytics(db, username)


@router.get("/module", status_code=status.HTTP_200_OK)
async def module_ready() -> dict[str, object]:
    return analytics_module_ready()
