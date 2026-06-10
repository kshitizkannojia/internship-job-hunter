"""
Internship Hunter — FastAPI Application Entry Point

Run with: uvicorn app.main:app --reload --port 8000
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pathlib import Path

from app.config import get_settings
from app.database import create_tables
from app.routes import companies, emails, agent, stats, settings, auth, tracking
from app.services.scheduler import start_scheduler, stop_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown logic."""
    # ── Startup ──────────────────────────────
    print("Starting Internship Hunter...")
    try:
        await create_tables()
    except Exception as e:
        print(f"Warning: could not create/verify tables — {e}")
        print("The app will still start; ensure your DATABASE_URL is correct.")
    start_scheduler()
    print(f"Server ready on http://localhost:{get_settings().port}")
    yield
    # ── Shutdown ─────────────────────────────
    stop_scheduler()
    print("Shutting down...")


app = FastAPI(
    title="Internship Hunter",
    description="AI-powered job outreach system",
    version="2.0.0",
    lifespan=lifespan,
)

# ── Static files & templates ─────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")
templates = Jinja2Templates(directory=BASE_DIR / "templates")

# ── API routes ───────────────────────────────────────────────
app.include_router(companies.router, prefix="/api/companies", tags=["Companies"])
app.include_router(emails.router, prefix="/api/emails", tags=["Emails"])
app.include_router(agent.router, prefix="/api/agent", tags=["Agent"])
app.include_router(stats.router, prefix="/api/stats", tags=["Stats"])
app.include_router(settings.router, prefix="/api/settings", tags=["Settings"])
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(tracking.router, prefix="/track", tags=["Tracking"])


# ── Page routes (serve HTML templates) ───────────────────────

@app.get("/", include_in_schema=False)
async def dashboard_page(request: Request):
    return templates.TemplateResponse("dashboard.html", {"request": request})


@app.get("/emails", include_in_schema=False)
async def emails_page(request: Request):
    return templates.TemplateResponse("emails.html", {"request": request})


@app.get("/settings", include_in_schema=False)
async def settings_page(request: Request):
    return templates.TemplateResponse("settings.html", {"request": request})


# ── Health check ─────────────────────────────────────────────

@app.get("/api/health")
async def health():
    return {"status": "ok"}
