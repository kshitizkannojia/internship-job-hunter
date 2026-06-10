/**
 * Playwright Fallback Scraper
 *
 * When Apollo API key isn't configured or returns no results,
 * this scraper uses a headless browser to search Google for
 * companies matching the target filters and extract basic info.
 *
 * This is a best-effort fallback — it won't find emails (those
 * come from Hunter.io verification), but it discovers company names,
 * websites, and basic metadata.
 */

import { chromium } from 'playwright';

export async function scrapeCompanies(config) {
  const {
    industry = 'tech startups',
    location = 'India',
    roleKeywords = 'internship',
  } = config;

  const query = `${industry} companies ${location} ${roleKeywords} hiring`;
  console.log(`Playwright: searching Google for "${query}"`);

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();

    // Set a realistic user agent to avoid blocks
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
    });

    // Search Google
    await page.goto(
      `https://www.google.com/search?q=${encodeURIComponent(query)}&num=20`,
      { waitUntil: 'domcontentloaded', timeout: 15000 }
    );

    // Wait for results
    await page.waitForSelector('div#search', { timeout: 10000 }).catch(() => {});

    // Extract search result links and titles
    const rawResults = await page.evaluate(() => {
      const items = [];
      // Google search result anchors
      const links = document.querySelectorAll('div#search a[href^="http"]');
      for (const link of links) {
        const href = link.getAttribute('href');
        const title = link.innerText?.trim();
        if (
          href &&
          title &&
          !href.includes('google.com') &&
          !href.includes('youtube.com') &&
          !href.includes('wikipedia.org') &&
          title.length > 3
        ) {
          items.push({ url: href, title });
        }
      }
      return items.slice(0, 15); // cap at 15 results
    });

    // Try to extract company names from the results
    const companies = [];
    const seenDomains = new Set();

    for (const result of rawResults) {
      try {
        const domain = new URL(result.url).hostname.replace('www.', '');

        // Skip duplicates and common non-company sites
        if (seenDomains.has(domain)) continue;
        const skipDomains = [
          'linkedin.com', 'glassdoor.com', 'indeed.com', 'naukri.com',
          'ambitionbox.com', 'quora.com', 'reddit.com', 'medium.com',
          'twitter.com', 'facebook.com', 'instagram.com',
        ];
        if (skipDomains.some((d) => domain.includes(d))) continue;

        seenDomains.add(domain);

        // Try to visit the company page and extract metadata
        const meta = await scrapeCompanyPage(browser, result.url);

        companies.push({
          name: meta.name || cleanCompanyName(result.title),
          website: result.url,
          contactName: null,
          contactEmail: null,
          contactTitle: null,
          linkedinUrl: null,
          industry: industry || null,
          location: location || null,
          size: null,
          techStack: meta.techStack || [],
          recentNews: null,
          roleHint: roleKeywords || null,
          source: 'playwright',
        });
      } catch {
        // Skip problematic results
      }
    }

    return companies;
  } catch (err) {
    console.error('Playwright scraper error:', err.message);
    return [];
  } finally {
    if (browser) await browser.close();
  }
}

/**
 * Visit a company's website and try to extract basic metadata:
 * company name from <title>, tech stack from meta tags or scripts.
 */
async function scrapeCompanyPage(browser, url) {
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 8000 });

    const meta = await page.evaluate(() => {
      const title = document.title || '';
      // Look for common tech indicators in the page source
      const html = document.documentElement.innerHTML.toLowerCase();
      const techHints = [];

      const techMap = {
        react: /react/,
        'next.js': /next\.js|nextjs|_next/,
        vue: /vue\.js|vuejs/,
        angular: /angular/,
        django: /django/,
        rails: /ruby on rails|rails/,
        node: /node\.js|nodejs|express/,
        python: /python|flask|fastapi/,
        java: /java[^s]/,
        go: /golang/,
        rust: /rustlang/,
        typescript: /typescript/,
        tailwind: /tailwind/,
        wordpress: /wordpress|wp-content/,
        shopify: /shopify/,
      };

      for (const [tech, pattern] of Object.entries(techMap)) {
        if (pattern.test(html)) techHints.push(tech);
      }

      return { name: title.split('|')[0].split('-')[0].trim(), techStack: techHints };
    });

    return meta;
  } catch {
    return { name: null, techStack: [] };
  } finally {
    await page.close();
  }
}

// Clean up search result titles to extract a company name
function cleanCompanyName(title) {
  return title
    .replace(/\s*[-|–—]\s*.*/g, '')  // remove everything after separator
    .replace(/\s*\(.*\)/g, '')       // remove parenthetical
    .trim()
    .slice(0, 60);                   // cap length
}
