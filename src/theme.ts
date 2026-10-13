import { ColorValue, DynamicColorIOS, Platform } from 'react-native';

const adaptive = (name: string, light: string, dark: string): ColorValue => {
  if (Platform.OS === 'web') return `var(--${name}, ${light})` as ColorValue;
  if (Platform.OS === 'ios') return DynamicColorIOS({ light, dark });
  return light;
};

export const colors = {
  canvas: adaptive('canvas', '#FAFAFA', '#09090B'),
  surface: adaptive('surface', '#FFFFFF', '#18181B'),
  raised: adaptive('raised', '#FFFFFF', '#27272A'),
  surfaceMuted: adaptive('surface-muted', '#F4F4F5', '#27272A'),
  ink: adaptive('ink', '#18181B', '#FAFAFA'),
  muted: adaptive('muted', '#71717A', '#A1A1AA'),
  subtle: adaptive('subtle', '#A1A1AA', '#71717A'),
  line: adaptive('line', '#E4E4E7', '#3F3F46'),
  lineStrong: adaptive('line-strong', '#D4D4D8', '#52525B'),
  primary: adaptive('primary', '#18181B', '#E4E4E7'),
  primaryPressed: adaptive('primary-pressed', '#27272A', '#D4D4D8'),
  primarySoft: adaptive('primary-soft', '#F4F4F5', '#27272A'),
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
  white: adaptive('on-primary', '#FFFFFF', '#18181B'),
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
