from __future__ import annotations
"""
Email Sender Service.

Sends approved emails via Gmail API (OAuth2).
Adds tracking pixel, respects daily rate limit, updates DB.
"""

import uuid
import base64
import asyncio
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from sqlalchemy import select, func

from app.database import AsyncSessionLocal
from app.models import Email, Company, Setting
from app.config import get_settings


async def send_email(email_record, db) -> dict:
    """Send a single email via Gmail API."""
    company = await db.get(Company, email_record.company_id)
    if not company or not company.contact_email:
        raise RuntimeError(f"No contact email for company {email_record.company_id}")

    # Generate tracking pixel
    tracking_id = str(uuid.uuid4())
    cfg = get_settings()
    tracking_url = f"{cfg.tracking_base_url}/{tracking_id}"

    subject = email_record.chosen_subject or email_record.subject_a

    # Build HTML body with tracking pixel
    html_body = f"""
    <div style="font-family: sans-serif; font-size: 14px; line-height: 1.6; color: #333;">
      {email_record.body.replace(chr(10), '<br>')}
    </div>
    <img src="{tracking_url}" width="1" height="1" style="display:none" alt="" />
    """.strip()

    # Get Gmail tokens
    tokens = await _get_gmail_tokens(db)
    if not tokens:
        raise RuntimeError("Gmail not connected. Connect via Settings page.")

    gmail_msg_id = await _send_via_gmail(company.contact_email, subject, html_body, tokens)

    # Update records
    email_record.status = "sent"
    email_record.sent_at = datetime.utcnow()
    email_record.chosen_subject = subject
    email_record.tracking_pixel_id = tracking_id
    email_record.gmail_message_id = gmail_msg_id

    company.status = "emailed"
    await db.flush()

    print(f"Sent email to {company.contact_email} ({company.name})")
    return {"trackingPixelId": tracking_id, "gmailMessageId": gmail_msg_id}


async def send_approved_emails() -> dict:
    """Send all approved emails, respecting daily rate limit."""
    async with AsyncSessionLocal() as db:
        # Load daily limit
        limit_setting = await db.get(Setting, "daily_send_limit")
        daily_limit = int(limit_setting.value if limit_setting else "50")

        # Count sent today
        start_of_day = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        sent_today = (await db.execute(
            select(func.count(Email.id)).where(
                Email.sent_at >= start_of_day,
                Email.status.in_(["sent", "opened", "replied"]),
            )
        )).scalar() or 0

        remaining = max(0, daily_limit - sent_today)
        if remaining == 0:
            print("Sender: daily limit reached")
            return {"sent": 0, "reason": "Daily limit reached"}

        # Get approved emails
        emails = (await db.execute(
            select(Email).where(Email.status == "approved")
            .order_by(Email.created_at.asc()).limit(remaining)
        )).scalars().all()

        if not emails:
            print("Sender: no approved emails to send")
            return {"sent": 0, "reason": "No approved emails"}

        print(f"Sender: sending {len(emails)} emails ({remaining} remaining today)")

        sent = 0
        errors = []

        for email_record in emails:
            try:
                await send_email(email_record, db)
                sent += 1
                await asyncio.sleep(2)  # avoid spam flags
            except Exception as e:
                print(f"Sender: failed for email {email_record.id}: {e}")
                errors.append(str(e))

        await db.commit()
        return {"sent": sent, "errors": errors}


# ── Gmail API ────────────────────────────────────────────────

async def _get_gmail_tokens(db) -> dict | None:
    access = await db.get(Setting, "gmail_access_token")
    refresh = await db.get(Setting, "gmail_refresh_token")
    if not refresh or not refresh.value:
        return None
    return {"access_token": access.value if access else None, "refresh_token": refresh.value}


async def _send_via_gmail(to: str, subject: str, html_body: str, tokens: dict) -> str:
    """Send email through Gmail API. Runs sync googleapiclient in a thread."""
    import functools
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        None, functools.partial(_send_via_gmail_sync, to, subject, html_body, tokens)
    )


def _send_via_gmail_sync(to: str, subject: str, html_body: str, tokens: dict) -> str:
    """Synchronous Gmail send — called via run_in_executor."""
    cfg = get_settings()

    creds = Credentials(
        token=tokens["access_token"],
        refresh_token=tokens["refresh_token"],
        token_uri="https://oauth2.googleapis.com/token",
        client_id=cfg.gmail_client_id,
        client_secret=cfg.gmail_client_secret,
    )

    service = build("gmail", "v1", credentials=creds)

    msg = MIMEMultipart("alternative")
    msg["To"] = to
    msg["Subject"] = subject
    msg.attach(MIMEText(html_body, "html"))

    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode("utf-8")

    result = service.users().messages().send(
        userId="me", body={"raw": raw}
    ).execute()

    return result.get("id", "")
