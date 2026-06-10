import { Router } from 'express';
import prisma from '../lib/prisma.js';

const router = Router();

// GET /api/track/:pixelId — serves a 1x1 transparent GIF and records the open
// The tracking pixel URL is embedded in outgoing emails as an <img> tag.
const TRANSPARENT_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

router.get('/:pixelId', async (req, res) => {
  try {
    // Fire-and-forget: update the email's openedAt timestamp
    await prisma.email.updateMany({
      where: { trackingPixelId: req.params.pixelId, openedAt: null },
      data: { openedAt: new Date(), status: 'opened' },
    });
  } catch (err) {
    console.error('Tracking pixel error:', err);
  }

  // Always return the image regardless of DB errors
  res.set({
    'Content-Type': 'image/gif',
    'Content-Length': TRANSPARENT_GIF.length,
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  });
  res.end(TRANSPARENT_GIF);
});

export default router;
