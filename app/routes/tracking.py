"""
Tracking pixel route.
GET /track/:pixel_id — serves a 1x1 transparent GIF and records the open
"""

import base64
from datetime import datetime
from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import Email

router = APIRouter()

# 1x1 transparent GIF (43 bytes)
PIXEL = base64.b64decode(
    "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
)


@router.get("/{pixel_id}")
async def track_open(pixel_id: str, db: AsyncSession = Depends(get_db)):
    """Record an email open event when the tracking pixel is loaded."""
    email = (await db.execute(
        select(Email).where(Email.tracking_pixel_id == pixel_id)
    )).scalar_one_or_none()

    if email and email.status in ("sent", "follow_up_sent"):
        email.status = "opened"
        email.opened_at = datetime.utcnow()
        await db.flush()

    return Response(content=PIXEL, media_type="image/gif")
