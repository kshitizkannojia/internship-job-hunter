import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { enqueueAgentJob } from '../jobs/scraperWorker.js';

const router = Router();

// POST /api/agent/start — trigger a new agent run
router.post('/start', async (req, res, next) => {
  try {
    const { type = 'scraper' } = req.body;

    // Prevent concurrent runs of the same type
    const running = await prisma.agentRun.findFirst({
      where: { type, status: 'running' },
    });
    if (running) {
      return res.status(409).json({
        error: `A ${type} agent is already running`,
        runId: running.id,
      });
    }

    // Create the run record
    const run = await prisma.agentRun.create({
      data: { type, config: req.body.config ?? {} },
    });

    // Enqueue the job (or run inline if no Redis)
    await enqueueAgentJob(run.id, type);

    res.status(201).json(run);
  } catch (err) {
    next(err);
  }
});

// GET /api/agent/status — get the latest run (or specific run by ?runId=)
router.get('/status', async (req, res, next) => {
  try {
    const { runId } = req.query;

    const run = runId
      ? await prisma.agentRun.findUnique({ where: { id: runId } })
      : await prisma.agentRun.findFirst({ orderBy: { startedAt: 'desc' } });

    if (!run) return res.json({ status: 'idle' });
    res.json(run);
  } catch (err) {
    next(err);
  }
});

// GET /api/agent/status/stream — SSE stream for real-time progress
// The dashboard can use EventSource to get live updates while the agent runs.
router.get('/status/stream', async (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const { runId } = req.query;

  // Poll the run status every 2 seconds and push updates
  const interval = setInterval(async () => {
    try {
      const run = runId
        ? await prisma.agentRun.findUnique({ where: { id: runId } })
        : await prisma.agentRun.findFirst({ orderBy: { startedAt: 'desc' } });

      if (!run) {
        res.write(`data: ${JSON.stringify({ status: 'idle' })}\n\n`);
        return;
      }

      res.write(`data: ${JSON.stringify(run)}\n\n`);

      // Stop streaming once the run is done
      if (run.status === 'completed' || run.status === 'failed') {
        clearInterval(interval);
        res.end();
      }
    } catch (err) {
      console.error('SSE error:', err.message);
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    }
  }, 2000);

  // Clean up when client disconnects
  req.on('close', () => {
    clearInterval(interval);
    res.end();
  });
});

// GET /api/agent/history — list past runs
router.get('/history', async (req, res, next) => {
  try {
    const runs = await prisma.agentRun.findMany({
      orderBy: { startedAt: 'desc' },
      take: 20,
    });
    res.json(runs);
  } catch (err) {
    next(err);
  }
});

export default router;
