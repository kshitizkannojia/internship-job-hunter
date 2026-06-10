/**
 * Gmail OAuth2 Routes
 *
 * Two endpoints:
 *   GET  /api/auth/gmail          — redirects user to Google consent screen
 *   GET  /api/auth/gmail/callback — handles the OAuth callback, stores tokens
 *
 * Setup required:
 *   1. Create a project at console.cloud.google.com
 *   2. Enable Gmail API
 *   3. Create OAuth2 credentials (Web application)
 *   4. Set redirect URI to http://localhost:3001/api/auth/gmail/callback
 *   5. Add GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET to .env
 */

import { Router } from 'express';
import { google } from 'googleapis';
import prisma from '../lib/prisma.js';

const router = Router();

function getOAuth2Client() {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const redirectUri = process.env.GMAIL_REDIRECT_URI || 'http://localhost:3001/api/auth/gmail/callback';

  if (!clientId || !clientSecret) {
    throw new Error('GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET must be set in .env');
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

// GET /api/auth/gmail — start the OAuth flow
router.get('/gmail', (_req, res, next) => {
  try {
    const oauth2Client = getOAuth2Client();

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',       // gets a refresh token
      prompt: 'consent',            // always show consent to get refresh token
      scope: [
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.modify',
      ],
    });

    res.redirect(authUrl);
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/gmail/callback — handle Google's redirect
router.get('/gmail/callback', async (req, res, next) => {
  try {
    const { code, error } = req.query;

    if (error) {
      return res.status(400).send(`OAuth error: ${error}`);
    }

    if (!code) {
      return res.status(400).send('Missing authorization code');
    }

    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    // Store tokens in the settings table
    await prisma.setting.upsert({
      where: { key: 'gmail_access_token' },
      update: { value: tokens.access_token },
      create: { key: 'gmail_access_token', value: tokens.access_token },
    });

    if (tokens.refresh_token) {
      await prisma.setting.upsert({
        where: { key: 'gmail_refresh_token' },
        update: { value: tokens.refresh_token },
        create: { key: 'gmail_refresh_token', value: tokens.refresh_token },
      });
    }

    if (tokens.expiry_date) {
      await prisma.setting.upsert({
        where: { key: 'gmail_token_expiry' },
        update: { value: String(tokens.expiry_date) },
        create: { key: 'gmail_token_expiry', value: String(tokens.expiry_date) },
      });
    }

    console.log('Gmail OAuth: tokens saved successfully');

    // Subscribe to Gmail webhook alerts via Pub/Sub watch
    try {
      const oauth2Client = getOAuth2Client();
      oauth2Client.setCredentials(tokens);
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      
      // Google Cloud Pub/Sub topic name configured by the user in .env
      const topicName = process.env.GMAIL_PUBSUB_TOPIC || 'projects/your-gcp-project/topics/gmail-notifications';
      
      await gmail.users.watch({
        userId: 'me',
        requestBody: {
          topicName: topicName,
          labelIds: ['INBOX'], // only watch incoming inbox messages
        },
      });
      console.log(`Gmail OAuth: watch successfully registered with topic ${topicName}`);
    } catch (watchErr) {
      console.error('Gmail OAuth: failed to register watch hook:', watchErr.message);
    }

    // Redirect back to the frontend settings page
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?gmail=connected`);
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/gmail/status — check if Gmail is connected
router.get('/gmail/status', async (_req, res, next) => {
  try {
    const refreshToken = await prisma.setting.findUnique({
      where: { key: 'gmail_refresh_token' },
    });

    res.json({
      connected: !!refreshToken?.value,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/status — check configuration status of API keys in .env
router.get('/status', async (_req, res, next) => {
  try {
    res.json({
      gmailConnected: !!(await prisma.setting.findUnique({ where: { key: 'gmail_refresh_token' } }))?.value,
      groqConfigured: !!process.env.GROQ_API_KEY,
      geminiConfigured: !!process.env.GEMINI_API_KEY,
      anthropicConfigured: !!process.env.ANTHROPIC_API_KEY,
      apolloConfigured: !!process.env.APOLLO_API_KEY,
      zeroBounceConfigured: !!process.env.ZEROBOUNCE_API_KEY,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
