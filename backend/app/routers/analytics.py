from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.dependencies import get_current_claims
from app.db.session import get_mongodb_db
from app.schemas.analytics import AnalyticsQuery
from app.services.analytics_service import (
    analytics_module_ready,
    analytics_overview,
    at_risk_analytics,
    performance_predictions,
    student_analytics,
    student_clusters,
    teacher_analytics,
)


router = APIRouter()


async def _resolve_analytics_scope(
    db,
    claims: dict,
    college: str | None,
    course: str | None,
    subject: str | None,
) -> tuple[str | None, str | None, str | None]:
    """
    Resolve analytics scope based on authenticated role.

    - teacher: scope is ALWAYS derived from their DB mapping (client params ignored for security).
    - superadmin: accepts optional query-param filters for drill-down; default = global.
    """
    role = claims.get("role")
    if role == "teacher":
        from app.services.assignment_scope import get_teacher_mapping
        mapping = await get_teacher_mapping(db, claims)
        return mapping.get("college"), mapping.get("course"), mapping.get("subject")
    if role == "superadmin":
        return college or None, course or None, subject or None
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Analytics access required")


@router.get("/dashboard", status_code=status.HTTP_200_OK)
async def dashboard(
    claims: dict = Depends(get_current_claims),
    college: str | None = Query(default=None),
    course: str | None = Query(default=None),
    subject: str | None = Query(default=None),
    db = Depends(get_mongodb_db),
) -> dict[str, object]:
    resolved_college, resolved_course, resolved_subject = await _resolve_analytics_scope(
        db, claims, college, course, subject
    )
    return await analytics_overview(db, college=resolved_college, course=resolved_course, subject=resolved_subject)


@router.get("/predict", status_code=status.HTTP_200_OK)
async def predict(
    claims: dict = Depends(get_current_claims),
    college: str | None = Query(default=None),
    course: str | None = Query(default=None),
    subject: str | None = Query(default=None),
    db = Depends(get_mongodb_db),
) -> dict[str, object]:
    resolved_college, resolved_course, resolved_subject = await _resolve_analytics_scope(
        db, claims, college, course, subject
    )
    return await performance_predictions(db, college=resolved_college, course=resolved_course, subject=resolved_subject)


@router.get("/cluster", status_code=status.HTTP_200_OK)
async def cluster(
    claims: dict = Depends(get_current_claims),
    college: str | None = Query(default=None),
    course: str | None = Query(default=None),
    subject: str | None = Query(default=None),
    db = Depends(get_mongodb_db),
) -> dict[str, object]:
    resolved_college, resolved_course, resolved_subject = await _resolve_analytics_scope(
        db, claims, college, course, subject
    )
    return await student_clusters(db, college=resolved_college, course=resolved_course, subject=resolved_subject)


@router.get("/at-risk", status_code=status.HTTP_200_OK)
async def at_risk(
    claims: dict = Depends(get_current_claims),
    college: str | None = Query(default=None),
    course: str | None = Query(default=None),
    subject: str | None = Query(default=None),
    db = Depends(get_mongodb_db),
) -> dict[str, object]:
    resolved_college, resolved_course, resolved_subject = await _resolve_analytics_scope(
        db, claims, college, course, subject
    )
    return await at_risk_analytics(db, college=resolved_college, course=resolved_course, subject=resolved_subject)



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
