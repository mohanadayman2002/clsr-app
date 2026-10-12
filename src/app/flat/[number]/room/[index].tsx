import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { describeError, type ClsrApi, type Project, type Room } from '@/api';
import { FRAME_ASPECT, FrameImage, HotspotLayer } from '@/components/frame';
import { PickerSheet } from '@/components/picker';
import { FloorPlan } from '@/components/plan';
import { ChangesTray } from '@/components/tray';
import { AppText, Button, EmptyState, IconButton, Leader, PressableScale, RoomChip, SectionHeader } from '@/components/ui';
import { hotspotFor } from '@/lib/changes';
import { formatEGP } from '@/lib/format';
import { roomHotspots, type HotspotTarget } from '@/lib/hotspots';
import { groupPieces, roomNames, sum } from '@/lib/rooms';
import { useResource } from '@/lib/useResource';
import { useApi } from '@/store/server';
import { useFlatStudio } from '@/store/studio';
import { fonts, radius, roomTint, shadow, spacing, typography, useAppTheme } from '@/theme';

/** Room of a flat: swipeable photos with tappable dots, prices, and room tabs. */
export default function RoomScreen() {
  const { number, index, view } = useLocalSearchParams<{ number: string; index: string; view?: string }>();
  const n = Number(number);
  const api = useApi();
  const { colors } = useAppTheme();
  const studio = useFlatStudio(n);
  // Refetch after every finished render, keeping the old data on screen meanwhile.
  const flat = useResource(() => api.project(n), `${n}|${studio.version}`, true);
  const room = flat.data?.rooms.find((r) => r.index === Number(index));

  if (!flat.data || !room) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        {flat.error || flat.data ? (
          <EmptyState
            icon="alert-circle-outline"
            title="Can't open this room"
            message={flat.error ? describeError(flat.error) : 'It is not part of this flat.'}
            action={<Button title="Try again" variant="secondary" compact onPress={flat.reload} />}
          />
        ) : (
          <ActivityIndicator color={colors.accent} />
        )}
      </View>
    );
  }

  const initialView = Math.min(Math.max(Number(view) || 0, 0), Math.max(room.views.length - 1, 0));
  return <RoomView key={room.index} api={api} project={flat.data} room={room} initialView={initialView} />;
}

