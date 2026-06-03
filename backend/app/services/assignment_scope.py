from __future__ import annotations

import re
from typing import Any


def _regex(value: str, *, anchored_end: bool = False) -> dict[str, object]:
    pattern = f"^{re.escape(value.strip())}"
    if anchored_end:
        pattern += "$"
    return {"$regex": pattern, "$options": "i"}


def combine_filters(filters: list[dict[str, object]]) -> dict[str, object]:
    if not filters:
        return {}
    if len(filters) == 1:
        return filters[0]
    return {"$and": filters}


async def build_teacher_assignment_scope(db, claims: dict[str, Any]) -> dict[str, object]:
    if claims.get("role") != "teacher":
        return {}

    college = (claims.get("college") or "").strip()
    course = (claims.get("course") or "").strip()
    clauses: list[dict[str, object]] = []

    # Prefer the student roster attached to the teacher scope so submissions stay visible
    # even if older assignment documents missed one of the copied scope fields.
    user_query: dict[str, object] = {}
    if college:
        user_query["college"] = _regex(college, anchored_end=True)
    if course:
        user_query["course_year"] = _regex(course)

    if user_query:
        users = await db.users.find(user_query, {"id": 1, "seat_no": 1}).to_list(length=None)
        user_ids = [user.get("id") for user in users if user.get("id") is not None]
        seat_nos = [user.get("seat_no") for user in users if user.get("seat_no")]
        if user_ids:
            clauses.append({"user_id": {"$in": user_ids}})
        if seat_nos:
            clauses.append({"seat_no": {"$in": seat_nos}})

    # Keep the copied assignment fields as a fallback for legacy records.
    if college:
        clauses.append({"college_name": _regex(college, anchored_end=True)})
    if course:
        clauses.append({"year": _regex(course)})

    return combine_filters([{"$or": clauses}] if clauses else [])
