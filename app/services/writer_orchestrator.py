"""
Writer Orchestrator.

Finds verified companies without drafts, generates personalized emails via AI.
"""

import asyncio
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import AsyncSessionLocal
from app.models import Company, Email, AgentRun
from app.services.email_writer import generate_email


async def run_writer(run_id: str):
    emails_written = 0
    errors = []

    async with AsyncSessionLocal() as db:
        try:
            await _update_run(db, run_id, status="running")

            # Get verified companies that have no email drafts yet
            all_verified = (await db.execute(
                select(Company)
                .options(selectinload(Company.emails))
                .where(Company.status == "verified", Company.contact_email.isnot(None))
            )).scalars().all()

            companies = [c for c in all_verified if len(c.emails) == 0][:20]

            if not companies:
                print("Writer: no verified companies need emails")
                await _update_run(db, run_id,
                    status="completed", completed_at=datetime.utcnow(),
                    emails_written=0, errors=["No verified companies without drafts found"],
                )
                return

            print(f"Writer: generating emails for {len(companies)} companies")

            for company in companies:
                try:
                    print(f"Writer: generating email for {company.name}...")

                    company_dict = {
                        "name": company.name, "website": company.website,
                        "contact_name": company.contact_name, "contact_title": company.contact_title,
                        "industry": company.industry, "location": company.location,
                        "size": company.size, "tech_stack": company.tech_stack or [],
                        "recent_news": company.recent_news, "role_hint": company.role_hint,
                    }

                    draft = await generate_email(company_dict)

                    db.add(Email(
                        company_id=company.id,
                        subject_a=draft["subjectA"],
                        subject_b=draft["subjectB"],
                        body=draft["body"],
                        followup_body=draft["followupBody"],
                        status="draft",
                    ))

                    company.status = "emailed"
                    await db.flush()
                    emails_written += 1

                    await asyncio.sleep(1)  # rate limit buffer

                except Exception as e:
                    print(f"Writer: error for {company.name}: {e}")
                    errors.append(f"{company.name}: {e}")

            await db.commit()
            print(f"Writer: done. {emails_written} drafts created.")

            await _update_run(db, run_id,
                status="completed", completed_at=datetime.utcnow(),
                emails_written=emails_written, errors=errors,
            )

        except Exception as e:
            print(f"Writer orchestrator fatal error: {e}")
            await _update_run(db, run_id,
                status="failed", completed_at=datetime.utcnow(),
                emails_written=emails_written, errors=[*errors, str(e)],
            )


async def _update_run(db, run_id: str, **kwargs):
    try:
        run = await db.get(AgentRun, run_id)
        if run:
            for k, v in kwargs.items():
                setattr(run, k, v)
            await db.commit()
    except Exception as e:
        print(f"Failed to update agent run: {e}")
