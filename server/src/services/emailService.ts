import nodemailer from 'nodemailer';

interface SendOtpEmailOptions {
  to: string;
  code: string;
  fullName?: string;
  isNewUser?: boolean;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  devCode?: string;
  simulated?: boolean;
}

// Create transport dynamically based on environment
function createTransport() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });
}

/**
 * Send branded 6-digit verification code email
 */
export async function sendOtpEmail(options: SendOtpEmailOptions): Promise<SendEmailResult> {
  const { to, code, fullName, isNewUser } = options;
  const cleanEmail = to.trim().toLowerCase();

  const transporter = createTransport();

  // If SMTP is not yet set up in .env, simulate and log for local testing
  if (!transporter) {
    console.log(`\n📬 ========================================================`);
    console.log(`📧 [EMAIL OTP DEV SIMULATION]`);
    console.log(`   To: ${cleanEmail}`);
    console.log(`   Verification Code: [ ${code} ]`);
    console.log(`   Action: ${isNewUser ? 'New Registration' : 'Log In'}`);
    console.log(`   (Configure SMTP_USER and SMTP_PASS in server/.env to send real emails)`);
    console.log(`========================================================\n`);

    return {
      success: true,
      devCode: code,
      simulated: true,
    };
  }

  const fromAddress = process.env.SMTP_FROM || `"TrustTag Xavfsiz Savdo" <${process.env.SMTP_USER}>`;
  const greeting = fullName ? `Hurmatli <b>${fullName}</b>,` : 'Assalomu alaykum,';
  const actionText = isNewUser
    ? "TrustTag xavfsiz P2P bozorida yangi hisob ochish uchun quyidagi tasdiqlash kodidan foydalaning:"
    : "TrustTag hisobingizga kirish uchun quyidagi tasdiqlash kodidan foydalaning:";

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TrustTag Tasdiqlash Kodi</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F3F4F6; margin: 0; padding: 24px 12px; color: #1F2937;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; margin: 0 auto; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #E5E7EB;">
    <!-- Header -->
    <tr>
      <td style="padding: 28px 24px 20px; text-align: center; background: linear-gradient(135deg, #0F172A 0%, #1E3A8A 100%);">
        <h1 style="color: #FFFFFF; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">🛡️ TrustTag</h1>
        <p style="color: #93C5FD; margin: 6px 0 0; font-size: 13px;">O'zbekistonning Kafolatlangan P2P Bozor Platformasi</p>
      </td>
    </tr>

    <!-- Body Content -->
    <tr>
      <td style="padding: 32px 28px 24px;">
        <p style="font-size: 15px; margin: 0 0 12px; color: #374151;">${greeting}</p>
        <p style="font-size: 14px; line-height: 22px; margin: 0 0 24px; color: #4B5563;">${actionText}</p>

        <!-- OTP Code Box -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 0 0 24px;">
          <tr>
            <td style="background-color: #F8FAFC; border: 2px dashed #3B82F6; border-radius: 12px; padding: 20px; text-align: center;">
              <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #6B7280; font-weight: 700; display: block; margin-bottom: 8px;">Bir martalik tasdiqlash kodi:</span>
              <span style="font-size: 34px; font-weight: 900; letter-spacing: 8px; color: #1E40AF; font-family: monospace;">${code}</span>
              <span style="font-size: 12px; color: #EF4444; display: block; margin-top: 8px; font-weight: 600;">⏱️ Ushbu kod 5 daqiqa davomida amal qiladi</span>
            </td>
          </tr>
        </table>

        <!-- Security Warning -->
        <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 12px 14px; border-radius: 6px; margin-bottom: 24px;">
          <p style="font-size: 12px; color: #92400E; margin: 0; line-height: 18px;">
            <b>Diqqat:</b> Ushbu kodni hech kimga, hatto TrustTag ma'muriyati yoki sotuvchilarga ham bermang. TrustTag xodimlari sizdan hech qachon kod so'ramaydi.
          </p>
        </div>

        <p style="font-size: 13px; color: #6B7280; margin: 0; line-height: 19px;">
          Agar siz ushbu amalni bajarmagan bo'lsangiz, ushbu xatni e'tiborsiz qoldiring yoki xavfsizlik maqsadida parolingizni yangilang.
        </p>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding: 16px 24px 24px; text-align: center; border-top: 1px solid #F3F4F6; background-color: #FAFAFA;">
        <p style="font-size: 11px; color: #9CA3AF; margin: 0;">
          © ${new Date().getFullYear()} TrustTag P2P Marketplace. Barcha huquqlar himoyalangan.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to: cleanEmail,
      subject: `[${code}] - TrustTag hisobingiz uchun tasdiqlash kodi`,
      text: `Sizning TrustTag tasdiqlash kodingiz: ${code}. Kod 5 daqiqa davomida amal qiladi. Kodni hech kimga bermang.`,
      html: htmlContent,
    });

    console.log(`✉️ Email OTP sent successfully to ${cleanEmail}: [${code}] (Message ID: ${info.messageId})`);

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error: any) {
    console.error('Failed to send email via SMTP:', error);
    throw new Error(`Email yuborishda xatolik yuz berdi: ${error.message}`);
  }
}
