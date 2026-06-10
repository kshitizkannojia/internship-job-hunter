from __future__ import annotations
"""
Apollo.io API Integration.

Free tier: 50 credits/month. Each search uses ~1 credit per result.
Searches for companies + contacts matching target config.
"""

import httpx
from app.config import get_settings

APOLLO_BASE = "https://api.apollo.io/v1"


async def search_companies(config: dict) -> list[dict]:
    """Search Apollo for companies matching filters. Returns list of company dicts."""
    api_key = get_settings().apollo_api_key
    if not api_key:
        print("Apollo API key not set — skipping")
        return []

    industry = config.get("industry", "")
    location = config.get("location", "")
    company_size = config.get("companySize", "")
    role_keywords = config.get("roleKeywords", "")

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            # Step 1: Search organizations
            payload = {
                "api_key": api_key,
                "page": 1,
                "per_page": 25,
            }
            if industry:
                payload["q_organization_keyword_tags"] = [industry]
            if location:
                payload["organization_locations"] = [location]
            if company_size:
                payload["organization_num_employees_ranges"] = [company_size]

            resp = await client.post(f"{APOLLO_BASE}/mixed_companies/search", json=payload)
            resp.raise_for_status()
            orgs = resp.json().get("organizations", [])

            if not orgs:
                print("Apollo: no organizations found")
                return []

            # Step 2: For each org, find a relevant contact
            results = []
            for org in orgs:
                contact = await _find_contact(client, org["id"], role_keywords, api_key)
                results.append({
                    "name": org.get("name"),
                    "website": org.get("website_url") or org.get("primary_domain"),
                    "contactName": contact.get("name") if contact else None,
                    "contactEmail": contact.get("email") if contact else None,
                    "contactTitle": contact.get("title") if contact else None,
                    "linkedinUrl": org.get("linkedin_url"),
                    "industry": org.get("industry"),
                    "location": _build_location(org),
                    "size": _estimate_range(org.get("estimated_num_employees")),
                    "techStack": (org.get("technology_names") or [])[:10],
                    "recentNews": None,
                    "roleHint": (contact.get("title") if contact else None) or role_keywords or None,
                    "source": "apollo",
                })

            return results

    except Exception as e:
        print(f"Apollo search error: {e}")
        return []


async def _find_contact(client: httpx.AsyncClient, org_id: str, role_keywords: str, api_key: str) -> dict | None:
    """Find a relevant contact (HR/founder/eng lead) at a company."""
    titles = [role_keywords] if role_keywords else ["HR", "Hiring Manager", "Engineering Manager", "CTO", "Founder"]

    try:
        resp = await client.post(f"{APOLLO_BASE}/mixed_people/search", json={
            "api_key": api_key,
            "q_organization_id": org_id,
            "person_titles": titles,
            "page": 1,
            "per_page": 1,
        })
        if resp.status_code != 200:
            return None

        person = resp.json().get("people", [None])[0]
        if not person:
            return None

        return {"name": person.get("name"), "email": person.get("email"), "title": person.get("title")}
    except Exception:
        return None


def _build_location(org: dict) -> str | None:
    city = org.get("city")
    state = org.get("state")
    country = org.get("country")
    if city:
        return f"{city}, {state or country}"
    return country


def _estimate_range(count: int | None) -> str | None:
    if not count:
        return None
    if count <= 10:
        return "1-10"
    if count <= 50:
        return "11-50"
    if count <= 200:
        return "51-200"
    if count <= 1000:
        return "201-1000"
    return "1000+"
