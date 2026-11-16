import cron from 'node-cron';
import { prisma } from '../db';
import { io } from '../index';

const CENTRAL_VAULT_ID = '00000000-0000-0000-0000-000000000000';

export function startEscrowCronJobs() {
  // Run every 10 minutes to check for trades ready for automatic release
  cron.schedule('*/10 * * * *', async () => {
    try {
      const now = new Date();
      const readyTrades = await prisma.tradeSession.findMany({
        where: {
          status: 'MONEY_IN_SAFE_HOLD',
          autoReleaseAt: { lte: now },
        },
        include: {
          seller: { include: { wallet: true } },
          buyer: true,
          product: true,
          disputes: {
            where: {
              status: { in: ['OPEN_PENDING', 'INVESTIGATING'] },
            },
          },
        },
      });

      if (readyTrades.length === 0) return;

      console.log(`⏰ Escrow Cron: Found ${readyTrades.length} trades eligible for auto-release`);

      for (const trade of readyTrades) {
        // Skip if there is an active dispute under investigation
        if (trade.disputes.length > 0) {
          console.log(`⚠️ Trade ${trade.id} has active dispute. Skipping auto-release.`);
          continue;
        }

        const vault = await prisma.user.findUnique({
          where: { id: CENTRAL_VAULT_ID },
          include: { wallet: true },
        });

        if (!vault?.wallet || !trade.seller.wallet) continue;

        const amountUzs = trade.agreedPrice;

        await prisma.$transaction(async (tx) => {
          // 1. Deduct from Central Vault safe hold
          await tx.wallet.update({
            where: { id: vault.wallet!.id },
            data: { safeHoldBalance: { decrement: amountUzs } },
          });

          // 2. Credit Seller's available balance
          await tx.wallet.update({
            where: { id: trade.seller.wallet!.id },
            data: { availableBalance: { increment: amountUzs } },
          });

          // 3. Update Trade Session to COMPLETED
          await tx.tradeSession.update({
            where: { id: trade.id },
            data: {
              status: 'COMPLETED',
              completedAt: now,
            },
          });

          // 4. Mark Product as SOLD
          await tx.product.update({
            where: { id: trade.productId },
            data: { status: 'SOLD' },
          });

          // 5. Increment user stats
          await tx.user.update({
            where: { id: trade.sellerId },
            data: { successfulSalesCount: { increment: 1 } },
          });
          await tx.user.update({
            where: { id: trade.buyerId },
            data: { successfulBuysCount: { increment: 1 } },
          });

          // 6. Record Ledger Entry
          await tx.ledgerEntry.create({
            data: {
              tradeSessionId: trade.id,
              sourceWalletId: vault.wallet!.id,
              destWalletId: trade.seller.wallet!.id,
              amount: amountUzs,
              currency: 'UZS',
              txType: 'ESCROW_RELEASE_PAYOUT',
              idempotencyKey: `AUTO_RELEASE_${trade.id}_${now.getTime()}`,
              notes: `Auto-release completed after delivery window elapsed for product: ${trade.product.title}`,
            },
          });

          // 7. System Chat Message
          await tx.chatMessage.create({
            data: {
              tradeSessionId: trade.id,
              senderId: CENTRAL_VAULT_ID,
              messageText: `🎉 Trade auto-completed! Delivery window elapsed without dispute. ${amountUzs.toLocaleString()} UZS has been paid to the Seller.`,
              isSystemEvent: true,
              systemEventType: 'PRODUCT_RECEIVED',
            },
          });

          // 8. Push Notifications
          await tx.notification.create({
            data: {
              userId: trade.sellerId,
              title: '💵 Auto-Release Payout Received!',
              message: `Your trade for "${trade.product.title}" has been completed! ${amountUzs.toLocaleString()} UZS is now available in your wallet.`,
              type: 'TRADE_RECEIVED',
              linkId: trade.id,
            },
          });
        });

        // Broadcast to WebSocket room - both events for full client compatibility
        io.to(`trade_${trade.id}`).emit('trade_status_updated', {
          tradeId: trade.id,
          newStatus: 'COMPLETED',
          completedAt: now,
        });
        io.to(`trade_${trade.id}`).emit('trade_status_changed', {
          tradeId: trade.id,
          newStatus: 'COMPLETED',
          completedAt: now,
        });

        console.log(`✅ Escrow auto-release successful for trade: ${trade.id}`);
      }
    } catch (err) {
      console.error('Error in escrow auto-release cron:', err);
    }
  });

  console.log('⏰ Escrow auto-release cron job initialized');
}

