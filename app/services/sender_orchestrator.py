"""
Sender Orchestrator.

Wraps send_approved_emails() with agent run tracking.
"""

from datetime import datetime

from app.database import AsyncSessionLocal
from app.models import AgentRun
from app.services.email_sender import send_approved_emails


async def run_sender(run_id: str):
    async with AsyncSessionLocal() as db:
        try:
            run = await db.get(AgentRun, run_id)
            if run:
                run.status = "running"
                await db.commit()

            result = await send_approved_emails()

            run = await db.get(AgentRun, run_id)
            if run:
                run.status = "completed"
                run.completed_at = datetime.utcnow()
                run.emails_sent = result.get("sent", 0)
                run.errors = result.get("errors", [])
                await db.commit()

            print(f"Sender: done. {result.get('sent', 0)} emails sent.")

        except Exception as e:
            print(f"Sender orchestrator error: {e}")
            run = await db.get(AgentRun, run_id)
            if run:
                run.status = "failed"
                run.completed_at = datetime.utcnow()
                run.errors = [str(e)]
                await db.commit()
