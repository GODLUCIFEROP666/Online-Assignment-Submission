from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "FINAL2 API"
    app_env: str = "development"
    database_url: str = "mysql+mysqlconnector://root:@localhost/final"
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
    analytics_db_host: str = "localhost"
    analytics_db_user: str = "root"
    analytics_db_password: str = ""
    analytics_db_name: str = "final"

    @property
    def cors_origin_list(self) -> List[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def cookie_secure(self) -> bool:
        return self.app_env.lower() == "production"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
