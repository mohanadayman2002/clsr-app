import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { clsr, type BudgetTier, type DesignStyle } from '@/api';
import { AppText, Badge, Card, Chip, SectionHeader } from '@/components/ui';
import { BUDGET_TIERS, DESIGN_STYLES, type IconName } from '@/lib/catalog';
import { useSettings } from '@/store/settings';
import { spacing, useAppTheme } from '@/theme';

export default function SettingsScreen() {
  const { settings, update } = useSettings();
  const { colors } = useAppTheme();

  return (
    <SafeAreaView edges={['top']} style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="display">Settings</AppText>

        <View>
          <SectionHeader title="CLSR service" />
          <Card style={styles.rows}>
            <Row icon="server-outline" label="Connection">
              {clsr.isMock ? <Badge label="Demo mode" tone="warning" /> : <Badge label="Connected" tone="success" />}
            </Row>
            <AppText variant="caption">
              {clsr.isMock
                ? 'The app is using simulated results. It will talk to the CLSR system once the integration is configured.'
                : 'Floor plans are sent to CLSR for furnishing and rendering.'}
            </AppText>
          </Card>
        </View>

        <View>
          <SectionHeader title="Default design style" />
          <View style={styles.chips}>
            {(Object.keys(DESIGN_STYLES) as DesignStyle[]).map((key) => (
              <Chip
                key={key}
                label={DESIGN_STYLES[key].label}
                selected={settings.defaultStyle === key}
                onPress={() => update({ defaultStyle: key })}
              />
            ))}
          </View>
        </View>

        <View>
          <SectionHeader title="Default budget" />
          <View style={styles.chips}>
            {(Object.keys(BUDGET_TIERS) as BudgetTier[]).map((key) => (
              <Chip
                key={key}
                label={BUDGET_TIERS[key].label}
                selected={settings.defaultBudget === key}
                onPress={() => update({ defaultBudget: key })}
              />
            ))}
          </View>
        </View>

        <View>
          <SectionHeader title="General" />
          <Card style={styles.rows}>
            <Row icon="notifications-outline" label="Notify me when renders are ready">
              <Switch
                value={settings.notifyWhenReady}
                onValueChange={(v) => update({ notifyWhenReady: v })}
                trackColor={{ true: colors.accent, false: colors.border }}
                thumbColor="#FFFFFF"
              />
            </Row>
            <Row
              icon="play-circle-outline"
              label="Show introduction again"
              onPress={() => {
                update({ hasSeenOnboarding: false });
                router.replace('/onboarding');
              }}>
              <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
            </Row>
          </Card>
        </View>

        <AppText variant="caption" style={styles.version}>
          CLSR · version {Constants.expoConfig?.version ?? '—'}
        </AppText>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ icon, label, children, onPress }: { icon: IconName; label: string; children?: ReactNode; onPress?: () => void }) {
  const { colors } = useAppTheme();
  const content = (
    <View style={styles.row}>
      <Ionicons name={icon} size={20} color={colors.textMuted} />
      <AppText variant="body" style={styles.flex}>
        {label}
      </AppText>
      {children}
    </View>
  );
  return onPress ? (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => pressed && { opacity: 0.6 }}>
      {content}
    </Pressable>
  ) : (
    content
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.xl, gap: spacing.xl, paddingBottom: spacing.xxl * 2 },
  rows: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 32 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  version: { textAlign: 'center' },
});
