import { Router } from 'express';
import { prisma } from '../db';

const router = Router();

// GET /api/users - List available demo users
router.get('/', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { id: { not: '00000000-0000-0000-0000-000000000000' } },
      include: { wallet: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json(users);
  } catch (error) {
    console.error('Fetch users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/users/:id - Single user public profile & reviews
router.get('/:id', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        wallet: true,
        reviewsReceived: {
          include: {
            author: { select: { id: true, fullName: true, avatarUrl: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        productsListed: {
          where: { status: 'AVAILABLE' },
          take: 10,
        },
      },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    // Compute average rating
    const avgRating = user.reviewsReceived.length > 0
      ? user.reviewsReceived.reduce((acc, r) => acc + r.rating, 0) / user.reviewsReceived.length
      : 5.0;

    res.json({
      ...user,
      averageRating: parseFloat(avgRating.toFixed(1)),
      productsListed: user.productsListed.map((p) => ({
        ...p,
        images: JSON.parse(p.images || '[]'),
      })),
    });
  } catch (error) {
    console.error('User profile error:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// POST /api/users/review - Submit verified trade review
router.post('/review', async (req, res) => {
  try {
    const { tradeSessionId, authorId, targetUserId, rating, comment } = req.body;

    if (!tradeSessionId || !authorId || !targetUserId || !rating) {
      return res.status(400).json({ error: 'Missing review parameters' });
    }

    // Verify trade session is completed and author was a participant
    const trade = await prisma.tradeSession.findUnique({
      where: { id: tradeSessionId },
    });

    if (!trade) return res.status(404).json({ error: 'Trade not found' });
    if (trade.status !== 'COMPLETED') {
      return res.status(400).json({ error: 'Reviews are only allowed after a trade is successfully completed' });
    }

    if (trade.buyerId !== authorId && trade.sellerId !== authorId) {
      return res.status(403).json({ error: 'Only participants in this trade can leave a review' });
    }

    // Check if review already exists
    const existing = await prisma.review.findUnique({
      where: { tradeSessionId },
    });

    if (existing) {
      return res.status(400).json({ error: 'A review has already been submitted for this trade' });
    }

    const review = await prisma.review.create({
      data: {
        tradeSessionId,
        authorId,
        targetUserId,
        rating: parseInt(rating, 10),
        comment: comment || '',
      },
    });

    res.status(201).json(review);
  } catch (error) {
    console.error('Review error:', error);
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

export default router;

