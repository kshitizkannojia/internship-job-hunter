"""
Seed script - populates default settings and test companies.
Run: python seed.py
"""

import asyncio
from app.database import AsyncSessionLocal, create_tables
from app.models import Setting, Company, Email


DEFAULT_SETTINGS = {
    "ai_prompt": (
        "You are writing a cold outreach email on behalf of a college student in India "
        "looking for an internship.\n\n"
        "Rules:\n"
        "- Sound like a real person, not a bot or salesperson\n"
        "- Reference one specific thing about the company (recent news, tech stack, product)\n"
        "- Keep the email body under 120 words, exactly 4 sentences\n"
        "- End with a clear CTA: suggest a 15-minute call or link to portfolio\n"
        "- Never use cliches like I hope this email finds you well\n"
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
    {"name": "Razorpay", "website": "https://razorpay.com", "contact_name": "Harshil Mathur", "contact_email": "careers@razorpay.com", "contact_title": "CEO & Co-founder", "industry": "Fintech", "location": "Bangalore, India", "size": "1000+", "tech_stack": ["React", "Node.js", "Go", "Python", "Kubernetes"], "recent_news": "Razorpay launched payment buttons for small businesses.", "role_hint": "Software Engineering Intern", "source": "manual", "status": "emailed"},
    {"name": "Zerodha", "website": "https://zerodha.com", "contact_name": "Nithin Kamath", "contact_email": "careers@zerodha.com", "contact_title": "Founder & CEO", "industry": "Fintech", "location": "Bangalore, India", "size": "201-1000", "tech_stack": ["Go", "Python", "PostgreSQL", "React"], "recent_news": "Zerodha crossed 10 million active users.", "role_hint": "Backend Engineering Intern", "source": "manual", "status": "replied"},
    {"name": "Postman", "website": "https://postman.com", "contact_name": "Abhinav Asthana", "contact_email": "careers@postman.com", "contact_title": "CEO & Co-founder", "industry": "Developer Tools", "location": "Bangalore, India", "size": "201-1000", "tech_stack": ["Node.js", "React", "Electron", "TypeScript"], "recent_news": "Postman launched AI-powered API testing features.", "role_hint": "Software Engineering Intern", "source": "manual", "status": "emailed"},
    {"name": "Cred", "website": "https://cred.club", "contact_name": "Kunal Shah", "contact_email": "careers@cred.club", "contact_title": "Founder & CEO", "industry": "Fintech", "location": "Bangalore, India", "size": "201-1000", "tech_stack": ["React Native", "Kotlin", "Python", "AWS"], "recent_news": "CRED launched merchant reward platform for offline stores.", "role_hint": "Full Stack Intern", "source": "apollo", "status": "verified"},
    {"name": "Notion", "website": "https://notion.so", "contact_name": "Ivan Zhao", "contact_email": "careers@notion.so", "contact_title": "CEO & Co-founder", "industry": "Productivity", "location": "San Francisco, USA", "size": "201-1000", "tech_stack": ["React", "TypeScript", "Rust", "PostgreSQL"], "recent_news": "Notion introduced AI-powered Q&A across workspace docs.", "role_hint": "Software Engineering Intern", "source": "apollo", "status": "interview"},
    {"name": "Supabase", "website": "https://supabase.com", "contact_name": "Paul Copplestone", "contact_email": "careers@supabase.com", "contact_title": "CEO & Co-founder", "industry": "Developer Tools", "location": "Remote", "size": "51-200", "tech_stack": ["PostgreSQL", "Elixir", "TypeScript", "Deno"], "recent_news": "Supabase launched branching for database environments.", "role_hint": "Backend Engineering Intern", "source": "apollo", "status": "emailed"},
    {"name": "Vercel", "website": "https://vercel.com", "contact_name": "Guillermo Rauch", "contact_email": "careers@vercel.com", "contact_title": "CEO & Founder", "industry": "Developer Tools", "location": "Remote", "size": "201-1000", "tech_stack": ["Next.js", "React", "Go", "Rust", "Turborepo"], "recent_news": "Vercel launched v0 AI-powered UI generation tool.", "role_hint": "Frontend Engineering Intern", "source": "apollo", "status": "discovered"},
    {"name": "Freshworks", "website": "https://freshworks.com", "contact_name": "Girish Mathrubootham", "contact_email": "careers@freshworks.com", "contact_title": "Founder & Chairman", "industry": "SaaS", "location": "Chennai, India", "size": "1000+", "tech_stack": ["Ruby on Rails", "React", "AWS", "Python"], "recent_news": "Freshworks integrated generative AI into their CRM suite.", "role_hint": "Software Engineering Intern", "source": "apollo", "status": "verified"},
]


TEST_EMAILS = [
    {"company_name": "Razorpay", "subject_a": "CS student excited about Razorpay's payment buttons", "subject_b": "Quick question about internships at Razorpay", "body": "Hi Harshil,\n\nI saw Razorpay's recent launch of payment buttons for small businesses. As a CS student building an AI-powered outreach platform with React and Python, I'd love to bring my full-stack skills to your engineering team this summer.\n\nWould you have 15 minutes for a quick chat about internship opportunities?", "followup_body": "Hi Harshil,\n\nJust following up on my earlier email about internship opportunities at Razorpay. I recently deployed my AI outreach project and would love to share what I've built.", "status": "sent"},
    {"company_name": "Zerodha", "subject_a": "Backend-focused CS student interested in Zerodha", "subject_b": "Internship inquiry at Zerodha", "body": "Hi Nithin,\n\nCongrats on crossing 10 million active users. I'm a CS student working with Go and Python, building async systems at scale. Zerodha's lean engineering philosophy resonates with how I approach problem-solving.\n\nCould we schedule a 15-minute call to discuss backend engineering internships?", "followup_body": "Hi Nithin,\n\nWanted to circle back on my earlier message about backend internship opportunities. Would love to chat if you have a few minutes.", "status": "replied"},
    {"company_name": "Postman", "subject_a": "CS student inspired by Postman's AI testing", "subject_b": "Internship at Postman", "body": "Hi Abhinav,\n\nPostman's new AI-powered testing features caught my attention. I'm building a full-stack AI outreach platform using React, FastAPI, and the Groq API, which has given me deep experience with API design.\n\nWould you be open to a 15-minute chat about summer internship possibilities?", "followup_body": None, "status": "sent"},
    {"company_name": "Notion", "subject_a": "Full-stack student excited about Notion's AI Q&A", "subject_b": "Internship at Notion", "body": "Hi Ivan,\n\nNotion's AI-powered Q&A feature is something I've been thinking about a lot. I'm a CS student in India building an AI outreach system with React, TypeScript, and PostgreSQL.\n\nCould we find 15 minutes to discuss internship opportunities on the engineering team?", "followup_body": None, "status": "opened"},
    {"company_name": "Cred", "subject_a": "CS student interested in CRED's merchant platform", "subject_b": "Internship inquiry at CRED", "body": "Hi Kunal,\n\nCRED's expansion into merchant rewards for offline stores is a fascinating play. I'm a full-stack CS student working with React, Python, and AWS, currently building an AI-powered outreach platform.\n\nWould you have 15 minutes to chat about internship roles?", "followup_body": None, "status": "draft"},
    {"company_name": "Supabase", "subject_a": "Backend student excited about Supabase branching", "subject_b": "Internship at Supabase", "body": "Hi Paul,\n\nDatabase branching is going to change how teams handle migrations. I'm a CS student whose current project runs entirely on Supabase (PostgreSQL + async Python), and I've gained hands-on experience with your platform.\n\nCould we find 15 minutes to discuss remote internship opportunities?", "followup_body": None, "status": "sent"},
]


async def seed():
    from sqlalchemy import select
    from datetime import datetime, timedelta

    await create_tables()

    async with AsyncSessionLocal() as db:
        # Seed settings
        for key, value in DEFAULT_SETTINGS.items():
            existing = await db.get(Setting, key)
            if not existing:
                db.add(Setting(key=key, value=value))
                print(f"  Setting: {key}")

        # Seed companies
        company_map = {}
        for data in TEST_COMPANIES:
            rows = (await db.execute(
                select(Company).where(Company.name == data["name"])
            )).scalars().all()

            if not rows:
                c = Company(**data)
                db.add(c)
                await db.flush()
                company_map[data["name"]] = c.id
                print(f"  Company: {data['name']}")
            else:
                company_map[data["name"]] = rows[0].id

        # Seed emails
        for i, edata in enumerate(TEST_EMAILS):
            company_id = company_map.get(edata["company_name"])
            if not company_id:
                continue

            email_rows = (await db.execute(
                select(Email).where(Email.company_id == company_id)
            )).scalars().all()

            if not email_rows:
                now = datetime.utcnow()
                sent_at = now - timedelta(days=5 - i) if edata["status"] != "draft" else None
                opened_at = now - timedelta(days=3) if edata["status"] == "opened" else None
                replied_at = now - timedelta(days=2) if edata["status"] == "replied" else None

                email = Email(
                    company_id=company_id,
                    subject_a=edata["subject_a"],
                    subject_b=edata["subject_b"],
                    body=edata["body"],
                    followup_body=edata.get("followup_body"),
                    status=edata["status"],
                    sent_at=sent_at,
                    opened_at=opened_at,
                    replied_at=replied_at,
                )
                db.add(email)
                print(f"  Email: {edata['company_name']} ({edata['status']})")

        await db.commit()
        print("Seed complete.")


if __name__ == "__main__":
    asyncio.run(seed())
