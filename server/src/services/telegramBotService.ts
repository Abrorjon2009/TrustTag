import { prisma } from '../db';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../middleware/auth';

interface TelegramAuthSessionData {
  user: any;
  token: string;
  refreshToken: string;
  isNewUser: boolean;
  phoneNumber?: string | null;
  createdAt: number;
}

// In-memory cache of authenticated sessions (auto-expires in 10 minutes)
const activeSessions = new Map<string, TelegramAuthSessionData>();

// In-memory map from chatId to pending phone session ID
const pendingPhoneSessions = new Map<number, string>();

// In-memory map of actively polled sessions from the frontend: sessionId -> lastPolledTimestamp
const activelyPolledSessions = new Map<string, number>();

// Helper to cleanup expired sessions
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of activeSessions.entries()) {
    if (now - data.createdAt > 10 * 60 * 1000) {
      activeSessions.delete(key);
    }
  }
  for (const [key, time] of activelyPolledSessions.entries()) {
    if (now - time > 5 * 60 * 1000) {
      activelyPolledSessions.delete(key);
    }
  }
}, 60 * 1000);

export function registerPolledSession(sessionId: string) {
  if (sessionId) {
    activelyPolledSessions.set(sessionId, Date.now());
  }
}

export function getLatestPolledSession(): string | null {
  const now = Date.now();
  let latestId: string | null = null;
  let latestTime = 0;
  for (const [id, time] of activelyPolledSessions.entries()) {
    if (now - time < 3 * 60 * 1000 && time > latestTime) {
      latestTime = time;
      latestId = id;
    }
  }
  return latestId;
}

export function getTelegramSession(sessionId: string): TelegramAuthSessionData | null {
  registerPolledSession(sessionId);
  return activeSessions.get(sessionId) || null;
}

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

let isPolling = false;
let updateOffset = 0;

/**
 * Start lightweight Telegram Bot long polling
 */
