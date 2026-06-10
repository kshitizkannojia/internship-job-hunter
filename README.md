# Internship Hunter

AI-powered job outreach system that automatically finds companies, personalizes cold emails using AI, sends them via Gmail, and tracks replies — all from a single dashboard.

## Tech Stack

- **Backend**: Python 3.11+ / FastAPI / SQLAlchemy (async)
- **Frontend**: Jinja2 templates + Tailwind CSS + HTMX + Alpine.js
- **Database**: PostgreSQL (Supabase free tier)
- **AI**: Groq (Llama 3.3 70B, free tier)
- **Scraping**: Apollo.io API + Playwright fallback
- **Email**: Gmail API (OAuth2)
- **Verification**: ZeroBounce

## Architecture

```
app/
  main.py           FastAPI entry point + page routes
  config.py         Pydantic settings (loads .env)
  database.py       Async SQLAlchemy engine
  models.py         ORM models (companies, emails, agent_runs, settings)
  routes/           REST API endpoints
  services/         Business logic (scraper, AI writer, sender, scheduler)
  templates/        Jinja2 HTML templates (dashboard, emails, settings)
  static/css/       Custom styles
seed.py             Seed default settings + test companies
requirements.txt    Python dependencies
```

## Quick Start

### 1. Clone & install

```bash
git clone https://github.com/kshitizkannojia/internship-job-hunter.git
cd internship-job-hunter

python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

pip install -r requirements.txt
playwright install chromium
```

### 2. Configure

```bash
copy .env.example .env       # Windows
# cp .env.example .env       # macOS/Linux
```

Fill in your API keys in `.env` (at minimum `DATABASE_URL` and `GROQ_API_KEY`).

### 3. Seed the database

```bash
python seed.py
```

### 4. Run

```bash
uvicorn app.main:app --reload --port 8000
```

Open [http://localhost:8000](http://localhost:8000).

## API Keys Needed

| Service | Purpose | Free tier |
|---------|---------|-----------|
| Supabase | PostgreSQL database | 500 MB |
| Groq | AI email writing (Llama 3.3 70B) | 30 req/min |
| Apollo.io | Company/contact discovery | 50 credits/month |
| ZeroBounce | Email verification | 100/month |
| Gmail API | Sending & tracking emails | Free with OAuth |

## API Docs

FastAPI auto-generates interactive docs at [http://localhost:8000/docs](http://localhost:8000/docs).

## License

MIT
