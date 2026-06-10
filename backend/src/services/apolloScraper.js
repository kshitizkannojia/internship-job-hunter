/**
 * Apollo.io API Integration
 *
 * Uses Apollo's free-tier "People Search" and "Organization Search" endpoints
 * to find companies and contacts matching the target config.
 *
 * Free tier: 50 credits/month. Each search uses ~1 credit per result.
 * API docs: https://apolloio.github.io/apollo-api-docs/
 */

const APOLLO_BASE = 'https://api.apollo.io/v1';

export async function searchCompanies(config, apiKey) {
  if (!apiKey) {
    console.warn('Apollo API key not set — skipping Apollo search');
    return [];
  }

  const {
    industry = '',
    location = '',
    companySize = '',
    roleKeywords = '',
  } = config;

  try {
    // Step 1: Search for organizations matching filters
    const orgRes = await fetch(`${APOLLO_BASE}/mixed_companies/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
      body: JSON.stringify({
        api_key: apiKey,
        q_organization_keyword_tags: industry ? [industry] : undefined,
        organization_locations: location ? [location] : undefined,
        organization_num_employees_ranges: companySize
          ? [companySize]
          : undefined,
        page: 1,
        per_page: 25, // conservative to stay within free tier
      }),
    });

    if (!orgRes.ok) {
      const err = await orgRes.text();
      throw new Error(`Apollo org search failed (${orgRes.status}): ${err}`);
    }

    const orgData = await orgRes.json();
    const organizations = orgData.organizations || [];

    if (organizations.length === 0) {
      console.log('Apollo: no organizations found for given filters');
      return [];
    }

    // Step 2: For each org, find a relevant contact (hiring manager / founder)
    const results = [];

    for (const org of organizations) {
      try {
        const contact = await findContact(org.id, roleKeywords, apiKey);

        results.push({
          name: org.name,
          website: org.website_url || org.primary_domain,
          contactName: contact?.name || null,
          contactEmail: contact?.email || null,
          contactTitle: contact?.title || null,
          linkedinUrl: org.linkedin_url || null,
          industry: org.industry || null,
          location: org.city
            ? `${org.city}, ${org.state || org.country}`
            : org.country || null,
          size: org.estimated_num_employees
            ? estimateRange(org.estimated_num_employees)
            : null,
          techStack: org.technology_names?.slice(0, 10) || [],
          recentNews: null, // enriched later via web search
          roleHint: contact?.title || roleKeywords || null,
          source: 'apollo',
        });
      } catch (err) {
        console.error(`Apollo: error fetching contact for ${org.name}:`, err.message);
        // Still include the company without contact info
        results.push({
          name: org.name,
          website: org.website_url || org.primary_domain,
          contactName: null,
          contactEmail: null,
          contactTitle: null,
          linkedinUrl: org.linkedin_url || null,
          industry: org.industry || null,
          location: org.city
            ? `${org.city}, ${org.state || org.country}`
            : org.country || null,
          size: org.estimated_num_employees
            ? estimateRange(org.estimated_num_employees)
            : null,
          techStack: org.technology_names?.slice(0, 10) || [],
          recentNews: null,
          roleHint: roleKeywords || null,
          source: 'apollo',
        });
      }
    }

    return results;
  } catch (err) {
    console.error('Apollo search error:', err.message);
    return [];
  }
}

/**
 * Find the most relevant contact at a company (HR, founder, engineering lead).
 * Uses Apollo's people search scoped to a specific organization.
 */
async function findContact(orgId, roleKeywords, apiKey) {
  // Search for people with relevant titles at this org
  const titles = roleKeywords
    ? [roleKeywords]
    : ['HR', 'Hiring Manager', 'Engineering Manager', 'CTO', 'Founder'];

  const res = await fetch(`${APOLLO_BASE}/mixed_people/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    },
    body: JSON.stringify({
      api_key: apiKey,
      q_organization_id: orgId,
      person_titles: titles,
      page: 1,
      per_page: 1,
    }),
  });

  if (!res.ok) return null;

  const data = await res.json();
  const person = data.people?.[0];
  if (!person) return null;

  return {
    name: person.name,
    email: person.email,
    title: person.title,
    linkedin: person.linkedin_url,
  };
}

// Converts a raw employee count to a range string (e.g. "51-200")
function estimateRange(count) {
  if (count <= 10) return '1-10';
  if (count <= 50) return '11-50';
  if (count <= 200) return '51-200';
  if (count <= 1000) return '201-1000';
  return '1000+';
}
