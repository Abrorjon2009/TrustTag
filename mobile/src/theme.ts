export const THEME = {
  colors: {
    // Official Design Palette
    primary: '#FF6B00',          // Primary Orange
    primaryDark: '#E05E00',
    primaryLight: '#FF8533',
    primaryTint: '#FFF7ED',      // Soft peach background for chips & badges

    // Status Colors
    success: '#16A34A',          // Success Green (Verified safe-trade, positive)
    safeGreen: '#16A34A',
    safeGreenLight: '#DCFCE7',
    safeGreenDark: '#15803D',
    info: '#3B82F6',             // Info Blue
    infoLight: '#EFF6FF',
    alertRed: '#EF4444',         // Alert Red
    alertRedLight: '#FEE2E2',
    vipGold: '#F59E0B',          // VIP Gold
    vipGoldLight: '#FEF3C7',

    // Surfaces & Backgrounds
    background: '#F8FAFC',       // Clean slate light background
    canvasBg: '#F8FAFC',
    card: '#FFFFFF',             // Pure white card background
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',

    // Typography
    textPrimary: '#0F172A',      // Text Dark (#0F172A)
    textDark: '#0F172A',
    textSecondary: '#64748B',    // Text Secondary (#64748B)
    textMuted: '#94A3B8',        // Slate 400
    borderSubtle: '#E2E8F0',     // Slate 200
    borderMedium: '#CBD5E1',

    // Trade Stage Banners
    stage1Gray: '#64748B',
    stage1GrayBg: '#F1F5F9',
    stage2Green: '#16A34A',
    stage2GreenBg: '#DCFCE7',
    stage3Blue: '#3B82F6',
    stage3BlueBg: '#EFF6FF',
    stage3Yellow: '#D97706',
    stage3YellowBg: '#FEF3C7',
    stage4Red: '#DC2626',
    stage4RedBg: '#FEE2E2',
  },
  typography: {
    heading1: { fontSize: 22, fontWeight: '600' as const },
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
      shadowColor: '#FF6B00',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
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
