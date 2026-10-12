import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ClsrError, describeError, type ClsrApi, type Quality } from '@/api';
import { notify } from '@/lib/confirm';
import { formatEGP } from '@/lib/format';
import { sum } from '@/lib/rooms';
import { useFlatStudio } from '@/store/studio';
import { radius, shadow, spacing, typography, useAppTheme } from '@/theme';

import { AppText, Button, LiveDot } from './ui';

const QUALITIES: { value: Quality; label: string; hint: string }[] = [
  { value: 'draft', label: 'Draft', hint: '~30 s · just the view you are on' },
  { value: 'preview', label: 'Preview', hint: 'a few minutes · every view of the room' },
  { value: 'final', label: 'Final', hint: '~7 min a frame · best quality' },
];

const BUSY = 'The server renders one job at a time, for every flat, and something else is rendering now. Your changes are kept: try again when it finishes.';

function useElapsed(startedSec?: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!startedSec) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [startedSec]);
  if (!startedSec) return undefined;
  const s = Math.max(0, Math.round(now / 1000 - startedSec));
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
}

/** Floating bar: render progress, a "done" note, or the queue of picked changes. */
export function ChangesTray({ api, flat, view }: { api: ClsrApi; flat: number; view?: string }) {
  const studio = useFlatStudio(flat);
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const elapsed = useElapsed(studio.running ? studio.job?.started : undefined);

  // Let the "done" note fade on its own.
  const { finished, dismissFinished } = studio;
  useEffect(() => {
    if (!finished) return;
    const t = setTimeout(dismissFinished, 6000);
    return () => clearTimeout(t);
  }, [finished, dismissFinished]);

  const bottom = Math.max(insets.bottom, spacing.md);
  let content: ReactNode = null;

  if (studio.running && studio.job) {
    const job = studio.job;
    const frames = job.frames?.length ?? 0;
    const done = job.done_frames ?? 0;
    content = (
      <View style={[styles.bar, shadow, { backgroundColor: colors.surface }]}>
        <LiveDot color={colors.accent} />
        <View style={styles.flex}>
          <AppText variant="label" numberOfLines={1}>
            Rendering{job.stage ? ` · ${job.stage}` : ''}
            {frames ? ` · ${done}/${frames} frames` : ''}
          </AppText>
          <AppText variant="caption" numberOfLines={1}>
            {job.model_name ?? job.kind ?? 'Working'}
            {elapsed ? ` · ${elapsed}` : ''}
          </AppText>
          {frames > 0 && (
            <View style={[styles.track, { backgroundColor: colors.surfaceMuted }]}>
              <View style={[styles.fill, { backgroundColor: colors.accent, width: `${Math.round((done / frames) * 100)}%` }]} />
            </View>
          )}
        </View>
        {studio.queue.length > 0 && (
          <Pressable onPress={() => setOpen(true)} style={[styles.count, { backgroundColor: colors.accentSoft }]}>
            <Text style={[typography.label, { color: colors.accent }]}>{studio.queue.length} queued</Text>
          </Pressable>
        )}
      </View>
    );
  } else if (studio.finished && studio.queue.length === 0) {
    content = (
      <Pressable onPress={studio.dismissFinished} style={[styles.bar, shadow, { backgroundColor: colors.successSoft }]}>
        <Ionicons name="checkmark-circle" size={22} color={colors.success} />
        <View style={styles.flex}>
          <AppText variant="label">{studio.finished.status === 'error' ? 'Render failed' : 'Rendered'}</AppText>
          <AppText variant="caption" numberOfLines={1}>
            {studio.finished.status === 'error' ? (studio.finished.message ?? 'See the studio for details') : 'Frames refreshed with your changes'}
          </AppText>
        </View>
      </Pressable>
    );
  } else if (studio.queue.length > 0) {
    const delta = sum(studio.queue.map((q) => q.delta ?? 0));
    content = (
      <Pressable onPress={() => setOpen(true)} style={[styles.bar, shadow, { backgroundColor: colors.accent }]}>
        <View style={[styles.badge, { backgroundColor: colors.onAccent }]}>
          <Text style={[typography.label, { color: colors.accent }]}>{studio.queue.length}</Text>
        </View>
        <View style={styles.flex}>
          <Text style={[typography.label, { color: colors.onAccent }]}>
            {studio.queue.length === 1 ? '1 change' : `${studio.queue.length} changes`} ready
          </Text>
          {delta !== 0 && (
            <Text style={[typography.mono, { color: colors.onAccent, opacity: 0.85, fontSize: 12 }]}>
              {delta > 0 ? '+' : '−'}
              {formatEGP(Math.abs(delta))} est.
            </Text>
          )}
        </View>
        <Text style={[typography.label, { color: colors.onAccent }]}>Review</Text>
        <Ionicons name="chevron-up" size={18} color={colors.onAccent} />
      </Pressable>
    );
  }

  return (
    <>
      {content && (
        <View style={[styles.wrap, { bottom }]} pointerEvents="box-none">
          {content}
        </View>
      )}
      <ReviewSheet api={api} flat={flat} view={view} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function ReviewSheet({ api, flat, view, open, onClose }: { api: ClsrApi; flat: number; view?: string; open: boolean; onClose: () => void }) {
  const studio = useFlatStudio(flat);
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [quality, setQuality] = useState<Quality>('draft');
  const [sending, setSending] = useState(false);
  const target = view ?? studio.lastView;
  const delta = sum(studio.queue.map((q) => q.delta ?? 0));

  const render = async () => {
    setSending(true);
    try {
      await studio.render(quality, target);
      onClose();
    } catch (e) {
      notify(e instanceof ClsrError && e.kind === 'busy' ? 'The server is busy' : 'Could not start the render', e instanceof ClsrError && e.kind === 'busy' ? BUSY : describeError(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <View style={[styles.sheet, { backgroundColor: colors.surface, maxHeight: height * 0.86, paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        <View style={[styles.grabber, { backgroundColor: colors.border }]} />
        <ScrollView contentContainerStyle={styles.sheetBody}>
          <View style={styles.row}>
            <AppText variant="title" style={styles.flex}>
              Your changes
            </AppText>
            {studio.queue.length > 0 && <Button title="Clear" variant="ghost" compact onPress={studio.clearQueue} />}
          </View>

          {studio.queue.length === 0 && <AppText variant="caption">Nothing queued. Tap a dot on a photo to pick a change.</AppText>}

          {studio.queue.map((q) => (
            <View key={q.target} style={[styles.item, { borderColor: colors.border }]}>
              <View style={[styles.itemThumb, { backgroundColor: q.swatch ?? colors.surfaceMuted }]}>
                {q.thumb ? <Image source={api.imageSource(q.thumb)} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
              </View>
              <View style={styles.flex}>
                <AppText variant="label" numberOfLines={2}>
                  {q.title}
                </AppText>
                {q.detail && (
                  <AppText variant="caption" numberOfLines={2}>
                    {q.detail}
                  </AppText>
                )}
                {q.delta != null && q.delta !== 0 && (
                  <AppText variant="mono" color={q.delta > 0 ? 'accent' : 'success'}>
                    {q.delta > 0 ? '+' : '−'}
                    {formatEGP(Math.abs(q.delta))} est.
                  </AppText>
                )}
              </View>
              <Pressable accessibilityLabel={`Remove ${q.title}`} hitSlop={8} onPress={() => studio.dequeue(q.target)}>
                <Ionicons name="close-circle" size={24} color={colors.textFaint} />
              </Pressable>
            </View>
          ))}

          {studio.queue.length > 0 && (
            <>
              {delta !== 0 && (
                <AppText variant="mono" color="textMuted">
                  Bill {delta > 0 ? 'up' : 'down'} by about {formatEGP(Math.abs(delta))} (estimate)
                </AppText>
              )}
              <AppText variant="overline">Quality</AppText>
              <View style={styles.qualities}>
                {QUALITIES.map((q) => {
                  const on = q.value === quality;
                  return (
                    <Pressable
                      key={q.value}
                      onPress={() => setQuality(q.value)}
                      style={[styles.quality, { borderColor: on ? colors.accent : colors.border, backgroundColor: on ? colors.accentSoft : colors.surface }]}>
                      <AppText variant="label" style={{ color: on ? colors.accent : colors.text }}>
                        {q.label}
                      </AppText>
                      <AppText variant="caption">{q.hint}</AppText>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}
        </ScrollView>
        {studio.queue.length > 0 && (
          <View style={styles.footer}>
            {studio.running && (
              <AppText variant="caption" style={styles.centerText}>
                Waiting for the current render to finish before this can be sent.
              </AppText>
            )}
            <Button
              title={`Render ${studio.queue.length === 1 ? '1 change' : `${studio.queue.length} changes`}`}
              icon="sparkles"
              variant="accent"
              loading={sending}
              disabled={studio.running}
              onPress={render}
            />
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  centerText: { textAlign: 'center' },
  wrap: { position: 'absolute', left: spacing.lg, right: spacing.lg },
  bar: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.lg },
  badge: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  count: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill },
  track: { height: 4, borderRadius: 2, overflow: 'hidden', marginTop: 6 },
  fill: { height: '100%' },
  backdrop: { flex: 1, backgroundColor: 'rgba(43,34,56,0.35)' },
  sheet: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingTop: spacing.md },
  grabber: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.sm },
  sheetBody: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg, gap: spacing.md },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: spacing.md },
  itemThumb: { width: 48, height: 48, borderRadius: radius.sm, overflow: 'hidden' },
  qualities: { gap: spacing.sm },
  quality: { borderWidth: 1.5, borderRadius: radius.md, padding: spacing.md, gap: 2 },
  footer: { paddingHorizontal: spacing.xl, gap: spacing.sm },
});
