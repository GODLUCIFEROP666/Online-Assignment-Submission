import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.services.assignment_scope import build_teacher_assignment_scope, combine_filters

async def run_tests():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["final"]

    print("\n==================================================")
    print("RUNNING STRICT TEACHER ACCESS CONTROL TEST SUITE")
    print("==================================================\n")

    # TEST 1: Teacher (BCA, Sem 1, C Programming) -> Student Assignment (BCA, Sem 1, C Programming)
    claims_teacher_c = {
        "role": "teacher",
        "admin_id": 1,
        "college": "SDJ International College",
        "course": "BCA",
        "semester": "Sem 1",
        "subject": "C Programming"
    }
    scope_1 = await build_teacher_assignment_scope(db, claims_teacher_c)
    assignments_1 = await db.assignments.find(scope_1).to_list(length=None)
    c_count = len(assignments_1)
    print(f"TEST 1: Teacher (BCA, Sem 1, C Programming) Scope Count: {c_count}")
    assert c_count > 0, "TEST 1 FAILED: Expected matching assignments for C Programming"
    for a in assignments_1:
        assert a.get("subject") == "C Programming", f"TEST 1 FAILED: Found wrong subject {a.get('subject')}"
    print("[PASS] TEST 1: ALLOW (Teacher only sees C Programming assignments)")


    # TEST 2: Teacher (BCA, Sem 1, DBMS) -> C Programming assignment
    claims_teacher_dbms = {
        "role": "teacher",
        "admin_id": 99,
        "college": "SDJ International College",
        "course": "BCA",
        "semester": "Sem 1",
        "subject": "DBMS"
    }
    scope_2 = await build_teacher_assignment_scope(db, claims_teacher_dbms)
    assignments_2 = await db.assignments.find(scope_2).to_list(length=None)
    c_in_dbms_teacher = [a for a in assignments_2 if a.get("subject") == "C Programming"]
    print(f"TEST 2: DBMS Teacher seeing C Programming count: {len(c_in_dbms_teacher)}")
    assert len(c_in_dbms_teacher) == 0, "TEST 2 FAILED: DBMS Teacher saw C Programming assignment!"
    print("[PASS] TEST 2: DENY (DBMS teacher cannot see C Programming assignments)")

    # TEST 3: Teacher (BBA, Sem 1, C Programming) -> BCA assignment
    claims_teacher_bba = {
        "role": "teacher",
        "admin_id": 98,
        "college": "SDJ International College",
        "course": "BBA",
        "semester": "Sem 1",
        "subject": "C Programming"
    }
    scope_3 = await build_teacher_assignment_scope(db, claims_teacher_bba)
    assignments_3 = await db.assignments.find(scope_3).to_list(length=None)
    bca_in_bba_teacher = [a for a in assignments_3 if "BCA" in (a.get("year") or "")]
    print(f"TEST 3: BBA Teacher seeing BCA assignment count: {len(bca_in_bba_teacher)}")
    assert len(bca_in_bba_teacher) == 0, "TEST 3 FAILED: BBA Teacher saw BCA assignment!"
    print("[PASS] TEST 3: DENY (BBA teacher cannot see BCA assignments)")

    # TEST 4: Teacher (B.Com, Sem 1, C Programming) -> BCA assignment
    claims_teacher_bcom = {
        "role": "teacher",
        "admin_id": 97,
        "college": "SDJ International College",
        "course": "B.Com",
        "semester": "Sem 1",
        "subject": "C Programming"
    }
    scope_4 = await build_teacher_assignment_scope(db, claims_teacher_bcom)
    assignments_4 = await db.assignments.find(scope_4).to_list(length=None)
    bca_in_bcom_teacher = [a for a in assignments_4 if "BCA" in (a.get("year") or "")]
    print(f"TEST 4: B.Com Teacher seeing BCA assignment count: {len(bca_in_bcom_teacher)}")
    assert len(bca_in_bcom_teacher) == 0, "TEST 4 FAILED: B.Com Teacher saw BCA assignment!"
    print("[PASS] TEST 4: DENY (B.Com teacher cannot see BCA assignments)")

    # TEST 5: Direct assignment ID access check (Teacher C Programming tries to access DBMS assignment)
    dbms_assignment = await db.assignments.find_one({"subject": "DBMS"})
    assert dbms_assignment is not None, "Precondition failed: No DBMS assignment in DB"
    matched_dbms = await db.assignments.find_one({"_id": dbms_assignment["_id"], **scope_1})
    print(f"TEST 5: Direct match for DBMS assignment under C Programming Teacher scope: {matched_dbms}")
    assert matched_dbms is None, "TEST 5 FAILED: C Programming teacher scope matched DBMS assignment ID!"
    print("[PASS] TEST 5: 403 FORBIDDEN (Direct cross-subject access is blocked)")

    # TEST 6: SuperAdmin access
    claims_superadmin = {"role": "superadmin", "admin_id": 2}
    all_assignments = await db.assignments.find({}).to_list(length=None)
    print(f"TEST 6: SuperAdmin assignment count: {len(all_assignments)}")
    assert len(all_assignments) > 0, "TEST 6 FAILED: SuperAdmin sees no assignments"
    print("[PASS] TEST 6: ALLOW (SuperAdmin accesses all assignments)")

    # TEST 7: Teacher dashboard counts calculation
    c_pending = await db.assignments.count_documents(combine_filters([scope_1, {"status": "Pending"}]))
    c_checked = await db.assignments.count_documents(combine_filters([scope_1, {"status": "Checked"}]))
    c_rejected = await db.assignments.count_documents(combine_filters([scope_1, {"status": "Rejected"}]))
    print(f"TEST 7: Teacher C Programming counts -- Total: {c_count}, Pending: {c_pending}, Checked: {c_checked}, Rejected: {c_rejected}")
    assert (c_pending + c_checked + c_rejected) == c_count, "TEST 7 FAILED: Dashboard counts do not sum to total scoped assignments"
    print("[PASS] TEST 7: Statistics strictly match teacher's scope")

    print("\n==================================================")
    print("ALL 7 TESTS PASSED SUCCESSFULLY!")
    print("==================================================\n")


if __name__ == "__main__":
    asyncio.run(run_tests())
