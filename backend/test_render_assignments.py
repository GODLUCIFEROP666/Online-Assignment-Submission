import urllib.request
import json

API_BASE_URL = "https://online-assignment-submission-3.onrender.com"

def make_post(url, data):
    req_data = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(url, method="POST", headers={"Content-Type": "application/json"}, data=req_data)
    try:
        with urllib.request.urlopen(req) as res:
            return json.loads(res.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        print("HTTP Error:", e.code, e.read().decode("utf-8"))
        raise

def make_get(url, token):
    req = urllib.request.Request(url, method="GET", headers={"Authorization": f"Bearer {token}"})
    try:
        with urllib.request.urlopen(req) as res:
            return json.loads(res.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        print("HTTP Error:", e.code, e.read().decode("utf-8"))
        raise

def main():
    # 1. Login as admin
    print("Logging into Render API as admin...")
    login_res = make_post(f"{API_BASE_URL}/api/admin/auth/login", {
        "username": "admin",
        "password": "12345678"
    })
    token = login_res["access_token"]

    # 2. Get assignments
    print("Fetching assignments from Render API /api/admin/assignments...")
    res = make_get(f"{API_BASE_URL}/api/admin/assignments", token)
    print(f"Total assignments returned: {res['count']}")
    for item in res["items"]:
        print(f"  - ID: {item['id']} | Student: {item['student_name']} | Title: {item.get('title')} | College: {item['college_name']} | Year: {item['year']}")

if __name__ == "__main__":
    main()
