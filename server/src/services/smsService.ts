/**
 * Uzbekistan SMS Service
 * Supports:
 * 1. Eskiz.uz (Official Uzbekistan SMS Gateway - free trial 100 SMS available on registration)
 * 2. Fallback / Dev mode for seamless testing
 */

interface SendSmsResult {
  success: boolean;
  messageId?: string;
  provider: 'ESKIZ' | 'DEV';
  error?: string;
}

let eskizToken: string | null = null;
let tokenExpiresAt = 0;

/**
 * Obtain auth token from Eskiz.uz
 */
async function getEskizToken(): Promise<string | null> {
  const email = process.env.ESKIZ_EMAIL;
  const password = process.env.ESKIZ_PASSWORD;

  if (process.env.ESKIZ_TOKEN) {
    return process.env.ESKIZ_TOKEN;
  }

  if (!email || !password) {
    return null;
  }

  // Reuse cached token if valid (valid for ~29 days, we refresh at 25 days)
  if (eskizToken && Date.now() < tokenExpiresAt) {
    return eskizToken;
  }

  try {
    const formData = new URLSearchParams();
    formData.append('email', email);
    formData.append('password', password);

    const res = await fetch('https://notify.eskiz.uz/api/auth/login', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      console.warn(`⚠️ Eskiz auth failed with status ${res.status}`);
      return null;
    }

    const data: any = await res.json();
    if (data?.data?.token) {
      eskizToken = data.data.token;
      tokenExpiresAt = Date.now() + 25 * 24 * 60 * 60 * 1000;
      return eskizToken;
    }
  } catch (err: any) {
    console.error('Error fetching Eskiz token:', err.message);
  }

  return null;
}

/**
 * Send SMS verification code to Uzbekistan phone number (+998...)
 */
export async function sendSmsCode(phoneNumber: string, code: string): Promise<SendSmsResult> {
  // Clean phone number (Eskiz expects 998901234567 without +)
  const cleanPhone = phoneNumber.replace(/\D/g, '');

  const token = await getEskizToken();

  if (token) {
    try {
      const message = `TrustTag platformasida tasdiqlash kodi: ${code}. Xavfsizlik uchun hech kimga bermang.`;
      const formData = new URLSearchParams();
      formData.append('mobile_phone', cleanPhone);
      formData.append('message', message);
      formData.append('from', '4546'); // Default registered sender ID in Eskiz

      const res = await fetch('https://notify.eskiz.uz/api/message/sms/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data: any = await res.json();

      if (res.ok && data?.status === 'waiting' || data?.id) {
        console.log(`📡 Eskiz SMS dispatched to ${cleanPhone} (ID: ${data.id})`);
        return {
          success: true,
          messageId: data.id ? String(data.id) : undefined,
          provider: 'ESKIZ',
        };
      } else {
        console.warn('⚠️ Eskiz SMS sending response:', data);
      }
    } catch (err: any) {
      console.error('Error sending Eskiz SMS:', err.message);
    }
  }

  // Graceful fallback for free dev / test mode
  console.log(`📱 [SMS DEV/FREE]: Verification code for ${phoneNumber} is [${code}]`);
  return {
    success: true,
    provider: 'DEV',
  };
}
