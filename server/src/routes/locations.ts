import { Router } from 'express';
import { prisma } from '../db';

const router = Router();

// GET /api/locations - Returns entire hierarchical tree (Regions -> Districts -> Cities)
router.get('/', async (req, res) => {
  try {
    const regions = await prisma.geoRegion.findMany({
      include: {
        districts: {
          include: {
            cities: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
    res.json(regions);
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({ error: 'Failed to fetch location hierarchy' });
  }
});

export default router;

