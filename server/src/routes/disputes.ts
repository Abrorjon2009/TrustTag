import { Router } from 'express';
import { prisma } from '../db';
import { io } from '../index';

const router = Router();
const CENTRAL_VAULT_ID = '00000000-0000-0000-0000-000000000000';

// POST /api/disputes - File a report
router.post('/', async (req, res) => {
  try {
    const {
      tradeSessionId,
      reporterId,
      reasonCode,
      description,
      evidenceUrls, // array of string URLs
    } = req.body;

    if (!tradeSessionId || !reporterId || !reasonCode || !description) {
      return res.status(400).json({ error: 'Missing required dispute fields' });
    }

    const trade = await prisma.tradeSession.findUnique({
      where: { id: tradeSessionId },
      include: { buyer: true, seller: true },
    });

    if (!trade) return res.status(404).json({ error: 'Trade session not found' });

    const accusedId = trade.buyerId === reporterId ? trade.sellerId : trade.buyerId;

    let dispute: any;

    await prisma.$transaction(async (tx) => {
      // 1. Create dispute record
      dispute = await tx.dispute.create({
        data: {
          tradeSessionId,
          reporterId,
          accusedId,
          reasonCode,
          description,
          status: 'OPEN_PENDING',
          evidence: {
            create: Array.isArray(evidenceUrls)
              ? evidenceUrls.map((url: string) => ({
                  uploaderId: reporterId,
                  fileUrl: url,
                  fileType: 'IMAGE',
                }))
              : [],
          },
        },
        include: { evidence: true },
      });

      // 2. Put Trade under investigation
      await tx.tradeSession.update({
        where: { id: tradeSessionId },
        data: {
          status: 'UNDER_INVESTIGATION',
          disputedAt: new Date(),
        },
      });

      // 3. Increment unresolved reports count on accused user
      await tx.user.update({
        where: { id: accusedId },
        data: { unresolvedReportsCount: { increment: 1 } },
      });

      // 4. Freeze safety logic:
      // If customer withdrew money and seller filed report, freeze that amount in accused's wallet
      if (trade.status === 'CANCELLED_WITHDRAWN' && reporterId === trade.sellerId) {
        const buyerWallet = await tx.wallet.findUnique({ where: { userId: trade.buyerId } });
        if (buyerWallet && buyerWallet.availableBalance > 0) {
          const freezeAmt = Math.min(buyerWallet.availableBalance, trade.agreedPrice);
          await tx.wallet.update({
            where: { id: buyerWallet.id },
            data: {
              availableBalance: { decrement: freezeAmt },
              frozenBalance: { increment: freezeAmt },
            },
          });
        }
      }

      // 5. Inject verified System Notice in chat
      await tx.chatMessage.create({
        data: {
          tradeSessionId,
          senderId: reporterId,
          messageText: `🚨 OFFICIAL SYSTEM NOTICE: A Report has been filed for "${reasonCode}". All funds are frozen and the trade is locked under Admin investigation. Chat history and account modifications are permanently preserved.`,
          isSystemEvent: true,
          systemEventType: 'REPORT_FILED',
        },
      });
    });

    if (io) {
      io.to(`trade_${tradeSessionId}`).emit('trade_status_updated', {
        tradeId: tradeSessionId,
        newStatus: 'UNDER_INVESTIGATION',
      });
    }

    res.status(201).json(dispute);
  } catch (error) {
    console.error('Report error:', error);
    res.status(500).json({ error: 'Failed to file dispute report' });
  }
});

// GET /api/disputes - Admin list of all disputes
router.get('/', async (req, res) => {
  try {
    const disputes = await prisma.dispute.findMany({
      include: {
        tradeSession: {
          include: {
            product: true,
            buyer: { select: { id: true, fullName: true, phoneNumber: true, email: true } },
            seller: { select: { id: true, fullName: true, phoneNumber: true, email: true } },
          },
        },
        reporter: { select: { id: true, fullName: true, phoneNumber: true, email: true } },
        accused: { select: { id: true, fullName: true, phoneNumber: true, email: true } },
        evidence: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(disputes);
  } catch (error) {
    console.error('Fetch disputes error:', error);
    res.status(500).json({ error: 'Failed to fetch disputes' });
  }
});

// POST /api/disputes/:id/resolve - Admin dispute adjudication
router.post('/:id/resolve', async (req, res) => {
  try {
    const { action, adminNotes, resolvedBy } = req.body; 
    // action: 'PAY_SELLER' | 'REFUND_BUYER' | 'BAN_ACCUSED' | 'DISMISS'

    const dispute = await prisma.dispute.findUnique({
      where: { id: req.params.id },
      include: {
        tradeSession: { include: { product: true } },
      },
    });

    if (!dispute) return res.status(404).json({ error: 'Dispute not found' });
    const trade = dispute.tradeSession;
    const price = trade.agreedPrice;

    await prisma.$transaction(async (tx) => {
      if (action === 'PAY_SELLER') {
        // Disburse to seller
        const vaultWallet = await tx.wallet.findUnique({ where: { userId: CENTRAL_VAULT_ID } });
        if (vaultWallet && vaultWallet.safeHoldBalance >= price) {
          await tx.wallet.update({
            where: { id: vaultWallet.id },
            data: { safeHoldBalance: { decrement: price } },
          });
        }
        await tx.wallet.update({
          where: { userId: trade.sellerId },
          data: { availableBalance: { increment: price } },
        });

        await tx.tradeSession.update({
          where: { id: trade.id },
          data: { status: 'COMPLETED', completedAt: new Date() },
        });

        await tx.dispute.update({
          where: { id: dispute.id },
          data: {
            status: 'RESOLVED_SELLER_PAID',
            adminNotes,
            resolvedBy: resolvedBy || 'Admin',
            resolvedAt: new Date(),
          },
        });
      } else if (action === 'REFUND_BUYER') {
        // Refund to buyer
        const vaultWallet = await tx.wallet.findUnique({ where: { userId: CENTRAL_VAULT_ID } });
        if (vaultWallet && vaultWallet.safeHoldBalance >= price) {
          await tx.wallet.update({
            where: { id: vaultWallet.id },
            data: { safeHoldBalance: { decrement: price } },
          });
        }
        await tx.wallet.update({
          where: { userId: trade.buyerId },
          data: { availableBalance: { increment: price } },
        });

        await tx.tradeSession.update({
          where: { id: trade.id },
          data: { status: 'CANCELLED_WITHDRAWN', withdrawnAt: new Date() },
        });

        await tx.dispute.update({
          where: { id: dispute.id },
          data: {
            status: 'RESOLVED_BUYER_REFUNDED',
            adminNotes,
            resolvedBy: resolvedBy || 'Admin',
            resolvedAt: new Date(),
          },
        });
      } else if (action === 'BAN_ACCUSED') {
        await tx.user.update({
          where: { id: dispute.accusedId },
          data: { isBanned: true },
        });
      }
    });

    if (io) {
      io.to(`trade_${trade.id}`).emit('trade_status_updated', {
        tradeId: trade.id,
        newStatus: action === 'PAY_SELLER' ? 'COMPLETED' : 'CANCELLED_WITHDRAWN',
      });
    }

    res.json({ success: true, message: `Dispute resolved with action: ${action}` });
  } catch (error) {
    console.error('Resolve dispute error:', error);
    res.status(500).json({ error: 'Failed to resolve dispute' });
  }
});

export default router;

