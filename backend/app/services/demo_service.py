# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.db.models import Admin, User


def ensure_demo_student(db: Session) -> User | None:
    # Prevent duplicate creation by checking username, new email, old email, and seat number
    existing = (
        db.query(User)
        .filter((User.username == "jignesh") | (User.email == "jignesh.demo@gmail.com") | (User.email == "jignesh@example.com") | (User.seat_no == "DEMO001"))
        .first()
    )
    if existing:
        existing.full_name = "jignesh"
        existing.username = "jignesh"
        existing.email = "jignesh.demo@gmail.com"
        existing.phone = "9999999999"
        existing.college = "Demo College"
        existing.course_year = "BCA - Sem 1"
        existing.seat_no = "DEMO001"
        existing.password = hash_password("12345678")
        existing.is_email_verified = 1
        existing.is_phone_verified = 1
        db.commit()
        db.refresh(existing)
        print("[SEED] -> Permanent demo student 'jignesh' (jignesh.demo@gmail.com) verified/updated in MySQL.")
        return existing

    user = User(
        full_name="jignesh",
        username="jignesh",
        email="jignesh.demo@gmail.com",
        phone="9999999999",
        college="Demo College",
        course_year="BCA - Sem 1",
        seat_no="DEMO001",
        password=hash_password("12345678"),
        is_email_verified=1,
        is_phone_verified=1,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    print("[SEED] -> Permanent demo student 'jignesh' (jignesh.demo@gmail.com) successfully seeded into MySQL.")
    return user


def ensure_demo_admin(db: Session) -> Admin | None:
    # Prevent duplicate creation by checking username, new email, and old email
    existing = (
        db.query(Admin)
        .filter((Admin.username == "admin") | (Admin.email == "admin.demo@gmail.com") | (Admin.email == "admin@faculty.edu"))
        .first()
    )
    if existing:
        existing.name = "admin"
        existing.username = "admin"
        existing.email = "admin.demo@gmail.com"
        existing.password = hash_password("12345678")
        existing.role = "teacher"  # Proper role mapping: database schema uses 'teacher' for the teacher/admin dashboard
        existing.college = "SDJ International College"
        existing.course = "BCA"
        db.commit()
        db.refresh(existing)
        print("[SEED] -> Permanent demo admin 'admin' (admin.demo@gmail.com, role: teacher) verified/updated in MySQL.")
        return existing

    admin = Admin(
        name="admin",
        username="admin",
        email="admin.demo@gmail.com",
        password=hash_password("12345678"),
        role="teacher",  # Proper role mapping: database schema uses 'teacher' for the teacher/admin dashboard
        college="SDJ International College",
        course="BCA",
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    print("[SEED] -> Permanent demo admin 'admin' (admin.demo@gmail.com, role: teacher) successfully seeded into MySQL.")
    return admin


def ensure_demo_superadmin(db: Session) -> Admin | None:
    # Prevent duplicate creation by checking username, new email, and old email
    existing = (
        db.query(Admin)
        .filter((Admin.username == "superadmin") | (Admin.email == "superadmin.demo@gmail.com") | (Admin.email == "superadmin@faculty.edu"))
        .first()
    )
    if existing:
        existing.name = "superadmin"
        existing.username = "superadmin"
        existing.email = "superadmin.demo@gmail.com"
        existing.password = hash_password("12345678")
        existing.role = "superadmin"
        existing.college = "Admin Office"
        existing.course = "Administration"
        db.commit()
        db.refresh(existing)
        print("[SEED] -> Permanent demo superadmin 'superadmin' (superadmin.demo@gmail.com, role: superadmin) verified/updated in MySQL.")
        return existing

    admin = Admin(
        name="superadmin",
        username="superadmin",
        email="superadmin.demo@gmail.com",
        password=hash_password("12345678"),
        role="superadmin",
        college="Admin Office",
        course="Administration",
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    print("[SEED] -> Permanent demo superadmin 'superadmin' (superadmin.demo@gmail.com, role: superadmin) successfully seeded into MySQL.")
    return admin
