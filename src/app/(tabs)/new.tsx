import Ionicons from '@expo/vector-icons/Ionicons';
import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ClsrError, describeError, type Health, type Style, type Tier } from '@/api';
import { StatusLine } from '@/components/status';
import { AppText, Button, PressableScale, SectionHeader, type IconName } from '@/components/ui';
import { notify } from '@/lib/confirm';
import { useResource } from '@/lib/useResource';
import { rememberBuild, useStartedBuilds } from '@/store/builds';
import { useServer } from '@/store/server';
import { fonts, radius, shadow, spacing, TAB_BAR_CLEARANCE, typography, useAppTheme } from '@/theme';

interface PickedPlan {
  uri: string;
  name: string;
  mimeType: string;
}

const TIERS: { value: Tier; label: string }[] = [
  { value: 'budget', label: 'Budget' },
  { value: 'comfort', label: 'Comfort' },
  { value: 'premium', label: 'Premium' },
];

/** Why a new flat can't start right now, from /api/health. Undefined when it can. */
function blocker(health: Health | undefined, state: string): { title: string; body: string } | undefined {
  if (state === 'unauthorized') return { title: 'Token rejected', body: 'The server did not accept the access token. Check it on the Studio link screen.' };
  if (!health)
    return state === 'checking' || state === 'unknown'
      ? { title: 'Checking the studio…', body: 'Asking the server what it can do right now.' }
      : { title: 'The studio is unreachable', body: 'New flats need the studio PC. Check it is on and that this phone is on ZeroTier.' };
  if (!health.blender) return { title: 'The renderer is off', body: 'Blender is not running on the studio PC, so nothing can be built or changed.' };
  if (!health.coohom)
    return {
      title: 'The plan reader is off',
      body: 'Reading a plan drives Coohom on the studio PC, and it isn’t open right now, so new flats can’t start. Existing flats can still be viewed and changed.',
    };
  return undefined;
}

