import asyncio
import os
import sys
import pandas as pd
from motor.motor_asyncio import AsyncIOMotorClient

# Add current directory to path to resolve imports correctly
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.analytics import ml_models
from app.services.analytics_service import _assignment_rows

async def run_analysis():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client.final

    print("Fetching student and assignment records from MongoDB...")
    rows = await _assignment_rows(db)
    df = pd.DataFrame(rows)

    if df.empty:
        print("Error: No assignment records found in MongoDB. Please run 'seed_ml_data.py' first.")
        return

    print(f"Successfully loaded {len(df)} assignment submissions across {df['username'].nunique()} students.")

    # 1. Clustering analysis
    print("\n" + "="*50)
    print("1. MACHINE LEARNING CLUSTERING ANALYSIS")
    print("="*50)
    print("Clustering students into 3 academic profiles based on submission count and average grades...")
    clusters = ml_models.cluster_students(df)
    
    cluster_mapping = {
        0: "At-Risk Performer (Low Activity / Lower Grades)",
        1: "Average Performer (Medium Activity / Passing Grades)",
        2: "High Achiever (High Activity / Top Grades)"
    }
    
    clusters_df = pd.DataFrame(clusters)
    if not clusters_df.empty:
        clusters_df["profile_label"] = clusters_df["cluster"].map(cluster_mapping)
        # Sort by cluster label descending (High Achievers first)
        clusters_df = clusters_df.sort_values(by="cluster", ascending=False)
        print(clusters_df[["username", "total_submissions", "avg_marks", "profile_label"]].to_string(index=False))
    else:
        print("Not enough data to form clusters.")

    # 2. Performance Predictions
    print("\n" + "="*50)
    print("2. RANDOM FOREST PERFORMANCE PREDICTIONS")
    print("="*50)
    print("Predicting student pass probabilities based on current submission habits and average grades...")
    predictions = ml_models.predict_performance(df)
    predictions_df = pd.DataFrame(predictions)
    if not predictions_df.empty:
        predictions_df = predictions_df.sort_values(by="pass_probability", ascending=False)
        print(predictions_df[["username", "total_submissions", "avg_marks", "pass_probability"]].to_string(index=False))
    else:
        print("No prediction output.")

    # 3. Individual Performance Deep Dive
    print("\n" + "="*50)
    print("3. INDIVIDUAL STUDENT DEEP DIVE & TREND FORECASTS")
    print("="*50)
    for username in df["username"].dropna().unique():
        analysis = ml_models.analyze_student(df, username)
        if "error" not in analysis:
            trend_icon = "(+)" if analysis["forecast"] == "Improving" else ("(-)" if analysis["forecast"] == "Declining" else "(=)")
            print(f"Student: {username:<12} | Avg Marks: {analysis['avg_marks']:.1f} | Success Rate: {analysis['success_rate']}% | Trend: {trend_icon} {analysis['forecast']}")

    # Save report
    report_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ml_analysis_report.txt")
    with open(report_path, "w", encoding="utf-8") as f:
        f.write("="*60 + "\n")
        f.write("            ACADEMIC PERFORMANCE ML ANALYSIS REPORT\n")
        f.write("="*60 + "\n")
        f.write(f"Analyzed on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"Total Assignment Records: {len(df)}\n")
        f.write(f"Total Students: {df['username'].nunique()}\n\n")
        
        f.write("--- 1. Clusters ---\n")
        f.write(clusters_df[["username", "total_submissions", "avg_marks", "profile_label"]].to_string(index=False) + "\n\n")
        
        f.write("--- 2. Predictions ---\n")
        f.write(predictions_df[["username", "total_submissions", "avg_marks", "pass_probability"]].to_string(index=False) + "\n\n")
        
    print(f"\nReport saved to: {report_path}")

if __name__ == "__main__":
    from datetime import datetime
    asyncio.run(run_analysis())
