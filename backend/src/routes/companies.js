import { Router } from 'express';
import prisma from '../lib/prisma.js';

const router = Router();

// GET /api/companies — list all companies with optional filters
router.get('/', async (req, res, next) => {
  try {
    const { status, industry, location, search, page = 1, limit = 50 } = req.query;

    const where = {};
    if (status) where.status = status;
    if (industry) where.industry = { contains: industry, mode: 'insensitive' };
    if (location) where.location = { contains: location, mode: 'insensitive' };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { contactName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        where,
        include: { emails: { orderBy: { createdAt: 'desc' }, take: 1 } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: Number(limit),
      }),
      prisma.company.count({ where }),
    ]);

    res.json({ companies, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
});

// GET /api/companies/:id — single company with all emails
router.get('/:id', async (req, res, next) => {
  try {
    const company = await prisma.company.findUnique({
      where: { id: req.params.id },
      include: { emails: { orderBy: { createdAt: 'desc' } } },
    });
    if (!company) return res.status(404).json({ error: 'Company not found' });
    res.json(company);
  } catch (err) {
    next(err);
  }
});

// POST /api/companies — create a company manually
router.post('/', async (req, res, next) => {
  try {
    const company = await prisma.company.create({ data: req.body });
    res.status(201).json(company);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/companies/:id — update a company
router.patch('/:id', async (req, res, next) => {
  try {
    const company = await prisma.company.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(company);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/companies/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.company.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
