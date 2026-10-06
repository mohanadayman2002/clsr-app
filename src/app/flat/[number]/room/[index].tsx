import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { describeError, type Piece, type Project, type Room } from '@/api';
import { FRAME_ASPECT, FrameImage, HotspotLayer } from '@/components/frame';
import { FloorPlan } from '@/components/plan';
import { AppText, Badge, Button, EmptyState, IconButton, Leader, PressableScale, SectionHeader } from '@/components/ui';
import { formatEGP } from '@/lib/format';
import { roomHotspots, type Hotspot, type HotspotTarget } from '@/lib/hotspots';
import { useResource } from '@/lib/useResource';
import { useApi } from '@/store/server';
import { fonts, radius, spacing, typography, useAppTheme } from '@/theme';

export default function RoomScreen() {
  const { number, index, view } = useLocalSearchParams<{ number: string; index: string; view?: string }>();
  const n = Number(number);
  const api = useApi();
  const { colors } = useAppTheme();
  const flat = useResource(() => api.project(n), `${n}`);
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
  return <RoomView key={room.index} project={flat.data} room={room} initialView={initialView} />;
}

function RoomView({ project, room, initialView }: { project: Project; room: Room; initialView: number }) {
  const api = useApi();
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const height = width / FRAME_ASPECT;
  const pager = useRef<FlatList>(null);
  const [page, setPage] = useState(initialView);
  const [showDots, setShowDots] = useState(true);
  const [selected, setSelected] = useState<Hotspot>();

  const hotspotsByView = useMemo(() => room.views.map((v) => roomHotspots(room, v.camera, FRAME_ASPECT)), [room]);
  const view = room.views[page];
  const subtotal = project.costs.rooms.find((c) => c.room === room.index)?.subtotal;
  const groups = useMemo(() => groupPieces(room.pieces), [room]);
  const position = project.rooms.findIndex((r) => r.index === room.index);
  const next = project.rooms[(position + 1) % project.rooms.length];

  const goTo = (i: number) => {
    pager.current?.scrollToOffset({ offset: i * width, animated: true });
    setPage(i);
  };

  const openGroup = (asset: string) => {
    const pieces = groups.get(asset)!;
    setSelected({
      id: `furniture:${asset}`,
      label: pieces[0].name,
      u: 0,
      v: 0,
      z: 0,
      target: { kind: 'furniture', asset, items: pieces.map((p) => p.key) },
    });
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <IconButton
              icon={showDots ? 'scan' : 'scan-outline'}
              accessibilityLabel={showDots ? 'Hide hotspots' : 'Show hotspots'}
              onPress={() => setShowDots((s) => !s)}
            />
          ),
        }}
      />
      <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
        <View style={{ width, height }}>
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
                <FrameImage api={api} number={project.number} room={room} view={item} width={width} height={height} />
                {showDots && (
                  <HotspotLayer hotspots={hotspotsByView[i]} width={width} height={height} selectedId={selected?.id} onPress={setSelected} />
                )}
              </View>
            )}
          />
          <LinearGradient colors={['rgba(15,14,12,0.75)', 'rgba(15,14,12,0)']} style={styles.topShade} pointerEvents="none" />
          <Pressable
            onPress={() => room.views.length > 1 && goTo((page + 1) % room.views.length)}
            accessibilityLabel="Plan of the flat. Tap for the next view."
            style={[styles.minimap, { backgroundColor: colors.overlay, borderColor: 'rgba(242,237,228,0.15)' }]}>
            <FloorPlan rooms={project.rooms} width={92} highlightRoom={room.index} activeView={view?.stem} compact />
          </Pressable>
        </View>

        {room.views.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.viewStrip}>
            {room.views.map((v, i) => {
              const active = i === page;
              return (
                <Pressable key={v.stem} onPress={() => goTo(i)} style={[styles.viewTab, active && { borderBottomColor: colors.accent }]}>
                  <Text style={[typography.overline, { color: active ? colors.text : colors.textFaint }]}>
                    {String(i + 1).padStart(2, '0')} · {v.camera.wall ?? 'view'} · {v.lens}mm
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        <View style={styles.body}>
          <View style={styles.titleBlock}>
            <AppText variant="overline" color="accent">
              Room {String(room.index).padStart(2, '0')} · flat № {project.number}
            </AppText>
            <AppText variant="display">{room.title}</AppText>
            <AppText variant="mono" color="textMuted">
              {room.area_m2} m²{subtotal != null ? `  ·  ${formatEGP(subtotal)}` : ''}
              {project.costs.estimated ? '  ·  est.' : ''}
            </AppText>
            <Text style={[typography.caption, { color: colors.textMuted, fontFamily: fonts.displayItalic, marginTop: spacing.sm }]}>
              Tap a glowing point to change that piece, the floor or the walls.
            </Text>
          </View>

          <View>
            <SectionHeader title="Furnished with" action={<AppText variant="overline">{room.pieces.length} pcs</AppText>} />
            <View style={styles.specs}>
              {[...groups.entries()].map(([asset, pieces]) => (
                <Pressable
                  key={asset}
                  onPress={() => pieces[0].swappable && openGroup(asset)}
                  style={({ pressed }) => [styles.spec, pressed && { opacity: 0.6 }]}>
                  <View style={[styles.swatch, { backgroundColor: pieces[0].colour, borderColor: colors.border }]} />
                  <View style={styles.flex}>
                    <Leader
                      label={`${pieces[0].name}${pieces.length > 1 ? ` ×${pieces.length}` : ''}`}
                      value={pieces.reduce((s, p) => s + p.price, 0).toLocaleString('en-US')}
                    />
                  </View>
                </Pressable>
              ))}
            </View>
          </View>

          {next && next.index !== room.index && (
            <PressableScale
              onPress={() => router.replace(`/flat/${project.number}/room/${next.index}`)}
              style={[styles.next, { borderColor: colors.border }]}>
              <View style={styles.flex}>
                <AppText variant="overline">Next room</AppText>
                <AppText variant="title">{next.title}</AppText>
              </View>
              <View style={[styles.nextArrow, { backgroundColor: colors.text }]}>
                <Ionicons name="arrow-forward" size={20} color={colors.onPrimary} />
              </View>
            </PressableScale>
          )}
        </View>
      </ScrollView>

      <HotspotSheet room={room} hotspot={selected} onClose={() => setSelected(undefined)} />
    </>
  );
}

function groupPieces(pieces: Piece[]) {
  const groups = new Map<string, Piece[]>();
  for (const p of pieces) groups.set(p.asset, [...(groups.get(p.asset) ?? []), p]);
  return groups;
}

/** What a tapped hotspot refers to. The pickers behind "Choose a replacement" come next. */
function HotspotSheet({ room, hotspot, onClose }: { room: Room; hotspot?: Hotspot; onClose: () => void }) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={!!hotspot} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <View
        style={[
          styles.sheet,
          { backgroundColor: colors.surface, borderColor: colors.border, paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.sm },
        ]}>
        <View style={[styles.grabber, { backgroundColor: colors.border }]} />
        {hotspot && <SheetBody room={room} target={hotspot.target} label={hotspot.label} />}
        <Button title="Choose a replacement" icon="swap-horizontal" variant="accent" disabled onPress={() => {}} />
        <Text style={[typography.caption, styles.centerText, { color: colors.textFaint, fontFamily: fonts.displayItalic }]}>
          The picker, with thumbnails and prices, is the next step.
        </Text>
      </View>
    </Modal>
  );
}

