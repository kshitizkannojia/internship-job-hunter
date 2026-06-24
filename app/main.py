"""
Internship Hunter — FastAPI Application Entry Point

Run with: uvicorn app.main:app --reload --port 8000
"""

from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.config import get_settings
from app.database import create_tables
from app.routes import companies, emails, agent, stats, settings, auth, tracking
from app.services.scheduler import start_scheduler, stop_scheduler

# Path to Vite build output
DIST_DIR = Path(__file__).resolve().parent.parent / "frontend" / "dist"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown logic."""
    print("Starting Internship Hunter...")
    try:
        await create_tables()
    except Exception as e:
        print(f"Warning: could not create/verify tables — {e}")
        print("The app will still start; ensure your DATABASE_URL is correct.")
    start_scheduler()
    print(f"Server ready on http://localhost:{get_settings().port}")
    yield
    stop_scheduler()
    print("Shutting down...")


app = FastAPI(
    title="Internship Hunter",
    description="AI-powered job outreach system",
    version="3.0.0",
    lifespan=lifespan,
)

# ── CORS ────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API routes ───────────────────────────────────────────────
app.include_router(companies.router, prefix="/api/companies", tags=["Companies"])
app.include_router(emails.router, prefix="/api/emails", tags=["Emails"])
app.include_router(agent.router, prefix="/api/agent", tags=["Agent"])
app.include_router(stats.router, prefix="/api/stats", tags=["Stats"])
app.include_router(settings.router, prefix="/api/settings", tags=["Settings"])
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(tracking.router, prefix="/track", tags=["Tracking"])


# ── Health check ─────────────────────────────────────────────

@app.get("/api/health")
async def health():
    return {"status": "ok"}


# ── Serve React SPA (built with Vite) ────────────────────────
# Mount the assets directory for JS/CSS/images
if DIST_DIR.exists():
    app.mount("/assets", StaticFiles(directory=DIST_DIR / "assets"), name="assets")

    # Catch-all: serve index.html for any non-API route (SPA client-side routing)
    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(request: Request, full_path: str):
        # If the file exists in dist (e.g. favicon, robots.txt), serve it
        file_path = DIST_DIR / full_path
        if full_path and file_path.is_file():
            return FileResponse(file_path)
        # Otherwise serve index.html — React Router handles the route
        return FileResponse(DIST_DIR / "index.html")
