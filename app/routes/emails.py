from __future__ import annotations
"""
Email routes.
GET   /api/emails           — list with status filter
GET   /api/emails/:id       — get one
POST  /api/emails/:id/approve — approve a draft
PUT   /api/emails/:id       — edit a draft
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Email, Company

router = APIRouter()


@router.get("")
async def list_emails(
    status: str | None = None,
    limit: int = Query(default=50, le=200),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Email)
        .options(selectinload(Email.company))
        .order_by(Email.created_at.desc())
    )

    if status:
        query = query.where(Email.status == status)

    total = (await db.execute(
        select(func.count()).select_from(query.subquery())
    )).scalar() or 0

    rows = (await db.execute(query.offset(offset).limit(limit))).scalars().all()

    return {
        "emails": [_serialize(e) for e in rows],
        "total": total,
    }


@router.get("/{email_id}")
async def get_email(email_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(Email).options(selectinload(Email.company)).where(Email.id == email_id)
    email = (await db.execute(stmt)).scalar_one_or_none()
    if not email:
        return {"error": "Not found"}, 404
    return _serialize(email)


@router.post("/{email_id}/approve")
async def approve_email(email_id: str, db: AsyncSession = Depends(get_db)):
    email = await db.get(Email, email_id)
    if not email:
        return {"error": "Not found"}, 404
    if email.status != "draft":
        return {"error": f"Cannot approve email with status '{email.status}'"}, 400

    email.status = "approved"
    await db.flush()
    return {"id": email.id, "status": "approved"}


@router.put("/{email_id}")
async def update_email(email_id: str, data: dict, db: AsyncSession = Depends(get_db)):
    email = await db.get(Email, email_id)
    if not email:
        return {"error": "Not found"}, 404

    if "subjectA" in data:
        email.subject_a = data["subjectA"]
    if "subjectB" in data:
        email.subject_b = data["subjectB"]
    if "body" in data:
        email.body = data["body"]
    if "followupBody" in data:
        email.followup_body = data["followupBody"]

    await db.flush()
    return _serialize(email)


# ── Helpers ──────────────────────────────────────────────────

def _serialize(e: Email) -> dict:
    return {
        "id": e.id,
        "companyId": e.company_id,
        "company": {"id": e.company.id, "name": e.company.name} if e.company else None,
        "subjectA": e.subject_a,
        "subjectB": e.subject_b,
        "chosenSubject": e.chosen_subject,
        "body": e.body,
        "followupBody": e.followup_body,
        "status": e.status,
        "sentAt": e.sent_at.isoformat() if e.sent_at else None,
        "openedAt": e.opened_at.isoformat() if e.opened_at else None,
        "repliedAt": e.replied_at.isoformat() if e.replied_at else None,
        "followupSentAt": e.followup_sent_at.isoformat() if e.followup_sent_at else None,
        "createdAt": e.created_at.isoformat() if e.created_at else None,
    }
