import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { useState } from 'react';

import { ClsrError, describeError, type ClsrApi, type Job, type Project, type Room } from '@/api';
import { FRAME_ASPECT, FrameImage } from '@/components/frame';
import { FloorPlan } from '@/components/plan';
import { ChangesTray } from '@/components/tray';
import { AppText, Button, EmptyState, Leader, PressableScale, SectionHeader, Stamp } from '@/components/ui';
import { confirm, notify } from '@/lib/confirm';
import { capitalize, formatEGP } from '@/lib/format';
import { roomNames } from '@/lib/rooms';
import { useResource } from '@/lib/useResource';
import { useApi } from '@/store/server';
import { useFlatStudio } from '@/store/studio';
import { fonts, radius, roomTint, shadow, spacing, typography, useAppTheme } from '@/theme';

const CARD_WIDTH = 248;

export default function FlatScreen() {
  const { number } = useLocalSearchParams<{ number: string }>();
  const n = Number(number);
  const api = useApi();
  const { colors } = useAppTheme();
  const studio = useFlatStudio(n);
  // Refetch after every finished render, keeping the old data on screen meanwhile.
  const flat = useResource(() => api.project(n), `${n}|${studio.version}`, true);

  if (!flat.data) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        {flat.error ? (
          <EmptyState
            icon="cloud-offline-outline"
            title="Can't open this flat"
            message={describeError(flat.error)}
            action={<Button title="Try again" variant="secondary" compact onPress={flat.reload} />}
          />
        ) : (
          <ActivityIndicator color={colors.accent} />
        )}
      </View>
    );
  }

  return <FlatView project={flat.data} api={api} refreshing={flat.loading} onRefresh={flat.reload} />;
}

