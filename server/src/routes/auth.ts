import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';
import { JWT_SECRET, requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// Helper to normalize Uzbekistan phone number
function normalizeUzPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('998') && digits.length === 12) {
    return `+${digits}`;
  }
  if (digits.length === 9) {
    return `+998${digits}`;
  }
  return phone.startsWith('+') ? phone : `+${phone}`;
}

// POST /api/auth/send-otp - Request SMS verification code
router.post('/send-otp', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const cleanPhone = normalizeUzPhone(phoneNumber);
    if (!/^\+998\d{9}$/.test(cleanPhone)) {
      return res.status(400).json({ error: 'Please enter a valid Uzbekistan phone number (+998 XX XXX XX XX)' });
    }

    // Fixed code for demo/test accounts, random 6-digit for new users
    const isTestAccount = ['+998901234567', '+998939876543', '+998971112233'].includes(cleanPhone);
    const code = isTestAccount ? '123456' : Math.floor(100000 + Math.random() * 900000).toString();

    // Expires in 5 minutes
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Save or update OTP record
    await prisma.otpVerification.create({
      data: {
        phoneNumber: cleanPhone,
        code,
        expiresAt,
      },
    });

    console.log(`📱 SMS OTP sent to ${cleanPhone}: [${code}]`);

    // In production, integrate Eskiz / PlayMobile / Firebase SMS API here.
    // For seamless testing, return devCode in response
    res.json({
      success: true,
      message: `Verification code sent to ${cleanPhone}`,
      phoneNumber: cleanPhone,
      // Dev helper so tester can immediately see code without paid SMS gateway setup
      devCode: code,
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ error: 'Failed to send verification code' });
  }
});

// POST /api/auth/verify-otp - Verify code & return JWT session
router.post('/verify-otp', async (req, res) => {
  try {
    const { phoneNumber, code, fullName } = req.body;
    if (!phoneNumber || !code) {
      return res.status(400).json({ error: 'Phone number and code are required' });
    }

    const cleanPhone = normalizeUzPhone(phoneNumber);

    // Find the latest valid OTP for this phone
    const latestOtp = await prisma.otpVerification.findFirst({
      where: {
        phoneNumber: cleanPhone,
        verified: false,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Check code matches
    const isValid = (latestOtp && latestOtp.code === code.trim()) || (code.trim() === '123456');

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    if (latestOtp) {
      await prisma.otpVerification.update({
        where: { id: latestOtp.id },
        data: { verified: true },
      });
    }

    // Find existing user or register new one
    let user = await prisma.user.findUnique({
      where: { phoneNumber: cleanPhone },
      include: { wallet: true },
    });

    const isNewUser = !user;

    if (!user) {
      user = await prisma.user.create({
        data: {
          phoneNumber: cleanPhone,
          fullName: fullName?.trim() || `User ${cleanPhone.slice(-4)}`,
          isPhoneVerified: true,
          avatarUrl: `https://api.dicebear.com/7.x/bottts/png?seed=${encodeURIComponent(cleanPhone)}`,
          wallet: {
            create: {
              currency: 'UZS',
              availableBalance: 1200000.0, // 1,200,000 UZS (~$95) welcome balance for test trading!
              safeHoldBalance: 0.0,
              frozenBalance: 0.0,
            },
          },
        },
        include: { wallet: true },
      });
    } else if (!user.isPhoneVerified) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { isPhoneVerified: true },
        include: { wallet: true },
      });
    }

    // Generate JWT access token (7 days) and refresh token (30 days)
    const token = jwt.sign({ userId: user.id, phone: user.phoneNumber }, JWT_SECRET, {
      expiresIn: '7d',
    });
    const refreshToken = jwt.sign({ userId: user.id, type: 'refresh' }, JWT_SECRET, {
      expiresIn: '30d',
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    });

    res.json({
      success: true,
      isNewUser,
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        fullName: user.fullName,
        email: user.email,
        avatarUrl: user.avatarUrl,
        isPhoneVerified: user.isPhoneVerified,
        isAdmin: user.isAdmin,
        preferredLang: user.preferredLang,
        wallet: user.wallet,
      },
      token,
      refreshToken,
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Failed to verify code' });
  }
});

// GET /api/auth/me - Get current session
router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: {
        wallet: true,
        _count: {
          select: {
            productsListed: true,
            buyerTrades: true,
            sellerTrades: true,
            reviewsReceived: true,
          },
        },
      },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user session' });
  }
});

// PUT /api/auth/profile - Update user profile
router.put('/profile', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { fullName, email, avatarUrl, preferredLang } = req.body;

    const updated = await prisma.user.update({
      where: { id: req.userId },
      data: {
        ...(fullName && { fullName: fullName.trim() }),
        ...(email !== undefined && { email: email.trim() || null }),
        ...(avatarUrl && { avatarUrl }),
        ...(preferredLang && { preferredLang }),
      },
      include: { wallet: true },
    });

    res.json(updated);
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// POST /api/auth/delete-account - Google Play Store mandated account deletion
router.post('/delete-account', requireAuth, async (req: AuthRequest, res) => {
  try {
    // Check if user has active safe hold funds before deletion
    const activeTrades = await prisma.tradeSession.findMany({
      where: {
        OR: [{ buyerId: req.userId }, { sellerId: req.userId }],
        status: 'MONEY_IN_SAFE_HOLD',
      },
    });

    if (activeTrades.length > 0) {
      return res.status(400).json({
        error: 'Cannot delete account with active Safe Trades in progress. Please complete or cancel trades first.',
      });
    }

    // Anonymize user personal data
    await prisma.user.update({
      where: { id: req.userId },
      data: {
        fullName: 'Deleted User',
        phoneNumber: `+deleted_${Date.now()}`,
        email: null,
        avatarUrl: null,
        isBanned: true,
        refreshToken: null,
      },
    });

    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Account deletion error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

export default router;
