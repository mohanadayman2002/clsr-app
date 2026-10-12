import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { artPath, describeError, swatchPath, type ClsrApi, type Dressing, type Piece, type Room } from '@/api';
import { artChange, colourChange, dressingModelChange, finishChange, swapChange, target, type QueuedChange } from '@/lib/changes';
import { formatEGP } from '@/lib/format';
import type { HotspotTarget } from '@/lib/hotspots';
import { finishArea } from '@/lib/rooms';
import { useResource } from '@/lib/useResource';
import { radius, roomTint, spacing, typography, useAppTheme } from '@/theme';

import { AppText, Badge, Button } from './ui';

interface Props {
  api: ClsrApi;
  flat: number;
  room: Room;
  roomName: string;
  /** What was tapped; undefined closes the sheet. */
  subject?: HotspotTarget;
  queue: QueuedChange[];
  onPick: (item: QueuedChange) => void;
  onClose: () => void;
}

const tick = () => {
  if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
};

/**
 * Bottom sheet listing what can replace the tapped thing: other models or
 * colours for furniture, prints and frames, lamps/plants/rugs, or floor and
 * wall finishes. Picks go into the queue; nothing is sent until "Render".
 */
export function PickerSheet({ api, flat, room, roomName, subject, queue, onPick, onClose }: Props) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  return (
    <Modal visible={!!subject} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <View style={[styles.sheet, { backgroundColor: colors.surface, maxHeight: height * 0.86, paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        <View style={[styles.grabber, { backgroundColor: colors.border }]} />
        {subject && (
          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            {subject.kind === 'furniture' && (
              <FurniturePicker api={api} flat={flat} room={room} pieces={room.pieces.filter((p) => subject.items.includes(p.key))} queue={queue} onPick={onPick} />
            )}
            {subject.kind === 'dressing' && <DressingPicker api={api} flat={flat} room={room} piece={subject.piece} queue={queue} onPick={onPick} />}
            {(subject.kind === 'floor' || subject.kind === 'wall') && (
              <FinishPicker api={api} room={room} roomName={roomName} surface={subject.kind} queue={queue} onPick={onPick} />
            )}
          </ScrollView>
        )}
        <Button title="Done" variant="primary" onPress={onClose} style={styles.done} />
      </View>
    </Modal>
  );
}

function FurniturePicker({ api, flat, room, pieces, queue, onPick }: { api: ClsrApi; flat: number; room: Room; pieces: Piece[]; queue: QueuedChange[]; onPick: (q: QueuedChange) => void }) {
  const { colors } = useAppTheme();
  const [tab, setTab] = useState<'model' | 'colour'>('model');
  const first = pieces[0];
  const asset = first?.asset ?? '';
  const catalog = useResource(() => api.catalog(asset, flat), `${flat}|${asset}`);
  const colours = useResource(tab === 'colour' ? () => api.colours() : null, tab);
  if (!first) return null;

  const queuedModel = queue.find((q) => q.target === target.model(room.index, asset));
  const queuedColour = queue.find((q) => q.target === target.colour(room.index, asset));
  const pickedModel = queuedModel?.change.kind === 'swap' ? queuedModel.change.model : undefined;
  const pickedColour = queuedColour?.change.kind === 'colour' ? queuedColour.change.colour : undefined;
  const total = pieces.reduce((s, p) => s + p.price, 0);

  return (
    <>
      <View style={styles.head}>
        <View style={[styles.headSwatch, { backgroundColor: first.colour, borderColor: colors.border }]} />
        <View style={styles.flex}>
          <AppText variant="overline">{asset.replace(/_/g, ' ')}</AppText>
          <AppText variant="title">
            {first.name}
            {pieces.length > 1 ? ` ×${pieces.length}` : ''}
          </AppText>
          <AppText variant="mono" color="textMuted">
            {pieces.length > 1 ? `${formatEGP(first.price)} each · ${formatEGP(total)}` : formatEGP(total)} · est.
          </AppText>
        </View>
      </View>
      {pieces.length > 1 && <AppText variant="caption">A change here applies to all {pieces.length} in this room.</AppText>}

      <Segmented
        value={tab}
        options={[
          { value: 'model', label: 'Other models' },
          { value: 'colour', label: 'Recolour' },
        ]}
        onChange={setTab}
      />

      {tab === 'model' ? (
        <Loaded resource={catalog}>
          {(c) => (
            <View style={styles.grid}>
              {c.models.map((m) => {
                const current = m.id === first.model;
                const picked = m.id === pickedModel;
                const delta = (m.price - first.price) * pieces.length;
                return (
                  <Tile
                    key={m.id}
                    image={m.thumb ? api.imageSource(m.thumb) : undefined}
                    title={m.name}
                    subtitle={current ? formatEGP(m.price) : `${formatEGP(m.price)} · ${delta >= 0 ? '+' : '−'}${formatEGP(Math.abs(delta)).replace('EGP ', '')}`}
                    badge={current ? 'Current' : m.source === 'pack' ? 'This mood' : undefined}
                    selected={picked}
                    disabled={current}
                    onPress={() => {
                      tick();
                      onPick(swapChange(room, pieces, m));
                    }}
                  />
                );
              })}
            </View>
          )}
        </Loaded>
      ) : (
        <Loaded resource={colours}>
          {(list) => (
            <View style={styles.swatches}>
              {list.map((c) => (
                <Pressable
                  key={c.hex + c.name}
                  accessibilityRole="button"
                  accessibilityLabel={c.name}
                  onPress={() => {
                    tick();
                    onPick(colourChange(room, pieces, c));
                  }}
                  style={styles.swatchItem}>
                  <View style={[styles.swatchDot, { backgroundColor: c.hex, borderColor: pickedColour === c.hex ? colors.accent : colors.border, borderWidth: pickedColour === c.hex ? 3 : 1 }]} />
                  <Text style={[typography.caption, { color: colors.textMuted }]} numberOfLines={1}>
                    {c.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </Loaded>
      )}
    </>
  );
}

function DressingPicker({ api, flat, room, piece, queue, onPick }: { api: ClsrApi; flat: number; room: Room; piece: string; queue: QueuedChange[]; onPick: (q: QueuedChange) => void }) {
  const { colors } = useAppTheme();
  const d = room.dressing.find((x) => x.name === piece);
  const isArt = d?.kind === 'art';
  const options = useResource(d ? () => (isArt ? api.dressing('art', flat) : api.dressing('model', flat, d.role)) : null, `${flat}|${piece}`);
  if (!d) return null;

  const queued = queue.find((q) => q.target === target.dressing(room.index, d.name));
  const choice = queued?.change.kind === 'dressing' ? queued.change.choice : {};

  return (
    <>
      <View style={styles.head}>
        {isArt ? (
          <Image source={api.imageSource(artPath(d.current))} style={[styles.headThumb, { backgroundColor: colors.surfaceMuted }]} contentFit="cover" />
        ) : (
          <View style={[styles.headThumb, styles.center, { backgroundColor: colors.surfaceMuted }]}>
            <Ionicons name="leaf-outline" size={24} color={colors.textMuted} />
          </View>
        )}
        <View style={styles.flex}>
          <AppText variant="overline">{isArt ? 'Print' : d.role.replace(/_/g, ' ')}</AppText>
          <AppText variant="title">{d.label}</AppText>
          {isArt && d.frame && (
            <AppText variant="mono" color="textMuted">
              {d.frame} frame
            </AppText>
          )}
        </View>
      </View>

      <Loaded resource={options}>
        {(cat) => (
          <>
            {isArt && cat.frames && cat.frames.length > 0 && (
              <View style={styles.frameRow}>
                <AppText variant="overline">Frame</AppText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                  {cat.frames.map((f) => {
                    const on = (choice.frame ?? d.frame) === f.id;
                    return (
                      <Pressable
                        key={f.id}
                        onPress={() => {
                          tick();
                          onPick(artChange(room, d, { frame: f }, queued));
                        }}
                        style={[styles.chip, { backgroundColor: on ? colors.accent : colors.surfaceMuted }]}>
                        <Text style={[typography.label, { color: on ? colors.onAccent : colors.text }]}>{f.label}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            )}
            <View style={styles.grid}>
              {cat.options.map((o) => {
                const current = o.id === d.current;
                const picked = isArt ? choice.art === o.id : choice.model === o.id;
                const thumb = o.thumb ?? (isArt ? artPath(o.id) : null);
                return (
                  <Tile
                    key={o.id}
                    image={thumb ? api.imageSource(thumb) : undefined}
                    title={o.label}
                    subtitle={o.price != null ? formatEGP(o.price) : o.pack}
                    badge={current ? 'Current' : undefined}
                    selected={picked}
                    disabled={current}
                    onPress={() => {
                      tick();
                      onPick(isArt ? artChange(room, d, { art: o }, queued) : dressingModelChange(room, d as Dressing, o));
                    }}
                  />
                );
              })}
            </View>
          </>
        )}
      </Loaded>
    </>
  );
}

function FinishPicker({ api, room, roomName, surface, queue, onPick }: { api: ClsrApi; room: Room; roomName: string; surface: 'floor' | 'wall'; queue: QueuedChange[]; onPick: (q: QueuedChange) => void }) {
  const finishes = useResource(() => api.finishes(surface), surface);
  const queued = queue.find((q) => q.target === target.finish(room.index, surface));
  const picked = queued?.change.kind === 'finish' ? queued.change.finish : undefined;
  const area = finishArea(room, surface);
  const tint = roomTint(room.label);

  return (
    <>
      <View style={styles.head}>
        <View style={[styles.headThumb, styles.center, { backgroundColor: tint.fill }]}>
          <Ionicons name={surface === 'floor' ? 'grid-outline' : 'color-fill-outline'} size={24} color={tint.ink} />
        </View>
        <View style={styles.flex}>
          <AppText variant="overline">{roomName}</AppText>
          <AppText variant="title">{surface === 'floor' ? 'Floor' : 'Walls'}</AppText>
          <AppText variant="mono" color="textMuted">
            ≈ {Math.round(area)} m² {surface === 'wall' ? 'of wall (estimated)' : ''}
          </AppText>
        </View>
      </View>
      <Loaded resource={finishes}>
        {(list) => (
          <View style={styles.grid}>
            {list.map((f) => (
              <Tile
                key={f.id}
                image={f.kind === 'scan' ? api.imageSource(swatchPath(f.id)) : undefined}
                fill={f.kind === 'paint' ? f.hex : undefined}
                title={f.label}
                subtitle={f.rate ? `${formatEGP(f.rate)}/m² · ≈ ${formatEGP(f.rate * area)}` : f.kind}
                badge={f.kind === 'paint' ? 'Paint' : undefined}
                selected={picked === f.id}
                onPress={() => {
                  tick();
                  onPick(finishChange(room, surface, f));
                }}
              />
            ))}
          </View>
        )}
      </Loaded>
    </>
  );
}

// ---- Pieces ----------------------------------------------------------------

function Loaded<T>({ resource, children }: { resource: { data?: T; error?: unknown; loading: boolean; reload: () => void }; children: (data: T) => ReactNode }) {
  const { colors } = useAppTheme();
  if (resource.data) return <>{children(resource.data)}</>;
  if (resource.error)
    return (
      <View style={styles.state}>
        <AppText variant="caption" color="danger">
          {describeError(resource.error)}
        </AppText>
        <Button title="Try again" variant="secondary" compact onPress={resource.reload} />
      </View>
    );
  return (
    <View style={styles.state}>
      <ActivityIndicator color={colors.accent} />
    </View>
  );
}

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.segment, { backgroundColor: colors.surfaceMuted }]}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={[styles.segmentItem, on && { backgroundColor: colors.surface }]}>
            <Text style={[typography.label, { color: on ? colors.text : colors.textMuted }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Tile({
  image,
  fill,
  title,
  subtitle,
  badge,
  selected,
  disabled,
  onPress,
}: {
  image?: { uri: string; headers?: Record<string, string> };
  fill?: string;
  title: string;
  subtitle?: string;
  badge?: string;
  selected?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={title}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        { borderColor: selected ? colors.accent : colors.border, borderWidth: selected ? 2.5 : 1, opacity: pressed ? 0.8 : 1 },
      ]}>
      <View style={[styles.tileImage, { backgroundColor: fill ?? colors.surfaceMuted }]}>
        {image && <Image source={image} style={StyleSheet.absoluteFill} contentFit="cover" transition={120} />}
        {!image && !fill && <Ionicons name="cube-outline" size={26} color={colors.textFaint} />}
        {badge && (
          <View style={styles.tileBadge}>
            <Badge label={badge} tone={badge === 'Current' ? 'neutral' : 'accent'} />
          </View>
        )}
        {selected && (
          <View style={[styles.tick, { backgroundColor: colors.accent }]}>
            <Ionicons name="checkmark" size={14} color={colors.onAccent} />
          </View>
        )}
      </View>
      <View style={styles.tileBody}>
        <Text style={[typography.label, { color: colors.text }]} numberOfLines={2}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[typography.mono, { color: colors.textMuted, fontSize: 11 }]} numberOfLines={2}>
            {subtitle}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(43,34,56,0.35)' },
  sheet: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingTop: spacing.md },
  grabber: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.sm },
  body: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg, gap: spacing.lg },
  done: { marginHorizontal: spacing.xl, marginTop: spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headSwatch: { width: 56, height: 56, borderRadius: 28, borderWidth: 1 },
  headThumb: { width: 56, height: 56, borderRadius: radius.md, overflow: 'hidden' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.md },
  tile: { width: '48%', borderRadius: radius.md, overflow: 'hidden' },
  tileImage: { aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  tileBadge: { position: 'absolute', top: 6, left: 6 },
  tick: { position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tileBody: { padding: spacing.sm, gap: 2 },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  swatchItem: { width: 64, alignItems: 'center', gap: 4 },
  swatchDot: { width: 48, height: 48, borderRadius: 24 },
  frameRow: { gap: spacing.sm },
  chips: { gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill },
  segment: { flexDirection: 'row', padding: 4, borderRadius: radius.pill },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radius.pill },
  state: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl },
});
