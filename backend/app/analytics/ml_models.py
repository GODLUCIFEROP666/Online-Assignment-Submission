import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler


def analyze_student(df, username):
    """
    Perform deep analysis on a single student's performance.
    """
    if df.empty:
        return {"error": "No data found for this student"}

    student_df = df[df["username"] == username].copy()
    if student_df.empty:
        return {"error": "Student not found in dataset"}

    student_df["marks"] = pd.to_numeric(student_df["marks"], errors="coerce").fillna(0)

    total_assignments = len(student_df)
    completed_assignments = len(student_df[student_df["status"].str.lower() == "checked"])

    avg_marks = float(student_df["marks"].mean())
    max_marks = float(student_df["marks"].max()) if total_assignments > 0 else 0

    subject_marks = student_df.groupby("subject")["marks"].mean().to_dict()
    best_subject = max(subject_marks, key=subject_marks.get) if subject_marks else None
    weakest_subject = min(subject_marks, key=subject_marks.get) if subject_marks else None

    student_df["submit_date_parsed"] = pd.to_datetime(student_df["submit_date"])
    recent_df = student_df.sort_values("submit_date_parsed", ascending=False).head(3)
    recent_avg = float(recent_df["marks"].mean()) if not recent_df.empty else avg_marks

    forecast = "Stable"
    if recent_avg > avg_marks + 5:
        forecast = "Improving"
    elif recent_avg < avg_marks - 5:
        forecast = "Declining"

    success_rate = (completed_assignments / total_assignments * 100) if total_assignments > 0 else 0

    return {
        "username": username,
        "total_assignments": int(total_assignments),
        "completed_assignments": int(completed_assignments),
        "success_rate": round(success_rate, 1),
        "avg_marks": round(avg_marks, 2),
        "highest_marks": round(max_marks, 2),
        "best_subject": best_subject,
        "weakest_subject": weakest_subject,
        "recent_trend_avg": round(recent_avg, 2),
        "forecast": forecast,
        "subject_performance": subject_marks,
    }


def analyze_teacher(df, username):
    """
    Perform deep analysis on a teacher's performance (grading speed, average marks given).
    """
    if df.empty:
        return {"error": "No data found"}

    teacher_df = df[df["graded_by"] == username].copy()
    if teacher_df.empty:
        return {"error": "No graded assignments found for this teacher"}

    teacher_df["marks"] = pd.to_numeric(teacher_df["marks"], errors="coerce").fillna(0)

    total_graded = len(teacher_df)
    avg_marks_given = float(teacher_df["marks"].mean())

    teacher_df["submit_date_parsed"] = pd.to_datetime(teacher_df["submit_date"])
    teacher_df["graded_at_parsed"] = pd.to_datetime(teacher_df["graded_at"])
    teacher_df["grading_time_days"] = (teacher_df["graded_at_parsed"] - teacher_df["submit_date_parsed"]).dt.total_seconds() / (24 * 3600)

    valid_times = teacher_df["grading_time_days"].dropna()
    avg_grading_speed = float(valid_times.mean()) if not valid_times.empty else 0

    passed_assignments = len(teacher_df[teacher_df["marks"] >= 50])
    student_success_rate = (passed_assignments / total_graded * 100) if total_graded > 0 else 0

    speed_rating = "Fast"
    if avg_grading_speed > 7:
        speed_rating = "Slow"
    elif avg_grading_speed > 3:
        speed_rating = "Average"

    return {
        "username": username,
        "total_graded": int(total_graded),
        "avg_marks_given": round(avg_marks_given, 2),
        "avg_grading_speed_days": round(avg_grading_speed, 1),
        "grading_speed_rating": speed_rating,
        "student_success_rate": round(student_success_rate, 1),
    }


def predict_performance(df):
    """
    Predict if a student is likely to perform well or poorly
    based on their assignment scores and submission habits.
    """
    if df.empty:
        return []

    df = df.copy()
    df["marks"] = pd.to_numeric(df["marks"], errors="coerce").fillna(0)

    student_stats = df.groupby(["student_id", "username"], dropna=False).agg(
        {"assignment_id": "count", "marks": ["mean", "min", "max"]}
    ).reset_index()
    student_stats.columns = ["student_id", "username", "total_submissions", "avg_marks", "min_marks", "max_marks"]
    student_stats.fillna(0, inplace=True)

    features = student_stats[["total_submissions", "avg_marks", "min_marks", "max_marks"]]
    y_dummy = ((student_stats["avg_marks"] >= 50) | (student_stats["total_submissions"] >= 3)).astype(int)

    rf = RandomForestClassifier(n_estimators=10, random_state=42)
    if len(y_dummy.unique()) == 1:
        probabilities = np.full(len(y_dummy), 0.9 if y_dummy.iloc[0] == 1 else 0.1)
    else:
        rf.fit(features, y_dummy)
        probabilities = rf.predict_proba(features)[:, 1]

    student_stats["pass_probability"] = np.round(probabilities * 100, 2)
    return student_stats[["student_id", "username", "total_submissions", "avg_marks", "pass_probability"]].to_dict("records")


def cluster_students(df):
    """
    Cluster students into 3 groups based on their assignment metrics.
    """
    if df.empty:
        return []

    df = df.copy()
    df["marks"] = pd.to_numeric(df["marks"], errors="coerce").fillna(0)

    student_stats = df.groupby(["student_id", "username"], dropna=False).agg(
        {"assignment_id": "count", "marks": "mean"}
    ).reset_index()
    student_stats.columns = ["student_id", "username", "total_submissions", "avg_marks"]
    student_stats.fillna(0, inplace=True)

    features = student_stats[["total_submissions", "avg_marks"]]
    scaler = StandardScaler()
    scaled_features = scaler.fit_transform(features)

    n_clusters = min(3, len(features))
    if n_clusters < 2:
        student_stats["cluster"] = 0
    else:
        kmeans = KMeans(n_clusters=n_clusters, random_state=42)
        raw_cluster = kmeans.fit_predict(scaled_features)
        student_stats["raw_cluster"] = raw_cluster
        cluster_means = student_stats.groupby("raw_cluster")["avg_marks"].mean().sort_values()
        mapping = {old_label: new_label for new_label, old_label in enumerate(cluster_means.index)}
        student_stats["cluster"] = student_stats["raw_cluster"].map(mapping)
        student_stats.drop(columns=["raw_cluster"], inplace=True)

    return student_stats.to_dict("records")
