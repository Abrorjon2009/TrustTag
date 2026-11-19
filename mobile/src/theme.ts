export const THEME = {
  colors: {
    // Primary Modern Sapphire Blue (Calm, trustworthy, gentle on the eye)
    primary: '#2563EB',          // Modern Royal Sapphire Blue
    primaryDark: '#1D4ED8',      // Deeper Royal Blue
    primaryLight: '#3B82F6',     // Sky Accent Blue
    primaryTint: '#EFF6FF',      // Gentle, soothing ice-blue tint for chips & badges

    // TrustTag Official Brand Colors (from official Logo)
    brandNavy: '#073B63',        // TrustTag Official Deep Navy ("Trust" & Shield Left)
    brandNavyDark: '#042C4C',
    brandGreen: '#19AB60',       // TrustTag Official Tag Green ("tag" & Tag Right)
    brandGreenLight: '#E8FBF1',

    // Supporting Dark Blue & Slate Framing
    darkBlue: '#0F172A',         // Midnight Slate Blue (Clean, high-end)
    darkBlueLight: '#1E293B',
    darkBlueTint: '#F1F5F9',

    black: '#0F172A',            // Deep Dark Slate (replaces harsh stark black for softer readability)
    white: '#FFFFFF',            // Pure White (#FFFFFF)

    // Status Colors
    success: '#16A34A',          // Success Emerald Green (for verified SafeTrade checkmarks as shown in Figma spec)
    safeGreen: '#16A34A',        // Muted Emerald (escrow security indicators)
    safeGreenLight: '#ECFDF5',
    safeGreenDark: '#047857',
    info: '#3B82F6',             // Info Blue
    infoLight: '#EFF6FF',
    alertRed: '#EF4444',         // Alert Red
    alertRedLight: '#FEE2E2',
    vipGold: '#F59E0B',          // VIP Gold
    vipGoldLight: '#FEF3C7',

    // Surfaces & Backgrounds
    background: '#F8FAFC',       // Soothing Slate White Canvas
    canvasBg: '#F8FAFC',
    card: '#FFFFFF',             // Pure White Card Surface
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',

    // Typography
    textPrimary: '#0F172A',      // Midnight Dark Slate (soft on eyes, high contrast)
    textDark: '#0F172A',
    textSecondary: '#64748B',    // Slate 500 (balanced secondary)
    textMuted: '#94A3B8',        // Slate 400
    borderSubtle: '#E2E8F0',     // Hairline soft border
    borderMedium: '#CBD5E1',

    // Trade Stage Banners
    stage1Gray: '#64748B',
    stage1GrayBg: '#F1F5F9',
    stage2Green: '#2563EB',
    stage2GreenBg: '#EFF6FF',
    stage3Blue: '#1D4ED8',
    stage3BlueBg: '#EFF6FF',
    stage3Yellow: '#D97706',
    stage3YellowBg: '#FEF3C7',
    stage4Red: '#DC2626',
    stage4RedBg: '#FEE2E2',
  },
  typography: {
    heading1: { fontSize: 22, fontWeight: '700' as const },
    heading2: { fontSize: 16, fontWeight: '600' as const },
    body: { fontSize: 14, fontWeight: '400' as const },
    caption: { fontSize: 12, fontWeight: '400' as const },
  },
  borderRadius: {
    xs: 6,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    pill: 9999,
  },
  shadows: {
    card: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 2,
    },
    hover: {
      shadowColor: '#2563EB',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 4,
    },
    float: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 14,
      elevation: 6,
    },
  },
};
