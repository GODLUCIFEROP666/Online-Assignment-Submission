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
    def configured_mongodb_vars(self) -> dict[str, str]:
        candidates = {
            "MONGODB_URI": self.mongodb_uri,
            "DATABASE_URL": self.database_url,
            "MONGO_URI": self.mongo_uri,
            "MONGODB_URL": self.mongodb_url,
        }
        return {k: v.strip() for k, v in candidates.items() if v and v.strip()}

    @property
    def selected_mongodb_env_var(self) -> str:
        # Priority order: MONGODB_URI -> DATABASE_URL -> MONGO_URI -> MONGODB_URL
        for name in ["MONGODB_URI", "DATABASE_URL", "MONGO_URI", "MONGODB_URL"]:
            val = getattr(self, name.lower(), None)
            if val and val.strip():
                cleaned = val.strip().strip("'\"").strip()
                if cleaned.startswith("mongodb://") or cleaned.startswith("mongodb+srv://"):
                    return name

        # If none start with mongodb://, check if any is configured
        for name in ["MONGODB_URI", "DATABASE_URL", "MONGO_URI", "MONGODB_URL"]:
            val = getattr(self, name.lower(), None)
            if val and val.strip():
                return name

        return "fallback_localhost"

    @property
    def raw_mongodb_uri(self) -> str:
        selected = self.selected_mongodb_env_var
        if selected != "fallback_localhost":
            val = getattr(self, selected.lower(), None)
            if val and val.strip():
                return val.strip()
        return "mongodb://localhost:27017"

    @property
    def effective_mongodb_uri(self) -> str:
        other_vars = [k for k in self.configured_mongodb_vars if k != self.selected_mongodb_env_var]
        sanitized, _ = sanitize_and_normalize_mongodb_uri(
            self.raw_mongodb_uri,
            self.mongodb_db_name,
            selected_var=self.selected_mongodb_env_var,
            other_vars=other_vars,
        )
        return sanitized

    @property
    def mongodb_diagnostics(self) -> dict[str, Any]:
        other_vars = [k for k in self.configured_mongodb_vars if k != self.selected_mongodb_env_var]
        _, diag = sanitize_and_normalize_mongodb_uri(
            self.raw_mongodb_uri,
            self.mongodb_db_name,
            selected_var=self.selected_mongodb_env_var,
            other_vars=other_vars,
        )
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
