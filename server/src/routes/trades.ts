import { Router } from 'express';
import { prisma } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { io } from '../index';

const router = Router();
const CENTRAL_VAULT_ID = '00000000-0000-0000-0000-000000000000';

// Helper to compute live status banner packet
export function getTradeBannerInfo(trade: any, currentUserId?: string) {
  switch (trade.status) {
    case 'NEGOTIATING':
      return {
        stage: 'STAGE_1_AGREEING',
        color: 'gray',
        badgeBg: '#F3F4F6',
        badgeText: '#4B5563',
        title: 'Agreeing on Terms',
        message: 'No money deposited yet. Do not hand over the product.',
        canDeposit: Boolean(currentUserId && trade.buyerId === currentUserId),
        canConfirmReceived: false,
        canWithdraw: false,
        canReport: true,
      };
    case 'MONEY_IN_SAFE_HOLD':
      const isShipped = Boolean(trade.shippedAt);
      return {
        stage: 'STAGE_2_SAFE_HOLD',
        color: 'green',
        badgeBg: '#DEF7EC',
        badgeText: '#03543F',
        title: isShipped ? 'Mahsulot Jo\'natildi • Mablag\' Xavfsiz Hisobda' : 'Pul Markaziy Xavfsiz Hisobda',
        message: isShipped
          ? `Sotuvchi mahsulotni jo'natdi/topshirdi. Tekshirib olgach, qabul qilishni tasdiqlang.`
          : `Xaridor ${trade.agreedPrice.toLocaleString()} so'm kiritdi. Mahsulotni topshirishingiz xavfsiz!`,
        canDeposit: false,
        canShip: Boolean(currentUserId && trade.sellerId === currentUserId && !isShipped),
        canConfirmReceived: Boolean(currentUserId && trade.buyerId === currentUserId),
        canWithdraw: Boolean(currentUserId && trade.buyerId === currentUserId && !isShipped),
        canReport: true,
      };
    case 'COMPLETED':
      return {
        stage: 'STAGE_3A_COMPLETED',
        color: 'blue',
        badgeBg: '#E1EFFE',
        badgeText: '#1E429F',
        title: 'Trade Completed',
        message: `Customer confirmed receipt. ${trade.agreedPrice.toLocaleString()} so'm has been sent to the Seller.`,
        canDeposit: false,
        canConfirmReceived: false,
        canWithdraw: false,
        canReport: true,
      };
    case 'CANCELLED_WITHDRAWN':
      return {
        stage: 'STAGE_3B_WITHDRAWN',
        color: 'yellow',
        badgeBg: '#FEF08A',
        badgeText: '#713F12',
        title: 'Money Withdrawn (Trade Cancelled)',
        message: 'Customer withdrew their money from the Central Account. DO NOT hand over the product!',
        canDeposit: false,
        canConfirmReceived: false,
        canWithdraw: false,
        canReport: true,
      };
    case 'UNDER_INVESTIGATION':
      return {
        stage: 'STAGE_4_INVESTIGATION',
        color: 'red',
        badgeBg: '#FDE8E8',
        badgeText: '#9B1C1C',
        title: 'Under Investigation',
        message: 'A report has been filed on this trade. Safe-Hold funds are frozen while Admins investigate.',
        canDeposit: false,
        canConfirmReceived: false,
        canWithdraw: false,
        canReport: false,
      };
    default:
      return {
        stage: 'UNKNOWN',
        color: 'gray',
        badgeBg: '#F3F4F6',
        badgeText: '#4B5563',
        title: 'Unknown Status',
        message: '',
        canDeposit: false,
        canConfirmReceived: false,
        canWithdraw: false,
        canReport: false,
      };
  }
}

// POST /api/trades/start - Initiate or resume a Safe Trade session
router.post('/start', async (req, res) => {
  try {
    const { productId, buyerId, agreedPrice } = req.body;

    if (!productId || !buyerId || agreedPrice === undefined) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.sellerId === buyerId) {
      return res.status(400).json({ error: 'You cannot trade with your own product' });
    }

    // Check if an active trade session already exists between this buyer and product
    let trade = await prisma.tradeSession.findFirst({
      where: {
        productId,
        buyerId,
        status: { in: ['NEGOTIATING', 'MONEY_IN_SAFE_HOLD', 'UNDER_INVESTIGATION'] },
      },
    });

    if (!trade) {
      // Create new session
      trade = await prisma.tradeSession.create({
        data: {
          productId,
          buyerId,
          sellerId: product.sellerId,
          agreedPrice: parseFloat(agreedPrice),
          status: 'NEGOTIATING',
        },
      });

      // System greeting message in chat
      await prisma.chatMessage.create({
        data: {
          tradeSessionId: trade.id,
          senderId: buyerId,
          messageText: `Started Safe Trade for "${product.title}" at agreed price of ${parseFloat(agreedPrice).toLocaleString()} so'm.`,
          isSystemEvent: true,
          systemEventType: 'TERMS_AGREED',
        },
      });
    }

    res.json(trade);
  } catch (error) {
    console.error('Error starting trade:', error);
    res.status(500).json({ error: 'Failed to start trade session' });
  }
});

