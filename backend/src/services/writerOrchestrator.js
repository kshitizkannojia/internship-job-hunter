/**
 * Writer Orchestrator
 *
 * Finds all companies with status "verified" (have an email but no draft yet),
 * calls Claude to generate a personalized email for each, and stores the drafts.
 *
 * Called by the BullMQ worker or inline when Redis isn't available.
 */

import prisma from '../lib/prisma.js';
import { generateEmail } from './emailWriter.js';

export async function runWriter(runId) {
  let emailsWritten = 0;
  const errors = [];

  try {
    await updateRun(runId, { status: 'running' });

    // Find companies that have a verified email but no email draft yet
    const companies = await prisma.company.findMany({
      where: {
        status: 'verified',
        contactEmail: { not: null },
        emails: { none: {} }, // no existing drafts
      },
      take: 20, // batch size — don't blow through Claude credits
    });

    if (companies.length === 0) {
      console.log('Writer: no verified companies need emails');
      await updateRun(runId, {
        status: 'completed',
        completedAt: new Date(),
        emailsWritten: 0,
        errors: ['No verified companies without drafts found'],
      });
      return;
    }

    console.log(`Writer: generating emails for ${companies.length} companies`);

    for (const company of companies) {
      try {
        console.log(`Writer: generating email for ${company.name}...`);
        const draft = await generateEmail(company);

        // Store the draft in the database
        await prisma.email.create({
          data: {
            companyId: company.id,
            subjectA: draft.subjectA,
            subjectB: draft.subjectB,
            body: draft.body,
            followupBody: draft.followupBody,
            status: 'draft',
          },
        });

        // Update company status to "emailed" (draft created)
        await prisma.company.update({
          where: { id: company.id },
          data: { status: 'emailed' },
        });

        emailsWritten++;

        // Small delay between API calls to avoid rate limiting
        await sleep(1000);
      } catch (err) {
        console.error(`Writer: error for ${company.name}:`, err.message);
        errors.push(`${company.name}: ${err.message}`);
      }
    }

    console.log(`Writer: done. ${emailsWritten} drafts created.`);
    await updateRun(runId, {
      status: 'completed',
      completedAt: new Date(),
      emailsWritten,
      errors,
    });
  } catch (err) {
    console.error('Writer orchestrator fatal error:', err);
    await updateRun(runId, {
      status: 'failed',
      completedAt: new Date(),
      emailsWritten,
      errors: [...errors, err.message],
    });
  }
}

async function updateRun(runId, data) {
  try {
    await prisma.agentRun.update({ where: { id: runId }, data });
  } catch (err) {
    console.error('Failed to update agent run:', err.message);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
