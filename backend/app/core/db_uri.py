from __future__ import annotations

import logging
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


def sanitize_and_normalize_mongodb_uri(
    uri: str | None,
    default_db: str = "final",
    selected_var: str = "MONGODB_URI",
    other_vars: list[str] | None = None,
) -> tuple[str, dict[str, Any]]:
    """
    Safely normalize MongoDB connection string:
    1. Strips accidental outer whitespace, newlines, and surrounding quotes.
    2. Safely handles special characters in credentials (e.g. unescaped @, literal +)
       without corrupting already URL-encoded credentials (%2B, %40, %25, etc.).
    3. For Atlas SRV connections (mongodb+srv://), ensures authSource=admin is present
       unless explicitly set, matching Atlas user authentication database requirements.
    4. Detects placeholder angle brackets ('<' or '>') from template copy-pasting.
    5. Returns the clean URI and comprehensive safe diagnostics (never logging secrets).
    """
    other_vars = other_vars or []

    if not uri or not uri.strip():
        fallback = "mongodb://localhost:27017"
        return fallback, {
            "selected_var": selected_var,
            "other_configured_vars": other_vars,
            "is_valid": True,
            "scheme": "mongodb",
            "host": "localhost:27017",
            "database_path": None,
            "auth_source": "default",
            "has_username": False,
            "username_masked": None,
            "has_password": False,
            "password_length": 0,
            "has_placeholder_brackets": False,
            "had_whitespace_or_quotes": False,
            "masked_uri": fallback,
        }

    raw = uri
    cleaned = raw.strip().strip("'\"").strip()
    had_whitespace_or_quotes = (raw != cleaned)

    if not (cleaned.startswith("mongodb://") or cleaned.startswith("mongodb+srv://")):
        return cleaned, {
            "selected_var": selected_var,
            "other_configured_vars": other_vars,
            "is_valid": False,
            "scheme": "unknown",
            "host": "unknown",
            "database_path": None,
            "auth_source": "unknown",
            "has_username": False,
            "username_masked": None,
            "has_password": False,
            "password_length": 0,
            "has_placeholder_brackets": False,
            "had_whitespace_or_quotes": had_whitespace_or_quotes,
            "masked_uri": mask_mongodb_uri(cleaned),
        }

    prefix, rest = cleaned.split("://", 1)
    scheme = prefix

    userinfo: str | None = None
    host_and_rest = rest
    if "@" in rest:
        userinfo, host_and_rest = rest.rsplit("@", 1)

    has_brackets = False
    has_user = False
    has_pass = False
    username_masked: str | None = None
    password_len = 0

    if userinfo:
        if "<" in userinfo or ">" in userinfo:
            has_brackets = True

        if ":" in userinfo:
            raw_user, raw_pass = userinfo.split(":", 1)
            has_user = bool(raw_user)
            has_pass = bool(raw_pass)
            username_masked = f"{raw_user[:3]}***" if len(raw_user) > 3 else "***"
            password_len = len(raw_pass)

            # Safely percent-encode unescaped @ and literal + without double-encoding
            # 1. Unescaped @ in password becomes %40
            # 2. Literal + in password becomes %2B so PyMongo does not unquote it to space
            escaped_pass = raw_pass.replace("@", "%40").replace("+", "%2B")
            cleaned = f"{prefix}://{raw_user}:{escaped_pass}@{host_and_rest}"
        else:
            has_user = bool(userinfo)
            username_masked = f"{userinfo[:3]}***" if len(userinfo) > 3 else "***"

    # Extract host, path, and query params safely
    host_part = host_and_rest
    path_db: str | None = None
    query_part = ""

    if "/" in host_part:
        host_only, path_and_query = host_part.split("/", 1)
        host_part = host_only
        if "?" in path_and_query:
            path_db_raw, query_part = path_and_query.split("?", 1)
            path_db = path_db_raw if path_db_raw else None
        else:
            path_db = path_and_query if path_and_query else None
    elif "?" in host_part:
        host_only, query_part = host_part.split("?", 1)
        host_part = host_only

    # Determine auth_source
    auth_source = "default"
    lower_query = query_part.lower()
    if "authsource=" in lower_query:
        # Extract existing authSource value
        for param in query_part.split("&"):
            if param.lower().startswith("authsource="):
                auth_source = param.split("=", 1)[1]
                break
    elif scheme == "mongodb+srv":
        # For Atlas SRV, all users reside in 'admin' auth database.
        # If not explicitly specified, append authSource=admin
        auth_source = "admin"
        sep = "&" if "?" in cleaned else "?"
        cleaned = f"{cleaned}{sep}authSource=admin"

    diagnostics: dict[str, Any] = {
        "selected_var": selected_var,
        "other_configured_vars": other_vars,
        "is_valid": True,
        "scheme": scheme,
        "host": host_part,
        "database_path": path_db,
        "auth_source": auth_source,
        "has_username": has_user,
        "username_masked": username_masked,
        "has_password": has_pass,
        "password_length": password_len,
        "has_placeholder_brackets": has_brackets,
        "had_whitespace_or_quotes": had_whitespace_or_quotes,
        "masked_uri": mask_mongodb_uri(cleaned),
    }

    return cleaned, diagnostics
