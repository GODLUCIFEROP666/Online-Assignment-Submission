from __future__ import annotations

from collections.abc import Iterable

import pandas as pd
from sqlalchemy.orm import Session

from app.analytics import ml_models
from app.db.models import Assignment, User


def _assignment_rows(db: Session) -> list[dict[str, object]]:
    users_by_id = {user.id: user for user in db.query(User).all()}
    users_by_seat = {user.seat_no: user for user in users_by_id.values()}
    rows: list[dict[str, object]] = []

    for assignment in db.query(Assignment).order_by(Assignment.id.asc()).all():
        user = users_by_id.get(assignment.user_id) if assignment.user_id else None
        if not user and assignment.seat_no:
            user = users_by_seat.get(assignment.seat_no)

        rows.append(
            {
                "assignment_id": assignment.id,
                "student_id": user.id if user else assignment.user_id,
                "username": user.username if user else None,
                "full_name": user.full_name if user else assignment.student_name,
                "college": assignment.college_name or (user.college if user else None),
                "course_year": assignment.year or (user.course_year if user else None),
                "seat_no": assignment.seat_no or (user.seat_no if user else None),
                "subject": assignment.subject,
                "title": assignment.title,
                "details": assignment.details,
                "status": assignment.status,
                "marks": assignment.marks,
                "submit_date": assignment.submit_date,
                "submit_time": assignment.submit_time,
                "teacher_note": assignment.teacher_note,
                "graded_by": assignment.graded_by,
                "graded_at": assignment.graded_at,
            }
        )

    return rows


def _frame(db: Session) -> pd.DataFrame:
    rows = _assignment_rows(db)
    return pd.DataFrame(rows)


def _filtered_frame(db: Session, college: str | None = None, course: str | None = None, subject: str | None = None) -> pd.DataFrame:
    frame = _frame(db)
    if frame.empty:
        return frame
    if college:
        frame = frame[frame["college"].fillna("") == college]
    if course:
        frame = frame[frame["course_year"].fillna("").str.contains(course, case=False, na=False)]
    if subject:
        frame = frame[frame["subject"].fillna("") == subject]
    return frame


def analytics_overview(db: Session, college: str | None = None, course: str | None = None, subject: str | None = None) -> dict[str, object]:
    frame = _filtered_frame(db, college=college, course=course, subject=subject)
    if frame.empty:
        return {"status": "success", "data": {"assignments": 0, "students": 0, "teachers": 0, "pending": 0, "pass_probability": []}}

    pending = int((frame["status"].fillna("").str.lower() == "pending").sum())
    return {
        "status": "success",
        "data": {
            "assignments": int(len(frame)),
            "students": int(frame["student_id"].dropna().nunique()),
            "teachers": int(frame["graded_by"].dropna().nunique()),
            "pending": pending,
            "predictions": ml_models.predict_performance(frame),
            "clusters": ml_models.cluster_students(frame),
        },
    }


def performance_predictions(db: Session, college: str | None = None, course: str | None = None, subject: str | None = None) -> dict[str, object]:
    frame = _filtered_frame(db, college=college, course=course, subject=subject)
    return {"status": "success", "data": ml_models.predict_performance(frame)}


def student_clusters(db: Session, college: str | None = None, course: str | None = None, subject: str | None = None) -> dict[str, object]:
    frame = _filtered_frame(db, college=college, course=course, subject=subject)
    return {"status": "success", "data": ml_models.cluster_students(frame)}


def student_analytics(db: Session, username: str) -> dict[str, object]:
    frame = _frame(db)
    if frame.empty:
        return {"status": "success", "data": {"error": "No data found"}}
    return {"status": "success", "data": ml_models.analyze_student(frame, username)}


def teacher_analytics(db: Session, username: str) -> dict[str, object]:
    frame = _frame(db)
    if frame.empty:
        return {"status": "success", "data": {"error": "No data found"}}
    return {"status": "success", "data": ml_models.analyze_teacher(frame, username)}


def analytics_module_ready() -> dict[str, object]:
    return {
        "status": "ready",
        "module": "python-ml",
        "functions": [
            "predict_performance",
            "cluster_students",
            "analyze_student",
            "analyze_teacher",
        ],
    }
