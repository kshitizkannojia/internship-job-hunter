import { Router } from 'express';
import prisma from '../lib/prisma.js';

const router = Router();

// GET /api/settings — get all settings as a key-value object
router.get('/', async (_req, res, next) => {
  try {
    const rows = await prisma.setting.findMany();
    const settings = {};
    for (const row of rows) {
      try {
        settings[row.key] = JSON.parse(row.value);
      } catch {
        settings[row.key] = row.value;
      }
    }
    res.json(settings);
  } catch (err) {
    next(err);
  }
});

// POST /api/settings — upsert one or more settings
// Body: { "key1": value1, "key2": value2 }
router.post('/', async (req, res, next) => {
  try {
    const entries = Object.entries(req.body);
    await Promise.all(
      entries.map(([key, value]) =>
        prisma.setting.upsert({
          where: { key },
          update: { value: typeof value === 'string' ? value : JSON.stringify(value) },
          create: { key, value: typeof value === 'string' ? value : JSON.stringify(value) },
        })
      )
    );
    res.json({ updated: entries.length });
  } catch (err) {
    next(err);
  }
});

export default router;
