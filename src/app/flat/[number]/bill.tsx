import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { describeError, type Costs, type Tier } from '@/api';
import { AppText, Badge, Button, EmptyState, Leader, SectionHeader, Stamp } from '@/components/ui';
import { capitalize, formatEGP } from '@/lib/format';
import { roomNames } from '@/lib/rooms';
import { useResource } from '@/lib/useResource';
import { useApi } from '@/store/server';
import { useFlatStudio } from '@/store/studio';
import { fonts, radius, roomTint, shadow, spacing, typography, useAppTheme } from '@/theme';

const TIERS: { value: Tier | undefined; label: string }[] = [
  { value: undefined, label: 'As built' },
  { value: 'budget', label: 'Budget' },
  { value: 'comfort', label: 'Comfort' },
  { value: 'premium', label: 'Premium' },
];

/** The itemised bill from /costs, at the tier the flat was built at or another. */
export default function BillScreen() {
  const { number } = useLocalSearchParams<{ number: string }>();
  const n = Number(number);
  const api = useApi();
  const { colors } = useAppTheme();
  const studio = useFlatStudio(n);
  const [tier, setTier] = useState<Tier>();
  const bill = useResource(() => api.costs(n, tier), `${n}|${tier ?? ''}|${studio.version}`, true);
  // Room titles repeat (four bathrooms); the flat gives the order to number them by.
  const flat = useResource(() => api.project(n), `${n}`);
  const names = flat.data ? roomNames(flat.data.rooms) : new Map<number, string>();

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={bill.loading && !!bill.data} onRefresh={bill.reload} tintColor={colors.textMuted} />}>
      <View style={[styles.tiers, { backgroundColor: colors.surfaceMuted }]}>
        {TIERS.map((t) => {
          const on = t.value === tier;
          return (
            <Pressable key={t.label} onPress={() => setTier(t.value)} style={[styles.tier, on && { backgroundColor: colors.surface }]}>
              <Text style={[typography.label, { color: on ? colors.text : colors.textMuted }]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {bill.data ? (
        <Bill costs={bill.data} names={names} />
      ) : bill.error ? (
        <EmptyState icon="receipt-outline" title="Can't load the bill" message={describeError(bill.error)} action={<Button title="Try again" variant="secondary" compact onPress={bill.reload} />} />
      ) : (
        <ActivityIndicator style={styles.loader} color={colors.accent} />
      )}
    </ScrollView>
  );
}

function Bill({ costs, names }: { costs: Costs; names: Map<number, string> }) {
  const { colors } = useAppTheme();
  const allLines = costs.rooms.flatMap((r) => r.lines ?? []);

  return (
    <>
      <View style={[styles.summary, shadow, { backgroundColor: colors.surface }]}>
        <View style={styles.row}>
          <View style={styles.flex}>
            <AppText variant="overline">
              {capitalize(costs.tier)} · {costs.currency}
            </AppText>
            <AppText variant="display" style={{ color: colors.accent }}>
              {formatEGP(costs.total)}
            </AppText>
          </View>
          {costs.estimated ? <Stamp lines={['Estimate', 'not a quotation']} /> : <Stamp lines={['Quoted']} tone="success" />}
        </View>
        {costs.budget != null && <Leader label="Budget" value={formatEGP(costs.budget)} muted />}
        <Text style={[typography.caption, { color: colors.textMuted, fontFamily: fonts.displayItalic }]}>
          {costs.quoted_lines > 0
            ? `${costs.quoted_lines} of ${allLines.length || 'the'} lines carry real supplier prices; the rest are estimates at typical Cairo retail.`
            : 'Every line is an estimate at typical Cairo retail until a supplier quotes it.'}
        </Text>
      </View>

      {costs.rooms.map((r) => {
        const tint = roomTint(r.title);
        return (
          <View key={r.room}>
            <SectionHeader title={names.get(r.room) ?? r.title} action={<AppText variant="mono">{formatEGP(r.subtotal)}</AppText>} />
            <View style={[styles.card, shadow, { backgroundColor: colors.surface }]}>
              <View style={[styles.stripe, { backgroundColor: tint.ink }]} />
              {(r.lines ?? []).map((l, i) => (
                <View key={`${l.what}-${i}`} style={styles.line}>
                  <View style={styles.flex}>
                    <Leader label={l.count > 1 ? `${l.what} ×${l.count}` : l.what} value={Math.round(l.amount).toLocaleString('en-US')} />
                    <View style={styles.lineMeta}>
                      {l.count > 1 && (
                        <AppText variant="mono" color="textFaint" style={styles.small}>
                          {Math.round(l.each).toLocaleString('en-US')} each
                        </AppText>
                      )}
                      {l.source === 'quoted' && <Badge label="Quoted" tone="success" />}
                    </View>
                  </View>
                </View>
              ))}
              {!r.lines?.length && <AppText variant="caption">No itemised lines for this room.</AppText>}
            </View>
          </View>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  content: { padding: spacing.xl, gap: spacing.xl, paddingBottom: spacing.xxl * 2 },
  tiers: { flexDirection: 'row', padding: 4, borderRadius: radius.pill },
  tier: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radius.pill },
  loader: { marginTop: spacing.xxl },
  summary: { borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  card: { borderRadius: radius.lg, padding: spacing.lg, paddingLeft: spacing.lg + 4, gap: spacing.md, overflow: 'hidden' },
  stripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  line: { flexDirection: 'row', alignItems: 'center' },
  lineMeta: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: spacing.sm, marginTop: 2 },
  small: { fontSize: 11 },
});
