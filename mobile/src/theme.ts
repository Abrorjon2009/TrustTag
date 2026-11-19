export const THEME = {
  colors: {
    // 4 Primary Colors: White, Bright Green, Dark Blue, Black
    primary: '#05C168',          // Bright Green (Action, Buttons, Active Highlights, Prices)
    primaryDark: '#049F56',
    primaryLight: '#34D399',
    primaryTint: '#E8FBF1',      // Soft pastel Bright Green tint for chips & badges

    darkBlue: '#0B192C',         // Deep Midnight Dark Blue
    darkBlueLight: '#1E293B',
    darkBlueTint: '#F0F4F8',

    black: '#000000',            // Pure Black (#000000)
    white: '#FFFFFF',            // Pure White (#FFFFFF)

    // Status Colors
    success: '#05C168',          // Bright Green
    safeGreen: '#05C168',
    safeGreenLight: '#E8FBF1',
    safeGreenDark: '#047857',
    info: '#0284C7',             // Dark Sky Blue
    infoLight: '#E0F2FE',
    alertRed: '#EF4444',         // Alert Red
    alertRedLight: '#FEE2E2',
    vipGold: '#F59E0B',          // VIP Gold
    vipGoldLight: '#FEF3C7',

    // Surfaces & Backgrounds
    background: '#F8FAFC',       // Clean Slate White Background
    canvasBg: '#F8FAFC',
    card: '#FFFFFF',             // Pure White Card
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',

    // Typography (Black & Dark Blue)
    textPrimary: '#000000',      // Solid Black
    textDark: '#0B192C',         // Midnight Dark Blue
    textSecondary: '#475569',    // Slate Dark Muted
    textMuted: '#94A3B8',
    borderSubtle: '#E2E8F0',     // Subtle White/Slate border
    borderMedium: '#CBD5E1',

    // Trade Stage Banners
    stage1Gray: '#475569',
    stage1GrayBg: '#F1F5F9',
    stage2Green: '#05C168',
    stage2GreenBg: '#E8FBF1',
    stage3Blue: '#0B192C',
    stage3BlueBg: '#F0F4F8',
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
      shadowColor: '#0B192C',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 2,
    },
    hover: {
      shadowColor: '#05C168',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 4,
    },
    float: {
      shadowColor: '#0B192C',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.1,
      shadowRadius: 14,
      elevation: 6,
    },
  },
};
