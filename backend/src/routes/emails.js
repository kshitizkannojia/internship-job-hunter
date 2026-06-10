import { Router } from 'express';
import prisma from '../lib/prisma.js';

const router = Router();

// GET /api/emails — list emails with optional status filter
router.get('/', async (req, res, next) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const where = status ? { status } : {};

    const [emails, total] = await Promise.all([
      prisma.email.findMany({
        where,
        include: { company: { select: { id: true, name: true, website: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: Number(limit),
      }),
      prisma.email.count({ where }),
    ]);

    res.json({ emails, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
});

// GET /api/emails/:id
router.get('/:id', async (req, res, next) => {
  try {
    const email = await prisma.email.findUnique({
      where: { id: req.params.id },
      include: { company: true },
    });
    if (!email) return res.status(404).json({ error: 'Email not found' });
    res.json(email);
  } catch (err) {
    next(err);
  }
});

// POST /api/emails/:id/approve — approve a draft for sending
router.post('/:id/approve', async (req, res, next) => {
  try {
    const email = await prisma.email.update({
      where: { id: req.params.id },
      data: { status: 'approved' },
    });
    res.json(email);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/emails/:id — edit a draft before sending
router.patch('/:id', async (req, res, next) => {
  try {
    const email = await prisma.email.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(email);
  } catch (err) {
    next(err);
  }
});

export default router;
