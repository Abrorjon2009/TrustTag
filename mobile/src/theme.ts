export const THEME = {
  colors: {
    // Taobao Brand Palette
    primary: '#FF5000',          // Iconic Taobao Vibrant Orange
    primaryDark: '#E04700',
    primaryLight: '#FF7A33',
    primaryTint: '#FFF1EB',      // Soft background for chips & badges

    // Central Safe-Hold / Escrow Colors
    safeGreen: '#00B578',        // Central Safe-Hold Active Green
    safeGreenLight: '#E8F8F2',
    safeGreenDark: '#028A5B',

    // Alert & Urgency Colors
    alertRed: '#FF0036',         // Tmall / Alert Red (Urgent alerts & reports)
    alertRedLight: '#FDE8E8',

    // VIP & Verification Gold
    vipGold: '#E2B35B',          // Verified badge, 5-star ratings
    vipGoldLight: '#FEF9E7',

    // Neutral Surfaces & Text
    canvasBg: '#F4F5F7',         // Cool slate off-white canvas
    surface: '#FFFFFF',          // Pure white card background
    surfaceElevated: '#FFFFFF',

    textPrimary: '#111111',      // High contrast product titles
    textSecondary: '#666666',    // Specifications & store names
    textMuted: '#999999',        // Sales volume, placeholder text
    borderSubtle: '#EEEEEE',     // Hairline dividers (0.5px / 1px)
    borderMedium: '#DDDDDD',

    // Trade Stage Banners
    stage1Gray: '#6B7280',
    stage1GrayBg: '#F3F4F6',
    stage2Green: '#03543F',
    stage2GreenBg: '#DEF7EC',
    stage3Blue: '#1E429F',
    stage3BlueBg: '#E1EFFE',
    stage3Yellow: '#713F12',
    stage3YellowBg: '#FEF08A',
    stage4Red: '#9B1C1C',
    stage4RedBg: '#FDE8E8',
  },
  borderRadius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    pill: 9999,
  },
  shadows: {
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 2,
    },
    hover: {
      shadowColor: '#FF5000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 4,
    },
    float: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
    },
  },
};