function FlatView({ project, api, refreshing, onRefresh }: { project: Project; api: ClsrApi; refreshing: boolean; onRefresh: () => void }) {
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const studio = useFlatStudio(project.number);
  const names = roomNames(project.rooms);
  const history = studio.jobState ? studio.history : project.history;
  const hero = findView(project, project.hero);
  const area = project.rooms.reduce((s, r) => s + r.area_m2, 0);
  const openRoom = (room: Room, view = 0) => router.push(`/flat/${project.number}/room/${room.index}?view=${view}`);

  return (
    <>
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textMuted} />}>
      <View style={{ width, height: width / FRAME_ASPECT + 90 }}>
        {hero && <FrameImage api={api} number={project.number} room={hero.room} view={hero.view} width={width} height={width / FRAME_ASPECT} bust={studio.bustAt} />}
        <LinearGradient
          colors={['rgba(255,248,240,0)', 'rgba(255,248,240,0)', colors.background]}
          locations={[0, 0.6, 0.86]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.heroCaption}>
          <AppText variant="overline" color="accent">
            Flat № {project.number}
          </AppText>
          <AppText variant="hero">{capitalize(project.style)}</AppText>
          <AppText variant="overline">
            {project.rooms.length} rooms · {area.toFixed(1)} m² · eye level {project.camera_height_m} m
          </AppText>
        </View>
      </View>

      <View style={styles.body}>
        <View>
          <SectionHeader index="01" title="Plan" />
          <View style={[styles.planWrap, shadow, { backgroundColor: colors.surface, borderColor: colors.surface }]}>
            <FloorPlan
              rooms={project.rooms}
              width={width - spacing.xl * 2 - spacing.md * 2}
              onRoomPress={(room) => openRoom(room)}
              onViewPress={(room, i) => openRoom(room, i)}
            />
          </View>
          <AppText variant="caption" style={styles.hint}>
            Tap a room, or a cone to stand where that camera stood.
          </AppText>
          {project.plans && project.plans.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.carousel}>
              {project.plans.map((p) => (
                <View key={p.key} style={[styles.planCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Image source={api.imageSource(p.url)} style={styles.planImage} contentFit="contain" transition={150} accessibilityLabel={p.label} />
                  <AppText variant="overline" style={styles.planLabel}>
                    {p.label}
                  </AppText>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        <View>
          <SectionHeader index="02" title="Rooms" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={CARD_WIDTH + spacing.md}
            decelerationRate="fast"
            style={styles.bleed}
            contentContainerStyle={styles.carousel}>
            {project.rooms.map((room) => (
              <RoomCard
                key={room.index}
                api={api}
                number={project.number}
                room={room}
                name={names.get(room.index) ?? room.title}
                bust={studio.bustAt}
                subtotal={project.costs.rooms.find((c) => c.room === room.index)?.subtotal}
                onPress={() => openRoom(room)}
              />
            ))}
          </ScrollView>
        </View>

        <View>
          <SectionHeader index="03" title="The bill" />
          <Receipt project={project} names={names} />
          <Button title="Itemised bill and tiers" icon="receipt-outline" variant="secondary" onPress={() => router.push(`/flat/${project.number}/bill`)} style={styles.billButton} />
        </View>

        {history.length > 0 && (
          <View>
            <SectionHeader index="04" title="Changes so far" />
            <History flat={project.number} history={history} />
          </View>
        )}
      </View>
    </ScrollView>
    <ChangesTray api={api} flat={project.number} />
    </>
  );
}

/** Rendered changes, newest first, each with Undo. Undo is itself a render, so it waits for a free server. */
function History({ flat, history }: { flat: number; history: Job[] }) {
  const { colors } = useAppTheme();
  const studio = useFlatStudio(flat);
  const [busyId, setBusyId] = useState<string>();

  const undo = async (job: Job) => {
    const ok = await confirm('Undo this change?', job.model_name ?? job.kind ?? 'This change', 'Undo');
    if (!ok) return;
    setBusyId(job.id);
    try {
      await studio.undo(job.id);
    } catch (e) {
      notify(e instanceof ClsrError && e.kind === 'busy' ? 'The server is busy' : 'Could not undo', describeError(e));
    } finally {
      setBusyId(undefined);
    }
  };

  return (
    <View style={styles.history}>
      {history.map((h) => (
        <View key={h.id} style={[styles.historyRow, { borderColor: colors.border }]}>
          <View style={[styles.historyDot, { backgroundColor: h.status === 'error' ? colors.danger : colors.success }]} />
          <View style={styles.flex}>
            <AppText variant="label" numberOfLines={2}>
              {h.model_name ?? h.kind ?? 'Change'}
            </AppText>
            <AppText variant="mono" color="textFaint">
              {[h.quality, h.finished ? new Date(h.finished * 1000).toLocaleString() : undefined, h.frames?.length ? `${h.frames.length} frames` : undefined]
                .filter(Boolean)
                .join(' · ')}
            </AppText>
          </View>
          <Button title="Undo" icon="arrow-undo" variant="ghost" compact loading={busyId === h.id} disabled={studio.running} onPress={() => undo(h)} />
        </View>
      ))}
    </View>
  );
}

function findView(project: Project, image: string) {
  for (const room of project.rooms) {
    const view = room.views.find((v) => v.image.replace(/\.png$/, '') === image || v.stem === image);
    if (view) return { room, view };
  }
  const room = project.rooms.find((r) => r.views.length);
  return room ? { room, view: room.views[0] } : undefined;
}

function RoomCard({
  api,
  number,
  room,
  name,
  bust,
  subtotal,
  onPress,
}: {
  api: ClsrApi;
  number: number;
  room: Room;
  name: string;
  bust?: number;
  subtotal?: number;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();
  const height = CARD_WIDTH / FRAME_ASPECT;
  return (
    <PressableScale onPress={onPress} style={[styles.roomCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.roomStripe, { backgroundColor: roomTint(room.label).ink }]} />
      <View style={{ width: CARD_WIDTH, height }}>
        {room.views[0] && <FrameImage api={api} number={number} room={room} view={room.views[0]} width={CARD_WIDTH} height={height} bust={bust} />}
        <Text style={[typography.overline, styles.roomViews, { color: colors.text, backgroundColor: colors.surface }]}>
          {room.views.length} {room.views.length === 1 ? 'view' : 'views'}
        </Text>
      </View>
      <View style={styles.roomBody}>
        <AppText variant="title" style={[styles.roomTitle, { color: roomTint(room.label).ink }]} numberOfLines={1}>
          {name}
        </AppText>
        <View style={styles.roomMeta}>
          <AppText variant="mono" color="textMuted">
            {room.area_m2} m²
          </AppText>
          {subtotal != null && (
            <AppText variant="mono" color="accent">
              {formatEGP(subtotal)}
            </AppText>
          )}
        </View>
      </View>
    </PressableScale>
  );
}

/** The bill as a printed receipt, stamped so an estimate never reads as a quote. */
function Receipt({ project, names }: { project: Project; names: Map<number, string> }) {
  const { colors } = useAppTheme();
  const { costs } = project;
  return (
    <View style={[styles.receipt, shadow, { backgroundColor: colors.surface, borderColor: colors.surface }]}>
      <View style={styles.receiptHead}>
        <View style={styles.flex}>
          <AppText variant="overline">Furnishing · {costs.tier}</AppText>
          <Text style={[typography.mono, { color: colors.textFaint, fontSize: 11 }]}>
            {costs.currency} · flat № {project.number}
          </Text>
        </View>
        <View style={styles.stamp}>
          {costs.estimated ? <Stamp lines={['Estimate', 'not a quotation']} /> : <Stamp lines={['Quoted']} tone="success" />}
        </View>
      </View>

      <View style={styles.lines}>
        {costs.rooms.map((r) => (
          <View key={r.room} style={styles.line}>
            <View style={[styles.lineDot, { backgroundColor: roomTint(r.title).ink }]} />
            <View style={styles.flex}>
              <Leader label={names.get(r.room) ?? r.title} value={Math.round(r.subtotal).toLocaleString('en-US')} />
            </View>
          </View>
        ))}
      </View>

      <View style={[styles.tear, { borderColor: colors.textFaint }]} />
      <Leader label="Total" value={formatEGP(costs.total)} strong />
      {costs.budget != null && <Leader label="Budget" value={formatEGP(costs.budget)} muted />}

      <Text style={[typography.caption, { color: colors.textMuted, fontFamily: fonts.displayItalic }]}>
        {costs.estimated
          ? costs.quoted_lines > 0
            ? `${costs.quoted_lines} line${costs.quoted_lines === 1 ? ' is' : 's are'} quoted; everything else is an estimate.`
            : 'Every line is an estimate until a supplier quotes it.'
          : 'Every line is quoted.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: 140 },
  planCard: { width: 220, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', marginBottom: spacing.md },
  planImage: { width: 220, height: 160 },
  planLabel: { padding: spacing.sm },
  billButton: { marginTop: spacing.md },
  history: { gap: spacing.md },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: spacing.md },
  historyDot: { width: 8, height: 8, borderRadius: 4 },
  heroCaption: { position: 'absolute', left: spacing.xl, right: spacing.xl, bottom: 0, gap: spacing.xs },
  body: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl, gap: spacing.xxl },
  job: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderRadius: radius.pill, paddingRight: spacing.lg, paddingLeft: spacing.sm, height: 44 },
  planWrap: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, padding: spacing.md },
  hint: { marginTop: spacing.sm, fontFamily: fonts.displayItalic },
  bleed: { marginHorizontal: -spacing.xl },
  carousel: { paddingHorizontal: spacing.xl, gap: spacing.md },
  roomCard: { width: CARD_WIDTH, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', marginBottom: spacing.lg },
  roomStripe: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 5, zIndex: 1 },
  line: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  lineDot: { width: 8, height: 8, borderRadius: 4 },
  roomViews: { position: 'absolute', top: spacing.sm, left: spacing.sm, fontSize: 9, paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill, overflow: 'hidden' },
  roomBody: { padding: spacing.md, gap: 2 },
  roomTitle: { fontSize: 20, lineHeight: 26 },
  roomMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  receipt: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  receiptHead: { flexDirection: 'row', alignItems: 'flex-start' },
  stamp: { marginTop: -4, marginRight: -2 },
  lines: { gap: spacing.sm },
  tear: { borderTopWidth: 1, borderStyle: 'dashed', marginVertical: spacing.xs },
});
