/**
 * Scraper Orchestrator
 *
 * Coordinates the full scraping pipeline:
 *   1. Load target config from settings
 *   2. Search companies via Apollo (primary) or Playwright (fallback)
 *   3. Verify/find emails via Hunter.io
 *   4. Deduplicate against existing companies in DB
 *   5. Store results and update the agent run record
 *
 * Called by the BullMQ worker in jobs/scraperWorker.js
 */

import prisma from '../lib/prisma.js';
import { searchCompanies as apolloSearch } from './apolloScraper.js';
import { scrapeCompanies as playwrightScrape } from './playwrightScraper.js';
import { verifyEmail } from './emailVerifier.js';

export async function runScraper(runId) {
  const startTime = Date.now();
  let companiesFound = 0;
  const errors = [];

  try {
    // ── 1. Load config ──────────────────────────────────────
    const settings = await loadSettings();
    const config = {
      industry: settings.target_industry || '',
      location: settings.target_location || '',
      companySize: settings.target_company_size || '',
      roleKeywords: settings.target_role_keywords || '',
    };

    await updateRun(runId, { status: 'running' });

    // ── 2. Scrape companies ─────────────────────────────────
    console.log('Scraper: starting company search...');
    let rawCompanies = [];

    // Try Apollo first
    if (process.env.APOLLO_API_KEY) {
      rawCompanies = await apolloSearch(config, process.env.APOLLO_API_KEY);
      console.log(`Apollo: found ${rawCompanies.length} companies`);
    }

    // Fall back to Playwright if Apollo returned nothing
    if (rawCompanies.length === 0) {
      console.log('Scraper: falling back to Playwright...');
      try {
        rawCompanies = await playwrightScrape(config);
        console.log(`Playwright: found ${rawCompanies.length} companies`);
      } catch (err) {
        console.error('Playwright fallback failed:', err.message);
        errors.push(`Playwright: ${err.message}`);
      }
    }

    if (rawCompanies.length === 0) {
      await updateRun(runId, {
        status: 'completed',
        completedAt: new Date(),
        companiesFound: 0,
        errors: ['No companies found with current filters'],
      });
      return;
    }

    // ── 3. Deduplicate ──────────────────────────────────────
    const existingNames = new Set(
      (await prisma.company.findMany({ select: { name: true } }))
        .map((c) => c.name.toLowerCase())
    );

    const newCompanies = rawCompanies.filter(
      (c) => !existingNames.has(c.name.toLowerCase())
    );
    console.log(`Scraper: ${newCompanies.length} new companies after dedup`);

    // ── 4. Verify emails via ZeroBounce ──────────────────────
    const zeroBounceKey = process.env.ZEROBOUNCE_API_KEY;

    for (const company of newCompanies) {
      try {
        // If we have a website but no email, try to find one (uses Apollo contacts mainly now)
        if (company.website && !company.contactEmail) {
          // If we had domain finder API we could use it, but since we are using ZeroBounce for verification:
          // We verify the email we got from Apollo
        }

        // Verify the email if we have one
        if (company.contactEmail && zeroBounceKey) {
          const verification = await verifyEmail(company.contactEmail);
          if (verification?.result === 'undeliverable') {
            console.log(`Scraper: ${company.contactEmail} is undeliverable, clearing`);
            company.contactEmail = null;
          }
        }
      } catch (err) {
        console.error(`Email verification error for ${company.name}:`, err.message);
        errors.push(`ZeroBounce (${company.name}): ${err.message}`);
      }
    }

    // ── 5. Store in database ────────────────────────────────
    for (const company of newCompanies) {
      try {
        await prisma.company.create({
          data: {
            name: company.name,
            website: company.website,
            contactName: company.contactName,
            contactEmail: company.contactEmail,
            contactTitle: company.contactTitle,
            linkedinUrl: company.linkedinUrl,
            industry: company.industry,
            location: company.location,
            size: company.size,
            techStack: company.techStack,
            recentNews: company.recentNews,
            roleHint: company.roleHint,
            source: company.source,
            // If we have a verified email, mark as "verified"; otherwise "discovered"
            status: company.contactEmail ? 'verified' : 'discovered',
          },
        });
        companiesFound++;
      } catch (err) {
        // Skip duplicates (unique constraint violations)
        if (err.code !== 'P2002') {
          console.error(`DB insert error for ${company.name}:`, err.message);
          errors.push(`DB (${company.name}): ${err.message}`);
        }
      }
    }

    // ── 6. Finalize ─────────────────────────────────────────
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`Scraper: done. ${companiesFound} companies stored in ${elapsed}s`);

    await updateRun(runId, {
      status: 'completed',
      completedAt: new Date(),
      companiesFound,
      errors,
    });
  } catch (err) {
    console.error('Scraper orchestrator fatal error:', err);
    await updateRun(runId, {
      status: 'failed',
      completedAt: new Date(),
      companiesFound,
      errors: [...errors, err.message],
    });
  }
}

// ── Helpers ───────────────────────────────────────────────────

async function loadSettings() {
  const rows = await prisma.setting.findMany();
  const settings = {};
  for (const row of rows) {
    try {
      settings[row.key] = JSON.parse(row.value);
    } catch {
      settings[row.key] = row.value;
    }
  }
  return settings;
}

async function updateRun(runId, data) {
  try {
    await prisma.agentRun.update({ where: { id: runId }, data });
  } catch (err) {
    console.error('Failed to update agent run:', err.message);
  }
}
