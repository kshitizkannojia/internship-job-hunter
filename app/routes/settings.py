"""
Settings routes — key-value config store.
GET  /api/settings — get all settings as a flat object
POST /api/settings — save multiple settings at once
"""

import json
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import Setting

router = APIRouter()


@router.get("")
async def get_settings(db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(Setting))).scalars().all()
    result = {}
    for row in rows:
        try:
            result[row.key] = json.loads(row.value)
        except (json.JSONDecodeError, TypeError):
            result[row.key] = row.value
    return result


@router.post("")
async def save_settings(data: dict, db: AsyncSession = Depends(get_db)):
    for key, value in data.items():
        str_value = json.dumps(value) if not isinstance(value, str) else value

        existing = await db.get(Setting, key)
        if existing:
            existing.value = str_value
        else:
            db.add(Setting(key=key, value=str_value))

    await db.flush()
    return {"ok": True}
