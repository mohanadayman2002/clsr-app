import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';

import { clsr } from '@/api';
import { FloorPlanPreview } from '@/components/media';
import { PipelineProgress, RoomCard, StatusBadge } from '@/components/project';
import { AppText, Badge, Button, Card, EmptyState, IconButton, SectionHeader } from '@/components/ui';
import { BUDGET_TIERS, DESIGN_STYLES, isProcessing } from '@/lib/catalog';
import { formatRelativeDate } from '@/lib/format';
import { useProject, useProjects } from '@/store/projects';
import { spacing, useAppTheme } from '@/theme';

export default function ProjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { project, error, reload } = useProject(id);
  const { remove, upsert } = useProjects();
  const { colors } = useAppTheme();
  const [retrying, setRetrying] = useState(false);

  if (!project) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        {error ? (
          <EmptyState
            icon="alert-circle-outline"
            title="Project unavailable"
            message={error}
            action={<Button title="Try again" variant="secondary" compact onPress={reload} />}
          />
        ) : (
          <ActivityIndicator color={colors.textMuted} />
        )}
      </View>
    );
  }

  const confirmDelete = () =>
    Alert.alert('Delete project?', `"${project.name}" and all of its renders will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await remove(project.id);
          router.back();
        },
      },
    ]);

  const retry = async () => {
    setRetrying(true);
    try {
      upsert(await clsr.retryProject(project.id));
    } finally {
      setRetrying(false);
    }
  };

  const processing = isProcessing(project.status);
  const readyRooms = project.rooms.filter((r) => r.status === 'ready').length;

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => <IconButton plain icon="trash-outline" accessibilityLabel="Delete project" size={20} onPress={confirmDelete} />,
        }}
      />
      <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
        <View style={styles.titleBlock}>
          <StatusBadge status={project.status} />
          <AppText variant="title">{project.name}</AppText>
          <AppText variant="caption">Created {formatRelativeDate(project.createdAt)}</AppText>
        </View>

        {processing && <PipelineProgress project={project} />}

        {project.status === 'failed' && (
          <Card style={{ backgroundColor: colors.dangerSoft, borderColor: colors.dangerSoft }}>
            <AppText variant="label" color="danger">
              Something went wrong
            </AppText>
            <AppText variant="caption" style={styles.gapTop}>
              {project.error ?? 'CLSR could not finish this project.'}
            </AppText>
            <Button title="Retry" icon="refresh" variant="secondary" compact loading={retrying} onPress={retry} style={styles.gapTop} />
          </Card>
        )}

        <View>
          <SectionHeader
            title="Rooms"
            action={
              <AppText variant="caption">
                {readyRooms}/{project.rooms.length} ready
              </AppText>
            }
          />
          <View style={styles.grid}>
            {project.rooms.map((room) => (
              <View key={room.id} style={styles.gridItem}>
                <RoomCard room={room} onPress={() => router.push(`/project/${project.id}/room/${room.id}`)} />
              </View>
            ))}
          </View>
        </View>

        <View>
          <SectionHeader title="Brief" />
          <Card style={styles.brief}>
            <View style={styles.briefRow}>
              <AppText variant="caption">Style</AppText>
              <Badge label={DESIGN_STYLES[project.preferences.style].label} tone="accent" />
            </View>
            <View style={styles.briefRow}>
              <AppText variant="caption">Budget</AppText>
              <Badge label={BUDGET_TIERS[project.preferences.budget].label} />
            </View>
            {project.preferences.notes ? <AppText variant="body">{project.preferences.notes}</AppText> : null}
          </Card>
        </View>

        <View>
          <SectionHeader title="Floor plan" />
          <Card padded={false}>
            <View style={styles.plan}>
              <FloorPlanPreview file={project.floorPlan} />
            </View>
          </Card>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.xl, paddingTop: spacing.sm, gap: spacing.xl, paddingBottom: spacing.xxl * 2 },
  titleBlock: { gap: spacing.xs },
  gapTop: { marginTop: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.md },
  gridItem: { width: '48%' },
  brief: { gap: spacing.md },
  briefRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  plan: { height: 220 },
});
