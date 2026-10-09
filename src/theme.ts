export const colors = {
  canvas: '#FAFAFA', // Very clean off-white
  surface: '#FFFFFF',
  raised: '#FFFFFF',
  surfaceMuted: '#F4F4F5',
  ink: '#18181B', // Zinc 900
  muted: '#71717A', // Zinc 500
  subtle: '#A1A1AA', // Zinc 400
  line: '#E4E4E7', // Zinc 200
  lineStrong: '#D4D4D8',
  primary: '#18181B', // Black primary actions
  primaryPressed: '#27272A',
  primarySoft: '#F4F4F5',
  accent: '#4F46E5', // Indigo for active states
  accentSoft: '#EEF2FF',
  success: '#059669',
  successSoft: '#ECFDF5',
  warning: '#D97706',
  warningSoft: '#FFFBEB',
  danger: '#DC2626',
  dangerSoft: '#FEF2F2',
  info: '#2563EB',
  infoSoft: '#EFF6FF',
  white: '#FFFFFF',
};

export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };
export const radius = { sm: 6, md: 8, lg: 12, xl: 16, pill: 999 };
export const type = {
  display: { fontSize: 28, lineHeight: 34, fontWeight: '700' as const, letterSpacing: -0.6 },
  title: { fontSize: 18, lineHeight: 24, fontWeight: '600' as const, letterSpacing: -0.4 },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' as const, letterSpacing: -0.1 },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '500' as const, letterSpacing: -0.1 },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' as const, letterSpacing: 0 },
};
