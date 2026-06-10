from __future__ import annotations
"""
Playwright Fallback Scraper.

When Apollo returns nothing, uses a headless browser to search Google
for companies matching the target config. Discovers names, websites,
and basic tech stack metadata.
"""

from playwright.async_api import async_playwright


async def scrape_companies(config: dict) -> list[dict]:
    """Google search fallback scraper. Returns list of company dicts."""
    industry = config.get("industry", "tech startups")
    location = config.get("location", "India")
    role_keywords = config.get("roleKeywords", "internship")

    query = f"{industry} companies {location} {role_keywords} hiring"
    print(f'Playwright: searching Google for "{query}"')

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-setuid-sandbox"],
        )

        try:
            page = await browser.new_page()
            await page.set_extra_http_headers({"Accept-Language": "en-US,en;q=0.9"})

            await page.goto(
                f"https://www.google.com/search?q={query}&num=20",
                wait_until="domcontentloaded",
                timeout=15000,
            )

            await page.wait_for_selector("div#search", timeout=10000).catch_(lambda _: None)

            # Extract search results
            raw_results = await page.evaluate("""() => {
                const items = [];
                const links = document.querySelectorAll('div#search a[href^="http"]');
                for (const link of links) {
                    const href = link.getAttribute('href');
                    const title = link.innerText?.trim();
                    if (href && title && !href.includes('google.com') &&
                        !href.includes('youtube.com') && !href.includes('wikipedia.org') &&
                        title.length > 3) {
                        items.push({ url: href, title });
                    }
                }
                return items.slice(0, 15);
            }""")

            companies = []
            seen_domains = set()

            skip_domains = {
                "linkedin.com", "glassdoor.com", "indeed.com", "naukri.com",
                "ambitionbox.com", "quora.com", "reddit.com", "medium.com",
                "twitter.com", "facebook.com", "instagram.com",
            }

            for result in raw_results:
                try:
                    from urllib.parse import urlparse
                    domain = urlparse(result["url"]).hostname.replace("www.", "")

                    if domain in seen_domains or any(s in domain for s in skip_domains):
                        continue
                    seen_domains.add(domain)

                    meta = await _scrape_company_page(browser, result["url"])

                    name = meta.get("name") or _clean_name(result["title"])
                    companies.append({
                        "name": name,
                        "website": result["url"],
                        "contactName": None,
                        "contactEmail": None,
                        "contactTitle": None,
                        "linkedinUrl": None,
                        "industry": industry,
                        "location": location,
                        "size": None,
                        "techStack": meta.get("techStack", []),
                        "recentNews": None,
                        "roleHint": role_keywords,
                        "source": "playwright",
                    })
                except Exception:
                    pass

            return companies

        except Exception as e:
            print(f"Playwright scraper error: {e}")
            return []
        finally:
            await browser.close()


async def _scrape_company_page(browser, url: str) -> dict:
    """Visit a company page, extract title and tech stack hints."""
    page = await browser.new_page()
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=8000)
        meta = await page.evaluate("""() => {
            const title = document.title || '';
            const html = document.documentElement.innerHTML.toLowerCase();
            const techHints = [];
            const techMap = {
                'react': /react/, 'next.js': /next\\.js|nextjs|_next/,
                'vue': /vue\\.js|vuejs/, 'angular': /angular/,
                'django': /django/, 'rails': /ruby on rails|rails/,
                'node': /node\\.js|nodejs|express/, 'python': /python|flask|fastapi/,
                'typescript': /typescript/, 'tailwind': /tailwind/,
            };
            for (const [tech, pattern] of Object.entries(techMap)) {
                if (pattern.test(html)) techHints.push(tech);
            }
            return { name: title.split('|')[0].split('-')[0].trim(), techStack: techHints };
        }""")
        return meta
    except Exception:
        return {"name": None, "techStack": []}
    finally:
        await page.close()


def _clean_name(title: str) -> str:
    import re
    name = re.split(r"\s*[-|–—]\s*", title)[0]
    name = re.sub(r"\s*\(.*\)", "", name)
    return name.strip()[:60]
