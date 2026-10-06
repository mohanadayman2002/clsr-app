/**
 * "Studio" theme: a dark gallery so renders carry the colour, a serif for
 * headings, and a mono for measurements and prices, like annotations on a drawing.
 */

const colors = {
  background: '#0F0E0C',
  surface: '#191714',
  surfaceMuted: '#221F1B',
  surfaceRaised: '#2A2621',
  text: '#F2EDE4',
  textMuted: '#A39B8F',
  textFaint: '#6B645B',
  border: '#2E2A25',
  /** Hairlines on drawings and plans. */
  line: 'rgba(242, 237, 228, 0.55)',
  primary: '#F2EDE4',
  onPrimary: '#0F0E0C',
  /** Brass: hotspots, prices, the active thing. */
  accent: '#E0A458',
  onAccent: '#1A1206',
  accentSoft: 'rgba(224, 164, 88, 0.14)',
  success: '#7BC49A',
  successSoft: 'rgba(123, 196, 154, 0.14)',
  warning: '#E0A458',
  warningSoft: 'rgba(224, 164, 88, 0.14)',
  danger: '#E57361',
  dangerSoft: 'rgba(229, 115, 97, 0.14)',
  overlay: 'rgba(8, 7, 6, 0.72)',
};

export type Colors = typeof colors;

export const fonts = {
  display: 'Fraunces_600SemiBold',
  displayItalic: 'Fraunces_500Medium_Italic',
  serif: 'Fraunces_500Medium',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodyBold: 'Inter_600SemiBold',
  mono: 'JetBrainsMono_400Regular',
  monoMedium: 'JetBrainsMono_500Medium',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 18, xl: 26, pill: 999 } as const;

/** Bottom padding for tab screens so content clears the floating tab bar. */
export const TAB_BAR_CLEARANCE = 120;

export const typography = {
  hero: { fontFamily: fonts.display, fontSize: 44, lineHeight: 48, letterSpacing: -1 },
  display: { fontFamily: fonts.display, fontSize: 34, lineHeight: 40, letterSpacing: -0.6 },
  title: { fontFamily: fonts.serif, fontSize: 26, lineHeight: 32, letterSpacing: -0.3 },
  italic: { fontFamily: fonts.displayItalic, fontSize: 20, lineHeight: 26 },
  heading: { fontFamily: fonts.bodyBold, fontSize: 17, lineHeight: 22 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  label: { fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  mono: { fontFamily: fonts.mono, fontSize: 13, lineHeight: 18 },
  monoLarge: { fontFamily: fonts.monoMedium, fontSize: 22, lineHeight: 28, letterSpacing: -0.5 },
  overline: { fontFamily: fonts.monoMedium, fontSize: 11, lineHeight: 14, letterSpacing: 1.6, textTransform: 'uppercase' },
} as const;

export function useAppTheme() {
  return { colors, isDark: true };
}
