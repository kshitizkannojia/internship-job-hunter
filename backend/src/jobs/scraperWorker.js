/**
 * BullMQ Worker for Agent Jobs
 *
 * Handles "scraper", "writer", and "sender" job types.
 * If Redis isn't configured (no REDIS_URL), runs jobs inline.
 */

import { runScraper } from '../services/scraperOrchestrator.js';
import { runWriter } from '../services/writerOrchestrator.js';
import { runSender } from '../services/senderOrchestrator.js';

let Worker, Queue;
const REDIS_URL = process.env.REDIS_URL;

let agentQueue = null;

export async function initQueue() {
  if (!REDIS_URL) {
    console.log('Jobs: REDIS_URL not set — agents will run inline (no queue)');
    return;
  }

  try {
    const bullmq = await import('bullmq');
    Worker = bullmq.Worker;
    Queue = bullmq.Queue;

    const connection = { url: REDIS_URL };

    agentQueue = new Queue('agent', { connection });

    const worker = new Worker(
      'agent',
      async (job) => {
        const { runId, type } = job.data;
        console.log(`Worker: processing ${type} job ${job.id}, runId=${runId}`);

        if (type === 'scraper') {
          await runScraper(runId);
        } else if (type === 'writer') {
          await runWriter(runId);
        } else if (type === 'sender') {
          await runSender(runId);
        } else {
          throw new Error(`Unknown job type: ${type}`);
        }
      },
      {
        connection,
        concurrency: 1,
      }
    );

    worker.on('completed', (job) => {
      console.log(`Worker: job ${job.id} completed`);
    });

    worker.on('failed', (job, err) => {
      console.error(`Worker: job ${job?.id} failed:`, err.message);
    });

    console.log('Jobs: BullMQ worker started');
  } catch (err) {
    console.error('Jobs: failed to init BullMQ:', err.message);
    console.log('Jobs: falling back to inline execution');
  }
}

/**
 * Enqueue an agent job. If Redis isn't available, runs inline.
 */
export async function enqueueAgentJob(runId, type = 'scraper') {
  if (agentQueue) {
    await agentQueue.add(type, { runId, type }, {
      attempts: 1,
      removeOnComplete: true,
      removeOnFail: false,
    });
    console.log(`Jobs: enqueued ${type} job for run ${runId}`);
  } else {
    // No Redis — run directly (non-blocking)
    console.log(`Jobs: running ${type} inline for run ${runId}`);
    const runners = { scraper: runScraper, writer: runWriter, sender: runSender };
    const runner = runners[type] || runScraper;
    runner(runId).catch((err) => {
      console.error(`Inline ${type} error:`, err.message);
    });
  }
}

// Keep backward compat — old name used in agent route
export const enqueueScrapeJob = (runId) => enqueueAgentJob(runId, 'scraper');