function SheetBody({ room, target, label }: { room: Room; target: HotspotTarget; label: string }) {
  const { colors } = useAppTheme();
  if (target.kind === 'furniture') {
    const pieces = room.pieces.filter((p) => target.items.includes(p.key));
    const total = pieces.reduce((s, p) => s + p.price, 0);
    return (
      <View style={styles.sheetBody}>
        <View style={styles.sheetHead}>
          <View style={[styles.swatchLarge, { backgroundColor: pieces[0]?.colour, borderColor: colors.border }]} />
          <View style={styles.flex}>
            <AppText variant="overline">Furniture · {target.asset.replace(/_/g, ' ')}</AppText>
            <AppText variant="display">
              {pieces[0]?.name ?? label}
              {pieces.length > 1 ? <Text style={{ fontFamily: fonts.displayItalic, color: colors.accent }}> ×{pieces.length}</Text> : null}
            </AppText>
          </View>
        </View>
        {pieces.length > 1 && <Leader label={`${pieces.length} pieces, each`} value={formatEGP(pieces[0].price)} muted />}
        <Leader label={pieces.length > 1 ? 'All of them' : 'Price'} value={formatEGP(total)} strong />
        <View style={styles.badges}>
          <Badge label="Estimate" tone="warning" />
          <Badge label={pieces[0]?.colour ?? ''} />
          {pieces.length > 1 && <Badge label="Changes all together" tone="accent" />}
        </View>
      </View>
    );
  }
  if (target.kind === 'dressing') {
    const d = room.dressing.find((x) => x.name === target.piece);
    return (
      <View style={styles.sheetBody}>
        <AppText variant="overline">Styling · {d?.kind}</AppText>
        <AppText variant="display">{d?.label ?? label}</AppText>
        <AppText variant="mono" color="textMuted" numberOfLines={2}>
          {d?.current.split('/').pop()}
          {d?.frame ? `  ·  ${d.frame} frame` : ''}
        </AppText>
      </View>
    );
  }
  return (
    <View style={styles.sheetBody}>
      <AppText variant="overline">Finish</AppText>
      <View style={styles.sheetHead}>
        <View style={[styles.finishIcon, { borderColor: colors.accent }]}>
          <Ionicons name={target.kind === 'floor' ? 'grid-outline' : 'color-fill-outline'} size={22} color={colors.accent} />
        </View>
        <AppText variant="display">{target.kind === 'floor' ? 'Floor' : 'Walls'}</AppText>
      </View>
      <AppText variant="mono" color="textMuted">
        {room.title} · {room.area_m2} m² · priced per m²
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerText: { textAlign: 'center' },
  content: { paddingBottom: spacing.xxl * 2 },
  topShade: { position: 'absolute', top: 0, left: 0, right: 0, height: 110 },
  minimap: { position: 'absolute', right: spacing.md, bottom: spacing.md, padding: 6, borderRadius: radius.md, borderWidth: 1 },
  viewStrip: { paddingHorizontal: spacing.xl, gap: spacing.lg },
  viewTab: { paddingVertical: spacing.md, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  body: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, gap: spacing.xxl },
  titleBlock: { gap: spacing.xs },
  specs: { gap: spacing.md },
  spec: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  swatch: { width: 12, height: 12, borderRadius: 6, borderWidth: 1 },
  next: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  nextArrow: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(8,7,6,0.6)' },
  sheet: {
    padding: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.lg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
  },
  grabber: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center' },
  sheetBody: { gap: spacing.md },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  swatchLarge: { width: 48, height: 48, borderRadius: 24, borderWidth: 1 },
  finishIcon: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
