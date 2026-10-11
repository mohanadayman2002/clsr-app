import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState, type ComponentProps, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import Svg, { Circle } from 'react-native-svg';

import { confetti, fonts, radius, roomTint, shadow, spacing, typography, useAppTheme, type Colors } from '@/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

type Variant = keyof typeof typography;

export function AppText({
  variant = 'body',
  color,
  style,
  ...rest
}: TextProps & { variant?: Variant; color?: keyof Colors }) {
  const { colors } = useAppTheme();
  const fallback: keyof Colors = variant === 'caption' || variant === 'overline' ? 'textMuted' : 'text';
  return <Text style={[typography[variant] as TextStyle, { color: colors[color ?? fallback] }, style]} {...rest} />;
}

/** Pressable that sinks slightly under the finger. */
export function PressableScale({
  children,
  onPress,
  style,
  disabled,
  scaleTo = 0.97,
  ...rest
}: Omit<PressableProps, 'style' | 'children'> & { children: ReactNode; style?: StyleProp<ViewStyle>; scaleTo?: number }) {
  const [scale] = useState(() => new Animated.Value(1));
  const to = (value: number) => Animated.spring(scale, { toValue: value, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  return (
    <Pressable onPress={onPress} disabled={disabled} onPressIn={() => to(scaleTo)} onPressOut={() => to(1)} {...rest}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger';

export function Button({
  title,
  icon,
  variant = 'primary',
  loading,
  disabled,
  style,
  compact,
  ...rest
}: Omit<PressableProps, 'style'> & {
  title: string;
  icon?: IconName;
  variant?: ButtonVariant;
  loading?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useAppTheme();
  const palette = {
    primary: { bg: colors.primary, fg: colors.onPrimary, border: colors.primary },
    accent: { bg: colors.accent, fg: colors.onAccent, border: colors.accent },
    secondary: { bg: 'transparent', fg: colors.text, border: colors.border },
    ghost: { bg: 'transparent', fg: colors.textMuted, border: 'transparent' },
    danger: { bg: colors.dangerSoft, fg: colors.danger, border: 'transparent' },
  }[variant];
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={inactive}
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        { backgroundColor: palette.bg, borderColor: palette.border, opacity: inactive ? 0.45 : pressed ? 0.8 : 1 },
        style,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={compact ? 15 : 17} color={palette.fg} />}
          <Text style={[typography.label, { color: palette.fg }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  size = 20,
  plain,
  style,
}: {
  icon: IconName;
  onPress?: () => void;
  accessibilityLabel: string;
  size?: number;
  /** No border or fill, for use in navigation headers. */
  plain?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        plain ? styles.plain : [{ backgroundColor: colors.surface, borderColor: colors.surface }, shadow],
        { opacity: pressed ? 0.7 : 1 },
        style,
      ]}>
      <Ionicons name={icon} size={size} color={colors.text} />
    </Pressable>
  );
}

export function Card({
  children,
  onPress,
  style,
  padded = true,
}: {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}) {
  const { colors } = useAppTheme();
  const base = [styles.card, padded && styles.cardPadded, shadow, { backgroundColor: colors.surface, borderColor: colors.border }, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <PressableScale onPress={onPress} style={base}>
      {children}
    </PressableScale>
  );
}

/** Small filled tag. */
export function Badge({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger' }) {
  const { colors } = useAppTheme();
  const [fg, bg] = {
    neutral: [colors.textMuted, colors.surfaceMuted],
    accent: [colors.accent, colors.accentSoft],
    success: [colors.success, colors.successSoft],
    warning: [colors.warning, colors.warningSoft],
    danger: [colors.danger, colors.dangerSoft],
  }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[typography.overline, { color: fg, fontSize: 10 }]}>{label}</Text>
    </View>
  );
}

/** A pill in a room's own colour. */
export function RoomChip({ label, small }: { label: string; small?: boolean }) {
  const tint = roomTint(label);
  return (
    <View style={[styles.roomChip, small && styles.roomChipSmall, { backgroundColor: tint.fill }]}>
      <View style={[styles.roomChipDot, { backgroundColor: tint.ink }]} />
      <Text style={[typography.label, { color: tint.ink, fontSize: small ? 11 : 13 }]} numberOfLines={1}>
        {label.charAt(0).toUpperCase() + label.slice(1)}
      </Text>
    </View>
  );
}

/**
 * Soft colour blobs behind a heading. Purely decorative. Pass the screen width;
 * `inset` is the parent's horizontal padding, so the blobs run to the screen edge.
 */
export function Blobs({ width, height = 220, inset = 0 }: { width: number; height?: number; inset?: number }) {
  return (
    <Svg width={width} height={height} style={{ position: 'absolute', top: -spacing.lg, left: -inset }} pointerEvents="none">
      <Circle cx={width * 0.86} cy={height * 0.22} r={70} fill={confetti.sun} opacity={0.55} />
      <Circle cx={width * 0.68} cy={height * 0.6} r={34} fill={confetti.lilac} opacity={0.55} />
      <Circle cx={width * 0.97} cy={height * 0.72} r={46} fill={confetti.mint} opacity={0.5} />
      <Circle cx={width * 0.55} cy={height * 0.12} r={12} fill={confetti.pink} opacity={0.8} />
      <Circle cx={width * 0.78} cy={height * 0.92} r={8} fill={confetti.sky} opacity={0.9} />
    </Svg>
  );
}

/** A small dot that breathes; for "live" states. */
export function LiveDot({ color, size = 8, pulsing = true }: { color: string; size?: number; pulsing?: boolean }) {
  const [pulse] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!pulsing) return;
    const loop = Animated.loop(
      Animated.timing(pulse, { toValue: 1, duration: 1600, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, pulsing]);
  return (
    <View style={{ width: size * 2.5, height: size * 2.5, alignItems: 'center', justifyContent: 'center' }}>
      {pulsing && (
        <Animated.View
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size,
            backgroundColor: color,
            opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
            transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.5] }) }],
          }}
        />
      )}
      <View style={{ width: size, height: size, borderRadius: size, backgroundColor: color }} />
    </View>
  );
}

