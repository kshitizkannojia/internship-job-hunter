import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

import companiesRouter from './routes/companies.js';
import emailsRouter from './routes/emails.js';
import agentRouter from './routes/agent.js';
import statsRouter from './routes/stats.js';
import settingsRouter from './routes/settings.js';
import trackingRouter from './routes/tracking.js';
import authRouter from './routes/auth.js';
import gmailWebhookRouter from './routes/gmailWebhook.js';
import { initQueue } from './jobs/scraperWorker.js';
import { startScheduler } from './jobs/scheduler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ────────────────────────────────────────────────

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(morgan('dev'));
app.use(express.json());

// ── Routes ───────────────────────────────────────────────────

app.use('/api/companies', companiesRouter);
app.use('/api/emails', emailsRouter);
app.use('/api/agent', agentRouter);
app.use('/api/stats', statsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/track', trackingRouter); // tracking pixel endpoint
app.use('/api/auth', authRouter);     // Gmail OAuth flow
app.use('/api/webhooks', gmailWebhookRouter); // Gmail incoming webhook endpoint

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Global error handler ─────────────────────────────────────

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
});

app.listen(PORT, async () => {
  console.log(`🚀 Internship Hunter API running on http://localhost:${PORT}`);

  // Initialize the job queue (or fall back to inline execution)
  await initQueue();

  // Start the follow-up scheduler (cron jobs)
  startScheduler();
});

export default app;
