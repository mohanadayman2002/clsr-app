import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import type { Project, ProjectStatus, Room } from '@/api';
import { DESIGN_STYLES, PIPELINE_STAGES, ROOM_TYPES, STATUS_LABELS, isProcessing } from '@/lib/catalog';
import { formatArea, formatRelativeDate } from '@/lib/format';
import { radius, spacing, useAppTheme } from '@/theme';

import { FloorPlanPreview, RenderImage } from './media';
import { AppText, Badge, Card, ProgressBar } from './ui';

export function StatusBadge({ status }: { status: ProjectStatus }) {
  const tone = status === 'completed' ? 'success' : status === 'failed' ? 'danger' : 'accent';
  return <Badge label={STATUS_LABELS[status]} tone={tone} />;
}

export function ProjectCard({ project, onPress }: { project: Project; onPress: () => void }) {
  const cover = project.rooms.find((r) => r.renders.length > 0);
  const readyCount = project.rooms.filter((r) => r.status === 'ready').length;

  return (
    <Card onPress={onPress} padded={false}>
      <View style={styles.cover}>
        {cover ? (
          <RenderImage render={cover.renders[0]} roomType={cover.type} />
        ) : (
          <FloorPlanPreview file={project.floorPlan} />
        )}
        <View style={styles.coverBadge}>
          <StatusBadge status={project.status} />
        </View>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.row}>
          <AppText variant="heading" numberOfLines={1} style={styles.flex}>
            {project.name}
          </AppText>
          <AppText variant="caption">{formatRelativeDate(project.updatedAt)}</AppText>
        </View>
        <AppText variant="caption">
          {DESIGN_STYLES[project.preferences.style].label} · {readyCount}/{project.rooms.length} rooms rendered
        </AppText>
        {isProcessing(project.status) && <ProgressBar value={project.progress} style={styles.progress} />}
      </View>
    </Card>
  );
}

export function RoomCard({ room, onPress }: { room: Room; onPress?: () => void }) {
  const { colors } = useAppTheme();
  const meta = ROOM_TYPES[room.type];
  const ready = room.status === 'ready';

  return (
    <Card onPress={ready ? onPress : undefined} padded={false} style={styles.roomCard}>
      <View style={styles.roomImage}>
        {ready ? (
          <RenderImage render={room.renders[0]} roomType={room.type} />
        ) : (
          <View style={[styles.roomPending, { backgroundColor: colors.surfaceMuted }]}>
            <Ionicons name={meta.icon} size={28} color={colors.textFaint} />
            <AppText variant="caption">{room.status === 'rendering' ? 'Rendering…' : 'Waiting'}</AppText>
          </View>
        )}
      </View>
      <View style={styles.roomBody}>
        <AppText variant="label" numberOfLines={1}>
          {room.name}
        </AppText>
        <AppText variant="caption" numberOfLines={1}>
          {[formatArea(room.areaSqm), ready ? `${room.renders.length} renders` : undefined].filter(Boolean).join(' · ') || meta.label}
        </AppText>
      </View>
    </Card>
  );
}

/** Vertical list of pipeline stages with the current one highlighted. */
export function PipelineProgress({ project }: { project: Project }) {
  const { colors } = useAppTheme();
  const currentIndex = PIPELINE_STAGES.findIndex((s) => s.status === project.status);

  return (
    <Card>
      <View style={styles.row}>
        <AppText variant="heading" style={styles.flex}>
          Designing your space
        </AppText>
        <AppText variant="label" color="accent">
          {Math.round(project.progress * 100)}%
        </AppText>
      </View>
      <ProgressBar value={project.progress} style={styles.progressLarge} />
      <View style={styles.stages}>
        {PIPELINE_STAGES.map((stage, i) => {
          const done = i < currentIndex;
          const active = i === currentIndex;
          return (
            <View key={stage.status} style={styles.stage}>
              <View
                style={[
                  styles.stageDot,
                  {
                    backgroundColor: done ? colors.success : active ? colors.accent : colors.surfaceMuted,
                  },
                ]}>
                {done ? (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                ) : (
                  <AppText variant="caption" style={{ color: active ? '#fff' : colors.textFaint, fontWeight: '700' }}>
                    {i + 1}
                  </AppText>
                )}
              </View>
              <View style={styles.flex}>
                <AppText variant="label" color={done || active ? 'text' : 'textFaint'}>
                  {stage.label}
                </AppText>
                <AppText variant="caption" color={active ? 'textMuted' : 'textFaint'}>
                  {stage.description}
                </AppText>
              </View>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cover: { height: 170 },
  coverBadge: { position: 'absolute', top: spacing.md, left: spacing.md },
  cardBody: { padding: spacing.lg, gap: spacing.xs },
  progress: { marginTop: spacing.sm },
  progressLarge: { marginTop: spacing.md, marginBottom: spacing.lg },
  roomCard: { flex: 1 },
  roomImage: { height: 120 },
  roomPending: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  roomBody: { padding: spacing.md, gap: 2 },
  stages: { gap: spacing.md },
  stage: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  stageDot: { width: 26, height: 26, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