/** "Label ·········· value", like a spec sheet or a receipt. */
export function Leader({
  label,
  value,
  strong,
  muted,
}: {
  label: string;
  value: string;
  strong?: boolean;
  muted?: boolean;
}) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.leader}>
      <Text style={[strong ? typography.label : typography.body, { color: muted ? colors.textMuted : colors.text }]} numberOfLines={1}>
        {label}
      </Text>
      {/* A long run of dots that wraps; the box shows only its first line. */}
      <View style={styles.dotsBox}>
        <Text style={[styles.dots, { color: colors.textFaint }]}>{'· '.repeat(80)}</Text>
      </View>
      <Text style={[strong ? typography.monoLarge : typography.mono, { color: strong ? colors.accent : colors.text }]}>{value}</Text>
    </View>
  );
}

/** A rubber stamp, tilted: used to mark estimates so they never read as quotations. */
export function Stamp({ lines, tone = 'accent' }: { lines: string[]; tone?: 'accent' | 'success' }) {
  const { colors } = useAppTheme();
  const c = tone === 'accent' ? colors.accent : colors.success;
  return (
    <View style={[styles.stamp, { borderColor: c }]}>
      {lines.map((l, i) => (
        <Text key={l} style={[typography.overline, { color: c, fontSize: i === 0 ? 12 : 8, letterSpacing: i === 0 ? 2.4 : 1.2 }]}>
          {l}
        </Text>
      ))}
    </View>
  );
}

export function SectionHeader({ title, index, action }: { title: string; index?: string; action?: ReactNode }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitle}>
        {index && <Text style={[typography.overline, { color: colors.accent }]}>{index}</Text>}
        <Text style={[typography.overline, { color: colors.textMuted }]}>{title}</Text>
      </View>
      <View style={[styles.sectionRule, { backgroundColor: colors.border }]} />
      {action}
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon: IconName;
  title: string;
  message: string;
  action?: ReactNode;
}) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.accentSoft, borderColor: colors.accentSoft }]}>
        <Ionicons name={icon} size={28} color={colors.accent} />
      </View>
      <AppText variant="title" style={styles.center}>
        {title}
      </AppText>
      <AppText variant="body" color="textMuted" style={styles.center}>
        {message}
      </AppText>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  buttonCompact: { minHeight: 40, paddingHorizontal: spacing.lg },
  iconButton: { width: 40, height: 40, borderRadius: radius.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  plain: { backgroundColor: 'transparent', borderColor: 'transparent' },
  card: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  cardPadded: { padding: spacing.lg },
  badge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  roomChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  roomChipSmall: { paddingHorizontal: 9, paddingVertical: 4, gap: 5 },
  roomChipDot: { width: 7, height: 7, borderRadius: 4 },
  leader: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  dotsBox: { flex: 1, height: 14, overflow: 'hidden' },
  dots: { fontFamily: fonts.mono, fontSize: 11, lineHeight: 14 },
  stamp: {
    borderWidth: 1.5,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    alignItems: 'center',
    transform: [{ rotate: '-8deg' }],
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  sectionTitle: { flexDirection: 'row', gap: spacing.sm },
  sectionRule: { flex: 1, height: StyleSheet.hairlineWidth },
  empty: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg },
  emptyIcon: { width: 72, height: 72, borderRadius: radius.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  center: { textAlign: 'center' },
});
