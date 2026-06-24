"""
Dashboard stats route.
GET /api/stats — summary counts, reply rate, recent activity
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models import Company, Email, AgentRun

router = APIRouter()


@router.get("")
async def get_stats(db: AsyncSession = Depends(get_db)):
    # Company counts
    total_companies = (await db.execute(select(func.count(Company.id)))).scalar() or 0
    verified = (await db.execute(
        select(func.count(Company.id)).where(Company.status == "verified")
    )).scalar() or 0

    # Email counts
    total_emails = (await db.execute(select(func.count(Email.id)))).scalar() or 0
    sent = (await db.execute(
        select(func.count(Email.id)).where(Email.status.in_(["sent", "opened", "replied", "follow_up_sent"]))
    )).scalar() or 0
    replies = (await db.execute(
        select(func.count(Email.id)).where(Email.status == "replied")
    )).scalar() or 0
    drafts = (await db.execute(
        select(func.count(Email.id)).where(Email.status == "draft")
    )).scalar() or 0

    # Reply rate
    reply_rate = round((replies / sent * 100), 1) if sent > 0 else 0

    # Recent activity (last 7 days of email events)
    from datetime import datetime, timedelta
    week_ago = datetime.utcnow() - timedelta(days=7)

    recent_sent = (await db.execute(
        select(func.count(Email.id)).where(Email.sent_at >= week_ago)
    )).scalar() or 0
    recent_replies = (await db.execute(
        select(func.count(Email.id)).where(Email.replied_at >= week_ago)
    )).scalar() or 0

    # Interviews booked (companies with status "interview")
    interviews = (await db.execute(
        select(func.count(Company.id)).where(Company.status == "interview")
    )).scalar() or 0

    # Daily breakdown for chart (last 7 days)
    daily_chart = []
    for i in range(7):
        day_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=6 - i)
        day_end = day_start + timedelta(days=1)

        day_sent = (await db.execute(
            select(func.count(Email.id)).where(
                Email.sent_at >= day_start, Email.sent_at < day_end
            )
        )).scalar() or 0

        day_replies = (await db.execute(
            select(func.count(Email.id)).where(
                Email.replied_at >= day_start, Email.replied_at < day_end
            )
        )).scalar() or 0

        day_rate = round((day_replies / day_sent * 100), 1) if day_sent > 0 else 0
        daily_chart.append({
            "date": day_start.strftime("%b %d"),
            "sent": day_sent,
            "replied": day_replies,
            "rate": day_rate,
        })

    return {
        "totalCompanies": total_companies,
        "verifiedCompanies": verified,
        "totalEmails": total_emails,
        "emailsSent": sent,
        "replies": replies,
        "drafts": drafts,
        "replyRate": reply_rate,
        "interviews": interviews,
        "recentActivity": {
            "sentThisWeek": recent_sent,
            "repliesThisWeek": recent_replies,
        },
        "dailyChart": daily_chart,
    }
