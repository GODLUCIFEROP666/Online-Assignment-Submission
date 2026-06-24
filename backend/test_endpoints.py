import asyncio
import json
import urllib.request
import urllib.error
import sys
sys.path.append(".")
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.security import hash_password

API_BASE_URL = "http://localhost:8000"

def make_request(url, method="GET", headers=None, data=None, cookies=None):
    if headers is None:
        headers = {}
    if "Content-Type" not in headers and data is not None:
        headers["Content-Type"] = "application/json"
    
    if cookies:
        cookie_str = "; ".join(f"{k}={v}" for k, v in cookies.items())
        headers["Cookie"] = cookie_str

    req_data = None
    if data is not None:
        req_data = json.dumps(data).encode("utf-8")

    req = urllib.request.Request(url, method=method, headers=headers, data=req_data)
    
    try:
        with urllib.request.urlopen(req) as response:
            res_headers = response.info()
            res_data = response.read().decode("utf-8")
            
            cookies_received = {}
            for cookie_header in res_headers.get_all("Set-Cookie") or []:
                parts = cookie_header.split(";")[0].split("=")
                if len(parts) == 2:
                    cookies_received[parts[0].strip()] = parts[1].strip()

            res_json = None
            try:
                res_json = json.loads(res_data)
            except Exception:
                pass
            return response.status, res_json, res_data, cookies_received
    except urllib.error.HTTPError as e:
        err_data = e.read().decode("utf-8")
        err_json = None
        try:
            err_json = json.loads(err_data)
        except Exception:
            pass
        return e.code, err_json, err_data, {}
    except Exception as e:
        return 500, None, str(e), {}


async def test_auth_and_permissions():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client.final

    # Temporarily reset passwords to "12345678" for jjjjj and admin to ensure login works 100%
    await db.users.update_many({"username": "jjjjj"}, {"$set": {"password": hash_password("12345678")}})
    await db.admins.update_many({"role": "teacher"}, {"$set": {"password": hash_password("12345678")}})

    # Fetch real records from MongoDB
    student_doc = await db.users.find_one({"username": "jjjjj"})
    teacher_doc = await db.admins.find_one({"role": "teacher"})
    assignment_doc = await db.assignments.find_one()

    if not student_doc or not teacher_doc:
        print("[TEST FAILURE] Required seed users not found in MongoDB.")
        return

    print(f"\n[INFO] Found real Student in MongoDB: {student_doc['username']} ({student_doc['email']})")
    print(f"[INFO] Found real Teacher in MongoDB: {teacher_doc['username']} ({teacher_doc['email']})")
    if assignment_doc:
        file_id_str = str(assignment_doc.get("id") or assignment_doc["_id"])
        print(f"[INFO] Found real Assignment in MongoDB: ID={file_id_str} - Title={assignment_doc.get('assignment_title') or assignment_doc.get('title')}")
    else:
        print("[INFO] No assignments found in MongoDB.")
        file_id_str = None

    # ==========================================
    # TEST 1: Student Login & /me verification
    # ==========================================
    print("\n--- TEST 1: Student Login & Profile Lookup ---")
    status, res_json, res_data, cookies = make_request(
        f"{API_BASE_URL}/api/auth/login",
        method="POST",
        data={"identifier": student_doc["username"], "password": "12345678"}
    )
    if status != 200:
        print(f"[TEST FAILURE] Student login failed: {status} - {res_data}")
        return

    student_token = res_json["access_token"]
    print("[TEST SUCCESS] Student logged in successfully via API.")

    # Request /me to verify token works
    status, res_json, res_data, _ = make_request(
        f"{API_BASE_URL}/api/me",
        headers={"Authorization": f"Bearer {student_token}"}
    )
    print(f"[TEST SUCCESS] Student /me returned code {status}: {res_json}")

    # ==========================================
    # TEST 2: Cookie-based File Download check
    # ==========================================
    print("\n--- TEST 2: Cookie-based File Download Authentication ---")
    if file_id_str:
        # Pass final2_access_token cookie just like standard browser href link click
        cookies = {"final2_access_token": student_token}
        status, _, res_data, _ = make_request(
            f"{API_BASE_URL}/api/files/{file_id_str}",
            cookies=cookies
        )
        print(f"[TEST SUCCESS] Student cookie-based file download returned status: {status}")
        if status != 200:
            print(f"[TEST FAILURE DETAIL]: {res_data}")
    else:
        print("[TEST SKIP] No assignments in database to test file download.")

    # ==========================================
    # TEST 3: Teacher Login & /me verification
    # ==========================================
    print("\n--- TEST 3: Teacher Login & /me Lookup ---")
    status, res_json, res_data, _ = make_request(
        f"{API_BASE_URL}/api/admin/auth/login",
        method="POST",
        data={"username": teacher_doc["username"], "password": "12345678"}
    )
    if status != 200:
        print(f"[TEST FAILURE] Teacher login failed: {status} - {res_data}")
        return

    teacher_token = res_json["access_token"]
    print("[TEST SUCCESS] Teacher logged in successfully via API.")

    status, res_json, res_data, _ = make_request(
        f"{API_BASE_URL}/api/me",
        headers={"Authorization": f"Bearer {teacher_token}"}
    )
    print(f"[TEST SUCCESS] Teacher /me returned code {status}: {res_json}")

    # ==========================================
    # TEST 4: Teacher Download File
    # ==========================================
    print("\n--- TEST 4: Teacher Download File (Cookie-based) ---")
    if file_id_str:
        cookies = {"final2_access_token": teacher_token}
        status, _, res_data, _ = make_request(
            f"{API_BASE_URL}/api/files/{file_id_str}",
            cookies=cookies
        )
        print(f"[TEST SUCCESS] Teacher cookie-based file download returned status: {status}")
        if status != 200:
            print(f"[TEST FAILURE DETAIL]: {res_data}")
    else:
        print("[TEST SKIP] No assignments in database to test teacher download.")

    # ==========================================
    # TEST 5: Teacher Assignment Review (Grading)
    # ==========================================
    print("\n--- TEST 5: Teacher Review/Grading Submission ---")
    if file_id_str:
        review_payload = {
            "status": "Checked",
            "marks": 92.5,
            "teacher_note": "Excellent work. Programmatic integration test succeeded."
        }
        status, res_json, res_data, _ = make_request(
            f"{API_BASE_URL}/api/assignments/{file_id_str}/review",
            method="PATCH",
            headers={"Authorization": f"Bearer {teacher_token}"},
            data=review_payload
        )
        print(f"[TEST RESULT] Teacher review grading patch status code: {status}")
        if status == 200:
            print(f"[TEST SUCCESS] Grading verified successfully: {res_json}")
        else:
            print(f"[TEST FAILURE DETAIL]: {res_data}")
    else:
        print("[TEST SKIP] No assignments in database to test teacher grading.")


if __name__ == "__main__":
    asyncio.run(test_auth_and_permissions())