function RoomView({ api, project, room, initialView }: { api: ClsrApi; project: Project; room: Room; initialView: number }) {
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const height = width / FRAME_ASPECT;
  const pager = useRef<FlatList>(null);
  const studio = useFlatStudio(project.number);
  const [page, setPage] = useState(initialView);
  const [showDots, setShowDots] = useState(true);
  const [subject, setSubject] = useState<HotspotTarget>();

  const names = useMemo(() => roomNames(project.rooms), [project.rooms]);
  const name = names.get(room.index) ?? room.title;
  const hotspotsByView = useMemo(() => room.views.map((v) => roomHotspots(room, v.camera, FRAME_ASPECT)), [room]);
  const groups = useMemo(() => groupPieces(room.pieces), [room]);
  const view = room.views[page];
  const subtotal = project.costs.rooms.find((c) => c.room === room.index)?.subtotal;
  const queuedHere = studio.queue.filter((q) => q.room === room.index);
  const queuedIds = useMemo(() => new Set(queuedHere.map((q) => q.hotspotId)), [queuedHere]);

  const { setLastView } = studio;
  useEffect(() => {
    if (view) setLastView(view.stem);
    // setLastView is a fresh closure each render; the stem is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view?.stem]);

  const goTo = (i: number) => {
    pager.current?.scrollToOffset({ offset: i * width, animated: true });
    setPage(i);
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <IconButton icon={showDots ? 'scan' : 'scan-outline'} accessibilityLabel={showDots ? 'Hide dots' : 'Show dots'} onPress={() => setShowDots((s) => !s)} />
          ),
        }}
      />
      <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
        <View style={{ width, height }}>
          {room.views.length === 0 ? (
            <View style={[styles.center, { backgroundColor: colors.surfaceMuted }]}>
              <AppText variant="caption">No photos of this room.</AppText>
            </View>
          ) : (
            <FlatList
              ref={pager}
              data={room.views}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={initialView}
              keyExtractor={(v) => v.stem}
              getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
              onMomentumScrollEnd={(e: NativeSyntheticEvent<NativeScrollEvent>) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
              renderItem={({ item, index: i }) => (
                <View style={{ width, height }}>
                  <FrameImage api={api} number={project.number} room={room} view={item} width={width} height={height} bust={studio.bustAt} />
                  {showDots && (
                    <HotspotLayer hotspots={hotspotsByView[i]} width={width} height={height} queuedIds={queuedIds} onPress={(h) => setSubject(h.target)} />
                  )}
                </View>
              )}
            />
          )}
          <Pressable
            onPress={() => room.views.length > 1 && goTo((page + 1) % room.views.length)}
            accessibilityLabel="Plan of the flat. Tap for the next view."
            style={[styles.minimap, shadow, { backgroundColor: colors.surface }]}>
            <FloorPlan rooms={project.rooms} width={92} highlightRoom={room.index} activeView={view?.stem} compact />
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.roomTabs}>
          {project.rooms.map((r) => {
            const on = r.index === room.index;
            const tint = roomTint(r.label);
            return (
              <Pressable
                key={r.index}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                onPress={() => !on && router.setParams({ index: String(r.index), view: '0' })}
                style={[styles.roomTab, { backgroundColor: on ? tint.ink : tint.fill }]}>
                <Text style={[typography.label, { color: on ? '#FFFFFF' : tint.ink }]}>{names.get(r.index)}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {room.views.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.viewStrip}>
            {room.views.map((v, i) => {
              const on = i === page;
              return (
                <Pressable key={v.stem} onPress={() => goTo(i)} style={[styles.viewTab, { backgroundColor: on ? colors.accent : colors.surfaceMuted }]}>
                  <Text style={[typography.overline, { color: on ? colors.onAccent : colors.textMuted }]}>
                    {String(i + 1).padStart(2, '0')} · {v.camera.wall ?? 'view'} · {v.lens}mm
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        <View style={styles.body}>
          <View style={styles.titleBlock}>
            <View style={styles.chipRow}>
              <RoomChip label={room.label} />
              <AppText variant="overline" color="textFaint">
                flat № {project.number}
              </AppText>
            </View>
            <AppText variant="display">{name}</AppText>
            <AppText variant="mono" color="textMuted">
              {room.area_m2} m²{subtotal != null ? `  ·  ${formatEGP(subtotal)}` : ''}
              {project.costs.estimated ? '  ·  estimate' : ''}
            </AppText>
            <Text style={[typography.caption, styles.hint, { color: colors.textMuted }]}>
              {studio.running
                ? 'The server is rendering. You can keep picking changes; they render when it is free.'
                : 'Tap a dot on the photo to change that piece, the floor or the walls.'}
            </Text>
          </View>

          <View style={styles.surfaces}>
            {(['floor', 'wall'] as const).map((s) => (
              <Button
                key={s}
                title={s === 'floor' ? 'Change floor' : 'Change walls'}
                icon={queuedIds.has(hotspotFor.finish(s)) ? 'checkmark-circle' : s === 'floor' ? 'grid-outline' : 'color-fill-outline'}
                variant="secondary"
                compact
                style={styles.flex}
                onPress={() => setSubject({ kind: s })}
              />
            ))}
          </View>

          <View>
            <SectionHeader title="Furnished with" action={<AppText variant="overline">{room.pieces.length} pcs</AppText>} />
            <View style={styles.specs}>
              {[...groups.entries()].map(([asset, pieces]) => {
                const queued = queuedIds.has(hotspotFor.furniture(asset));
                const total = sum(pieces.map((p) => p.price));
                return (
                  <Pressable
                    key={asset}
                    disabled={!pieces[0].swappable}
                    onPress={() => setSubject({ kind: 'furniture', asset, items: pieces.map((p) => p.key) })}
                    style={({ pressed }) => [styles.spec, pressed && { opacity: 0.6 }]}>
                    <View style={[styles.swatch, { backgroundColor: pieces[0].colour, borderColor: queued ? colors.accent : colors.border, borderWidth: queued ? 2 : 1 }]} />
                    <View style={styles.flex}>
                      <Leader label={`${pieces[0].name}${pieces.length > 1 ? ` ×${pieces.length}` : ''}`} value={total.toLocaleString('en-US')} />
                      {pieces.length > 1 && (
                        <AppText variant="mono" color="textFaint" style={styles.each}>
                          {pieces[0].price.toLocaleString('en-US')} each
                        </AppText>
                      )}
                    </View>
                  </Pressable>
                );
              })}
              {room.dressing.map((d) => (
                <Pressable key={d.name} onPress={() => setSubject({ kind: 'dressing', piece: d.name })} style={({ pressed }) => [styles.spec, pressed && { opacity: 0.6 }]}>
                  <Ionicons name={d.kind === 'art' ? 'image-outline' : 'leaf-outline'} size={14} color={queuedIds.has(hotspotFor.dressing(d.name)) ? colors.accent : colors.textMuted} />
                  <AppText variant="body" style={styles.flex}>
                    {d.label}
                  </AppText>
                  <AppText variant="mono" color="textFaint">
                    styling
                  </AppText>
                </Pressable>
              ))}
            </View>
            {subtotal != null && (
              <View style={styles.subtotal}>
                <Leader label="Room total" value={formatEGP(subtotal)} strong />
              </View>
            )}
          </View>

          <PressableScale onPress={() => router.push(`/flat/${project.number}/bill`)} style={[styles.billLink, { borderColor: colors.border }]}>
            <Ionicons name="receipt-outline" size={20} color={colors.accent} />
            <AppText variant="label" style={styles.flex}>
              Whole-flat bill · {formatEGP(project.costs.total)}
            </AppText>
            <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
          </PressableScale>
        </View>
      </ScrollView>

      <ChangesTray api={api} flat={project.number} view={view?.stem} />
      <PickerSheet
        api={api}
        flat={project.number}
        room={room}
        roomName={name}
        subject={subject}
        queue={queuedHere}
        onPick={studio.enqueue}
        onClose={() => setSubject(undefined)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: 140 },
  minimap: { position: 'absolute', right: spacing.md, bottom: spacing.md, padding: 6, borderRadius: radius.md },
  roomTabs: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, gap: spacing.sm },
  roomTab: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill },
  viewStrip: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, gap: spacing.sm },
  viewTab: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.pill },
  body: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, gap: spacing.xl },
  titleBlock: { gap: spacing.xs },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xs },
  hint: { fontFamily: fonts.displayItalic, marginTop: spacing.sm },
  surfaces: { flexDirection: 'row', gap: spacing.sm },
  specs: { gap: spacing.md },
  spec: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  swatch: { width: 14, height: 14, borderRadius: 7 },
  each: { fontSize: 11, textAlign: 'right' },
  subtotal: { marginTop: spacing.lg },
  billLink: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg },
});
