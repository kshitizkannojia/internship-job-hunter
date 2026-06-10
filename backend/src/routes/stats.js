import { Router } from 'express';
import prisma from '../lib/prisma.js';

const router = Router();

// GET /api/stats — dashboard summary numbers
router.get('/', async (_req, res, next) => {
  try {
    const [
      totalCompanies,
      emailsSent,
      repliesReceived,
      interviewsBooked,
      emailsByStatus,
      recentActivity,
    ] = await Promise.all([
      prisma.company.count(),
      prisma.email.count({ where: { status: { in: ['sent', 'opened', 'replied'] } } }),
      prisma.email.count({ where: { status: 'replied' } }),
      prisma.company.count({ where: { status: 'interview' } }),

      // Breakdown for the pipeline chart
      prisma.email.groupBy({ by: ['status'], _count: true }),

      // Last 7 days of email sends for the reply-rate chart
      prisma.email.findMany({
        where: {
          sentAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
        select: { sentAt: true, status: true },
        orderBy: { sentAt: 'asc' },
      }),
    ]);

    const replyRate = emailsSent > 0
      ? ((repliesReceived / emailsSent) * 100).toFixed(1)
      : 0;

    res.json({
      totalCompanies,
      emailsSent,
      repliesReceived,
      interviewsBooked,
      replyRate: Number(replyRate),
      emailsByStatus,
      recentActivity,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
