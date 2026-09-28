import { useColorScheme } from 'react-native';

const light = {
  background: '#F7F5F2',
  surface: '#FFFFFF',
  surfaceMuted: '#EFEBE5',
  text: '#1B1A18',
  textMuted: '#6E6A64',
  textFaint: '#A19C94',
  border: '#E3DED6',
  primary: '#1B1A18',
  onPrimary: '#FFFFFF',
  accent: '#C8643B',
  accentSoft: '#F6E4DA',
  success: '#2F7D5B',
  successSoft: '#DDEFE6',
  warning: '#B7791F',
  warningSoft: '#F8ECD5',
  danger: '#C2412D',
  dangerSoft: '#F7DEDA',
  overlay: 'rgba(20, 19, 17, 0.55)',
};

export type Colors = typeof light;

const dark: Colors = {
  background: '#141311',
  surface: '#1E1D1A',
  surfaceMuted: '#292724',
  text: '#F4F1EC',
  textMuted: '#A8A39B',
  textFaint: '#6F6A63',
  border: '#34312D',
  primary: '#F4F1EC',
  onPrimary: '#141311',
  accent: '#E07A4F',
  accentSoft: '#3A2419',
  success: '#5BBF92',
  successSoft: '#1C3329',
  warning: '#E0A546',
  warningSoft: '#3A2E17',
  danger: '#E5634F',
  dangerSoft: '#3D1E19',
  overlay: 'rgba(0, 0, 0, 0.65)',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 } as const;

export const typography = {
  display: { fontSize: 32, lineHeight: 38, fontWeight: '700' },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '700' },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  overline: { fontSize: 11, lineHeight: 14, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
} as const;

export function useAppTheme() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  return { colors: isDark ? dark : light, isDark };
}
