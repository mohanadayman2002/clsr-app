import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { clsr, type BudgetTier, type DesignStyle } from '@/api';
import { FlowScreen } from '@/components/flow';
import { AppText, Button, SectionHeader } from '@/components/ui';
import { BUDGET_TIERS, DESIGN_STYLES } from '@/lib/catalog';
import { useDraft } from '@/store/draft';
import { radius, spacing, typography, useAppTheme } from '@/theme';

export default function DetailsStep() {
  const { floorPlan, name, setName, preferences, setPreferences, setRooms } = useDraft();
  const { colors } = useAppTheme();
  const [analyzing, setAnalyzing] = useState(false);

  const inputStyle = [
    styles.input,
    typography.body,
    { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border },
  ];

  const next = async () => {
    if (!floorPlan) return router.back();
    setAnalyzing(true);
    try {
      setRooms(await clsr.analyzeFloorPlan(floorPlan));
      router.push('/new/rooms');
    } catch (e) {
      Alert.alert('Could not read the floor plan', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <FlowScreen
      step={2}
      title="Set the mood"
      subtitle="Pick a style and budget. CLSR furnishes every room to match."
      footer={
        <Button
          title={analyzing ? 'Reading your floor plan…' : 'Detect rooms'}
          icon="scan-outline"
          loading={analyzing}
          disabled={!name.trim()}
          onPress={next}
        />
      }>
      <View>
        <SectionHeader title="Project name" />
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Downtown loft"
          placeholderTextColor={colors.textFaint}
          style={inputStyle}
          returnKeyType="done"
          maxLength={60}
        />
      </View>

      <View>
        <SectionHeader title="Design style" />
        <View style={styles.grid}>
          {(Object.keys(DESIGN_STYLES) as DesignStyle[]).map((key) => {
            const style = DESIGN_STYLES[key];
            const selected = preferences.style === key;
            return (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setPreferences({ style: key })}
                style={[
                  styles.styleCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: selected ? colors.accent : colors.border,
                    borderWidth: selected ? 2 : 1,
                  },
                ]}>
                <View style={styles.swatches}>
                  {style.swatches.map((c) => (
                    <View key={c} style={[styles.swatch, { backgroundColor: c }]} />
                  ))}
                  {selected && <Ionicons name="checkmark-circle" size={20} color={colors.accent} style={styles.check} />}
                </View>
                <AppText variant="label">{style.label}</AppText>
                <AppText variant="caption" numberOfLines={2}>
                  {style.description}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View>
        <SectionHeader title="Budget" />
        <View style={[styles.segment, { backgroundColor: colors.surfaceMuted }]}>
          {(Object.keys(BUDGET_TIERS) as BudgetTier[]).map((key) => {
            const selected = preferences.budget === key;
            return (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setPreferences({ budget: key })}
                style={[styles.segmentItem, selected && { backgroundColor: colors.surface }]}>
                <AppText variant="label" color={selected ? 'text' : 'textMuted'}>
                  {BUDGET_TIERS[key].label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
        <AppText variant="caption" style={styles.hint}>
          {BUDGET_TIERS[preferences.budget].description}
        </AppText>
      </View>

      <View>
        <SectionHeader title="Notes for the designer (optional)" />
        <TextInput
          value={preferences.notes ?? ''}
          onChangeText={(notes) => setPreferences({ notes })}
          placeholder="Home office in bedroom 2, lots of plants, pet friendly…"
          placeholderTextColor={colors.textFaint}
          style={[inputStyle, styles.multiline]}
          multiline
          maxLength={500}
        />
      </View>
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  multiline: { minHeight: 100, textAlignVertical: 'top' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.md },
  styleCard: { width: '48%', padding: spacing.md, borderRadius: radius.lg, gap: 2 },
  swatches: { flexDirection: 'row', gap: 4, marginBottom: spacing.sm, alignItems: 'center' },
  swatch: { width: 22, height: 22, borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.15)' },
  check: { marginLeft: 'auto' },
  segment: { flexDirection: 'row', padding: 4, borderRadius: radius.pill },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radius.pill },
  hint: { marginTop: spacing.sm },
});