/** Upload a plan with a mood and a budget, then follow the build. */
export default function NewFlatScreen() {
  const { api, reachability, health, checkHealth } = useServer();
  const { colors } = useAppTheme();
  const styles_ = useResource(api ? () => api.styles() : null, 'styles');
  const { builds, reload: reloadBuilds } = useStartedBuilds();
  const [plan, setPlan] = useState<PickedPlan>();
  const [style, setStyle] = useState<string>();
  const [mode, setMode] = useState<'tier' | 'amount'>('tier');
  const [tier, setTier] = useState<Tier>('comfort');
  const [amount, setAmount] = useState('');
  const [sending, setSending] = useState(false);

  useFocusEffect(
    useCallback(() => {
      reloadBuilds();
      checkHealth();
    }, [reloadBuilds, checkHealth]),
  );

  const block = blocker(health, reachability.state);
  const budget = Number(amount.replace(/[^\d]/g, ''));
  const budgetOk = mode === 'tier' || budget >= 1000;
  const ready = !block && !!plan && !!style && budgetOk && !!api;

  const pickImage = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (r.canceled) return;
    const a = r.assets[0];
    const mimeType = a.mimeType ?? 'image/png';
    setPlan({ uri: a.uri, name: a.fileName ?? `plan.${mimeType.includes('jpeg') ? 'jpg' : 'png'}`, mimeType });
  };

  const pickFile = async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: ['image/png', 'image/jpeg'], copyToCacheDirectory: true });
    if (r.canceled) return;
    const a = r.assets[0];
    setPlan({ uri: a.uri, name: a.name, mimeType: a.mimeType ?? 'image/png' });
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return notify('Camera access needed', 'Allow camera access in Settings to photograph a plan.');
    const r = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
    if (r.canceled) return;
    const a = r.assets[0];
    setPlan({ uri: a.uri, name: a.fileName ?? 'plan.jpg', mimeType: a.mimeType ?? 'image/jpeg' });
  };

  const submit = async () => {
    if (!api || !plan || !style) return;
    setSending(true);
    try {
      const res = await api.upload({ ...plan, style, ...(mode === 'tier' ? { tier } : { budget }) });
      await rememberBuild({ number: res.number, style, started: Date.now() });
      setPlan(undefined);
      router.push(`/build/${res.number}`);
    } catch (e) {
      notify(e instanceof ClsrError && e.kind === 'busy' ? 'The studio is busy' : 'Upload failed', describeError(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <StatusLine />
          <View>
            <AppText variant="hero">New</AppText>
            <Text style={[typography.hero, { fontFamily: fonts.displayItalic, color: colors.accent }]}>flat.</Text>
          </View>
          <AppText variant="caption">Upload a 2D plan, pick a mood and a budget. Building takes 20–40 minutes; you can leave and come back.</AppText>
        </View>

        {builds.length > 0 && (
          <View>
            <SectionHeader title="Building now" />
            <View style={styles.builds}>
              {builds.map((b) => (
                <PressableScale key={b.number} onPress={() => router.push(`/build/${b.number}`)} style={[styles.buildRow, shadow, { backgroundColor: colors.surface }]}>
                  <Ionicons name="construct-outline" size={20} color={colors.accent} />
                  <View style={styles.flex}>
                    <AppText variant="label">Flat № {b.number}</AppText>
                    <AppText variant="caption">
                      {b.style.replace(/_/g, ' ')} · started {new Date(b.started).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </AppText>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
                </PressableScale>
              ))}
            </View>
          </View>
        )}

        {block && (
          <View style={[styles.block, { backgroundColor: colors.warningSoft }]}>
            <Ionicons name="pause-circle" size={26} color={colors.warning} />
            <View style={styles.flex}>
              <AppText variant="label">{block.title}</AppText>
              <AppText variant="caption">{block.body}</AppText>
            </View>
            <Button title="Check" variant="secondary" compact onPress={checkHealth} />
          </View>
        )}
        {!block && health && !health.ollama && (
          <View style={[styles.block, { backgroundColor: colors.surfaceMuted }]}>
            <Ionicons name="information-circle-outline" size={22} color={colors.textMuted} />
            <AppText variant="caption" style={styles.flex}>
              The design model (Ollama) is off, so the flat will be laid out with rules instead of the model. It still builds.
            </AppText>
          </View>
        )}

        <View style={block ? styles.dimmed : undefined} pointerEvents={block ? 'none' : 'auto'}>
          <SectionHeader index="01" title="The plan" />
          {plan ? (
            <View style={[styles.planCard, shadow, { backgroundColor: colors.surface }]}>
              <Image source={{ uri: plan.uri }} style={styles.planImage} contentFit="contain" />
              <View style={styles.planRow}>
                <AppText variant="label" numberOfLines={1} style={styles.flex}>
                  {plan.name}
                </AppText>
                <Button title="Change" variant="ghost" compact onPress={() => setPlan(undefined)} />
              </View>
            </View>
          ) : (
            <View style={styles.sources}>
              <Source icon="image-outline" label="Photos" onPress={pickImage} />
              <Source icon="document-outline" label="Files" onPress={pickFile} />
              {Platform.OS !== 'web' && <Source icon="camera-outline" label="Camera" onPress={takePhoto} />}
            </View>
          )}

          <SectionHeader index="02" title="The mood" />
          {styles_.data ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.moods}>
              {styles_.data.map((s) => (
                <Mood key={s.key} style={s} selected={style === s.key} onPress={() => setStyle(s.key)} />
              ))}
            </ScrollView>
          ) : styles_.error ? (
            <AppText variant="caption" color="danger">
              {describeError(styles_.error)}
            </AppText>
          ) : (
            <ActivityIndicator color={colors.accent} />
          )}

          <SectionHeader index="03" title="The budget" />
          <View style={[styles.segment, { backgroundColor: colors.surfaceMuted }]}>
            {[...TIERS.map((t) => ({ key: t.value, label: t.label })), { key: 'amount', label: 'Exact EGP' }].map((o) => {
              const on = o.key === 'amount' ? mode === 'amount' : mode === 'tier' && tier === o.key;
              return (
                <Pressable
                  key={o.key}
                  onPress={() => {
                    if (o.key === 'amount') setMode('amount');
                    else {
                      setMode('tier');
                      setTier(o.key as Tier);
                    }
                  }}
                  style={[styles.segmentItem, on && { backgroundColor: colors.surface }]}>
                  <Text style={[typography.label, { color: on ? colors.text : colors.textMuted, fontSize: 13 }]}>{o.label}</Text>
                </Pressable>
              );
            })}
          </View>
          {mode === 'amount' && (
            <View style={styles.amount}>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                placeholder="500000"
                placeholderTextColor={colors.textFaint}
                keyboardType="number-pad"
                accessibilityLabel="Budget in EGP"
                style={[styles.input, typography.mono, { fontSize: 18, color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
              />
              <AppText variant="caption">{budget > 0 && budget < 1000 ? 'The studio ignores budgets under EGP 1,000.' : 'Total for the whole flat, in EGP.'}</AppText>
            </View>
          )}
        </View>

        <Button title="Build this flat" icon="hammer-outline" variant="accent" loading={sending} disabled={!ready} onPress={submit} />
        {!block && !ready && (
          <AppText variant="caption" style={styles.centerText}>
            {!plan ? 'Choose a plan image.' : !style ? 'Pick a mood.' : !budgetOk ? 'Enter a budget of at least EGP 1,000.' : ''}
          </AppText>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Source({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.flex}>
      <PressableScale onPress={onPress} style={[styles.source, { borderColor: colors.accent, backgroundColor: colors.accentSoft }]}>
        <Ionicons name={icon} size={26} color={colors.accent} />
        <AppText variant="label" style={{ color: colors.accent }}>
          {label}
        </AppText>
      </PressableScale>
    </View>
  );
}

function Mood({ style, selected, onPress }: { style: Style; selected: boolean; onPress: () => void }) {
  const { colors } = useAppTheme();
  return (
    <PressableScale onPress={onPress} style={[styles.mood, shadow, { backgroundColor: colors.surface, borderColor: selected ? colors.accent : colors.surface }]}>
      <View style={styles.moodSwatches}>
        {style.swatch.slice(0, 5).map((hex, i) => (
          <View key={`${hex}-${i}`} style={[styles.moodBand, { backgroundColor: hex }]} />
        ))}
      </View>
      <View style={styles.moodBody}>
        <View style={styles.moodTitle}>
          <AppText variant="label" style={styles.flex}>
            {style.label}
          </AppText>
          {style.label_ar ? <AppText variant="caption">{style.label_ar}</AppText> : null}
        </View>
        {style.thesis ? (
          <AppText variant="caption" numberOfLines={3}>
            {style.thesis}
          </AppText>
        ) : null}
      </View>
      {selected && (
        <View style={[styles.moodTick, { backgroundColor: colors.accent }]}>
          <Ionicons name="checkmark" size={14} color={colors.onAccent} />
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centerText: { textAlign: 'center' },
  content: { padding: spacing.xl, paddingTop: spacing.lg, gap: spacing.xl, paddingBottom: TAB_BAR_CLEARANCE },
  header: { gap: spacing.md },
  builds: { gap: spacing.sm },
  buildRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg },
  block: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg },
  dimmed: { opacity: 0.45 },
  sources: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
  source: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xl, borderRadius: radius.lg, borderWidth: 1.5, borderStyle: 'dashed' },
  planCard: { borderRadius: radius.lg, overflow: 'hidden', marginBottom: spacing.xl },
  planImage: { width: '100%', height: 220 },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md },
  bleed: { marginHorizontal: -spacing.xl, marginBottom: spacing.xl },
  moods: { paddingHorizontal: spacing.xl, gap: spacing.md, paddingBottom: spacing.md },
  mood: { width: 200, borderRadius: radius.lg, borderWidth: 2.5, overflow: 'hidden' },
  moodSwatches: { flexDirection: 'row', height: 56 },
  moodBand: { flex: 1 },
  moodBody: { padding: spacing.md, gap: spacing.xs },
  moodTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  moodTick: { position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  segment: { flexDirection: 'row', padding: 4, borderRadius: radius.pill },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radius.pill },
  amount: { gap: spacing.xs, marginTop: spacing.md },
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
});
