# Internship Hunter

AI-powered job outreach system that automatically finds companies, personalizes cold emails using Claude, sends them via Gmail, and tracks replies — all from a single dashboard.

## Architecture

```
frontend/          React + Vite + Tailwind + shadcn/ui
backend/
  src/
    routes/        Express REST API
    services/      Business logic (scraper, AI writer, email sender)
    jobs/          BullMQ workers
    lib/           Prisma client singleton
  prisma/          Schema + migrations + seed
```

## Prerequisites

- **Node.js** 18+
- **PostgreSQL** — free via [Supabase](https://supabase.com)
- **Redis** — free via [Upstash](https://upstash.com) (needed for job queue in Session 5)

## Quick Start

### 1. Clone & install

```bash
git clone https://github.com/YOUR_USERNAME/internship-hunter.git
cd internship-hunter

# Backend
cd backend
npm install
cp .env.example .env   # fill in your keys

# Frontend
cd ../frontend
npm install
```

### 2. Set up the database

Create a free Supabase project, copy the connection string into `backend/.env`, then:

```bash
cd backend
npx prisma db push     # creates tables
npx prisma db seed     # seeds default settings
```

### 3. Run locally

```bash
# Terminal 1 — backend
cd backend
npm run dev

# Terminal 2 — frontend
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The status indicator should show **API: ok**.

## API Keys Needed

| Service | Purpose | Free tier |
|---------|---------|-----------|
| Supabase | PostgreSQL database | 500 MB |
| Anthropic | AI email writing (Claude) | Pay-as-you-go |
| Apollo.io | Company/contact discovery | 50 credits/month |
| Hunter.io | Email verification | 25 searches/month |
| Gmail API | Sending & tracking emails | Free with OAuth |
| Upstash | Redis for BullMQ job queue | 10K commands/day |

## Build Sessions

1. **Project setup** — folder structure, Prisma schema, Express boilerplate *(this session)*
2. **Dashboard UI** — stats cards, outreach table, pipeline chart
3. **Scraper agent** — Apollo API + Playwright fallback + Hunter.io verification
4. **AI email writer** — Claude API integration + prompt engineering
5. **Email sender** — Gmail OAuth + tracking pixel + follow-up scheduler
6. **Settings page** — Monaco prompt editor + target config
7. **Polish & deploy** — error handling, mobile responsiveness, Vercel + Railway

## License

MIT
