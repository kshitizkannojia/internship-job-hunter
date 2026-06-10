from __future__ import annotations
"""
Company CRUD routes.
GET  /api/companies       — list with filtering, pagination, search
POST /api/companies       — create a company
GET  /api/companies/:id   — get one
PUT  /api/companies/:id   — update
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_

from app.database import get_db
from app.models import Company

router = APIRouter()


@router.get("")
async def list_companies(
    status: str | None = None,
    search: str | None = None,
    limit: int = Query(default=20, le=100),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    query = select(Company).order_by(Company.created_at.desc())

    if status:
        query = query.where(Company.status == status)
    if search:
        pattern = f"%{search}%"
        query = query.where(
            or_(Company.name.ilike(pattern), Company.industry.ilike(pattern))
        )

    # Total count
    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    # Paginated results
    rows = (await db.execute(query.offset(offset).limit(limit))).scalars().all()

    return {
        "companies": [_serialize(c) for c in rows],
        "total": total,
    }


@router.get("/{company_id}")
async def get_company(company_id: str, db: AsyncSession = Depends(get_db)):
    company = await db.get(Company, company_id)
    if not company:
        return {"error": "Not found"}, 404
    return _serialize(company)


@router.post("")
async def create_company(data: dict, db: AsyncSession = Depends(get_db)):
    company = Company(
        name=data["name"],
        website=data.get("website"),
        contact_name=data.get("contactName"),
        contact_email=data.get("contactEmail"),
        contact_title=data.get("contactTitle"),
        linkedin_url=data.get("linkedinUrl"),
        industry=data.get("industry"),
        location=data.get("location"),
        size=data.get("size"),
        tech_stack=data.get("techStack", []),
        recent_news=data.get("recentNews"),
        role_hint=data.get("roleHint"),
        status=data.get("status", "discovered"),
        source=data.get("source"),
    )
    db.add(company)
    await db.flush()
    return _serialize(company)


@router.put("/{company_id}")
async def update_company(company_id: str, data: dict, db: AsyncSession = Depends(get_db)):
    company = await db.get(Company, company_id)
    if not company:
        return {"error": "Not found"}, 404

    for key, val in data.items():
        # Convert camelCase keys to snake_case attribute names
        attr = _camel_to_snake(key)
        if hasattr(company, attr):
            setattr(company, attr, val)

    await db.flush()
    return _serialize(company)


# ── Helpers ──────────────────────────────────────────────────

def _serialize(c: Company) -> dict:
    return {
        "id": c.id,
        "name": c.name,
        "website": c.website,
        "contactName": c.contact_name,
        "contactEmail": c.contact_email,
        "contactTitle": c.contact_title,
        "linkedinUrl": c.linkedin_url,
        "industry": c.industry,
        "location": c.location,
        "size": c.size,
        "techStack": c.tech_stack or [],
        "recentNews": c.recent_news,
        "roleHint": c.role_hint,
        "status": c.status,
        "source": c.source,
        "createdAt": c.created_at.isoformat() if c.created_at else None,
        "updatedAt": c.updated_at.isoformat() if c.updated_at else None,
    }


def _camel_to_snake(name: str) -> str:
    import re
    return re.sub(r"(?<!^)(?=[A-Z])", "_", name).lower()
