import ast
import re
from typing import Any


def evaluate_python_code(code_text: str) -> tuple[int, list[str]]:
    """Validate Python code syntax locally using standard library ast module."""
    notes = []
    score = 40  # base code score out of 40
    
    try:
        parsed = ast.parse(code_text)
        notes.append("Code syntax is valid Python.")
        
        functions = [node for node in ast.walk(parsed) if isinstance(node, ast.FunctionDef)]
        loops = [node for node in ast.walk(parsed) if isinstance(node, (ast.For, ast.While))]
        
        if functions:
            notes.append(f"Defined {len(functions)} custom function(s).")
            score += 5
        if loops:
            notes.append(f"Implemented {len(loops)} loop construct(s).")
            score += 5
    except SyntaxError as e:
        score = 15
        notes.append(f"Syntax warning/error detected at line {e.lineno}: {e.msg}")
    except Exception:
        score = 25
        notes.append("Analyzed code structure.")
        
    return min(score, 40), notes


def auto_grade_submission(
    submission_text: str,
    assignment_title: str = "",
    rubric_keywords: list[str] | None = None,
    max_marks: float = 100.0,
    plagiarism_similarity: float = 0.0,
) -> dict[str, Any]:
    """
    100% Free local AI Auto-Grader & Feedback Generator.
    Analyzes text/code submissions locally without external paid API calls.
    """
    if not submission_text or not submission_text.strip():
        return {
            "suggested_marks": 0.0,
            "max_marks": max_marks,
            "percentage": 0.0,
            "breakdown": {
                "concept_coverage": 0,
                "structure_depth": 0,
                "syntax_formatting": 0,
                "plagiarism_penalty": 0,
            },
            "suggested_feedback": "No content submitted.",
            "notes": ["Empty submission."],
        }

    text = submission_text.strip()
    words = text.split()
    word_count = len(words)
    notes = []

    # 1. Depth & Word Count Score (max 30 points)
    depth_score = 0
    if word_count >= 200:
        depth_score = 30
        notes.append(f"Comprehensive submission depth ({word_count} words).")
    elif word_count >= 100:
        depth_score = 22
        notes.append(f"Adequate submission depth ({word_count} words).")
    elif word_count >= 50:
        depth_score = 15
        notes.append(f"Brief submission ({word_count} words).")
    else:
        depth_score = 8
        notes.append(f"Very short submission ({word_count} words).")

    # 2. Concept & Rubric Keyword Coverage (max 35 points)
    concept_score = 15  # default base
    keywords_to_check = set()
    
    if rubric_keywords:
        keywords_to_check.update([k.lower() for k in rubric_keywords])
    if assignment_title:
        # Extract meaningful title terms (length > 3)
        keywords_to_check.update([w.lower() for w in re.findall(r"\b\w{4,}\b", assignment_title)])

    matched_keywords = []
    if keywords_to_check:
        text_lower = text.lower()
        for kw in keywords_to_check:
            if kw in text_lower:
                matched_keywords.append(kw)
        
        match_ratio = len(matched_keywords) / max(len(keywords_to_check), 1)
        concept_score = int(15 + match_ratio * 20)
        if matched_keywords:
            notes.append(f"Addressed key assignment concepts: {', '.join(matched_keywords[:5])}.")
        else:
            notes.append("Few key assignment concepts explicitly identified.")

    # 3. Code Syntax & Formatting Score (max 35 points)
    is_code = "def " in text or "function" in text or "import " in text or "class " in text or "{" in text
    if is_code and ("def " in text or "import " in text or "print(" in text):
        code_score, code_notes = evaluate_python_code(text)
        syntax_score = code_score
        notes.extend(code_notes)
    else:
        # Paragraph & structure analysis
        paragraphs = [p for p in text.split("\n\n") if p.strip()]
        if len(paragraphs) >= 3:
            syntax_score = 35
            notes.append("Well-structured paragraphs and sections.")
        elif len(paragraphs) >= 2:
            syntax_score = 28
            notes.append("Structured into paragraphs.")
        else:
            syntax_score = 20
            notes.append("Single block formatting.")

    # 4. Plagiarism Penalty Adjustment
    penalty = 0
    if plagiarism_similarity >= 40.0:
        penalty = 30
        notes.append(f"WARNING: High similarity detected ({plagiarism_similarity:.1f}%). Marks penalized.")
    elif plagiarism_similarity >= 20.0:
        penalty = 15
        notes.append(f"Caution: Moderate similarity detected ({plagiarism_similarity:.1f}%).")

    total_raw_points = depth_score + concept_score + syntax_score - penalty
    total_raw_points = max(0, min(100, total_raw_points))

    # Scale to max_marks
    suggested_marks = round((total_raw_points / 100.0) * max_marks, 1)

    # Generate constructive feedback text
    feedback_parts = [f"Automated Grade Assessment: {suggested_marks}/{max_marks} ({total_raw_points}%)."]
    if matched_keywords:
        feedback_parts.append(f"Good coverage of key assignment concepts ({', '.join(matched_keywords[:4])}).")
    if word_count >= 100:
        feedback_parts.append("Work displays thorough explanation and effort.")
    else:
        feedback_parts.append("Consider elaborating further with more details or examples.")
        
    if plagiarism_similarity >= 20.0:
        feedback_parts.append(f"Note: Peer similarity scan logged a {plagiarism_similarity:.1f}% overlap.")

    return {
        "suggested_marks": suggested_marks,
        "max_marks": max_marks,
        "percentage": total_raw_points,
        "breakdown": {
            "concept_coverage": concept_score,
            "structure_depth": depth_score,
            "syntax_formatting": syntax_score,
            "plagiarism_penalty": penalty,
        },
        "suggested_feedback": " ".join(feedback_parts),
        "notes": notes,
    }
