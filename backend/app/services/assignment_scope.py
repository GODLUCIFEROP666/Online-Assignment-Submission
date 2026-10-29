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


async def get_teacher_mapping(db, claims: dict[str, Any]) -> dict[str, str | None]:
    """
    Fetch the latest teacher mapping from db.admins or claims.
    Returns dict with keys: 'college', 'course', 'semester', 'subject'.
    """
    admin_id = claims.get("admin_id")
    admin = None
    if admin_id:
        try:
            val = int(admin_id)
            admin = await db.admins.find_one({"id": val})
        except (ValueError, TypeError):
            pass
        if not admin:
            from bson import ObjectId
            try:
                admin = await db.admins.find_one({"_id": ObjectId(str(admin_id))})
            except Exception:
                pass
        if not admin:
            admin = await db.admins.find_one({"id": str(admin_id)})

    college = (admin.get("college") if admin else claims.get("college")) or ""
    course = (admin.get("course") if admin else claims.get("course")) or ""
    semester = (admin.get("semester") if admin else claims.get("semester")) or ""
    subject = (admin.get("subject") if admin else claims.get("subject")) or ""

    return {
        "college": college.strip() if college else None,
        "course": course.strip() if course else None,
        "semester": semester.strip() if semester else None,
        "subject": subject.strip() if subject else None,
    }


async def build_teacher_assignment_scope(db, claims: dict[str, Any]) -> dict[str, object]:
    if claims.get("role") != "teacher":
        return {}

    mapping = await get_teacher_mapping(db, claims)
    course = mapping["course"]
    semester = mapping["semester"]
    subject = mapping["subject"]
    college = mapping["college"]

    # Security requirement: Unmapped teachers get NO assignment access
    if not course or not semester or not subject:
        return {"_id": None}

    # Extract semester number or string (e.g. "Sem 1" -> "1" or "Sem 1")
    sem_clean = semester.strip()
    sem_digits = re.search(r"\d+", sem_clean)
    sem_num = sem_digits.group(0) if sem_digits else sem_clean

    and_clauses: list[dict[str, object]] = []

    # 1. Subject constraint: Must match assigned subject (with C Programming / C Language alias handling)
    subject_clean = subject.strip()
    if subject_clean.lower() in {"c programming", "c language", "c lang", "c"}:
        and_clauses.append({"subject": {"$regex": "^(?:c programming|c language|c lang|c)$", "$options": "i"}})
    else:
        and_clauses.append({"subject": {"$regex": f"^{re.escape(subject_clean)}$", "$options": "i"}})


    # 2. Course + Semester constraint:
    # Match assignment's `year` (e.g., "BCA - Sem 1") or explicit `course` and `semester` fields
    year_pattern = f"^{re.escape(course)}.*(?:sem|semester)?\\s*{re.escape(sem_num)}"
    course_sem_clause = {
        "$or": [
            {"year": {"$regex": year_pattern, "$options": "i"}},
            {
                "$and": [
                    {"course": {"$regex": f"^{re.escape(course)}$", "$options": "i"}},
                    {"semester": {"$regex": f".*{re.escape(sem_num)}.*", "$options": "i"}},
                ]
            },
        ]
    }
    and_clauses.append(course_sem_clause)

    # 3. College constraint (if specified)
    if college:
        and_clauses.append(
            {
                "$or": [
                    {"college_name": {"$regex": f"^{re.escape(college)}$", "$options": "i"}},
                    {"college": {"$regex": f"^{re.escape(college)}$", "$options": "i"}},
                ]
            }
        )

    return combine_filters(and_clauses)

