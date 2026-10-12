import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { describeError, type BuildStatus } from '@/api';
import { AppText, Button, LiveDot, SectionHeader } from '@/components/ui';
import { findBuild, forgetBuild } from '@/store/builds';
import { useApi, useServer } from '@/store/server';
import { fonts, radius, shadow, spacing, typography, useAppTheme } from '@/theme';

const POLL_MS = 2500;
const STAGES: { key: string; label: string }[] = [
  { key: 'queued', label: 'Queued' },
  { key: 'capturing', label: 'Reading the plan' },
  { key: 'measuring', label: 'Measuring' },
  { key: 'building', label: 'Building, furnishing, rendering' },
  { key: 'done', label: 'Done' },
];
const TERMINAL = new Set(['done', 'error', 'awaiting_measurement']);

const clock = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m ${String(s % 60).padStart(2, '0')}s`;
};

/** Live progress of a new flat: the server's stage and its real build log. */
export default function BuildScreen() {
  const { number } = useLocalSearchParams<{ number: string }>();
  const n = Number(number);
  const api = useApi();
  const { host } = useServer();
  const { colors } = useAppTheme();
  const [status, setStatus] = useState<BuildStatus>();
  const [error, setError] = useState<unknown>();
  const [startedAt, setStartedAt] = useState<number>();
  const [now, setNow] = useState(() => Date.now());
  const logRef = useRef<ScrollView>(null);
  const terminal = status ? TERMINAL.has(status.status) : false;

  useEffect(() => {
    findBuild(n).then((b) => setStartedAt(b?.started ?? Date.now()));
  }, [n]);

  // Poll until the build reaches an end state; keep going through network blips.
  useEffect(() => {
    if (terminal) return;
    let alive = true;
    const poll = async () => {
      try {
        const s = await api.status(n);
        if (!alive) return;
        setStatus(s);
        setError(undefined);
        if (s.status === 'done' || s.status === 'error') forgetBuild(n);
      } catch (e) {
        if (alive) setError(e);
      }
    };
    poll();
    const t = setInterval(poll, POLL_MS);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [api, n, terminal]);

  useEffect(() => {
    if (terminal) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [terminal]);

  const stageIndex = status ? STAGES.findIndex((s) => s.key === status.status) : -1;

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <AppText variant="overline" color="accent">
          {status?.style ? status.style.replace(/_/g, ' ') : 'New flat'}
        </AppText>
        <AppText variant="display">Flat № {n}</AppText>
        <View style={styles.row}>
          {!terminal && <LiveDot color={colors.accent} />}
          <AppText variant="mono" color="textMuted">
            {status ? status.status.replace(/_/g, ' ') : 'asking the studio…'}
            {startedAt && !terminal ? ` · ${clock(now - startedAt)}` : ''}
          </AppText>
        </View>
      </View>

      {status?.status === 'done' && (
        <View style={[styles.banner, { backgroundColor: colors.successSoft }]}>
          <Ionicons name="checkmark-circle" size={26} color={colors.success} />
          <View style={styles.flex}>
            <AppText variant="label">The flat is ready</AppText>
            <AppText variant="caption">Furnished, lit and photographed.</AppText>
          </View>
          <Button title="Open" variant="accent" compact onPress={() => router.replace(`/flat/${n}`)} />
        </View>
      )}
      {status?.status === 'error' && (
        <View style={[styles.banner, { backgroundColor: colors.dangerSoft }]}>
          <Ionicons name="alert-circle" size={26} color={colors.danger} />
          <View style={styles.flex}>
            <AppText variant="label">The build stopped</AppText>
            <AppText variant="caption">{status.error || 'See the log below.'}</AppText>
          </View>
        </View>
      )}
      {status?.status === 'awaiting_measurement' && (
        <View style={[styles.banner, { backgroundColor: colors.warningSoft }]}>
          <Ionicons name="resize" size={24} color={colors.warning} />
          <View style={styles.flex}>
            <AppText variant="label">Waiting for a scale</AppText>
            <AppText variant="caption">This run needs someone to choose the plan’s scale. Open {host.replace(/^https?:\/\//, '')}/studio in a browser to pick it.</AppText>
          </View>
        </View>
      )}
      {!!error && !status && (
        <View style={[styles.banner, { backgroundColor: colors.dangerSoft }]}>
          <AppText variant="caption" style={styles.flex}>
            {describeError(error)}
          </AppText>
        </View>
      )}

      <View style={[styles.stages, shadow, { backgroundColor: colors.surface }]}>
        {STAGES.map((s, i) => {
          const done = status?.status === 'done' || (stageIndex >= 0 && i < stageIndex);
          const active = i === stageIndex && !terminal;
          return (
            <View key={s.key} style={styles.stage}>
              <View
                style={[
                  styles.stageDot,
                  { backgroundColor: done ? colors.success : active ? colors.accent : colors.surfaceMuted },
                ]}>
                {done ? <Ionicons name="checkmark" size={13} color="#fff" /> : active ? <ActivityIndicator size="small" color="#fff" /> : null}
              </View>
              <AppText variant="label" color={done || active ? 'text' : 'textFaint'}>
                {s.label}
              </AppText>
            </View>
          );
        })}
      </View>

      <View>
        <SectionHeader title="Build log" action={!!error && !!status && <AppText variant="caption" color="danger">reconnecting…</AppText>} />
        <View style={[styles.log, { backgroundColor: colors.text }]}>
          <ScrollView ref={logRef} nestedScrollEnabled onContentSizeChange={() => logRef.current?.scrollToEnd({ animated: false })}>
            {(status?.log ?? []).map((line, i) => (
              <Text key={i} style={[typography.mono, styles.logLine, { color: '#EDE6F5' }]} selectable>
                {line}
              </Text>
            ))}
            {!status?.log?.length && <Text style={[typography.mono, styles.logLine, { color: '#A99FB2' }]}>No log yet.</Text>}
          </ScrollView>
        </View>
        <Text style={[typography.caption, styles.note, { color: colors.textMuted }]}>
          A flat takes 20–40 minutes. You can leave this screen; it’s listed under New flat until it finishes.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  content: { padding: spacing.xl, gap: spacing.xl, paddingBottom: spacing.xxl * 2 },
  header: { gap: spacing.xs },
  banner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg },
  stages: { borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  stage: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stageDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  log: { borderRadius: radius.lg, padding: spacing.md, height: 360 },
  logLine: { fontSize: 11, lineHeight: 16 },
  note: { marginTop: spacing.sm, fontFamily: fonts.displayItalic },
});
