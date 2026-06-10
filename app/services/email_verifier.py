from __future__ import annotations
"""
ZeroBounce Email Verification.

Free tier: 100 free verifications/month.
Checks deliverability for cold email targets.
"""

import httpx
from app.config import get_settings


async def verify_email(email: str) -> dict | None:
    """Verify a single email address. Returns {status, result, score} or None."""
    if not email:
        return None

    api_key = get_settings().zerobounce_api_key
    if not api_key:
        print("ZeroBounce API key not set — skipping verification")
        return None

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                "https://api.zerobounce.net/v2/validate",
                params={"api_key": api_key, "email": email},
            )
            if resp.status_code != 200:
                return None

            data = resp.json()
            result = "deliverable" if data.get("status") == "valid" else "undeliverable"

            return {
                "status": data.get("status"),
                "result": result,
                "score": 50 if data.get("sub_status") else 100,
            }

    except Exception as e:
        print(f"ZeroBounce verify error for {email}: {e}")
        return None
