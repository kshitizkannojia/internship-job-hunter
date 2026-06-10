import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const testCompanies = [
  {
    name: 'Razorpay',
    website: 'razorpay.com',
    contactName: 'Harshil Mathur',
    contactEmail: 'harshil@razorpay.com',
    contactTitle: 'CEO',
    industry: 'Fintech',
    location: 'Bangalore, India',
    techStack: ['React', 'Node.js', 'Go', 'Ruby on Rails'],
    recentNews: 'Raised $375M Series F, expanding payments infrastructure across Southeast Asia',
    roleHint: 'Software Engineering Intern',
    status: 'verified',
    source: 'manual',
  },
  {
    name: 'Zerodha',
    website: 'zerodha.com',
    contactName: 'Nithin Kamath',
    contactEmail: 'nithin@zerodha.com',
    contactTitle: 'Founder & CEO',
    industry: 'Fintech',
    location: 'Bangalore, India',
    techStack: ['Python', 'Go', 'React', 'PostgreSQL'],
    recentNews: 'Largest retail stockbroker in India with 10M+ users',
    roleHint: 'Backend Engineering Intern',
    status: 'verified',
    source: 'manual',
  },
  {
    name: 'Postman',
    website: 'postman.com',
    contactName: 'Abhinav Asthana',
    contactEmail: 'abhinav@postman.com',
    contactTitle: 'CEO',
    industry: 'Developer Tools',
    location: 'Bangalore, India',
    techStack: ['Node.js', 'React', 'Electron', 'Java'],
    recentNews: 'Launched Postman Flows for API workflow automation',
    roleHint: 'Full Stack Intern',
    status: 'verified',
    source: 'manual',
  },
];

async function main() {
  for (const company of testCompanies) {
    await prisma.company.create({ data: company });
    console.log(`✅ Added: ${company.name}`);
  }
  console.log(`\nDone — ${testCompanies.length} test companies added.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
