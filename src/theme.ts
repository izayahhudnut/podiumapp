export const colors = {
  // Backgrounds
  background: '#070707',
  card: '#111111',
  cardAlt: '#0D0D0D',
  surface: 'rgba(255,255,255,0.05)',
  surfaceRaised: 'rgba(255,255,255,0.08)',
  surfacePressed: 'rgba(255,255,255,0.04)',

  // Brand
  primary: '#7C3AED',
  primaryLight: '#9D6BFF',
  accent: '#FF1F6A',
  orange: '#F97316',
  green: '#22C55E',
  gold: '#F59E0B',
  blue: '#3B82F6',
  teal: '#14B8A6',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.72)',
  textMuted: 'rgba(255,255,255,0.48)',
  textDim: 'rgba(255,255,255,0.36)',
  textFaint: 'rgba(255,255,255,0.2)',

  // Borders
  borderSoft: 'rgba(255,255,255,0.06)',
  borderMed: 'rgba(255,255,255,0.10)',
  borderStrong: 'rgba(255,255,255,0.18)',

  // Overlays
  nav: 'rgba(7,7,7,0.94)',
  overlayStrong: 'rgba(0,0,0,0.72)',
  overlayMed: 'rgba(0,0,0,0.48)',

  // Legacy aliases for compatibility
  borderOverlay: 'rgba(255,255,255,0.12)',
  avatar: 'rgba(255,255,255,0.10)',
} as const;

// Category color map
export const categoryColors: Record<string, string> = {
  Tech: '#3B82F6',
  Technology: '#3B82F6',
  Sports: '#22C55E',
  'Hip-Hop': '#F97316',
  HipHop: '#F97316',
  Politics: '#3B82F6',
  Culture: '#F97316',
  Relationships: '#EC4899',
  Gaming: '#7C3AED',
  Finance: '#22C55E',
  Science: '#14B8A6',
  Business: '#22C55E',
  Entertainment: '#F97316',
  Anime: '#EC4899',
  Health: '#22C55E',
  Policy: '#3B82F6',
  Media: '#9D6BFF',
  Environment: '#22C55E',
};

export const categoryEmojis: Record<string, string> = {
  Tech: '💻',
  Technology: '💻',
  Sports: '⚽',
  'Hip-Hop': '🎤',
  HipHop: '🎤',
  Politics: '🏛️',
  Culture: '🌍',
  Relationships: '💕',
  Gaming: '🎮',
  Finance: '📈',
  Science: '🔬',
  Business: '💼',
  Entertainment: '🎬',
  Anime: '🎌',
  Health: '🏥',
  AI: '🤖',
};

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
  sm: 10,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  pill: 999,
} as const;

export const shadow = {
  panel: '0 20px 50px rgba(0, 0, 0, 0.28)',
  card: '0 14px 30px rgba(0, 0, 0, 0.18)',
  float: '0 10px 26px rgba(0, 0, 0, 0.34)',
} as const;
