/**
 * Email Sender Service
 *
 * Sends approved emails via Gmail API (OAuth2) or Nodemailer (SMTP fallback).
 * - Adds a tracking pixel to detect opens
 * - Rate-limits to the configured daily send limit (default 50)
 * - Updates email status in DB after sending
 */

import { google } from 'googleapis';
import nodemailer from 'nodemailer';
import { v4 as uuid } from 'uuid';
import prisma from '../lib/prisma.js';

/**
 * Send a single email. Picks Gmail API if OAuth tokens exist, otherwise SMTP.
 */
export async function sendEmail(email) {
  const company = await prisma.company.findUnique({
    where: { id: email.companyId },
  });

  if (!company?.contactEmail) {
    throw new Error(`No contact email for company ${email.companyId}`);
  }

  // Generate a tracking pixel ID
  const trackingPixelId = uuid();
  const trackingUrl = `${process.env.TRACKING_BASE_URL || 'http://localhost:3001/api/track'}/${trackingPixelId}`;

  // Pick the subject (A variant by default)
  const subject = email.chosenSubject || email.subjectA;

  // Build the HTML body with tracking pixel
  const htmlBody = `
    <div style="font-family: sans-serif; font-size: 14px; line-height: 1.6; color: #333;">
      ${email.body.replace(/\n/g, '<br>')}
    </div>
    <img src="${trackingUrl}" width="1" height="1" style="display:none" alt="" />
  `.trim();

  // Try Gmail API first, fall back to SMTP
  const gmailTokens = await getGmailTokens();

  let gmailMessageId = null;

  if (gmailTokens) {
    gmailMessageId = await sendViaGmail(company.contactEmail, subject, htmlBody, gmailTokens);
  } else if (process.env.SMTP_HOST) {
    gmailMessageId = await sendViaSMTP(company.contactEmail, subject, htmlBody);
  } else {
    throw new Error('No email transport configured. Connect Gmail or set SMTP_HOST in .env');
  }

  // Update the email record
  await prisma.email.update({
    where: { id: email.id },
    data: {
      status: 'sent',
      sentAt: new Date(),
      chosenSubject: subject,
      trackingPixelId,
      gmailMessageId,
    },
  });

  // Update company status
  await prisma.company.update({
    where: { id: email.companyId },
    data: { status: 'emailed' },
  });

  console.log(`Sent email to ${company.contactEmail} (${company.name})`);
  return { trackingPixelId, gmailMessageId };
}

/**
 * Send approved emails in batch. Respects daily rate limit.
 */
export async function sendApprovedEmails() {
  // Load daily limit from settings
  const limitSetting = await prisma.setting.findUnique({ where: { key: 'daily_send_limit' } });
  const dailyLimit = parseInt(limitSetting?.value || '50', 10);

  // Count how many we've sent today
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const sentToday = await prisma.email.count({
    where: {
      sentAt: { gte: startOfDay },
      status: { in: ['sent', 'opened', 'replied'] },
    },
  });

  const remaining = Math.max(0, dailyLimit - sentToday);
  if (remaining === 0) {
    console.log('Sender: daily limit reached, skipping');
    return { sent: 0, reason: 'Daily limit reached' };
  }

  // Get approved emails
  const emails = await prisma.email.findMany({
    where: { status: 'approved' },
    take: remaining,
    orderBy: { createdAt: 'asc' },
  });

  if (emails.length === 0) {
    console.log('Sender: no approved emails to send');
    return { sent: 0, reason: 'No approved emails' };
  }

  console.log(`Sender: sending ${emails.length} emails (${remaining} remaining today)`);

  let sent = 0;
  const errors = [];

  for (const email of emails) {
    try {
      await sendEmail(email);
      sent++;
      // 2-second delay between sends to avoid spam flags
      await new Promise((r) => setTimeout(r, 2000));
    } catch (err) {
      console.error(`Sender: failed for email ${email.id}:`, err.message);
      errors.push(err.message);
    }
  }

  return { sent, errors };
}

// ── Gmail API Transport ─────────────────────────────────────

async function getGmailTokens() {
  try {
    const [accessToken, refreshToken] = await Promise.all([
      prisma.setting.findUnique({ where: { key: 'gmail_access_token' } }),
      prisma.setting.findUnique({ where: { key: 'gmail_refresh_token' } }),
    ]);

    if (!refreshToken?.value) return null;

    return {
      access_token: accessToken?.value,
      refresh_token: refreshToken.value,
    };
  } catch {
    return null;
  }
}

async function sendViaGmail(to, subject, htmlBody, tokens) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI
  );

  oauth2Client.setCredentials(tokens);

  // Refresh token if needed
  const { credentials } = await oauth2Client.refreshAccessToken();
  oauth2Client.setCredentials(credentials);

  // Save refreshed access token
  if (credentials.access_token) {
    await prisma.setting.upsert({
      where: { key: 'gmail_access_token' },
      update: { value: credentials.access_token },
      create: { key: 'gmail_access_token', value: credentials.access_token },
    });
  }

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  // Build RFC 2822 email
  const from = credentials.email || 'me';
  const raw = Buffer.from(
    `From: ${from}\r\n` +
    `To: ${to}\r\n` +
    `Subject: ${subject}\r\n` +
    `MIME-Version: 1.0\r\n` +
    `Content-Type: text/html; charset=utf-8\r\n\r\n` +
    htmlBody
  ).toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const result = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw },
  });

  return result.data.id;
}

// ── SMTP Fallback Transport ─────────────────────────────────

async function sendViaSMTP(to, subject, htmlBody) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const result = await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    html: htmlBody,
  });

  return result.messageId;
}
