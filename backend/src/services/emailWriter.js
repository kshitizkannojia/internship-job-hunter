/**
 * AI Email Writer — Google Gemini API (Free Tier)
 *
 * Uses Gemini's free API to generate personalized cold emails.
 * Free tier: 15 requests/min, 1M tokens/day — more than enough.
 *
 * Get your free API key at: https://aistudio.google.com/apikey
 *
 * Falls back to Claude API if ANTHROPIC_API_KEY is set and GEMINI_API_KEY isn't.
 */

import prisma from '../lib/prisma.js';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * Generate a personalized email draft for a single company.
 * Returns { subjectA, subjectB, body, followupBody }.
 */
export async function generateEmail(company) {
  const systemPrompt = await loadSystemPrompt();
  const companyContext = buildCompanyContext(company);

  const userMessage = `Write a cold outreach email for this company. Return your response in EXACTLY this JSON format (no markdown, no code fences):

{"subjectA": "...", "subjectB": "...", "body": "...", "followupBody": "..."}

Company info:
${companyContext}

Requirements:
- subjectA and subjectB are two different A/B test subject lines (short, specific, no generic filler)
- body is a 4-sentence personalized email, max 120 words
- followupBody is a short 2-sentence follow-up to send after 3 days if no reply
- Reference something specific about the company (tech stack, recent news, product)
- Sound like a real student, not a sales bot
- End with a clear CTA (15-minute call or portfolio link)
- Never use "I hope this email finds you well" or similar`;

  let text;

  // Try Groq first (free), then Gemini, then Claude
  if (process.env.GROQ_API_KEY) {
    text = await callGroq(systemPrompt, userMessage);
  } else if (process.env.GEMINI_API_KEY) {
    text = await callGemini(systemPrompt, userMessage);
  } else if (process.env.ANTHROPIC_API_KEY) {
    text = await callClaude(systemPrompt, userMessage);
  } else {
    throw new Error('No AI API key configured. Set GROQ_API_KEY (free) or GEMINI_API_KEY or ANTHROPIC_API_KEY in .env');
  }

  // Parse the response
  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);

    if (!parsed.subjectA || !parsed.body) {
      throw new Error('Missing required fields in response');
    }

    return {
      subjectA: parsed.subjectA,
      subjectB: parsed.subjectB || parsed.subjectA,
      body: parsed.body,
      followupBody: parsed.followupBody || 'Hi — just following up on my email from a few days ago. I\'d love to chat for 15 minutes about how I could contribute to your team.',
    };
  } catch (parseErr) {
    console.error('Failed to parse AI response:', text?.slice(0, 200));
    throw new Error(`AI response parse error: ${parseErr.message}`);
  }
}

/**
 * Call Groq API (free tier — 30 req/min, 14.4K req/day).
 * Uses Llama 3 70B which is excellent at following instructions.
 */
async function callGroq(systemPrompt, userMessage) {
  const apiKey = process.env.GROQ_API_KEY;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 1024,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('Empty response from Groq');
  return text;
}

/**
 * Call Google Gemini API (free tier).
 */
async function callGemini(systemPrompt, userMessage) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = 'gemini-2.0-flash'; // fast, free, good at following instructions

  const res = await fetch(
    `${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userMessage }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
          responseMimeType: 'application/json',
        },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from Gemini');
  return text;
}

/**
 * Call Claude API (fallback if Anthropic key is set).
 */
async function callClaude(systemPrompt, userMessage) {
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  const text = response.content[0]?.text?.trim();
  if (!text) throw new Error('Empty response from Claude');
  return text;
}

/**
 * Build a concise context string about the company for the prompt.
 */
function buildCompanyContext(company) {
  const lines = [`Company: ${company.name}`];
  if (company.website) lines.push(`Website: ${company.website}`);
  if (company.contactName) lines.push(`Contact: ${company.contactName}`);
  if (company.contactTitle) lines.push(`Title: ${company.contactTitle}`);
  if (company.industry) lines.push(`Industry: ${company.industry}`);
  if (company.location) lines.push(`Location: ${company.location}`);
  if (company.size) lines.push(`Company size: ${company.size} employees`);
  if (company.roleHint) lines.push(`Target role: ${company.roleHint}`);
  if (company.techStack?.length > 0) lines.push(`Tech stack: ${company.techStack.join(', ')}`);
  if (company.recentNews) lines.push(`Recent news: ${company.recentNews}`);
  return lines.join('\n');
}

/**
 * Load the AI system prompt from the settings table.
 */
async function loadSystemPrompt() {
  try {
    const setting = await prisma.setting.findUnique({ where: { key: 'ai_prompt' } });
    if (setting?.value) {
      try { return JSON.parse(setting.value); } catch { return setting.value; }
    }
  } catch (err) {
    console.error('Failed to load AI prompt from settings:', err.message);
  }

  return `You are writing a cold outreach email on behalf of a college student in India looking for an internship.

Rules:
- Sound like a real person, not a bot or salesperson
- Reference one specific thing about the company (recent news, tech stack, product they built)
- Keep the email body under 120 words, exactly 4 sentences
- End with a clear CTA: suggest a 15-minute call or link to portfolio
- Never use "I hope this email finds you well" or similar clichés
- Be concise, genuine, and enthusiastic
- The tone should be professional but warm — a motivated student, not a corporate drone`;
}
