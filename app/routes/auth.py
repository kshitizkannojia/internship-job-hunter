"""
Gmail OAuth2 routes.
GET  /auth/gmail           — redirect to Google consent screen
GET  /auth/gmail/callback  — handle OAuth callback, store tokens
GET  /auth/gmail/status    — check if Gmail is connected
GET  /auth/status          — check all API key statuses
"""

from fastapi import APIRouter, Depends, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import get_settings
from app.database import get_db
from app.models import Setting

router = APIRouter()


def _get_oauth_flow():
    """Build Google OAuth2 flow object."""
    from google_auth_oauthlib.flow import Flow

    cfg = get_settings()
    if not cfg.gmail_client_id or not cfg.gmail_client_secret:
        raise ValueError("GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET must be set in .env")

    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": cfg.gmail_client_id,
                "client_secret": cfg.gmail_client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        },
        scopes=[
            "https://www.googleapis.com/auth/gmail.send",
            "https://www.googleapis.com/auth/gmail.readonly",
            "https://www.googleapis.com/auth/gmail.modify",
        ],
        redirect_uri=cfg.gmail_redirect_uri,
    )
    return flow


@router.get("/gmail")
async def gmail_auth():
    """Redirect user to Google consent screen."""
    flow = _get_oauth_flow()
    auth_url, _ = flow.authorization_url(access_type="offline", prompt="consent")
    return RedirectResponse(auth_url)


@router.get("/gmail/callback")
async def gmail_callback(request: Request, db: AsyncSession = Depends(get_db)):
    """Handle Google's OAuth redirect — store tokens in DB."""
    code = request.query_params.get("code")
    error = request.query_params.get("error")

    if error:
        return {"error": f"OAuth error: {error}"}
    if not code:
        return {"error": "Missing authorization code"}

    flow = _get_oauth_flow()
    flow.fetch_token(code=code)
    creds = flow.credentials

    # Save tokens
    await _upsert_setting(db, "gmail_access_token", creds.token)
    if creds.refresh_token:
        await _upsert_setting(db, "gmail_refresh_token", creds.refresh_token)
    if creds.expiry:
        await _upsert_setting(db, "gmail_token_expiry", str(creds.expiry.timestamp()))

    await db.flush()
    print("Gmail OAuth: tokens saved successfully")

    return RedirectResponse("/?gmail=connected")


@router.get("/gmail/status")
async def gmail_status(db: AsyncSession = Depends(get_db)):
    token = await db.get(Setting, "gmail_refresh_token")
    return {"connected": bool(token and token.value)}


@router.get("/status")
async def api_status(db: AsyncSession = Depends(get_db)):
    """Check which API keys / services are configured."""
    cfg = get_settings()
    gmail_token = await db.get(Setting, "gmail_refresh_token")

    return {
        "gmailConnected": bool(gmail_token and gmail_token.value),
        "groqConfigured": bool(cfg.groq_api_key),
        "geminiConfigured": bool(cfg.gemini_api_key),
        "anthropicConfigured": bool(cfg.anthropic_api_key),
        "apolloConfigured": bool(cfg.apollo_api_key),
        "zeroBounceConfigured": bool(cfg.zerobounce_api_key),
    }


# ── Helpers ──────────────────────────────────────────────────

async def _upsert_setting(db: AsyncSession, key: str, value: str):
    existing = await db.get(Setting, key)
    if existing:
        existing.value = value
    else:
        db.add(Setting(key=key, value=value))
