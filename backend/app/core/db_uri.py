import logging
import urllib.parse
from typing import Any

logger = logging.getLogger("app.db_uri")


def sanitize_and_normalize_mongodb_uri(uri: str | None, default_db: str = "final") -> tuple[str, dict[str, Any]]:
    """
    Sanitize and normalize MongoDB connection string:
    - Strips accidental leading/trailing whitespace, newlines, and single/double quotes.
    - Preserves local MongoDB connections (mongodb://localhost:27017).
    - Detects unencoded special characters in username/password and safely percent-encodes them per RFC 3986.
    - Ensures target database name is populated.
    - Appends 'authSource=admin' if connecting to MongoDB Atlas (+srv) without an explicit authSource.
    - Detects unpopulated template brackets ('<' or '>') from copy-pasting.
    - Returns sanitized URI and a safe diagnostic dictionary with masked credentials.
    """
    if not uri or not uri.strip():
        fallback = "mongodb://localhost:27017"
        return fallback, {
            "is_valid": True,
            "masked_uri": fallback,
            "has_placeholder_brackets": False,
            "had_whitespace_or_quotes": False,
            "encoded_special_chars": False,
            "added_auth_source": False,
            "username": None,
            "host": "localhost:27017",
            "database": default_db,
        }

    raw = uri
    cleaned = raw.strip().strip("'\"").strip()

    diagnostics: dict[str, Any] = {
        "is_valid": True,
        "had_whitespace_or_quotes": (raw != cleaned),
        "has_placeholder_brackets": False,
        "encoded_special_chars": False,
        "added_auth_source": False,
        "username": None,
        "host": None,
        "database": default_db,
        "masked_uri": "",
    }

    if not (cleaned.startswith("mongodb://") or cleaned.startswith("mongodb+srv://")):
        diagnostics["masked_uri"] = cleaned
        return cleaned, diagnostics

    prefix, rest = cleaned.split("://", 1)

    # If there are no credentials (e.g. local mongodb://localhost:27017)
    if "@" not in rest:
        diagnostics["masked_uri"] = f"{prefix}://{rest}"
        diagnostics["host"] = rest.split("/")[0] if "/" in rest else rest
        return cleaned, diagnostics

    # The last '@' splits userinfo from host and database path
    userinfo, host_and_path = rest.rsplit("@", 1)

    if ":" in userinfo:
        raw_user, raw_pass = userinfo.split(":", 1)
    else:
        raw_user, raw_pass = userinfo, ""

    # Check for placeholder angle brackets e.g. <DB_PASSWORD>
    if "<" in raw_user or ">" in raw_user or "<" in raw_pass or ">" in raw_pass:
        diagnostics["has_placeholder_brackets"] = True

    # Safely percent-encode password and username for RFC 3986 compliance
    unquoted_pass = urllib.parse.unquote_plus(raw_pass)
    encoded_pass = urllib.parse.quote_plus(unquoted_pass)
    if encoded_pass != raw_pass:
        diagnostics["encoded_special_chars"] = True

    unquoted_user = urllib.parse.unquote_plus(raw_user)
    encoded_user = urllib.parse.quote_plus(unquoted_user)

    diagnostics["username"] = unquoted_user

    # Parse host, path, and query string
    if "/" in host_and_path:
        host, path_and_query = host_and_path.split("/", 1)
    else:
        host = host_and_path
        path_and_query = ""

    diagnostics["host"] = host

    if "?" in path_and_query:
        db_part, query_part = path_and_query.split("?", 1)
    else:
        db_part = path_and_query
        query_part = ""

    target_db = db_part.strip() if db_part.strip() else default_db
    diagnostics["database"] = target_db

    # Parse query parameters safely
    query_params = urllib.parse.parse_qs(query_part, keep_blank_values=True)

    # Check if authSource is specified (Atlas database users authenticate against 'admin' by default)
    has_auth_source = any(k.lower() == "authsource" for k in query_params)
    if not has_auth_source and prefix == "mongodb+srv":
        query_params["authSource"] = ["admin"]
        diagnostics["added_auth_source"] = True

    if "retryWrites" not in query_params and prefix == "mongodb+srv":
        query_params["retryWrites"] = ["true"]

    # Reassemble query parameters
    new_query_pairs: list[str] = []
    for k, v_list in query_params.items():
        for val in v_list:
            new_query_pairs.append(f"{k}={val}")
    new_query_str = "&".join(new_query_pairs)

    sanitized_uri = f"{prefix}://{encoded_user}:{encoded_pass}@{host}/{target_db}?{new_query_str}"
    diagnostics["masked_uri"] = f"{prefix}://{encoded_user}:*****@{host}/{target_db}?{new_query_str}"

    return sanitized_uri, diagnostics

