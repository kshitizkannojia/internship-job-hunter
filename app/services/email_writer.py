"""
AI Email Writer — Groq (primary), Gemini, Claude fallbacks.

Generates personalized 4-sentence cold outreach emails using AI.
Groq free tier: 30 req/min with Llama 3.3 70B.
"""

import json
import httpx
from app.config import get_settings
from app.database import AsyncSessionLocal
from app.models import Setting

GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models"


async def generate_email(company: dict) -> dict:
    """
    Generate a personalized email for a company.
    Returns {subjectA, subjectB, body, followupBody}.
    """
    system_prompt = await _load_system_prompt()
    company_context = _build_company_context(company)

    user_message = f"""Write a cold outreach email for this company. Return your response in EXACTLY this JSON format (no markdown, no code fences):

{{"subjectA": "...", "subjectB": "...", "body": "...", "followupBody": "..."}}

Company info:
{company_context}

Requirements:
- subjectA and subjectB are two different A/B test subject lines (short, specific, no generic filler)
- body is a 4-sentence personalized email, max 120 words
- followupBody is a short 2-sentence follow-up to send after 3 days if no reply
- Reference something specific about the company (tech stack, recent news, product)
- Sound like a real student, not a sales bot
- End with a clear CTA (15-minute call or portfolio link)
- Never use "I hope this email finds you well" or similar"""

    cfg = get_settings()
    text = None

    # Try Groq → Gemini → Claude
    if cfg.groq_api_key:
        text = await _call_groq(system_prompt, user_message, cfg.groq_api_key)
    elif cfg.gemini_api_key:
        text = await _call_gemini(system_prompt, user_message, cfg.gemini_api_key)
    elif cfg.anthropic_api_key:
        text = await _call_claude(system_prompt, user_message, cfg.anthropic_api_key)
    else:
        raise RuntimeError("No AI API key configured. Set GROQ_API_KEY in .env")

    # Parse AI response
    try:
        cleaned = text.replace("```json", "").replace("```", "").strip()
        parsed = json.loads(cleaned)

        if not parsed.get("subjectA") or not parsed.get("body"):
            raise ValueError("Missing required fields")

        return {
            "subjectA": parsed["subjectA"],
            "subjectB": parsed.get("subjectB", parsed["subjectA"]),
            "body": parsed["body"],
            "followupBody": parsed.get("followupBody",
                "Hi — just following up on my email from a few days ago. "
                "I'd love to chat for 15 minutes about how I could contribute to your team."
            ),
        }
    except (json.JSONDecodeError, ValueError) as e:
        print(f"Failed to parse AI response: {text[:200] if text else 'None'}")
        raise RuntimeError(f"AI response parse error: {e}")


# ── Provider Calls ───────────────────────────────────────────

async def _call_groq(system_prompt: str, user_message: str, api_key: str) -> str:
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": "llama-3.3-70b-versatile",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
                "temperature": 0.7,
                "max_tokens": 1024,
                "response_format": {"type": "json_object"},
            },
        )
        resp.raise_for_status()
        data = resp.json()
        text = data["choices"][0]["message"]["content"]
        if not text:
            raise RuntimeError("Empty response from Groq")
        return text


async def _call_gemini(system_prompt: str, user_message: str, api_key: str) -> str:
    model = "gemini-2.0-flash"
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{GEMINI_BASE}/{model}:generateContent?key={api_key}",
            json={
                "system_instruction": {"parts": [{"text": system_prompt}]},
                "contents": [{"parts": [{"text": user_message}]}],
                "generationConfig": {
                    "temperature": 0.7,
                    "maxOutputTokens": 1024,
                    "responseMimeType": "application/json",
                },
            },
        )
        resp.raise_for_status()
        data = resp.json()
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        if not text:
            raise RuntimeError("Empty response from Gemini")
        return text


async def _call_claude(system_prompt: str, user_message: str, api_key: str) -> str:
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": "claude-sonnet-4-20250514",
                "max_tokens": 1024,
                "system": system_prompt,
                "messages": [{"role": "user", "content": user_message}],
            },
        )
        resp.raise_for_status()
        data = resp.json()
        text = data["content"][0]["text"].strip()
        if not text:
            raise RuntimeError("Empty response from Claude")
        return text


# ── Helpers ──────────────────────────────────────────────────

def _build_company_context(company: dict) -> str:
    lines = [f"Company: {company.get('name', 'Unknown')}"]
    field_map = {
        "website": "Website", "contact_name": "Contact", "contact_title": "Title",
        "industry": "Industry", "location": "Location", "role_hint": "Target role",
    }
    for key, label in field_map.items():
        val = company.get(key)
        if val:
            lines.append(f"{label}: {val}")

    size = company.get("size")
    if size:
        lines.append(f"Company size: {size} employees")

    tech = company.get("tech_stack", [])
    if tech:
        lines.append(f"Tech stack: {', '.join(tech)}")

    news = company.get("recent_news")
    if news:
        lines.append(f"Recent news: {news}")

    return "\n".join(lines)


async def _load_system_prompt() -> str:
    """Load the AI system prompt from the settings table."""
    try:
        async with AsyncSessionLocal() as db:
            setting = await db.get(Setting, "ai_prompt")
            if setting and setting.value:
                try:
                    return json.loads(setting.value)
                except json.JSONDecodeError:
                    return setting.value
    except Exception as e:
        print(f"Failed to load AI prompt from settings: {e}")

    return (
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
    )
