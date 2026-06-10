"""
Application configuration — loads from .env via Pydantic Settings.
Every env var listed here is validated at startup; missing required
vars crash immediately with a clear error instead of failing later.
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # ── Database ─────────────────────────────────────────────
    database_url: str

    # ── Server ───────────────────────────────────────────────
    port: int = 8000
    env: str = "development"

    # ── AI providers (Groq is primary, others are fallbacks) ─
    groq_api_key: str = ""
    gemini_api_key: str = ""
    anthropic_api_key: str = ""

    # ── Scraping ─────────────────────────────────────────────
    apollo_api_key: str = ""

    # ── Email verification ───────────────────────────────────
    zerobounce_api_key: str = ""

    # ── Gmail OAuth2 ─────────────────────────────────────────
    gmail_client_id: str = ""
    gmail_client_secret: str = ""
    gmail_redirect_uri: str = "http://localhost:8000/auth/gmail/callback"

    # ── Tracking ─────────────────────────────────────────────
    tracking_base_url: str = "http://localhost:8000/track"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
