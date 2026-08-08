"""Application configuration.

All values can be overridden via environment variables. Defaults match the
local Homebrew PostgreSQL instance provisioned for development.
"""
from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings

PROJECT_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    app_name: str = "Activ Paisa API"
    database_url: str = "postgresql+psycopg://activpaisa:activpaisa_dev_2026@127.0.0.1:5432/activpaisa"
    jwt_secret: str = "activpaisa-local-secret-change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_days: int = 7
    static_root: str | Path = PROJECT_ROOT
    trusted_origins: list[str] = ["*"]

    model_config = {"env_prefix": "ACTIVPAISA_", "env_file": ".env", "extra": "ignore"}


settings = Settings()