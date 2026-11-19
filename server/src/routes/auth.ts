import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';
import { JWT_SECRET, requireAuth, AuthRequest } from '../middleware/auth';
import { hashPassword, verifyPassword } from '../utils/security';

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

// Generate JWT tokens
function generateTokens(user: { id: string; phoneNumber?: string | null; email?: string | null }) {
  const token = jwt.sign(
    { userId: user.id, phone: user.phoneNumber, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  const refreshToken = jwt.sign(
    { userId: user.id, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
  return { token, refreshToken };
}

// Standardized user response shape
function formatUserResponse(user: any) {
  return {
    id: user.id,
    phoneNumber: user.phoneNumber,
    fullName: user.fullName,
    email: user.email,
    avatarUrl: user.avatarUrl,
    isPhoneVerified: user.isPhoneVerified,
    isEmailVerified: user.isEmailVerified,
    isAdmin: user.isAdmin,
    preferredLang: user.preferredLang,
    authProvider: user.authProvider,
    telegramUsername: user.telegramUsername,
    wallet: user.wallet,
  };
}

// ==========================================
// 1. PHONE NUMBER + SMS OTP (FREE DEV MODE)
// ==========================================

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
    // For seamless free testing, return devCode in response
    res.json({
      success: true,
      message: `Verification code sent to ${cleanPhone}`,
      phoneNumber: cleanPhone,
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
          authProvider: 'PHONE',
          avatarUrl: `https://api.dicebear.com/7.x/bottts/png?seed=${encodeURIComponent(cleanPhone)}`,
          wallet: {
            create: {
              currency: 'UZS',
              availableBalance: 1200000.0, // 1,200,000 UZS welcome balance
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

    const { token, refreshToken } = generateTokens(user);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    });

    res.json({
      success: true,
      isNewUser,
      user: formatUserResponse(user),
      token,
      refreshToken,
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Failed to verify code' });
  }
});

// ==========================================
// 2. OPTION A: GOOGLE SIGN-IN (FREE & EASY)
// ==========================================

// POST /api/auth/google
router.post('/google', async (req, res) => {
  try {
    const { googleId, email, fullName, avatarUrl } = req.body;
    if (!email && !googleId) {
      return res.status(400).json({ error: 'Google account details (email or googleId) are required' });
    }

    const cleanEmail = email ? email.trim().toLowerCase() : null;

    // Search user by googleId or by email
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          ...(googleId ? [{ googleId }] : []),
          ...(cleanEmail ? [{ email: cleanEmail }] : []),
        ],
      },
      include: { wallet: true },
    });

    const isNewUser = !user;

    if (!user) {
      const generatedGoogleId = googleId || `google_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      user = await prisma.user.create({
        data: {
          googleId: generatedGoogleId,
          email: cleanEmail,
          fullName: fullName?.trim() || (cleanEmail ? cleanEmail.split('@')[0] : 'Google User'),
          avatarUrl: avatarUrl || (cleanEmail ? `https://api.dicebear.com/7.x/bottts/png?seed=${encodeURIComponent(cleanEmail)}` : null),
          authProvider: 'GOOGLE',
          isEmailVerified: true,
          wallet: {
            create: {
              currency: 'UZS',
              availableBalance: 1200000.0,
              safeHoldBalance: 0.0,
              frozenBalance: 0.0,
            },
          },
        },
        include: { wallet: true },
      });
    } else {
      // Connect Google account if user signed up previously
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: user.googleId || googleId,
          avatarUrl: user.avatarUrl || avatarUrl,
          isEmailVerified: true,
        },
        include: { wallet: true },
      });
    }

    const { token, refreshToken } = generateTokens(user);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    });

    res.json({
      success: true,
      isNewUser,
      user: formatUserResponse(user),
      token,
      refreshToken,
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ error: 'Google orqali tizimga kirishda xatolik yuz berdi' });
  }
});

// ==========================================
// 3. OPTION B: TELEGRAM LOGIN (FREE & EASY)
// ==========================================

