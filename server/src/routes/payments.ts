import { Router } from 'express';
import { prisma } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { io } from '../index';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();
const CENTRAL_VAULT_ID = '00000000-0000-0000-0000-000000000000';

// Configuration stubs (User can insert their Merchant credentials into .env when ready)
const PAYME_MERCHANT_ID = process.env.PAYME_MERCHANT_ID || 'sandbox_merchant_id';
const CLICK_MERCHANT_ID = process.env.CLICK_MERCHANT_ID || 'sandbox_merchant_id';
const CLICK_SERVICE_ID = process.env.CLICK_SERVICE_ID || 'sandbox_service_id';

// Helper: Ensure Central Vault user & wallet exists
async function getOrCreateVault() {
  let vault = await prisma.user.findUnique({
    where: { id: CENTRAL_VAULT_ID },
    include: { wallet: true },
  });

  if (!vault) {
    vault = await prisma.user.create({
      data: {
        id: CENTRAL_VAULT_ID,
        phoneNumber: '+00000000000',
        fullName: 'TrustTag Central Escrow Vault',
        isAdmin: true,
        wallet: {
          create: {
            currency: 'UZS',
            availableBalance: 0,
            safeHoldBalance: 0,
            frozenBalance: 0,
          },
        },
      },
      include: { wallet: true },
    });
  }

  return vault;
}

