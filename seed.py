"""
Seed script — populates default settings and test companies.
Run: python seed.py
"""

import asyncio
from app.database import AsyncSessionLocal, create_tables
from app.models import Setting, Company


DEFAULT_SETTINGS = {
    "ai_prompt": (
        "You are writing a cold outreach email on behalf of a college student in India "
        "looking for an internship.\n\n"
        "Rules:\n"
        "- Sound like a real person, not a bot or salesperson\n"
        "- Reference one specific thing about the company (recent news, tech stack, product)\n"
        "- Keep the email body under 120 words, exactly 4 sentences\n"
        "- End with a clear CTA: suggest a 15-minute call or link to portfolio\n"
        '- Never use "I hope this email finds you well" or similar clichés\n'
        "- Be concise, genuine, and enthusiastic\n"
        "- The tone should be professional but warm"
    ),
    "daily_send_limit": "50",
    "require_approval": "true",
    "target_industry": "",
    "target_location": "",
    "target_company_size": "",
    "target_role_keywords": "",
}

TEST_COMPANIES = [
    {
        "name": "Razorpay",
        "website": "https://razorpay.com",
        "contact_name": "Harshil Mathur",
        "contact_email": "careers@razorpay.com",
        "contact_title": "CEO & Co-founder",
        "industry": "Fintech",
        "location": "Bangalore, India",
        "size": "1000+",
        "tech_stack": ["React", "Node.js", "Go", "Python", "Kubernetes"],
        "recent_news": "Razorpay launched payment buttons for small businesses.",
        "role_hint": "Software Engineering Intern",
        "source": "manual",
        "status": "verified",
    },
    {
        "name": "Zerodha",
        "website": "https://zerodha.com",
        "contact_name": "Nithin Kamath",
        "contact_email": "careers@zerodha.com",
        "contact_title": "Founder & CEO",
        "industry": "Fintech",
        "location": "Bangalore, India",
        "size": "201-1000",
        "tech_stack": ["Go", "Python", "PostgreSQL", "React"],
        "recent_news": "Zerodha crossed 10 million active users.",
        "role_hint": "Backend Engineering Intern",
        "source": "manual",
        "status": "verified",
    },
    {
        "name": "Postman",
        "website": "https://postman.com",
        "contact_name": "Abhinav Asthana",
        "contact_email": "careers@postman.com",
        "contact_title": "CEO & Co-founder",
        "industry": "Developer Tools",
        "location": "Bangalore, India",
        "size": "201-1000",
        "tech_stack": ["Node.js", "React", "Electron", "TypeScript"],
        "recent_news": "Postman launched AI-powered API testing features.",
        "role_hint": "Software Engineering Intern",
        "source": "manual",
        "status": "verified",
    },
]


async def seed():
    await create_tables()

    async with AsyncSessionLocal() as db:
        # Seed settings
        for key, value in DEFAULT_SETTINGS.items():
            existing = await db.get(Setting, key)
            if not existing:
                db.add(Setting(key=key, value=value))
                print(f"  Setting: {key}")

        # Seed test companies
        for data in TEST_COMPANIES:
            from sqlalchemy import select
            exists = (await db.execute(
                select(Company).where(Company.name == data["name"])
            )).scalar_one_or_none()

            if not exists:
                db.add(Company(**data))
                print(f"  Company: {data['name']}")

        await db.commit()
        print("Seed complete.")


if __name__ == "__main__":
    asyncio.run(seed())
