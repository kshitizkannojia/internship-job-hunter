import { Router } from 'express';
import { google } from 'googleapis';
import prisma from '../lib/prisma.js';

const router = Router();

// POST /api/webhooks/gmail — Google Cloud Pub/Sub pushes updates here
// To set this up:
// 1. Set up a Pub/Sub topic (e.g. "gmail-notifications") in Google Cloud Console.
// 2. Grant Gmail permissions to publish to this topic.
// 3. Register a Push Subscription pointing to your deployed URL (e.g. https://your-backend.railway.app/api/webhooks/gmail).
// 4. Run `watch` on Gmail API to subscribe the mailbox.
router.post('/gmail', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.data) {
      return res.status(400).json({ error: 'Invalid Pub/Sub message format' });
    }

    // Base64 decode the Pub/Sub payload
    const decodedString = Buffer.from(message.data, 'base64').toString('utf-8');
    const notification = JSON.parse(decodedString);

    const emailAddress = notification.emailAddress;
    const historyId = notification.historyId;

    console.log(`Gmail Webhook: Received update for ${emailAddress}, historyId=${historyId}`);

    // Trigger asynchronous reply check using tokens
    checkUserInboxForReplies(emailAddress, historyId).catch((err) => {
      console.error('Webhook reply validation task failed:', err.message);
    });

    // Acknowledge Pub/Sub message immediately
    res.status(200).send('Event acknowledged');
  } catch (err) {
    console.error('Gmail Webhook processing error:', err.message);
    res.status(500).json({ error: 'Webhook handler crash' });
  }
});

/**
 * Connect to Gmail API, fetch history, and find new incoming messages on threads
 */
async function checkUserInboxForReplies(emailAddress, historyId) {
  // Load Gmail tokens
  const [accessToken, refreshToken] = await Promise.all([
    prisma.setting.findUnique({ where: { key: 'gmail_access_token' } }),
    prisma.setting.findUnique({ where: { key: 'gmail_refresh_token' } }),
  ]);

  if (!refreshToken?.value) return;

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

  // Get active outreach threads we're waiting on
  const activeEmails = await prisma.email.findMany({
    where: {
      status: { in: ['sent', 'opened', 'follow_up_sent'] },
      gmailMessageId: { not: null },
    },
    include: { company: true },
  });

  if (activeEmails.length === 0) return;

  // Search threads matching outgoing messages to check for new incoming items
  for (const email of activeEmails) {
    try {
      const msg = await gmail.users.messages.get({
        userId: 'me',
        id: email.gmailMessageId,
        format: 'metadata',
      });

      const threadId = msg.data.threadId;

      const thread = await gmail.users.threads.get({
        userId: 'me',
        id: threadId,
        format: 'minimal',
      });

      // If there's more than 1 message in the thread, a reply was received
      if (thread.data.messages && thread.data.messages.length > 1) {
        await prisma.$transaction([
          prisma.email.update({
            where: { id: email.id },
            data: { status: 'replied', repliedAt: new Date() },
          }),
          prisma.company.update({
            where: { id: email.companyId },
            data: { status: 'replied' },
          }),
        ]);
        console.log(`Gmail Webhook: reply confirmed for ${email.company?.name}`);
      }
    } catch (error) {
      console.warn(`Webhook failed checking replies for thread: ${error.message}`);
    }
  }
}

export default router;
