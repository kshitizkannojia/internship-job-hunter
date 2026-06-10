"""
Scraper Orchestrator.

Pipeline: config → Apollo/Playwright → ZeroBounce verify → dedup → DB store.
"""

import json
from datetime import datetime
from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models import Company, AgentRun, Setting
from app.services.apollo_scraper import search_companies as apollo_search
from app.services.playwright_scraper import scrape_companies as playwright_scrape
from app.services.email_verifier import verify_email
from app.config import get_settings


async def run_scraper(run_id: str):
    companies_found = 0
    errors = []

    async with AsyncSessionLocal() as db:
        try:
            # 1. Load config
            config = await _load_config(db)
            await _update_run(db, run_id, status="running")

            # 2. Scrape companies
            print("Scraper: starting company search...")
            raw_companies = []

            if get_settings().apollo_api_key:
                raw_companies = await apollo_search(config)
                print(f"Apollo: found {len(raw_companies)} companies")

            if not raw_companies:
                print("Scraper: falling back to Playwright...")
                try:
                    raw_companies = await playwright_scrape(config)
                    print(f"Playwright: found {len(raw_companies)} companies")
                except Exception as e:
                    print(f"Playwright fallback failed: {e}")
                    errors.append(f"Playwright: {e}")

            if not raw_companies:
                await _update_run(db, run_id,
                    status="completed", completed_at=datetime.utcnow(),
                    companies_found=0, errors=["No companies found with current filters"],
                )
                return

            # 3. Deduplicate
            existing = (await db.execute(select(Company.name))).scalars().all()
            existing_names = {n.lower() for n in existing}
            new_companies = [c for c in raw_companies if c["name"].lower() not in existing_names]
            print(f"Scraper: {len(new_companies)} new companies after dedup")

            # 4. Verify emails
            for company in new_companies:
                try:
                    email = company.get("contactEmail")
                    if email and get_settings().zerobounce_api_key:
                        result = await verify_email(email)
                        if result and result.get("result") == "undeliverable":
                            print(f"Scraper: {email} is undeliverable, clearing")
                            company["contactEmail"] = None
                except Exception as e:
                    print(f"Verification error for {company['name']}: {e}")
                    errors.append(f"ZeroBounce ({company['name']}): {e}")

            # 5. Store in database
            for company in new_companies:
                try:
                    db.add(Company(
                        name=company["name"],
                        website=company.get("website"),
                        contact_name=company.get("contactName"),
                        contact_email=company.get("contactEmail"),
                        contact_title=company.get("contactTitle"),
                        linkedin_url=company.get("linkedinUrl"),
                        industry=company.get("industry"),
                        location=company.get("location"),
                        size=company.get("size"),
                        tech_stack=company.get("techStack", []),
                        recent_news=company.get("recentNews"),
                        role_hint=company.get("roleHint"),
                        source=company.get("source"),
                        status="verified" if company.get("contactEmail") else "discovered",
                    ))
                    await db.flush()
                    companies_found += 1
                except Exception as e:
                    if "duplicate" not in str(e).lower():
                        print(f"DB insert error for {company['name']}: {e}")
                        errors.append(f"DB ({company['name']}): {e}")
                    await db.rollback()

            await db.commit()
            print(f"Scraper: done. {companies_found} companies stored.")

            await _update_run(db, run_id,
                status="completed", completed_at=datetime.utcnow(),
                companies_found=companies_found, errors=errors,
            )

        except Exception as e:
            print(f"Scraper orchestrator fatal error: {e}")
            await _update_run(db, run_id,
                status="failed", completed_at=datetime.utcnow(),
                companies_found=companies_found, errors=[*errors, str(e)],
            )


async def _load_config(db) -> dict:
    rows = (await db.execute(select(Setting))).scalars().all()
    settings = {}
    for row in rows:
        try:
            settings[row.key] = json.loads(row.value)
        except (json.JSONDecodeError, TypeError):
            settings[row.key] = row.value

    return {
        "industry": settings.get("target_industry", ""),
        "location": settings.get("target_location", ""),
        "companySize": settings.get("target_company_size", ""),
        "roleKeywords": settings.get("target_role_keywords", ""),
    }


async def _update_run(db, run_id: str, **kwargs):
    try:
        run = await db.get(AgentRun, run_id)
        if run:
            for k, v in kwargs.items():
                setattr(run, k, v)
            await db.commit()
    except Exception as e:
        print(f"Failed to update agent run: {e}")
