from __future__ import annotations
"""
Agent routes — trigger scraper/writer/sender jobs.
POST /api/agent/start       — trigger a new agent run
GET  /api/agent/status      — get latest or specific run
GET  /api/agent/status/stream — SSE stream for real-time progress
GET  /api/agent/history     — list past runs
"""

import asyncio
from fastapi import APIRouter, Depends, Query, Request, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db, AsyncSessionLocal
from app.models import AgentRun
from app.services.scraper_orchestrator import run_scraper
from app.services.writer_orchestrator import run_writer
from app.services.sender_orchestrator import run_sender

router = APIRouter()

# Map of job type → runner function
RUNNERS = {
    "scraper": run_scraper,
    "writer": run_writer,
    "sender": run_sender,
}


@router.post("/start")
async def start_agent(data: dict = {}, db: AsyncSession = Depends(get_db)):
    job_type = data.get("type", "scraper")

    if job_type not in RUNNERS:
        raise HTTPException(status_code=400, detail=f"Unknown type: {job_type}")

    # Prevent concurrent runs of the same type
    existing = (await db.execute(
        select(AgentRun).where(AgentRun.type == job_type, AgentRun.status == "running")
    )).scalar_one_or_none()

    if existing:
        return {"error": f"A {job_type} agent is already running", "runId": existing.id}

    # Create the run record
    run = AgentRun(type=job_type, config=data.get("config", {}))
    db.add(run)
    await db.flush()
    run_id = run.id

    # Fire-and-forget: run the job in background
    runner = RUNNERS[job_type]
    asyncio.create_task(_run_in_background(runner, run_id))

    return {"id": run_id, "type": job_type, "status": "running"}


@router.get("/status")
async def get_status(run_id: str | None = Query(default=None, alias="runId"), db: AsyncSession = Depends(get_db)):
    if run_id:
        run = await db.get(AgentRun, run_id)
    else:
        run = (await db.execute(
            select(AgentRun).order_by(AgentRun.started_at.desc()).limit(1)
        )).scalar_one_or_none()

    if not run:
        return {"status": "idle"}
    return _serialize(run)


@router.get("/status/stream")
async def status_stream(run_id: str | None = Query(default=None, alias="runId")):
    """SSE endpoint — streams agent status every 2 seconds."""

    async def event_generator():
        import json
        while True:
            async with AsyncSessionLocal() as db:
                if run_id:
                    run = await db.get(AgentRun, run_id)
                else:
                    run = (await db.execute(
                        select(AgentRun).order_by(AgentRun.started_at.desc()).limit(1)
                    )).scalar_one_or_none()

                if not run:
                    yield f"data: {json.dumps({'status': 'idle'})}\n\n"
                else:
                    yield f"data: {json.dumps(_serialize(run))}\n\n"
                    if run.status in ("completed", "failed"):
                        return

            await asyncio.sleep(2)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.get("/history")
async def get_history(db: AsyncSession = Depends(get_db)):
    runs = (await db.execute(
        select(AgentRun).order_by(AgentRun.started_at.desc()).limit(20)
    )).scalars().all()
    return [_serialize(r) for r in runs]


# ── Helpers ──────────────────────────────────────────────────

async def _run_in_background(runner, run_id: str):
    """Execute an agent runner in a background task with its own DB session."""
    try:
        await runner(run_id)
    except Exception as e:
        print(f"Background {runner.__name__} error: {e}")


def _serialize(r: AgentRun) -> dict:
    return {
        "id": r.id,
        "type": r.type,
        "status": r.status,
        "startedAt": r.started_at.isoformat() if r.started_at else None,
        "completedAt": r.completed_at.isoformat() if r.completed_at else None,
        "companiesFound": r.companies_found,
        "emailsWritten": r.emails_written,
        "emailsSent": r.emails_sent,
        "errors": r.errors or [],
        "config": r.config,
    }
