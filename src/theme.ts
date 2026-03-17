export const colors = {
  background: '#000000',
  nav: 'rgba(0, 0, 0, 0.88)',
  surface: 'rgba(255, 255, 255, 0.02)',
  surfacePressed: 'rgba(255, 255, 255, 0.04)',
  surfaceRaised: 'rgba(255, 255, 255, 0.06)',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.76)',
  textMuted: 'rgba(255, 255, 255, 0.68)',
  textDim: 'rgba(255, 255, 255, 0.42)',
  textFaint: 'rgba(255, 255, 255, 0.24)',
  borderSoft: 'rgba(255, 255, 255, 0.08)',
  borderStrong: 'rgba(255, 255, 255, 0.22)',
  overlayStrong: 'rgba(0, 0, 0, 0.48)',
  borderOverlay: 'rgba(255, 255, 255, 0.12)',
  avatar: 'rgba(255, 255, 255, 0.10)',
} as const;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  xxl: 40,
  xxxl: 56,
} as const;

export const radii = {
  md: 16,
  lg: 24,
  xl: 36,
  pill: 999,
} as const;

export const shadow = {
  panel: '0 20px 50px rgba(0, 0, 0, 0.28)',
  card: '0 14px 30px rgba(0, 0, 0, 0.18)',
  float: '0 10px 26px rgba(0, 0, 0, 0.34)',
} as const;
