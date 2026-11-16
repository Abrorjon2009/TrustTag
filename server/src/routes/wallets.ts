import { Router } from 'express';
import { prisma } from '../db';

const router = Router();

// GET /api/wallets/:userId - Get wallet details & ledger transactions
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    let wallet = await prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: {
          userId,
          availableBalance: 100.0, // Initial welcome test balance
        },
      });
    }

    // Fetch user's active safe hold in trades (buying + selling)
    const activeBuyerTrades = await prisma.tradeSession.findMany({
      where: { buyerId: userId, status: 'MONEY_IN_SAFE_HOLD' },
    });
    const buyerLockedTotal = activeBuyerTrades.reduce((sum, t) => sum + t.agreedPrice, 0);

    const activeSellerTrades = await prisma.tradeSession.findMany({
      where: { sellerId: userId, status: 'MONEY_IN_SAFE_HOLD' },
    });
    const sellerIncomingTotal = activeSellerTrades.reduce((sum, t) => sum + t.agreedPrice, 0);

    // Fetch ledger transaction history
    const transactions = await prisma.ledgerEntry.findMany({
      where: {
        OR: [
          { sourceWalletId: wallet.id },
          { destWalletId: wallet.id },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({
      wallet,
      buyerLockedTotal,
      sellerIncomingTotal,
      transactions: transactions.map((tx) => ({
        ...tx,
        isCredit: tx.destWalletId === wallet?.id,
      })),
    });
  } catch (error) {
    console.error('Wallet error:', error);
    res.status(500).json({ error: 'Failed to fetch wallet info' });
  }
});

// POST /api/wallets/:userId/topup - Top up available balance
router.post('/:userId/topup', async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount } = req.body;

    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Invalid top-up amount' });
    }

    const amt = parseFloat(amount);
    let wallet = await prisma.wallet.findUnique({ where: { userId } });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: { userId, availableBalance: amt },
      });
    } else {
      wallet = await prisma.wallet.update({
        where: { id: wallet.id },
        data: { availableBalance: { increment: amt } },
      });
    }

    // Ledger record
    await prisma.ledgerEntry.create({
      data: {
        destWalletId: wallet.id,
        amount: amt,
        txType: 'DEPOSIT_TOPUP',
        idempotencyKey: `topup_${userId}_${Date.now()}`,
        notes: `User added ${amt.toLocaleString()} so'm to wallet via Bank Card`,
      },
    });

    res.json(wallet);
  } catch (error) {
    console.error('Topup error:', error);
    res.status(500).json({ error: 'Failed to process top-up' });
  }
});

// POST /api/wallets/:userId/withdraw-bank - Cash out to personal bank card
router.post('/:userId/withdraw-bank', async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount, bankCardNumber } = req.body;

    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Invalid withdrawal amount' });
    }

    const amt = parseFloat(amount);
    const wallet = await prisma.wallet.findUnique({ where: { userId } });

    if (!wallet || wallet.availableBalance < amt) {
      return res.status(400).json({ error: 'Insufficient available balance' });
    }

    const updated = await prisma.wallet.update({
      where: { id: wallet.id },
      data: { availableBalance: { decrement: amt } },
    });

    await prisma.ledgerEntry.create({
      data: {
        sourceWalletId: wallet.id,
        amount: amt,
        txType: 'CASH_OUT_TO_BANK',
        idempotencyKey: `cashout_${userId}_${Date.now()}`,
        notes: `Withdrawn ${amt.toLocaleString()} so'm to Bank Card ending in ${bankCardNumber ? bankCardNumber.slice(-4) : '****'}`,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Withdraw bank error:', error);
    res.status(500).json({ error: 'Failed to withdraw to bank' });
  }
});

export default router;

