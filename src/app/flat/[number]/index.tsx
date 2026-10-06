import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { describeError, type ClsrApi, type Project, type Room } from '@/api';
import { FRAME_ASPECT, FrameImage } from '@/components/frame';
import { FloorPlan } from '@/components/plan';
import { AppText, Button, EmptyState, Leader, LiveDot, PressableScale, SectionHeader, Stamp } from '@/components/ui';
import { capitalize, formatEGP } from '@/lib/format';
import { useResource } from '@/lib/useResource';
import { useApi } from '@/store/server';
import { fonts, radius, spacing, typography, useAppTheme } from '@/theme';

const CARD_WIDTH = 248;

export default function FlatScreen() {
  const { number } = useLocalSearchParams<{ number: string }>();
  const n = Number(number);
  const api = useApi();
  const { colors } = useAppTheme();
  const flat = useResource(() => api.project(n), `${n}`);

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
  const hero = findView(project, project.hero);
  const area = project.rooms.reduce((s, r) => s + r.area_m2, 0);
  const openRoom = (room: Room, view = 0) => router.push(`/flat/${project.number}/room/${room.index}?view=${view}`);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textMuted} />}>
      <View style={{ width, height: width / FRAME_ASPECT + 90 }}>
        {hero && <FrameImage api={api} number={project.number} room={hero.room} view={hero.view} width={width} height={width / FRAME_ASPECT} />}
        <LinearGradient
          colors={['rgba(15,14,12,0.7)', 'rgba(15,14,12,0)', 'rgba(15,14,12,0)', colors.background]}
          locations={[0, 0.25, 0.55, 0.82]}
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
        {project.job?.status === 'running' && (
          <View style={[styles.job, { borderColor: colors.accent, backgroundColor: colors.accentSoft }]}>
            <LiveDot color={colors.accent} />
            <AppText variant="label" style={styles.flex}>
              Rendering {project.job.done_frames}/{project.job.frames.length}
            </AppText>
            <AppText variant="overline" color="accent">
              {project.job.stage}
            </AppText>
          </View>
        )}

        <View>
          <SectionHeader index="01" title="Plan" />
          <View style={[styles.planWrap, { borderColor: colors.border }]}>
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
                subtotal={project.costs.rooms.find((c) => c.room === room.index)?.subtotal}
                onPress={() => openRoom(room)}
              />
            ))}
          </ScrollView>
        </View>

        <View>
          <SectionHeader index="03" title="The bill" />
          <Receipt project={project} />
        </View>
      </View>
    </ScrollView>
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

function RoomCard({ api, number, room, subtotal, onPress }: { api: ClsrApi; number: number; room: Room; subtotal?: number; onPress: () => void }) {
  const { colors } = useAppTheme();
  const height = CARD_WIDTH / FRAME_ASPECT;
  return (
    <PressableScale onPress={onPress} style={[styles.roomCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={{ width: CARD_WIDTH, height }}>
        {room.views[0] && <FrameImage api={api} number={number} room={room} view={room.views[0]} width={CARD_WIDTH} height={height} />}
        <Text style={[typography.overline, styles.roomViews, { color: colors.text, backgroundColor: colors.overlay }]}>
          {room.views.length} {room.views.length === 1 ? 'view' : 'views'}
        </Text>
      </View>
      <View style={styles.roomBody}>
        <AppText variant="title" style={styles.roomTitle} numberOfLines={1}>
          {room.title}
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
function Receipt({ project }: { project: Project }) {
  const { colors } = useAppTheme();
  const { costs } = project;
  return (
    <View style={[styles.receipt, { backgroundColor: colors.surface, borderColor: colors.border }]}>
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
          <Leader key={r.room} label={r.title} value={Math.round(r.subtotal).toLocaleString('en-US')} />
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
  content: { paddingBottom: spacing.xxl * 2 },
  heroCaption: { position: 'absolute', left: spacing.xl, right: spacing.xl, bottom: 0, gap: spacing.xs },
  body: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl, gap: spacing.xxl },
  job: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderRadius: radius.pill, paddingRight: spacing.lg, paddingLeft: spacing.sm, height: 44 },
  planWrap: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, padding: spacing.md },
  hint: { marginTop: spacing.sm, fontFamily: fonts.displayItalic },
  bleed: { marginHorizontal: -spacing.xl },
  carousel: { paddingHorizontal: spacing.xl, gap: spacing.md },
  roomCard: { width: CARD_WIDTH, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  roomViews: { position: 'absolute', top: spacing.sm, left: spacing.sm, fontSize: 9, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, overflow: 'hidden' },
  roomBody: { padding: spacing.md, gap: 2 },
  roomTitle: { fontSize: 20, lineHeight: 26 },
  roomMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  receipt: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  receiptHead: { flexDirection: 'row', alignItems: 'flex-start' },
  stamp: { marginTop: -4, marginRight: -2 },
  lines: { gap: spacing.sm },
  tear: { borderTopWidth: 1, borderStyle: 'dashed', marginVertical: spacing.xs },
});
