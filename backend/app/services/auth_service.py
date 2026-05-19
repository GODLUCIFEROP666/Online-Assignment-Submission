from app.core.security import create_access_token, create_refresh_token


def build_token_pair(subject: str, claims: dict | None = None) -> dict[str, str]:
    return {
        "access_token": create_access_token(subject, claims),
        "refresh_token": create_refresh_token(subject, claims),
    }
