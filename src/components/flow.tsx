import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing, useAppTheme } from '@/theme';

import { AppText } from './ui';

const TOTAL_STEPS = 3;

/** Layout for a step of the new-project flow: scrollable body + pinned footer actions. */
export function FlowScreen({
  step,
  title,
  subtitle,
  children,
  footer,
}: {
  step: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.steps}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <View key={i} style={[styles.step, { backgroundColor: i < step ? colors.accent : colors.border }]} />
          ))}
        </View>
        <AppText variant="overline">
          Step {step} of {TOTAL_STEPS}
        </AppText>
        <AppText variant="title">{title}</AppText>
        {subtitle && (
          <AppText variant="body" color="textMuted">
            {subtitle}
          </AppText>
        )}
        <View style={styles.body}>{children}</View>
      </ScrollView>
      <View
        style={[
          styles.footer,
          { borderTopColor: colors.border, backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, spacing.lg) },
        ]}>
        {footer}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.xl, gap: spacing.sm },
  steps: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md },
  step: { flex: 1, height: 4, borderRadius: 2 },
  body: { marginTop: spacing.lg, gap: spacing.xl },
  footer: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, gap: spacing.sm },
});
