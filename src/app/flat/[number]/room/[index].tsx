import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { describeError, type Piece, type Project, type Room } from '@/api';
import { FRAME_ASPECT, FrameImage, HotspotLayer } from '@/components/frame';
import { AppText, Badge, Button, EmptyState, IconButton, SectionHeader } from '@/components/ui';
import { formatEGP } from '@/lib/format';
import { roomHotspots, type Hotspot, type HotspotTarget } from '@/lib/hotspots';
import { useResource } from '@/lib/useResource';
import { useApi } from '@/store/server';
import { radius, spacing, useAppTheme } from '@/theme';

export default function RoomScreen() {
  const { number, index } = useLocalSearchParams<{ number: string; index: string }>();
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
          <ActivityIndicator color={colors.textMuted} />
        )}
      </View>
    );
  }

  return <RoomView project={flat.data} room={room} />;
}

function RoomView({ project, room }: { project: Project; room: Room }) {
  const api = useApi();
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const height = width / FRAME_ASPECT;
  const [page, setPage] = useState(0);
  const [showDots, setShowDots] = useState(true);
  const [selected, setSelected] = useState<Hotspot>();

  const hotspotsByView = useMemo(() => room.views.map((v) => roomHotspots(room, v.camera, FRAME_ASPECT)), [room]);
  const view = room.views[page];
  const subtotal = project.costs.rooms.find((c) => c.room === room.index)?.subtotal;
  const groups = useMemo(() => groupPieces(room.pieces), [room]);

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
          title: room.title,
          headerRight: () => (
            <IconButton
              plain
              icon={showDots ? 'radio-button-on' : 'radio-button-off'}
              accessibilityLabel={showDots ? 'Hide hotspots' : 'Show hotspots'}
              onPress={() => setShowDots((s) => !s)}
            />
          ),
        }}
      />
      <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
        <View style={{ height }}>
          <FlatList
            data={room.views}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(v) => v.stem}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            onMomentumScrollEnd={(e: NativeSyntheticEvent<NativeScrollEvent>) =>
              setPage(Math.round(e.nativeEvent.contentOffset.x / width))
            }
            renderItem={({ item, index: i }) => (
              <View style={{ width, height }}>
                <FrameImage api={api} number={project.number} room={room} view={item} width={width} height={height} />
                {showDots && (
                  <HotspotLayer
                    hotspots={hotspotsByView[i]}
                    width={width}
                    height={height}
                    selectedId={selected?.id}
                    onPress={setSelected}
                  />
                )}
              </View>
            )}
          />
        </View>

        <View style={styles.pad}>
          <View style={styles.viewBar}>
            <AppText variant="caption" style={styles.flex}>
              {view.camera.wall ? `${view.camera.wall} wall` : view.stem} · {view.lens} mm
            </AppText>
            {room.views.length > 1 && (
              <View style={styles.dots}>
                {room.views.map((v, i) => (
                  <View key={v.stem} style={[styles.pageDot, { backgroundColor: i === page ? colors.text : colors.border }]} />
                ))}
              </View>
            )}
          </View>

          <View style={styles.summary}>
            <AppText variant="title">{room.title}</AppText>
            <AppText variant="caption">
              {room.area_m2} m²{subtotal != null ? ` · ${formatEGP(subtotal)}` : ''}
              {project.costs.estimated ? ' · estimate' : ''}
            </AppText>
            <AppText variant="caption" color="textMuted">
              Tap a dot on the photo to change that piece, the floor or the walls.
            </AppText>
          </View>

          <View>
            <SectionHeader title="In this room" />
            <View style={[styles.list, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              {[...groups.entries()].map(([asset, pieces], i) => (
                <Pressable
                  key={asset}
                  onPress={() => pieces[0].swappable && openGroup(asset)}
                  style={({ pressed }) => [
                    styles.item,
                    i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
                    pressed && { opacity: 0.7 },
                  ]}>
                  <View style={[styles.swatch, { backgroundColor: pieces[0].colour }]} />
                  <AppText variant="body" style={styles.flex}>
                    {pieces[0].name}
                    {pieces.length > 1 ? ` ×${pieces.length}` : ''}
                  </AppText>
                  <AppText variant="label">{formatEGP(pieces.reduce((s, p) => s + p.price, 0))}</AppText>
                </Pressable>
              ))}
            </View>
          </View>
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

/** What a tapped hotspot refers to. The pickers behind "Change" come next. */
function HotspotSheet({ room, hotspot, onClose }: { room: Room; hotspot?: Hotspot; onClose: () => void }) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={!!hotspot} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={onClose} accessibilityLabel="Close" />
      <View style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        <View style={[styles.grabber, { backgroundColor: colors.border }]} />
        {hotspot && <SheetBody room={room} target={hotspot.target} label={hotspot.label} />}
        <Button title="Choose a replacement" icon="swap-horizontal" disabled onPress={() => {}} />
        <AppText variant="caption" style={styles.center}>
          Picker with thumbnails and prices is the next step.
        </AppText>
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
        <AppText variant="overline">Furniture · {target.asset.replace(/_/g, ' ')}</AppText>
        <AppText variant="title">
          {pieces[0]?.name ?? label}
          {pieces.length > 1 ? ` ×${pieces.length}` : ''}
        </AppText>
        {pieces.length > 1 && (
          <AppText variant="caption">A change here applies to all {pieces.length} in this room.</AppText>
        )}
        <View style={styles.row}>
          <View style={[styles.swatchLarge, { backgroundColor: pieces[0]?.colour, borderColor: colors.border }]} />
          <AppText variant="body" style={styles.flex}>
            {pieces[0]?.colour}
          </AppText>
          <AppText variant="heading">{formatEGP(total)}</AppText>
        </View>
        <Badge label="Estimated price" tone="warning" />
      </View>
    );
  }
  if (target.kind === 'dressing') {
    const d = room.dressing.find((x) => x.name === target.piece);
    return (
      <View style={styles.sheetBody}>
        <AppText variant="overline">Styling · {d?.kind}</AppText>
        <AppText variant="title">{d?.label ?? label}</AppText>
        <AppText variant="caption" numberOfLines={2}>
          {d?.current.split('/').pop()}
          {d?.frame ? ` · ${d.frame} frame` : ''}
        </AppText>
      </View>
    );
  }
  return (
    <View style={styles.sheetBody}>
      <AppText variant="overline">Finish</AppText>
      <View style={styles.row}>
        <Ionicons name={target.kind === 'floor' ? 'grid-outline' : 'color-fill-outline'} size={22} color={colors.text} />
        <AppText variant="title">{target.kind === 'floor' ? 'Floor' : 'Walls'}</AppText>
      </View>
      <AppText variant="caption">
        {room.title} · {room.area_m2} m². Finishes are priced per m².
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', textAlign: 'center' },
  content: { paddingBottom: spacing.xxl * 2 },
  pad: { padding: spacing.xl, gap: spacing.xl },
  viewBar: { flexDirection: 'row', alignItems: 'center', marginTop: -spacing.md },
  dots: { flexDirection: 'row', gap: 6 },
  pageDot: { width: 7, height: 7, borderRadius: radius.pill },
  summary: { gap: spacing.xs },
  list: { borderWidth: 1, borderRadius: radius.lg, overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  swatch: { width: 14, height: 14, borderRadius: 7 },
  swatchLarge: { width: 28, height: 28, borderRadius: 14, borderWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  backdrop: { flex: 1 },
  sheet: { padding: spacing.xl, paddingTop: spacing.md, gap: spacing.lg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl },
  grabber: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center' },
  sheetBody: { gap: spacing.sm },
});
