import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Seeds the settings table with sensible defaults so the app
// works out of the box without requiring manual configuration.
async function main() {
  const defaults = {
    ai_prompt: JSON.stringify(
      `You are writing a cold outreach email on behalf of a college student looking for an internship.
Rules:
- Sound like a real person, not a bot
- Reference one specific thing about the company (recent news, tech stack, product)
- Keep it under 120 words
- End with a clear CTA: suggest a 15-minute call or link to portfolio
- Never use "I hope this email finds you well" or similar clichés
- Be concise, genuine, and enthusiastic`
    ),
    daily_send_limit: '50',
    require_approval: 'true',
    target_industry: '""',
    target_location: '""',
    target_company_size: '""',
    target_role_keywords: '""',
  };

  for (const [key, value] of Object.entries(defaults)) {
    await prisma.setting.upsert({
      where: { key },
      update: {},          // don't overwrite existing values
      create: { key, value },
    });
  }

  console.log('✅ Seed complete');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
