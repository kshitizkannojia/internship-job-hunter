"""
APScheduler — cron jobs for automated sending and follow-ups.

- Hourly: send approved emails + follow-up after 3 days
- Every 6 hours: check Gmail for replies
"""

from apscheduler.schedulers.asyncio import AsyncIOScheduler

scheduler = AsyncIOScheduler()


def start_scheduler():
    """Register cron jobs and start the scheduler."""

    # Every hour: send approved + follow-ups
    scheduler.add_job(_hourly_job, "cron", minute=0, id="hourly_send", replace_existing=True)

    # Every 6 hours: check for replies
    scheduler.add_job(_reply_check_job, "cron", hour="*/6", id="reply_check", replace_existing=True)

    scheduler.start()
    print("Scheduler: cron jobs registered (hourly send, 6-hourly reply check)")


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown(wait=False)
        print("Scheduler: stopped")


async def _hourly_job():
    """Send approved emails and follow-ups."""
    print("Scheduler: hourly check running...")

    try:
        from app.services.email_sender import send_approved_emails
        result = await send_approved_emails()
        if result.get("sent", 0) > 0:
            print(f"Scheduler: sent {result['sent']} approved emails")
    except Exception as e:
        print(f"Scheduler: send error: {e}")

    try:
        await _send_followups()
    except Exception as e:
        print(f"Scheduler: follow-up error: {e}")


async def _send_followups():
    """Send follow-ups for emails with no reply after 3 days."""
    from datetime import datetime, timedelta
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    from app.database import AsyncSessionLocal
    from app.models import Email, Company
    from app.services.email_sender import send_email

    three_days_ago = datetime.utcnow() - timedelta(days=3)

    async with AsyncSessionLocal() as db:
        needs_followup = (await db.execute(
            select(Email)
            .options(selectinload(Email.company))
            .where(
                Email.status.in_(["sent", "opened"]),
                Email.sent_at <= three_days_ago,
                Email.followup_sent_at.is_(None),
                Email.followup_body.isnot(None),
            )
            .limit(10)
        )).scalars().all()

        if not needs_followup:
            return

        print(f"Scheduler: sending {len(needs_followup)} follow-ups")

        for email in needs_followup:
            if not email.company or not email.company.contact_email:
                continue
            try:
                followup = Email(
                    company_id=email.company_id,
                    subject_a=f"Re: {email.chosen_subject or email.subject_a}",
                    body=email.followup_body,
                    status="approved",
                )
                db.add(followup)
                await db.flush()

                await send_email(followup, db)

                email.followup_sent_at = datetime.utcnow()
                email.status = "follow_up_sent"
                await db.flush()

                print(f"Scheduler: follow-up sent to {email.company.contact_email}")
                import asyncio
                await asyncio.sleep(2)

            except Exception as e:
                print(f"Scheduler: follow-up failed for {email.company.name}: {e}")

        await db.commit()


async def _reply_check_job():
    """Check Gmail for replies to sent emails."""
    print("Scheduler: checking for replies...")

    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    from app.database import AsyncSessionLocal
    from app.models import Email, Setting
    from app.config import get_settings
    from datetime import datetime

    async with AsyncSessionLocal() as db:
        refresh = await db.get(Setting, "gmail_refresh_token")
        if not refresh or not refresh.value:
            return

        access = await db.get(Setting, "gmail_access_token")

        try:
            from google.oauth2.credentials import Credentials
            from googleapiclient.discovery import build

            cfg = get_settings()
            creds = Credentials(
                token=access.value if access else None,
                refresh_token=refresh.value,
                token_uri="https://oauth2.googleapis.com/token",
                client_id=cfg.gmail_client_id,
                client_secret=cfg.gmail_client_secret,
            )

            service = build("gmail", "v1", credentials=creds)

            sent_emails = (await db.execute(
                select(Email)
                .options(selectinload(Email.company))
                .where(
                    Email.status.in_(["sent", "opened", "follow_up_sent"]),
                    Email.gmail_message_id.isnot(None),
                )
                .limit(20)
            )).scalars().all()

            for email in sent_emails:
                try:
                    msg = service.users().messages().get(
                        userId="me", id=email.gmail_message_id, format="metadata"
                    ).execute()

                    thread = service.users().threads().get(
                        userId="me", id=msg["threadId"], format="minimal"
                    ).execute()

                    if len(thread.get("messages", [])) > 1:
                        email.status = "replied"
                        email.replied_at = datetime.utcnow()
                        if email.company:
                            email.company.status = "replied"
                        print(f"Scheduler: reply detected from {email.company.name if email.company else 'unknown'}")

                except Exception as e:
                    if "401" not in str(e):
                        print(f"Reply check error: {e}")

            await db.commit()

        except Exception as e:
            print(f"Scheduler: reply check error: {e}")
