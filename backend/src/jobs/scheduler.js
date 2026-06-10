/**
 * Follow-up Scheduler
 *
 * Runs every hour via node-cron and:
 *   1. Sends any approved emails that haven't been sent yet
 *   2. Sends follow-up emails for messages with no reply after 3 days
 *
 * Also handles checking for Gmail push notification replies
 * (simplified polling approach for now — true webhooks in a future session).
 */

import cron from 'node-cron';
import prisma from '../lib/prisma.js';
import { sendEmail, sendApprovedEmails } from '../services/emailSender.js';

export function startScheduler() {
  console.log('Scheduler: starting cron jobs');

  // ── Every hour: send approved emails + check for follow-ups ──
  cron.schedule('0 * * * *', async () => {
    console.log('Scheduler: hourly check running...');

    try {
      // Send any approved emails
      const sendResult = await sendApprovedEmails();
      if (sendResult.sent > 0) {
        console.log(`Scheduler: sent ${sendResult.sent} approved emails`);
      }
    } catch (err) {
      console.error('Scheduler: send approved error:', err.message);
    }

    try {
      // Send follow-ups for emails with no reply after 3 days
      await sendFollowUps();
    } catch (err) {
      console.error('Scheduler: follow-up error:', err.message);
    }
  });

  // ── Every 6 hours: check for replies (polling approach) ──
  cron.schedule('0 */6 * * *', async () => {
    console.log('Scheduler: checking for replies...');
    try {
      await checkForReplies();
    } catch (err) {
      console.error('Scheduler: reply check error:', err.message);
    }
  });

  console.log('Scheduler: cron jobs registered (hourly send + follow-up, 6-hourly reply check)');
}

/**
 * Find sent emails with no reply after 3 days and send the follow-up.
 */
async function sendFollowUps() {
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

  const needsFollowUp = await prisma.email.findMany({
    where: {
      status: { in: ['sent', 'opened'] },      // sent but no reply
      sentAt: { lte: threeDaysAgo },            // sent 3+ days ago
      followupSentAt: null,                     // haven't sent follow-up yet
      followupBody: { not: null },              // has a follow-up drafted
    },
    include: { company: true },
    take: 10, // batch size
  });

  if (needsFollowUp.length === 0) return;

  console.log(`Scheduler: sending ${needsFollowUp.length} follow-ups`);

  for (const email of needsFollowUp) {
    if (!email.company?.contactEmail) continue;

    try {
      // Create a new email record for the follow-up
      const followUp = await prisma.email.create({
        data: {
          companyId: email.companyId,
          subjectA: `Re: ${email.chosenSubject || email.subjectA}`,
          body: email.followupBody,
          status: 'approved', // auto-approve follow-ups
        },
      });

      await sendEmail(followUp);

      // Mark original as follow-up sent
      await prisma.email.update({
        where: { id: email.id },
        data: { followupSentAt: new Date(), status: 'follow_up_sent' },
      });

      console.log(`Scheduler: follow-up sent to ${email.company.contactEmail}`);

      await new Promise((r) => setTimeout(r, 2000));
    } catch (err) {
      console.error(`Scheduler: follow-up failed for ${email.company?.name}:`, err.message);
    }
  }
}

/**
 * Check Gmail inbox for replies to our sent emails.
 * Uses Gmail API to search for replies by message ID.
 * (Simplified polling — a webhook approach is more efficient but requires
 *  a public URL + Google Cloud Pub/Sub setup.)
 */
async function checkForReplies() {
  const { google } = await import('googleapis');

  // Load Gmail tokens
  const [accessToken, refreshToken] = await Promise.all([
    prisma.setting.findUnique({ where: { key: 'gmail_access_token' } }),
    prisma.setting.findUnique({ where: { key: 'gmail_refresh_token' } }),
  ]);

  if (!refreshToken?.value) {
    return; // Gmail not connected
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    access_token: accessToken?.value,
    refresh_token: refreshToken.value,
  });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  // Find sent emails that haven't been marked as replied
  const sentEmails = await prisma.email.findMany({
    where: {
      status: { in: ['sent', 'opened', 'follow_up_sent'] },
      gmailMessageId: { not: null },
    },
    include: { company: true },
    take: 20,
  });

  for (const email of sentEmails) {
    try {
      // Get the thread for this message
      const msg = await gmail.users.messages.get({
        userId: 'me',
        id: email.gmailMessageId,
        format: 'metadata',
      });

      const threadId = msg.data.threadId;

      // Check if thread has more messages (= reply)
      const thread = await gmail.users.threads.get({
        userId: 'me',
        id: threadId,
        format: 'minimal',
      });

      // If thread has more than 1 message, we got a reply
      if (thread.data.messages && thread.data.messages.length > 1) {
        await prisma.email.update({
          where: { id: email.id },
          data: { status: 'replied', repliedAt: new Date() },
        });

        await prisma.company.update({
          where: { id: email.companyId },
          data: { status: 'replied' },
        });

        console.log(`Scheduler: reply detected from ${email.company?.name}`);
      }
    } catch (err) {
      // Silently skip — might be a token issue
      if (err.code !== 401) {
        console.error(`Reply check error for ${email.company?.name}:`, err.message);
      }
    }
  }
}
