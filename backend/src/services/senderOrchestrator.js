/**
 * Sender Orchestrator
 *
 * Called when the "sender" agent type is triggered.
 * Sends all approved emails, updates the agent run record.
 */

import prisma from '../lib/prisma.js';
import { sendApprovedEmails } from './emailSender.js';

export async function runSender(runId) {
  try {
    await prisma.agentRun.update({
      where: { id: runId },
      data: { status: 'running' },
    });

    const result = await sendApprovedEmails();

    await prisma.agentRun.update({
      where: { id: runId },
      data: {
        status: 'completed',
        completedAt: new Date(),
        emailsSent: result.sent,
        errors: result.errors || [],
      },
    });

    console.log(`Sender: done. ${result.sent} emails sent.`);
  } catch (err) {
    console.error('Sender orchestrator error:', err);
    await prisma.agentRun.update({
      where: { id: runId },
      data: {
        status: 'failed',
        completedAt: new Date(),
        errors: [err.message],
      },
    });
  }
}