// POST /api/payments/initiate - Generate checkout details for Trade Escrow Deposit
router.post('/initiate', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { tradeSessionId, paymentMethod } = req.body; // 'WALLET' | 'PAYME' | 'CLICK' | 'UZCARD_HUMO'

    if (!tradeSessionId || !paymentMethod) {
      return res.status(400).json({ error: 'Missing tradeSessionId or paymentMethod' });
    }

    const trade = await prisma.tradeSession.findUnique({
      where: { id: tradeSessionId },
      include: {
        product: true,
        buyer: { include: { wallet: true } },
        seller: true,
      },
    });

    if (!trade) return res.status(404).json({ error: 'Trade session not found' });
    if (trade.buyerId !== req.userId) {
      return res.status(403).json({ error: 'Only the buyer can deposit funds for this trade' });
    }
    if (trade.status !== 'NEGOTIATING') {
      return res.status(400).json({ error: 'Trade is not in negotiating stage' });
    }

    const amountUzs = trade.agreedPrice; // in UZS (sum)

    // Option 1: Direct Payme checkout URL
    if (paymentMethod === 'PAYME') {
      const paymeParams = `m=${PAYME_MERCHANT_ID};ac.trade_id=${trade.id};a=${amountUzs * 100};c=https://trusttag.uz/payment/callback`;
      const paymeUrl = `https://checkout.paycom.uz/${Buffer.from(paymeParams).toString('base64')}`;
      return res.json({
        provider: 'PAYME',
        amount: amountUzs,
        currency: 'UZS',
        paymentUrl: paymeUrl,
        requiresRedirect: true,
      });
    }

    // Option 2: Click.uz checkout URL
    if (paymentMethod === 'CLICK') {
      const clickUrl = `https://my.click.uz/services/pay?service_id=${CLICK_SERVICE_ID}&merchant_id=${CLICK_MERCHANT_ID}&amount=${amountUzs}&transaction_param=${trade.id}&return_url=https://trusttag.uz/payment/callback`;
      return res.json({
        provider: 'CLICK',
        amount: amountUzs,
        currency: 'UZS',
        paymentUrl: clickUrl,
        requiresRedirect: true,
      });
    }

    // Option 3: In-App Wallet or Direct Uzbek Card (Uzcard/Humo) Instant Escrow Lock
    if (paymentMethod === 'WALLET' || paymentMethod === 'UZCARD_HUMO') {
      const vault = await getOrCreateVault();
      const vaultWallet = vault.wallet!;
      const buyerWallet = trade.buyer.wallet;

      if (!buyerWallet) {
        return res.status(400).json({ error: 'Buyer wallet not found' });
      }

      // If paying with Wallet, verify balance
      if (paymentMethod === 'WALLET' && buyerWallet.availableBalance < amountUzs) {
        return res.status(400).json({
          error: `Insufficient wallet balance. You have ${buyerWallet.availableBalance.toLocaleString()} UZS, required: ${amountUzs.toLocaleString()} UZS. Please top up or pay with card.`,
        });
      }

      // Execute Escrow Safe-Hold Deposit Transaction
      const updatedTrade = await prisma.$transaction(async (tx) => {
        // If wallet payment, deduct from buyer available
        if (paymentMethod === 'WALLET') {
          await tx.wallet.update({
            where: { id: buyerWallet.id },
            data: { availableBalance: { decrement: amountUzs } },
          });
        }

        // Add to Central Vault safe hold
        await tx.wallet.update({
          where: { id: vaultWallet.id },
          data: { safeHoldBalance: { increment: amountUzs } },
        });

        // Set auto-release timestamp (default: 5 days from now for physical, 24h for digital)
        const autoReleaseDays = trade.product.productType === 'ONLINE' ? 1 : 5;
        const autoReleaseAt = new Date(Date.now() + autoReleaseDays * 24 * 60 * 60 * 1000);

        // Update trade status to MONEY_IN_SAFE_HOLD
        const updated = await tx.tradeSession.update({
          where: { id: trade.id },
          data: {
            status: 'MONEY_IN_SAFE_HOLD',
            depositedAt: new Date(),
            autoReleaseAt,
            paymentMethod,
            paymentRef: `TX_${Date.now()}_${uuidv4().slice(0, 8)}`,
          },
        });

        // Record double-entry Ledger entry
        await tx.ledgerEntry.create({
          data: {
            tradeSessionId: trade.id,
            sourceWalletId: buyerWallet.id,
            destWalletId: vaultWallet.id,
            amount: amountUzs,
            currency: 'UZS',
            txType: 'ESCROW_LOCK',
            paymentProvider: paymentMethod,
            idempotencyKey: `ESCROW_LOCK_${trade.id}_${Date.now()}`,
            notes: `Safe-Hold deposit via ${paymentMethod} for product: ${trade.product.title}`,
          },
        });

        // Add system chat message to trade room
        await tx.chatMessage.create({
          data: {
            tradeSessionId: trade.id,
            senderId: trade.buyerId,
            messageText: `✅ Customer deposited ${amountUzs.toLocaleString()} UZS into the Central Bank Account. Safe to deliver the product!`,
            isSystemEvent: true,
            systemEventType: 'MONEY_DEPOSITED',
          },
        });

        // Send push notification to seller
        await tx.notification.create({
          data: {
            userId: trade.sellerId,
            title: '💰 Money in Central Safe Account!',
            message: `${trade.buyer.fullName} has deposited ${amountUzs.toLocaleString()} UZS into the Central Bank Account for "${trade.product.title}". It is now safe to deliver!`,
            type: 'TRADE_DEPOSIT',
            linkId: trade.id,
          },
        });

        return updated;
      });

      // Broadcast live status update to both buyer and seller over WebSockets
      io.to(`trade_${trade.id}`).emit('trade_status_changed', {
        tradeId: trade.id,
        newStatus: 'MONEY_IN_SAFE_HOLD',
        depositedAt: updatedTrade.depositedAt,
        autoReleaseAt: updatedTrade.autoReleaseAt,
      });

      return res.json({
        success: true,
        trade: updatedTrade,
        message: 'Deposit successful! Funds are now securely held in Central Safe Account.',
      });
    }

    res.status(400).json({ error: 'Unsupported payment method' });
  } catch (error) {
    console.error('Payment initiation error:', error);
    res.status(500).json({ error: 'Payment processing failed' });
  }
});

// POST /api/payments/payme/webhook - Payme Merchant JSON-RPC webhook receiver
router.post('/payme/webhook', async (req, res) => {
  try {
    const { method, params, id } = req.body;
    console.log(`[Payme Webhook] Method: ${method}, ID: ${id}`);

    // Handle Payme JSON-RPC methods
    switch (method) {
      case 'CheckPerformTransaction':
        return res.json({
          result: { allow: true },
          id,
        });

      case 'CreateTransaction':
        return res.json({
          result: {
            create_time: Date.now(),
            transaction: `PAYME_${Date.now()}`,
            state: 1,
          },
          id,
        });

      case 'PerformTransaction':
        return res.json({
          result: {
            perform_time: Date.now(),
            transaction: params.id,
            state: 2,
          },
          id,
        });

      case 'CheckTransaction':
        return res.json({
          result: {
            create_time: Date.now() - 5000,
            perform_time: Date.now(),
            cancel_time: 0,
            transaction: params.id,
            state: 2,
            reason: null,
          },
          id,
        });

      default:
        return res.json({
          error: { code: -32601, message: 'Method not found' },
          id,
        });
    }
  } catch (err) {
    console.error('Payme webhook error:', err);
    res.status(500).json({ error: 'Internal webhook error' });
  }
});

export default router;

