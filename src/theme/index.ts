/**
 * "Sunny studio" theme: warm cream paper, plum ink instead of black, a coral
 * accent, and a colour for every kind of room so plans and lists read at a glance.
 */

const colors = {
  background: '#FFF8F0',
  surface: '#FFFFFF',
  surfaceMuted: '#F7EEE4',
  surfaceRaised: '#FFFFFF',
  text: '#2B2238',
  textMuted: '#6E6479',
  textFaint: '#A99FB2',
  border: '#EFE4D8',
  /** Hairlines on drawings and plans. */
  line: '#2B2238',
  primary: '#2B2238',
  onPrimary: '#FFFFFF',
  /** Coral: hotspots, prices, the active thing. */
  accent: '#FF6B4A',
  onAccent: '#FFFFFF',
  accentSoft: '#FFE5DC',
  success: '#22A06B',
  successSoft: '#DDF5EA',
  warning: '#E8950C',
  warningSoft: '#FFF0D2',
  danger: '#E5484D',
  dangerSoft: '#FDE2E2',
  overlay: 'rgba(43, 34, 56, 0.45)',
  /** Soft drop shadow colour for raised cards and floating controls. */
  shadow: '#7A5C48',
};

export type Colors = typeof colors;

/** Extra colours for decoration. */
export const confetti = {
  sun: '#FFC94A',
  sky: '#7CC6FE',
  lilac: '#B9A6FF',
  mint: '#7EDDB5',
  peach: '#FFB59A',
  pink: '#FF9EC4',
};

export interface RoomTint {
  /** Pale fill for plans and cards. */
  fill: string;
  /** Strong version for text, outlines and dots. */
  ink: string;
}

const ROOM_TINTS: [RegExp, RoomTint][] = [
  [/living|lounge|reception|salon/, { fill: '#FFE1D2', ink: '#E2663E' }],
  [/dining/, { fill: '#FFE7C7', ink: '#D9822B' }],
  [/bed|master|guest|nursery/, { fill: '#E6DEFF', ink: '#7457F0' }],
  [/bath|wc|toilet|shower/, { fill: '#D6EEFF', ink: '#2C8BD6' }],
  [/kitchen|pantry/, { fill: '#FFF0B8', ink: '#C28A00' }],
  [/balcony|terrace|garden|roof/, { fill: '#D4F5E4', ink: '#1F9E66' }],
  [/office|study|work/, { fill: '#FFE0EE', ink: '#D9488A' }],
  [/hall|entr|corridor|lobby|foyer/, { fill: '#F1E7DB', ink: '#9A7652' }],
];

const FALLBACK_TINTS: RoomTint[] = [
  { fill: '#E2F3FF', ink: '#3A86C9' },
  { fill: '#FCE3F0', ink: '#C94C8B' },
  { fill: '#E5F7D9', ink: '#4E9A2A' },
];

/** A stable colour for a room, chosen from its label. */
export function roomTint(label: string): RoomTint {
  const key = label.toLowerCase();
  for (const [pattern, tint] of ROOM_TINTS) if (pattern.test(key)) return tint;
  let hash = 0;
  for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return FALLBACK_TINTS[hash % FALLBACK_TINTS.length];
}

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
export const radius = { sm: 10, md: 14, lg: 22, xl: 30, pill: 999 } as const;

/** Soft shadow for cards and floating controls. */
export const shadow = {
  shadowColor: colors.shadow,
  shadowOpacity: 0.14,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 8 },
  elevation: 6,
} as const;

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
  return { colors, isDark: false };
}