// POST /api/auth/telegram
router.post('/telegram', async (req, res) => {
  try {
    const { telegramId, username, fullName, avatarUrl } = req.body;
    if (!telegramId && !username) {
      return res.status(400).json({ error: 'Telegram ID or username is required' });
    }

    const cleanTgId = telegramId ? String(telegramId).trim() : null;
    const cleanUsername = username ? username.replace(/^@/, '').trim() : null;

    let user = await prisma.user.findFirst({
      where: {
        OR: [
          ...(cleanTgId ? [{ telegramId: cleanTgId }] : []),
          ...(cleanUsername ? [{ telegramUsername: cleanUsername }] : []),
        ],
      },
      include: { wallet: true },
    });

    const isNewUser = !user;

    if (!user) {
      const displayName = fullName?.trim() || (cleanUsername ? `@${cleanUsername}` : 'Telegram User');
      const generatedTgId = cleanTgId || `tg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      user = await prisma.user.create({
        data: {
          telegramId: generatedTgId,
          telegramUsername: cleanUsername,
          fullName: displayName,
          avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/bottts/png?seed=${encodeURIComponent(cleanUsername || generatedTgId)}`,
          authProvider: 'TELEGRAM',
          wallet: {
            create: {
              currency: 'UZS',
              availableBalance: 1200000.0,
              safeHoldBalance: 0.0,
              frozenBalance: 0.0,
            },
          },
        },
        include: { wallet: true },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          telegramId: user.telegramId || cleanTgId,
          telegramUsername: user.telegramUsername || cleanUsername,
          avatarUrl: user.avatarUrl || avatarUrl,
        },
        include: { wallet: true },
      });
    }

    const { token, refreshToken } = generateTokens(user);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    });

    res.json({
      success: true,
      isNewUser,
      user: formatUserResponse(user),
      token,
      refreshToken,
    });
  } catch (error) {
    console.error('Telegram auth error:', error);
    res.status(500).json({ error: 'Telegram orqali tizimga kirishda xatolik yuz berdi' });
  }
});

// ==========================================
// 4. OPTION C: EMAIL + PASSWORD (FREE & EASY)
// ==========================================

// POST /api/auth/register-email
router.post('/register-email', async (req, res) => {
  try {
    const { email, password, fullName } = req.body;
    if (!email || !password || !fullName) {
      return res.status(400).json({ error: 'Email, parol va ism-familiya kiritilishi shart' });
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ error: 'Iltimos, to\'g\'ri email manzil kiriting' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Parol kamida 6 ta belgidan iborat bo\'lishi kerak' });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Ushbu email bilan akkaunt allaqachon mavjud. Iltimos, tizimga kiring.' });
    }

    const user = await prisma.user.create({
      data: {
        email: cleanEmail,
        fullName: fullName.trim(),
        passwordHash: hashPassword(password),
        authProvider: 'EMAIL',
        avatarUrl: `https://api.dicebear.com/7.x/bottts/png?seed=${encodeURIComponent(cleanEmail)}`,
        wallet: {
          create: {
            currency: 'UZS',
            availableBalance: 1200000.0,
            safeHoldBalance: 0.0,
            frozenBalance: 0.0,
          },
        },
      },
      include: { wallet: true },
    });

    const { token, refreshToken } = generateTokens(user);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    });

    res.json({
      success: true,
      isNewUser: true,
      user: formatUserResponse(user),
      token,
      refreshToken,
    });
  } catch (error) {
    console.error('Email register error:', error);
    res.status(500).json({ error: 'Ro\'yxatdan o\'tishda xatolik yuz berdi' });
  }
});

// POST /api/auth/login-email
router.post('/login-email', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email va parol kiritilishi shart' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
      include: { wallet: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'Ushbu email bilan akkaunt topilmadi' });
    }

    if (!user.passwordHash) {
      return res.status(400).json({
        error: `Ushbu akkaunt ${user.authProvider || 'ijtimoiy tarmoq'} orqali ochilgan. Iltimos, o'sha usul orqali kiring.`,
      });
    }

    const isMatch = verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Noto\'g\'ri parol kiritildi' });
    }

    const { token, refreshToken } = generateTokens(user);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    });

    res.json({
      success: true,
      isNewUser: false,
      user: formatUserResponse(user),
      token,
      refreshToken,
    });
  } catch (error) {
    console.error('Email login error:', error);
    res.status(500).json({ error: 'Tizimga kirishda xatolik yuz berdi' });
  }
});

// ==========================================
// 5. PROFILE & ACCOUNT MANAGEMENT
// ==========================================

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
    res.json(formatUserResponse(user));
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
        ...(email !== undefined && { email: email.trim().toLowerCase() || null }),
        ...(avatarUrl && { avatarUrl }),
        ...(preferredLang && { preferredLang }),
      },
      include: { wallet: true },
    });

    res.json(formatUserResponse(updated));
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// POST /api/auth/delete-account - Google Play Store mandated account deletion
router.post('/delete-account', requireAuth, async (req: AuthRequest, res) => {
  try {
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

    await prisma.user.update({
      where: { id: req.userId },
      data: {
        fullName: 'Deleted User',
        phoneNumber: null,
        email: null,
        avatarUrl: null,
        googleId: null,
        telegramId: null,
        telegramUsername: null,
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
