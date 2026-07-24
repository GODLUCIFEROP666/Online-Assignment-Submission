import asyncio
import random
from datetime import datetime, timedelta, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.security import hash_password
from app.db.session import get_next_sequence_value

async def seed_ml_data():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client.final

    print("Cleaning existing users and assignments for ML demonstration...")
    # Keep the admin and superadmin, but clean other students/assignments to have a clean slate
    await db.users.delete_many({"username": {"$nin": ["jignesh"]}}) # Keep default demo student
    await db.assignments.delete_many({})
    
    # Reset counters for clean ID sequence
    await db.counters.update_one({"_id": "users"}, {"$set": {"sequence_value": 2}}, upsert=True)
    await db.counters.update_one({"_id": "assignments"}, {"$set": {"sequence_value": 0}}, upsert=True)

    print("Generating patterned student records...")
    subjects = ["Web Design", "DBMS", "C Programming", "Economics", "Finance"]
    first_names = ["Aarav", "Priya", "Rohan", "Sneha", "Karan", "Anjali", "Dev", "Riya", "Mihir", "Pooja", "Yash", "Kavya", "Arjun", "Nidhi", "Vivek"]
    last_names = ["Patel", "Shah", "Mehta", "Desai", "Joshi", "Modi", "Trivedi", "Sharma", "Parikh", "Pandya"]
    
    # We will generate 15 students
    # 5 High Achievers, 7 Average, 3 At-Risk
    profiles = (
        ["High"] * 5 +
        ["Average"] * 7 +
        ["At-Risk"] * 3
    )
    
    inserted_users = []
    
    # First, let's keep jignesh as one of the students and make him Average profile
    jignesh_user = await db.users.find_one({"username": "jignesh"})
    if jignesh_user:
        inserted_users.append((jignesh_user, "Average"))
        
    for i, profile in enumerate(profiles):
        username = f"student_{i+1}"
        full_name = f"{random.choice(first_names)} {random.choice(last_names)}"
        email = f"{username}@college.edu"
        seat_no = f"SDJ-BCA-{100 + i}"
        
        # Check if already exists
        exists = await db.users.find_one({"username": username})
        if exists:
            inserted_users.append((exists, profile))
            continue
            
        user_id = await get_next_sequence_value(db, "users")
        user = {
            "id": user_id,
            "full_name": full_name,
            "username": username,
            "email": email,
            "phone": f"98765432{i:02d}",
            "college": "SDJ International College",
            "course_year": "BCA - Sem 1",
            "seat_no": seat_no,
            "password": hash_password("12345678"),
            "is_email_verified": True,
            "is_phone_verified": True,
            "created_at": datetime.now(timezone.utc)
        }
        await db.users.insert_one(user)
        inserted_users.append((user, profile))
        print(f"Seeded student: {username} ({profile} performer)")

    print("\nGenerating assignment submissions matching performance profiles...")
    assignment_count = 0
    base_date = datetime.now(timezone.utc)

    for user, profile in inserted_users:
        # Determine number of submissions based on profile
        if profile == "High":
            num_subs = random.randint(4, 5)
        elif profile == "Average":
            num_subs = random.randint(2, 4)
        else: # At-Risk
            num_subs = random.randint(1, 2)
            
        selected_subjects = random.sample(subjects, num_subs)
        
        for subject in selected_subjects:
            assignment_id = await get_next_sequence_value(db, "assignments")
            
            # Marks based on profile
            if profile == "High":
                marks = random.randint(85, 98)
                status = "Checked"
            elif profile == "Average":
                marks = random.randint(55, 82)
                status = "Checked" if random.random() < 0.8 else "Pending"
            else: # At-Risk
                marks = random.randint(25, 48)
                status = "Checked" if random.random() < 0.5 else "Pending"
                
            days_ago = random.randint(2, 30)
            submit_date = base_date - timedelta(days=days_ago)
            
            assignment = {
                "id": assignment_id,
                "user_id": user["id"],
                "student_name": user["full_name"],
                "college_name": user["college"],
                "year": user["course_year"],
                "seat_no": user["seat_no"],
                "subject": subject,
                "title": f"Lab Assignment - {subject}",
                "details": f"Implementation of laboratory exercises for {subject}.",
                "file_name": f"submission_{assignment_id}.pdf",
                "status": status,
                "created_at": submit_date,
                "updated_at": submit_date
            }
            
            if status == "Checked":
                assignment["marks"] = float(marks)
                assignment["graded_by"] = "admin"
                assignment["graded_at"] = (submit_date + timedelta(days=random.randint(1, 5))).isoformat()
            else:
                assignment["marks"] = None
                
            await db.assignments.insert_one(assignment)
            assignment_count += 1

    print(f"\nSuccessfully seeded {len(inserted_users)} students and {assignment_count} assignments into MongoDB.")

if __name__ == "__main__":
    asyncio.run(seed_ml_data())
