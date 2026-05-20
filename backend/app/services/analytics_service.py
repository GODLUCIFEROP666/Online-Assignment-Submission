from __future__ import annotations
import pandas as pd
from app.analytics import ml_models

async def _assignment_rows(db) -> list[dict[str, object]]:
    # Get all users
    users_cursor = db.users.find()
    users = await users_cursor.to_list(length=None)
    users_by_id = {user["id"]: user for user in users}
    users_by_seat = {user["seat_no"]: user for user in users if "seat_no" in user}
    
    rows: list[dict[str, object]] = []
    assignments_cursor = db.assignments.find().sort("id", 1)
    assignments = await assignments_cursor.to_list(length=None)

    for assignment in assignments:
        user = users_by_id.get(assignment.get("user_id")) if assignment.get("user_id") else None
        if not user and assignment.get("seat_no"):
            user = users_by_seat.get(assignment["seat_no"])

        rows.append(
            {
                "assignment_id": assignment["id"],
                "student_id": user["id"] if user else assignment.get("user_id"),
                "username": user["username"] if user else None,
                "full_name": user["full_name"] if user else assignment.get("student_name"),
                "college": assignment.get("college_name") or (user.get("college") if user else None),
                "course_year": assignment.get("year") or (user.get("course_year") if user else None),
                "seat_no": assignment.get("seat_no") or (user.get("seat_no") if user else None),
                "subject": assignment.get("subject"),
                "title": assignment.get("title"),
                "details": assignment.get("details"),
                "status": assignment.get("status"),
                "marks": assignment.get("marks"),
                "submit_date": assignment.get("submit_date"),
                "submit_time": assignment.get("submit_time"),
                "teacher_note": assignment.get("teacher_note"),
                "graded_by": assignment.get("graded_by"),
                "graded_at": assignment.get("graded_at"),
            }
        )

    return rows


async def _frame(db) -> pd.DataFrame:
    rows = await _assignment_rows(db)
    return pd.DataFrame(rows)


async def _filtered_frame(db, college: str | None = None, course: str | None = None, subject: str | None = None) -> pd.DataFrame:
    frame = await _frame(db)
    if frame.empty:
        return frame
    if college:
        frame = frame[frame["college"].fillna("") == college]
    if course:
        frame = frame[frame["course_year"].fillna("").str.contains(course, case=False, na=False)]
    if subject:
        frame = frame[frame["subject"].fillna("") == subject]
    return frame


async def analytics_overview(db, college: str | None = None, course: str | None = None, subject: str | None = None) -> dict[str, object]:
    frame = await _filtered_frame(db, college=college, course=course, subject=subject)
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


async def performance_predictions(db, college: str | None = None, course: str | None = None, subject: str | None = None) -> dict[str, object]:
    frame = await _filtered_frame(db, college=college, course=course, subject=subject)
    return {"status": "success", "data": ml_models.predict_performance(frame)}


async def student_clusters(db, college: str | None = None, course: str | None = None, subject: str | None = None) -> dict[str, object]:
    frame = await _filtered_frame(db, college=college, course=course, subject=subject)
    return {"status": "success", "data": ml_models.cluster_students(frame)}


async def student_analytics(db, username: str) -> dict[str, object]:
    frame = await _frame(db)
    if frame.empty:
        return {"status": "success", "data": {"error": "No data found"}}
    return {"status": "success", "data": ml_models.analyze_student(frame, username)}


async def teacher_analytics(db, username: str) -> dict[str, object]:
    frame = await _frame(db)
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