export function startTelegramBotPolling(io?: any) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.log('ℹ️ Telegram Bot Token not set. Telegram Bot polling disabled.');
    return;
  }

  if (isPolling) return;
  isPolling = true;

  console.log(`🤖 Starting Telegram Bot polling for @${process.env.TELEGRAM_BOT_USERNAME || 'TrustTagUzAuthBot'}...`);

  // Polling loop
  const poll = async () => {
    while (isPolling) {
      try {
        const url = `https://api.telegram.org/bot${token}/getUpdates?offset=${updateOffset}&timeout=2`;
        const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
        if (!resp.ok) {
          await new Promise((r) => setTimeout(r, 3000));
          continue;
        }

        const data: any = await resp.json();
        if (data.ok && Array.isArray(data.result) && data.result.length > 0) {
          for (const update of data.result) {
            updateOffset = update.update_id + 1;
            await handleTelegramUpdate(update, token, io);
          }
        }
        await new Promise((r) => setTimeout(r, 300));
      } catch (err: any) {
        // Network timeout / connection error - wait and retry
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  };

  poll().catch((err) => console.error('Telegram polling error:', err));
}

/**
 * Handle incoming Telegram messages (Text, Commands, Contact sharing)
 */
async function handleTelegramUpdate(update: any, token: string, io?: any) {
  const message = update.message;
  if (!message) return;

  const chatId = message.chat.id;
  const from = message.from;
  const text = message.text ? message.text.trim() : '';

  // 1. Helper to send instant ⌛ response within milliseconds
  const sendInstantAck = async (): Promise<number | null> => {
    try {
      const ackRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: '⌛',
        }),
      });
      if (ackRes.ok) {
        const d: any = await ackRes.json();
        return d?.result?.message_id || null;
      }
    } catch (e) {
      // Ignore ack failure
    }
    return null;
  };

  // Helper to edit the ⌛ message to the final result, or send a new message
  const sendOrEditReply = async (msgId: number | null, replyText: string, replyMarkup?: any) => {
    if (msgId) {
      try {
        const editRes = await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            message_id: msgId,
            text: replyText,
            parse_mode: 'HTML',
          }),
        });
        if (editRes.ok) return;
      } catch (e) {
        // Fallback to sending new message
      }
    }

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: replyText,
        parse_mode: 'HTML',
        reply_markup: replyMarkup || { remove_keyboard: true },
      }),
    });
  };

  // 2. Handle Contact Sharing (100% Free Phone Number Verification)
  if (message.contact) {
    const ackId = await sendInstantAck();

    let rawPhone = message.contact.phone_number.trim();
    if (!rawPhone.startsWith('+')) {
      rawPhone = '+' + rawPhone;
    }

    const sessionId = pendingPhoneSessions.get(chatId) || getLatestPolledSession() || `phone_${Date.now()}`;
    const tgId = from ? String(from.id) : null;
    const tgUsername = from?.username ? from.username.replace(/^@/, '').trim() : null;
    const tgFullName = [from?.first_name, from?.last_name].filter(Boolean).join(' ') || 'Foydalanuvchi';

    try {
      let user = await prisma.user.findFirst({
        where: {
          OR: [
            { phoneNumber: rawPhone },
            ...(tgId ? [{ telegramId: tgId }] : []),
          ],
        },
        include: { wallet: true },
      });

      const isNewUser = !user;

      if (!user) {
        user = await prisma.user.create({
          data: {
            phoneNumber: rawPhone,
            isPhoneVerified: true,
            telegramId: tgId,
            telegramUsername: tgUsername,
            fullName: tgFullName,
            authProvider: 'PHONE',
            avatarUrl: `https://api.dicebear.com/7.x/bottts/png?seed=${encodeURIComponent(rawPhone)}`,
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
            phoneNumber: rawPhone,
            isPhoneVerified: true,
            telegramId: user.telegramId || tgId,
            telegramUsername: tgUsername || user.telegramUsername,
          },
          include: { wallet: true },
        });
      }

      const { token: userJwt, refreshToken } = generateTokens(user);

      await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken },
      });

      const formattedUser = formatUserResponse(user);

      // Save to active sessions for frontend polling
      activeSessions.set(sessionId, {
        user: formattedUser,
        token: userJwt,
        refreshToken,
        isNewUser,
        phoneNumber: rawPhone,
        createdAt: Date.now(),
      });
      activelyPolledSessions.delete(sessionId);

      // Emit via WebSockets
      if (io) {
        io.emit(`telegram_auth_success_${sessionId}`, {
          success: true,
          isNewUser,
          user: formattedUser,
          token: userJwt,
          refreshToken,
          phoneNumber: rawPhone,
          message: `Telefon raqamingiz muvaffaqiyatli tasdiqlandi: ${rawPhone}`,
        });
      }

      pendingPhoneSessions.delete(chatId);

      const reply = `✅ <b>Telefon raqamingiz tasdiqlandi!</b>\n\n📱 <code>${rawPhone}</code>\n\n🛡️ TrustTag hisobingizga muvaffaqiyatli bog'landi. Endi ilovaga qaytishingiz mumkin — tizimga kirdingiz!`;
      await sendOrEditReply(ackId, reply, { remove_keyboard: true });

      console.log(`📱 Telegram Contact Verified: ${rawPhone} for session ${sessionId}`);
      return;
    } catch (err: any) {
      console.error('Error handling contact sharing:', err);
    }
  }

  // 3. Handle "/start phone_<sessionId>" - Prompt for contact sharing
  if (text.startsWith('/start phone_')) {
    const ackId = await sendInstantAck();
    const sessionId = text.replace('/start phone_', '').trim();
    if (sessionId) {
      pendingPhoneSessions.set(chatId, sessionId);
    }

    const promptText = `🛡️ <b>TrustTag Xavfsiz Savdo</b>\n\nTelefon raqamingizni bepul va 1 bosishda tasdiqlash uchun pastdagi <b>"📱 Telefon raqamimni yuborish"</b> tugmasini bosing:`;

    // Prompt needs keyboard markup, so send fresh message
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: promptText,
        parse_mode: 'HTML',
        reply_markup: {
          keyboard: [
            [
              {
                text: '📱 Telefon raqamimni yuborish',
                request_contact: true,
              },
            ],
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      }),
    });
    return;
  }

  // 4. Handle "/start auth_<sessionId>" OR bare "/start" (when an app session is waiting!)
  let targetSessionId: string | null = null;
  if (text.startsWith('/start auth_')) {
    targetSessionId = text.replace('/start auth_', '').trim();
  } else if (text === '/start' || text.startsWith('/start')) {
    // If user just typed /start, see if there is an active session waiting in the app!
    targetSessionId = getLatestPolledSession();
  }

  if (targetSessionId) {
    // Immediately send ⌛ emoji so user gets instant response!
    const ackId = await sendInstantAck();

    try {
      const tgId = from ? String(from.id) : null;
      const tgUsername = from?.username ? from.username.replace(/^@/, '').trim() : null;
      const tgFullName = [from?.first_name, from?.last_name].filter(Boolean).join(' ') || (tgUsername ? `@${tgUsername}` : 'Telegram User');

      // Find or create user
      let user = await prisma.user.findFirst({
        where: {
          OR: [
            ...(tgId ? [{ telegramId: tgId }] : []),
            ...(tgUsername ? [{ telegramUsername: tgUsername }] : []),
          ],
        },
        include: { wallet: true },
      });

      const isNewUser = !user;

      if (!user) {
        user = await prisma.user.create({
          data: {
            telegramId: tgId,
            telegramUsername: tgUsername,
            fullName: tgFullName,
            authProvider: 'TELEGRAM',
            avatarUrl: `https://api.dicebear.com/7.x/bottts/png?seed=${encodeURIComponent(tgUsername || tgId || 'user')}`,
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
            telegramId: user.telegramId || tgId,
            telegramUsername: tgUsername || user.telegramUsername,
          },
          include: { wallet: true },
        });
      }

      const { token: userJwt, refreshToken } = generateTokens(user);

      await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken },
      });

      const formattedUser = formatUserResponse(user);

      // Save to active sessions for polling check
      activeSessions.set(targetSessionId, {
        user: formattedUser,
        token: userJwt,
        refreshToken,
        isNewUser,
        createdAt: Date.now(),
      });
      activelyPolledSessions.delete(targetSessionId);

      // Emit via WebSockets for instant realtime login
      if (io) {
        io.emit(`telegram_auth_success_${targetSessionId}`, {
          success: true,
          isNewUser,
          user: formattedUser,
          token: userJwt,
          refreshToken,
          message: isNewUser
            ? `Telegram orqali yangi hisob ochildi: ${user.fullName}`
            : `Telegram orqali kirdingiz: ${user.fullName}`,
        });
      }

      // Send confirmation message to user on Telegram (morphing ⌛ into the final reply)
      const replyText = `✅ <b>Assalomu alaykum, ${tgFullName}!</b>\n\n🛡️ TrustTag hisobingiz muvaffaqiyatli tasdiqlandi!\n\n${
        isNewUser ? '🎁 Sizga <b>1,200,000 UZS</b> xush kelibsiz start balansi taqdim etildi.\n\n' : ''
      }Endi ilovaga qaytishingiz mumkin — tizimga avtomatik tarzda kirdingiz.`;

      await sendOrEditReply(ackId, replyText, { remove_keyboard: true });

      console.log(`🤖 Telegram Bot Authenticated: ${tgFullName} (@${tgUsername || tgId}) for session ${targetSessionId}`);
    } catch (err: any) {
      console.error('Error in handleTelegramUpdate:', err);
    }
    return;
  }

  // 5. Default welcome when no session is waiting and just "/start"
  if (text === '/start') {
    const ackId = await sendInstantAck();
    const welcome = `Assalomu alaykum! 🛡️ <b>TrustTag Xavfsiz Savdo</b> platformasining rasmiy autentifikatsiya botiga xush kelibsiz.\n\nPlatformada 1 bosishda kirish yoki ro'yxatdan o'tish uchun sayt yoki ilovadan ushbu botga o'ting.`;
    await sendOrEditReply(ackId, welcome, { remove_keyboard: true });
  }
}
