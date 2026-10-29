import logging
import urllib.parse
from typing import Any

logger = logging.getLogger("app.db_uri")


def mask_mongodb_uri(uri: str | None) -> str:
    """
    Safely mask credentials in a MongoDB URI for logging.
    Never exposes passwords, tokens, or secrets.
    """
    if not uri or not uri.strip():
        return "mongodb://localhost:27017"

    cleaned = uri.strip().strip("'\"").strip()
    if not (cleaned.startswith("mongodb://") or cleaned.startswith("mongodb+srv://")):
        return cleaned

    if "@" not in cleaned:
        return cleaned

    prefix, rest = cleaned.split("://", 1)
    userinfo, host_and_rest = rest.rsplit("@", 1)

    if ":" in userinfo:
        user, _ = userinfo.split(":", 1)
        return f"{prefix}://{user}:*****@{host_and_rest}"
    return f"{prefix}://*****@{host_and_rest}"


def sanitize_and_normalize_mongodb_uri(uri: str | None, default_db: str = "final") -> tuple[str, dict[str, Any]]:
    """
    Safely normalize MongoDB connection string:
    1. Strips accidental outer whitespace, newlines, and surrounding quotes.
    2. Preserves valid MongoDB Atlas connection strings, credentials, paths, and query parameters intact.
    3. Avoids destructive unquoting/re-encoding that corrupts literal '+' or already URL-encoded characters.
    4. Detects placeholder angle brackets ('<' or '>') from template copy-pasting.
    5. Returns the clean URI and safe diagnostics (with masked credentials).
    """
    if not uri or not uri.strip():
        fallback = "mongodb://localhost:27017"
        return fallback, {
            "is_valid": True,
            "masked_uri": fallback,
            "has_placeholder_brackets": False,
            "had_whitespace_or_quotes": False,
        }

    raw = uri
    cleaned = raw.strip().strip("'\"").strip()

    diagnostics: dict[str, Any] = {
        "is_valid": True,
        "had_whitespace_or_quotes": (raw != cleaned),
        "has_placeholder_brackets": False,
        "masked_uri": mask_mongodb_uri(cleaned),
    }

    if not (cleaned.startswith("mongodb://") or cleaned.startswith("mongodb+srv://")):
        return cleaned, diagnostics

    # Check for unpopulated template placeholder brackets e.g. <DB_PASSWORD>
    if "@" in cleaned:
        prefix, rest = cleaned.split("://", 1)
        userinfo, host_and_rest = rest.rsplit("@", 1)
        if "<" in userinfo or ">" in userinfo:
            diagnostics["has_placeholder_brackets"] = True

        # Only if there are multiple '@' characters before host (i.e. unescaped '@' in password),
        # perform safe escaping of the unescaped '@'
        if "@" in userinfo and ":" in userinfo:
            raw_user, raw_pass = userinfo.split(":", 1)
            # Unescaped @ in password should be %40
            escaped_pass = raw_pass.replace("@", "%40")
            cleaned = f"{prefix}://{raw_user}:{escaped_pass}@{host_and_rest}"
            diagnostics["masked_uri"] = mask_mongodb_uri(cleaned)

    # Return the clean URI without altering query params, database path, or valid credentials
    return cleaned, diagnostics
