from functools import lru_cache
from typing import Any, List

from pydantic_settings import BaseSettings, SettingsConfigDict

from app.core.db_uri import sanitize_and_normalize_mongodb_uri


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "FINAL2 API"
    app_env: str = "development"

    # Recognized connection string environment variables
    mongodb_uri: str | None = None
    database_url: str | None = None
    mongo_uri: str | None = None
    mongodb_url: str | None = None

    mongodb_db_name: str = "final"
    jwt_secret: str = "change-me"
    jwt_refresh_secret: str = "change-me-too"
    jwt_access_expires_minutes: int = 30
    jwt_refresh_expires_days: int = 14
    cors_origins: str = "http://localhost:3000"
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from_name: str = "FINAL2 Portal"
    smtp_from_email: str = ""
    upload_dir: str = "./uploads"
    max_upload_mb: int = 25

    @property
    def raw_mongodb_uri(self) -> str:
        """
        Check all standard environment variable names:
        1. MONGODB_URI
        2. DATABASE_URL (Render blueprint standard)
        3. MONGO_URI
        4. MONGODB_URL
        """
        for candidate in [self.mongodb_uri, self.database_url, self.mongo_uri, self.mongodb_url]:
            if candidate and candidate.strip():
                return candidate.strip()
        return "mongodb://localhost:27017"

    @property
    def effective_mongodb_uri(self) -> str:
        sanitized, _ = sanitize_and_normalize_mongodb_uri(self.raw_mongodb_uri, self.mongodb_db_name)
        return sanitized

    @property
    def mongodb_diagnostics(self) -> dict[str, Any]:
        _, diag = sanitize_and_normalize_mongodb_uri(self.raw_mongodb_uri, self.mongodb_db_name)
        return diag

    @property
    def cors_origin_list(self) -> List[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def cookie_secure(self) -> bool:
        return self.app_env.lower() == "production"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
