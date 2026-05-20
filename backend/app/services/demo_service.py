from datetime import datetime, timezone
from app.core.security import hash_password
from app.db.session import get_next_sequence_value

async def ensure_demo_student(db) -> dict:
    existing = await db.users.find_one({
        "$or": [
            {"username": "jignesh"},
            {"email": "jignesh.demo@gmail.com"},
            {"email": "jignesh@example.com"},
            {"seat_no": "DEMO001"}
        ]
    })
    
    if existing:
        await db.users.update_one(
            {"id": existing["id"]},
            {"$set": {
                "full_name": "jignesh",
                "username": "jignesh",
                "email": "jignesh.demo@gmail.com",
                "phone": "9999999999",
                "college": "Demo College",
                "course_year": "BCA - Sem 1",
                "seat_no": "DEMO001",
                "password": hash_password("12345678"),
                "is_email_verified": 1,
                "is_phone_verified": 1,
            }}
        )
        updated = await db.users.find_one({"id": existing["id"]})
        print("[SEED] -> Permanent demo student 'jignesh' (jignesh.demo@gmail.com) verified/updated in MongoDB.")
        return updated

    user_id = await get_next_sequence_value(db, "users")
    user = {
        "id": user_id,
        "full_name": "jignesh",
        "username": "jignesh",
        "email": "jignesh.demo@gmail.com",
        "phone": "9999999999",
        "college": "Demo College",
        "course_year": "BCA - Sem 1",
        "seat_no": "DEMO001",
        "password": hash_password("12345678"),
        "is_email_verified": 1,
        "is_phone_verified": 1,
        "created_at": datetime.now(timezone.utc),
    }
    await db.users.insert_one(user)
    print("[SEED] -> Permanent demo student 'jignesh' (jignesh.demo@gmail.com) successfully seeded into MongoDB.")
    return user


async def ensure_demo_admin(db) -> dict:
    existing = await db.admins.find_one({
        "$or": [
            {"username": "admin"},
            {"email": "admin.demo@gmail.com"},
            {"email": "admin@faculty.edu"}
        ]
    })
    
    if existing:
        await db.admins.update_one(
            {"id": existing["id"]},
            {"$set": {
                "name": "admin",
                "username": "admin",
                "email": "admin.demo@gmail.com",
                "password": hash_password("12345678"),
                "role": "teacher",
                "college": "SDJ International College",
                "course": "BCA",
                "updated_at": datetime.now(timezone.utc),
            }}
        )
        updated = await db.admins.find_one({"id": existing["id"]})
        print("[SEED] -> Permanent demo admin 'admin' (admin.demo@gmail.com, role: teacher) verified/updated in MongoDB.")
        return updated

    admin_id = await get_next_sequence_value(db, "admins")
    admin = {
        "id": admin_id,
        "name": "admin",
        "username": "admin",
        "email": "admin.demo@gmail.com",
        "password": hash_password("12345678"),
        "role": "teacher",
        "college": "SDJ International College",
        "course": "BCA",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    await db.admins.insert_one(admin)
    print("[SEED] -> Permanent demo admin 'admin' (admin.demo@gmail.com, role: teacher) successfully seeded into MongoDB.")
    return admin


async def ensure_demo_superadmin(db) -> dict:
    existing = await db.admins.find_one({
        "$or": [
            {"username": "superadmin"},
            {"email": "superadmin.demo@gmail.com"},
            {"email": "superadmin@faculty.edu"}
        ]
    })
    
    if existing:
        await db.admins.update_one(
            {"id": existing["id"]},
            {"$set": {
                "name": "superadmin",
                "username": "superadmin",
                "email": "superadmin.demo@gmail.com",
                "password": hash_password("12345678"),
                "role": "superadmin",
                "college": "Admin Office",
                "course": "Administration",
                "updated_at": datetime.now(timezone.utc),
            }}
        )
        updated = await db.admins.find_one({"id": existing["id"]})
        print("[SEED] -> Permanent demo superadmin 'superadmin' (superadmin.demo@gmail.com, role: superadmin) verified/updated in MongoDB.")
        return updated

    admin_id = await get_next_sequence_value(db, "admins")
    admin = {
        "id": admin_id,
        "name": "superadmin",
        "username": "superadmin",
        "email": "superadmin.demo@gmail.com",
        "password": hash_password("12345678"),
        "role": "superadmin",
        "college": "Admin Office",
        "course": "Administration",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    await db.admins.insert_one(admin)
    print("[SEED] -> Permanent demo superadmin 'superadmin' (superadmin.demo@gmail.com, role: superadmin) successfully seeded into MongoDB.")
    return admin
