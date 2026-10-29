import re
from typing import Any


def clean_text(text: str) -> str:
    """Normalize text for fair similarity comparisons."""
    if not text:
        return ""
    # Remove excessive whitespace and normalize casing for analysis
    cleaned = re.sub(r"\s+", " ", text).strip().lower()
    return cleaned


def find_matching_passages(text1: str, text2: str, min_words: int = 4) -> list[str]:
    """Extract matching word n-grams between two texts to highlight in UI."""
    words1 = clean_text(text1).split()
    words2 = set(clean_text(text2).split())
    
    matches = []
    current_match = []
    
    for word in words1:
        if word in words2:
            current_match.append(word)
        else:
            if len(current_match) >= min_words:
                matches.append(" ".join(current_match))
            current_match = []
            
    if len(current_match) >= min_words:
        matches.append(" ".join(current_match))
        
    return list(set(matches))[:10]  # Return top 10 unique matching phrases


def analyze_plagiarism(submissions: list[dict[str, Any]]) -> dict[str, Any]:
    """
    Perform a 100% local peer-to-peer plagiarism scan across submissions for an assignment.
    
    submissions format:
    [
        {"submission_id": "...", "username": "...", "student_name": "...", "content": "..."},
        ...
    ]
    """
    if len(submissions) < 2:
        return {
            "total_submissions_scanned": len(submissions),
            "max_similarity_found": 0.0,
            "flagged_count": 0,
            "pairwise_comparisons": [],
            "flagged_submissions": [],
        }

    raw_contents = [clean_text(s.get("content", "")) for s in submissions]
    
    # Filter out empty submissions for vectorization
    valid_indices = [i for i, text in enumerate(raw_contents) if len(text.split()) > 3]
    
    if len(valid_indices) < 2:
        return {
            "total_submissions_scanned": len(submissions),
            "max_similarity_found": 0.0,
            "flagged_count": 0,
            "pairwise_comparisons": [],
            "flagged_submissions": [],
        }

    valid_submissions = [submissions[i] for i in valid_indices]
    valid_texts = [raw_contents[i] for i in valid_indices]

    try:
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.metrics.pairwise import cosine_similarity

        vectorizer = TfidfVectorizer(ngram_range=(1, 2), stop_words="english")
        tfidf_matrix = vectorizer.fit_transform(valid_texts)
        similarity_matrix = cosine_similarity(tfidf_matrix)
    except Exception as e:
        # Fallback if vectorization fails (e.g. all stop words)
        print(f"TF-IDF Vectorizer fallback due to: {e}")
        similarity_matrix = [[0.0] * len(valid_texts) for _ in valid_texts]

    pairwise_results = []
    flagged_ids = set()
    max_sim = 0.0

    n = len(valid_submissions)
    for i in range(n):
        for j in range(i + 1, n):
            sim_score = float(similarity_matrix[i][j]) * 100.0
            sim_score = round(sim_score, 1)
            
            if sim_score > max_sim:
                max_sim = sim_score

            risk_level = "low"
            if sim_score >= 40.0:
                risk_level = "high"
                flagged_ids.add(valid_submissions[i].get("submission_id"))
                flagged_ids.add(valid_submissions[j].get("submission_id"))
            elif sim_score >= 20.0:
                risk_level = "medium"
                flagged_ids.add(valid_submissions[i].get("submission_id"))

            matching_passages = find_matching_passages(
                valid_submissions[i].get("content", ""),
                valid_submissions[j].get("content", "")
            )

            pairwise_results.append({
                "student1_id": valid_submissions[i].get("submission_id"),
                "student1_username": valid_submissions[i].get("username"),
                "student1_name": valid_submissions[i].get("student_name", valid_submissions[i].get("username")),
                "student2_id": valid_submissions[j].get("submission_id"),
                "student2_username": valid_submissions[j].get("username"),
                "student2_name": valid_submissions[j].get("student_name", valid_submissions[j].get("username")),
                "similarity_percentage": sim_score,
                "risk_level": risk_level,
                "matching_phrases": matching_passages,
                "text1_sample": valid_submissions[i].get("content", "")[:300],
                "text2_sample": valid_submissions[j].get("content", "")[:300],
            })

    # Sort comparisons by highest similarity first
    pairwise_results.sort(key=lambda x: x["similarity_percentage"], reverse=True)

    return {
        "total_submissions_scanned": len(submissions),
        "max_similarity_found": round(max_sim, 1),
        "flagged_count": len(flagged_ids),
        "pairwise_comparisons": pairwise_results,
        "flagged_submission_ids": list(flagged_ids),
    }
