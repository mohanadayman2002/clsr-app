import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { describeError, type ClsrApi, type Project, type Room } from '@/api';
import { FrameBox, FrameImage } from '@/components/frame';
import { AppText, Badge, Button, Card, EmptyState, SectionHeader } from '@/components/ui';
import { capitalize, formatEGP } from '@/lib/format';
import { useResource } from '@/lib/useResource';
import { useApi } from '@/store/server';
import { radius, spacing, useAppTheme } from '@/theme';

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
          <ActivityIndicator color={colors.textMuted} />
        )}
      </View>
    );
  }

  const project = flat.data;
  const hero = findView(project, project.hero);
  const subtotal = (room: Room) => project.costs.rooms.find((c) => c.room === room.index)?.subtotal;

  return (
    <>
      <Stack.Screen options={{ title: `Flat #${project.number}` }} />
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={flat.loading} onRefresh={flat.reload} tintColor={colors.textMuted} />}>
        {hero && (
          <View style={styles.hero}>
            <FrameBox>{(size) => <FrameImage api={api} number={project.number} room={hero.room} view={hero.view} {...size} />}</FrameBox>
          </View>
        )}

        <View style={styles.titleBlock}>
          <AppText variant="title">{capitalize(project.style)}</AppText>
          <AppText variant="caption">
            {project.rooms.length} rooms · {project.rooms.reduce((s, r) => s + r.area_m2, 0).toFixed(1)} m²
          </AppText>
        </View>

        {project.job?.status === 'running' && (
          <Card style={[styles.job, { backgroundColor: colors.accentSoft, borderColor: colors.accentSoft }]}>
            <ActivityIndicator color={colors.accent} />
            <AppText variant="label" style={styles.flex}>
              Rendering {project.job.done_frames}/{project.job.frames.length} · {project.job.model_name ?? project.job.kind}
            </AppText>
          </Card>
        )}

        <CostSummary project={project} />

        <View>
          <SectionHeader title="Rooms" />
          <View style={styles.rooms}>
            {project.rooms.map((room) => (
              <RoomRow
                key={room.index}
                api={api}
                number={project.number}
                room={room}
                subtotal={subtotal(room)}
                onPress={() => router.push(`/flat/${project.number}/room/${room.index}`)}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </>
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

function CostSummary({ project }: { project: Project }) {
  const { costs } = project;
  return (
    <Card style={styles.costs}>
      <View style={styles.row}>
        <AppText variant="overline" style={styles.flex}>
          Furnishing · {capitalize(costs.tier)}
        </AppText>
        {costs.estimated ? <Badge label="Estimate" tone="warning" /> : <Badge label="Quoted" tone="success" />}
      </View>
      <AppText variant="title">{formatEGP(costs.total)}</AppText>
      <AppText variant="caption">
        {costs.estimated
          ? costs.quoted_lines > 0
            ? `${costs.quoted_lines} line${costs.quoted_lines === 1 ? ' is' : 's are'} quoted; the rest are estimates, not a quotation.`
            : 'All prices are estimates, not a quotation.'
          : 'All lines are quoted.'}
        {costs.budget != null ? ` Budget ${formatEGP(costs.budget)}.` : ''}
      </AppText>
    </Card>
  );
}

function RoomRow({
  api,
  number,
  room,
  subtotal,
  onPress,
}: {
  api: ClsrApi;
  number: number;
  room: Room;
  subtotal?: number;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();
  const view = room.views[0];
  return (
    <Card padded={false} onPress={onPress} style={styles.roomCard}>
      <View style={[styles.thumb, { backgroundColor: colors.surfaceMuted }]}>
        {view && (
          <FrameBox>{(size) => <FrameImage api={api} number={number} room={room} view={view} {...size} />}</FrameBox>
        )}
      </View>
      <View style={styles.roomBody}>
        <AppText variant="label">{room.title}</AppText>
        <AppText variant="caption">
          {room.area_m2} m² · {room.views.length} photo{room.views.length === 1 ? '' : 's'}
        </AppText>
        {subtotal != null && <AppText variant="caption">{formatEGP(subtotal)}</AppText>}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textFaint} style={styles.chevron} />
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.xl, paddingTop: spacing.sm, gap: spacing.xl, paddingBottom: spacing.xxl * 2 },
  hero: { borderRadius: radius.lg, overflow: 'hidden' },
  titleBlock: { gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  job: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  costs: { gap: spacing.xs },
  rooms: { gap: spacing.md },
  roomCard: { flexDirection: 'row', alignItems: 'center' },
  thumb: { width: 112 },
  roomBody: { flex: 1, padding: spacing.md, gap: 2 },
  chevron: { marginRight: spacing.md },
});