// GET /api/trades/:id - Get trade session with banner state & chat history
router.get('/:id', async (req, res) => {
  try {
    const { currentUserId } = req.query;
    const trade = await prisma.tradeSession.findUnique({
      where: { id: req.params.id },
      include: {
        product: {
          include: {
            itemCity: true,
          },
        },
        buyer: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            isPhoneVerified: true,
            phoneNumber: true,
          },
        },
        seller: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            isPhoneVerified: true,
            phoneNumber: true,
            successfulSalesCount: true,
          },
        },
        chatMessages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              select: {
                id: true,
                fullName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    if (!trade) {
      return res.status(404).json({ error: 'Trade session not found' });
    }

    const banner = getTradeBannerInfo(trade, currentUserId as string);

    res.json({
      ...trade,
      product: {
        ...trade.product,
        images: JSON.parse(trade.product.images || '[]'),
      },
      banner,
    });
  } catch (error) {
    console.error('Error fetching trade:', error);
    res.status(500).json({ error: 'Failed to fetch trade session' });
  }
});

// GET /api/trades/user/:userId - List all trades for a user (as buyer or seller)
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const trades = await prisma.tradeSession.findMany({
      where: {
        OR: [{ buyerId: userId }, { sellerId: userId }],
      },
      include: {
        product: true,
        buyer: { select: { id: true, fullName: true, avatarUrl: true } },
        seller: { select: { id: true, fullName: true, avatarUrl: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const formatted = trades.map((t) => ({
      ...t,
      product: {
        ...t.product,
        images: JSON.parse(t.product.images || '[]'),
      },
      banner: getTradeBannerInfo(t, userId),
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching user trades:', error);
    res.status(500).json({ error: 'Failed to fetch user trades' });
  }
});

// POST /api/trades/:id/deposit - Customer deposits agreed price into Central Account
router.post('/:id/deposit', async (req, res) => {
  try {
    const buyerId = req.body.buyerId || req.body.userId;
    const tradeId = req.params.id;

    const trade = await prisma.tradeSession.findUnique({
      where: { id: tradeId },
      include: { product: true },
    });

    if (!trade) return res.status(404).json({ error: 'Trade not found' });
    if (trade.buyerId !== buyerId) return res.status(403).json({ error: 'Only buyer can deposit funds' });
    if (trade.status !== 'NEGOTIATING') {
      return res.status(400).json({ error: `Cannot deposit in status ${trade.status}` });
    }

    const price = trade.agreedPrice;

    // Execute atomic balance & state updates with extended timeout for remote DB
    await prisma.$transaction(async (tx) => {
      // 1. Ensure buyer wallet exists with sufficient funds (auto top-up simulated if low for test mode)
      let buyerWallet = await tx.wallet.findUnique({ where: { userId: buyerId } });
      if (!buyerWallet) {
        buyerWallet = await tx.wallet.create({
          data: { userId: buyerId, availableBalance: price },
        });
      } else if (buyerWallet.availableBalance < price) {
        buyerWallet = await tx.wallet.update({
          where: { id: buyerWallet.id },
          data: { availableBalance: price },
        });
      }

      // Deduct from buyer
      await tx.wallet.update({
        where: { id: buyerWallet.id },
        data: { availableBalance: { decrement: price } },
      });

      // 2. Credit to Central Vault safeHoldBalance
      let vaultWallet = await tx.wallet.findUnique({ where: { userId: CENTRAL_VAULT_ID } });
      if (!vaultWallet) {
        vaultWallet = await tx.wallet.create({
          data: { userId: CENTRAL_VAULT_ID, safeHoldBalance: price },
        });
      } else {
        await tx.wallet.update({
          where: { id: vaultWallet.id },
          data: { safeHoldBalance: { increment: price } },
        });
      }

      // 3. Record Ledger
      await tx.ledgerEntry.create({
        data: {
          tradeSessionId: trade.id,
          sourceWalletId: buyerWallet.id,
          destWalletId: vaultWallet.id,
          amount: price,
          txType: 'ESCROW_LOCK',
          idempotencyKey: `deposit_${trade.id}_${Date.now()}`,
          notes: `Customer deposited ${price.toLocaleString()} so'm to Central Safe Account for product ${trade.product.title}`,
        },
      });

      // 4. Update Trade Session & Product Status
      await tx.tradeSession.update({
        where: { id: trade.id },
        data: {
          status: 'MONEY_IN_SAFE_HOLD',
          depositedAt: new Date(),
        },
      });

      await tx.product.update({
        where: { id: trade.productId },
        data: { status: 'RESERVED_IN_TRADE' },
      });
    }, { maxWait: 15000, timeout: 25000 });

    // 5. Audit Logging & System Event (outside financial transaction for speed & reliability)
    try {
      await prisma.chatMessage.create({
        data: {
          tradeSessionId: trade.id,
          senderId: buyerId,
          messageText: `🛡️ OFFICIAL SYSTEM NOTICE: Customer deposited ${price.toLocaleString()} so'm into the Central Bank Account. The funds are safely secured. Seller is now cleared to deliver the item.`,
          isSystemEvent: true,
          systemEventType: 'MONEY_DEPOSITED',
        },
      });

      await prisma.notification.create({
        data: {
          userId: trade.sellerId,
          title: '🛡️ Safe-Hold Deposit Received!',
          message: `Customer deposited ${price.toLocaleString()} so'm into Central Account for "${trade.product.title}". Safe to deliver now!`,
          type: 'TRADE_DEPOSIT',
          linkId: trade.id,
        },
      });
    } catch (auditErr) {
      console.warn('Non-blocking deposit audit error:', auditErr);
    }

    // Notify via Socket.IO - emit both event names for maximum client compatibility
    if (io) {
      io.to(`trade_${trade.id}`).emit('trade_status_updated', {
        tradeId: trade.id,
        newStatus: 'MONEY_IN_SAFE_HOLD',
      });
      io.to(`trade_${trade.id}`).emit('trade_status_changed', {
        tradeId: trade.id,
        newStatus: 'MONEY_IN_SAFE_HOLD',
      });
    }

    res.json({ success: true, message: 'Funds secured in Central Account' });
  } catch (error) {
    console.error('Deposit error:', error);
    res.status(500).json({ error: 'Failed to deposit into Central Safe Account' });
  }
});

// POST /api/trades/:id/receive - Customer confirms "Product Received" -> releases money to seller
router.post('/:id/receive', async (req, res) => {
  try {
    const buyerId = req.body.buyerId || req.body.userId;
    const tradeId = req.params.id;

    const trade = await prisma.tradeSession.findUnique({
      where: { id: tradeId },
      include: { product: true },
    });

    if (!trade) return res.status(404).json({ error: 'Trade not found' });
    if (trade.buyerId !== buyerId) return res.status(403).json({ error: 'Only buyer can confirm receipt' });
    if (trade.status !== 'MONEY_IN_SAFE_HOLD') {
      return res.status(400).json({ error: `Cannot release funds in status ${trade.status}` });
    }

    const price = trade.agreedPrice;

    await prisma.$transaction(async (tx) => {
      // 1. Deduct from Central Vault safeHoldBalance
      const vaultWallet = await tx.wallet.findUnique({ where: { userId: CENTRAL_VAULT_ID } });
      if (vaultWallet) {
        await tx.wallet.update({
          where: { id: vaultWallet.id },
          data: { safeHoldBalance: { decrement: price } },
        });
      }

      // 2. Credit to Seller availableBalance
      let sellerWallet = await tx.wallet.findUnique({ where: { userId: trade.sellerId } });
      if (!sellerWallet) {
        sellerWallet = await tx.wallet.create({
          data: { userId: trade.sellerId, availableBalance: price },
        });
      } else {
        await tx.wallet.update({
          where: { id: sellerWallet.id },
          data: { availableBalance: { increment: price } },
        });
      }

      // 3. Record Ledger
      await tx.ledgerEntry.create({
        data: {
          tradeSessionId: trade.id,
          sourceWalletId: vaultWallet?.id,
          destWalletId: sellerWallet.id,
          amount: price,
          txType: 'ESCROW_RELEASE_PAYOUT',
          idempotencyKey: `release_${trade.id}_${Date.now()}`,
          notes: `Central Account disbursed ${price.toLocaleString()} so'm to Seller following buyer receipt confirmation.`,
        },
      });

      // 4. Update Trade Session & Product Status
      await tx.tradeSession.update({
        where: { id: trade.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      await tx.product.update({
        where: { id: trade.productId },
        data: { status: 'SOLD' },
      });

      // 5. Update user trust counters
      await tx.user.update({
        where: { id: trade.sellerId },
        data: { successfulSalesCount: { increment: 1 } },
      });
      await tx.user.update({
        where: { id: trade.buyerId },
        data: { successfulBuysCount: { increment: 1 } },
      });
    }, { maxWait: 15000, timeout: 25000 });

    try {
      // 6. System Message
      await prisma.chatMessage.create({
        data: {
          tradeSessionId: trade.id,
          senderId: buyerId,
          messageText: `🎉 OFFICIAL SYSTEM NOTICE: Customer confirmed product received! ${price.toLocaleString()} so'm has been transferred from the Central Bank Account to Seller's balance. Trade is completed!`,
          isSystemEvent: true,
          systemEventType: 'PRODUCT_RECEIVED',
        },
      });

      // 7. Notification to Seller
      await prisma.notification.create({
        data: {
          userId: trade.sellerId,
          title: '🎉 Product Received & Funds Released!',
          message: `Customer confirmed receipt of "${trade.product.title}". ${price.toLocaleString()} so'm has been credited to your available balance!`,
          type: 'TRADE_RECEIVED',
          linkId: trade.id,
        },
      });
    } catch (auditErr) {
      console.warn('Non-blocking receive audit error:', auditErr);
    }

    if (io) {
      io.to(`trade_${trade.id}`).emit('trade_status_updated', {
        tradeId: trade.id,
        newStatus: 'COMPLETED',
      });
      io.to(`trade_${trade.id}`).emit('trade_status_changed', {
        tradeId: trade.id,
        newStatus: 'COMPLETED',
      });
    }

    res.json({ success: true, message: 'Trade successfully completed and money sent to Seller' });
  } catch (error) {
    console.error('Receive error:', error);
    res.status(500).json({ error: 'Failed to process receipt confirmation' });
  }
});

// POST /api/trades/:id/withdraw - Customer withdraws money from Central Account
router.post('/:id/withdraw', async (req, res) => {
  try {
    const buyerId = req.body.buyerId || req.body.userId;
    const tradeId = req.params.id;

    const trade = await prisma.tradeSession.findUnique({
      where: { id: tradeId },
      include: { product: true },
    });

    if (!trade) return res.status(404).json({ error: 'Trade not found' });
    if (trade.buyerId !== buyerId) return res.status(403).json({ error: 'Only buyer can withdraw funds' });
    if (trade.status !== 'MONEY_IN_SAFE_HOLD') {
      return res.status(400).json({ error: `Cannot withdraw funds in status ${trade.status}` });
    }

    // Safety guard against unilateral withdrawal scam after seller shipped
    if (trade.shippedAt) {
      return res.status(400).json({
        error: 'Product has already been marked as dispatched/handed over by seller. Please inspect the product and confirm receipt, or file an investigation report.',
      });
    }

    const price = trade.agreedPrice;

    await prisma.$transaction(async (tx) => {
      // 1. Deduct from Central Vault
      const vaultWallet = await tx.wallet.findUnique({ where: { userId: CENTRAL_VAULT_ID } });
      if (vaultWallet) {
        await tx.wallet.update({
          where: { id: vaultWallet.id },
          data: { safeHoldBalance: { decrement: price } },
        });
      }

      // 2. Refund back to Buyer
      const buyerWallet = await tx.wallet.findUnique({ where: { userId: buyerId } });
      if (buyerWallet) {
        await tx.wallet.update({
          where: { id: buyerWallet.id },
          data: { availableBalance: { increment: price } },
        });
      }

      // 3. Record Ledger
      await tx.ledgerEntry.create({
        data: {
          tradeSessionId: trade.id,
          sourceWalletId: vaultWallet?.id,
          destWalletId: buyerWallet?.id,
          amount: price,
          txType: 'ESCROW_REFUND_WITHDRAWAL',
          idempotencyKey: `withdraw_${trade.id}_${Date.now()}`,
          notes: `Customer withdrew ${price.toLocaleString()} so'm from Central Account back to wallet.`,
        },
      });

      // 4. Update status & revert product
      await tx.tradeSession.update({
        where: { id: trade.id },
        data: {
          status: 'CANCELLED_WITHDRAWN',
          withdrawnAt: new Date(),
        },
      });

      await tx.product.update({
        where: { id: trade.productId },
        data: { status: 'AVAILABLE' },
      });
    }, { maxWait: 15000, timeout: 25000 });

    try {
      // 5. System Message & Urgent Alert
      await prisma.chatMessage.create({
        data: {
          tradeSessionId: trade.id,
          senderId: buyerId,
          messageText: `⚠️ URGENT ALERT: Customer has withdrawn ${price.toLocaleString()} so'm from the Central Safe Account! Trade cancelled — Seller DO NOT hand over or send the product!`,
          isSystemEvent: true,
          systemEventType: 'MONEY_WITHDRAWN',
        },
      });

      // 6. Urgent Push Notification to Seller
      await prisma.notification.create({
        data: {
          userId: trade.sellerId,
          title: '⚠️ URGENT: Customer Withdrew Money!',
          message: `Customer withdrew ${price.toLocaleString()} so'm from Central Account for "${trade.product.title}". Trade cancelled — DO NOT hand over or send the product!`,
          type: 'TRADE_WITHDRAWN',
          linkId: trade.id,
        },
      });
    } catch (auditErr) {
      console.warn('Non-blocking withdraw audit error:', auditErr);
    }

    if (io) {
      io.to(`trade_${trade.id}`).emit('trade_status_updated', {
        tradeId: trade.id,
        newStatus: 'CANCELLED_WITHDRAWN',
      });
      io.to(`trade_${trade.id}`).emit('trade_status_changed', {
        tradeId: trade.id,
        newStatus: 'CANCELLED_WITHDRAWN',
      });
    }

    res.json({ success: true, message: 'Money withdrawn back to Customer account' });
  } catch (error) {
    console.error('Withdraw error:', error);
    res.status(500).json({ error: 'Failed to process withdrawal' });
  }
});

// POST /api/trades/:id/ship - Seller marks product as shipped/handed over
router.post('/:id/ship', async (req, res) => {
  try {
    const sellerId = req.body.sellerId || req.body.userId;
    const tradeId = req.params.id;

    const trade = await prisma.tradeSession.findUnique({
      where: { id: tradeId },
      include: { product: true },
    });

    if (!trade) return res.status(404).json({ error: 'Trade not found' });
    if (trade.sellerId !== sellerId) return res.status(403).json({ error: 'Only the seller can mark product as shipped' });
    if (trade.status !== 'MONEY_IN_SAFE_HOLD') {
      return res.status(400).json({ error: `Cannot ship product in status ${trade.status}` });
    }

    const autoReleaseDays = trade.product.productType === 'ONLINE' ? 1 : 5;
    const autoReleaseAt = new Date(Date.now() + autoReleaseDays * 24 * 60 * 60 * 1000);
    const shippedAt = new Date();

    const updated = await prisma.tradeSession.update({
      where: { id: trade.id },
      data: {
        shippedAt,
        autoReleaseAt,
      },
    });

    try {
      await prisma.chatMessage.create({
        data: {
          tradeSessionId: trade.id,
          senderId: sellerId,
          messageText: `📦 SELLER UPDATE: Seller has dispatched/handed over "${trade.product.title}". Safe-Hold funds will auto-release in ${autoReleaseDays} day(s) unless customer reports a problem.`,
          isSystemEvent: true,
          systemEventType: 'PRODUCT_SHIPPED',
        },
      });

      await prisma.notification.create({
        data: {
          userId: trade.buyerId,
          title: '📦 Product Dispatched / Handed Over!',
          message: `Seller marked "${trade.product.title}" as shipped. Please inspect and confirm receipt once received!`,
          type: 'TRADE_SHIPPED',
          linkId: trade.id,
        },
      });
    } catch (auditErr) {
      console.warn('Non-blocking ship audit error:', auditErr);
    }

    if (io) {
      io.to(`trade_${trade.id}`).emit('trade_status_updated', {
        tradeId: trade.id,
        newStatus: 'MONEY_IN_SAFE_HOLD',
        shippedAt,
        autoReleaseAt,
      });
      io.to(`trade_${trade.id}`).emit('trade_status_changed', {
        tradeId: trade.id,
        newStatus: 'MONEY_IN_SAFE_HOLD',
        shippedAt,
        autoReleaseAt,
      });
    }

    res.json({ success: true, message: 'Product marked as shipped/delivered', trade: updated });
  } catch (error) {
    console.error('Ship error:', error);
    res.status(500).json({ error: 'Failed to mark product as shipped' });
  }
});

export default router;

