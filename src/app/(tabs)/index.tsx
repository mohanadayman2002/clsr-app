import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { clsr } from '@/api';
import { ProjectCard } from '@/components/project';
import { AppText, Button, EmptyState } from '@/components/ui';
import { useProjects } from '@/store/projects';
import { radius, spacing, useAppTheme } from '@/theme';

export default function ProjectsScreen() {
  const { projects, loading, error, refresh } = useProjects();
  const { colors } = useAppTheme();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const newProject = () => router.push('/new');

  return (
    <SafeAreaView edges={['top']} style={[styles.flex, { backgroundColor: colors.background }]}>
      <FlatList
        data={projects}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textMuted} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.flex}>
                <AppText variant="overline">clsr</AppText>
                <AppText variant="display">Your spaces</AppText>
              </View>
            </View>

            {clsr.isMock && (
              <View style={[styles.banner, { backgroundColor: colors.warningSoft }]}>
                <Ionicons name="flask-outline" size={16} color={colors.warning} />
                <AppText variant="caption" style={[styles.flex, { color: colors.warning }]}>
                  Demo mode — results are simulated until the CLSR service is connected.
                </AppText>
              </View>
            )}

            <Pressable
              onPress={newProject}
              accessibilityRole="button"
              style={({ pressed }) => [styles.cta, { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 }]}>
              <View style={[styles.ctaIcon, { backgroundColor: colors.accent }]}>
                <Ionicons name="add" size={26} color="#fff" />
              </View>
              <View style={styles.flex}>
                <AppText variant="heading" style={{ color: colors.onPrimary }}>
                  New project
                </AppText>
                <AppText variant="caption" style={{ color: colors.onPrimary, opacity: 0.75 }}>
                  Upload a 2D floor plan and get every room furnished and rendered.
                </AppText>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.onPrimary} />
            </Pressable>

            {projects.length > 0 && (
              <AppText variant="overline" style={styles.sectionTitle}>
                Recent projects
              </AppText>
            )}
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing.lg }} />}
        renderItem={({ item }) => <ProjectCard project={item} onPress={() => router.push(`/project/${item.id}`)} />}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={styles.loader} color={colors.textMuted} />
          ) : error ? (
            <EmptyState
              icon="cloud-offline-outline"
              title="Couldn't load projects"
              message={error}
              action={<Button title="Try again" variant="secondary" compact onPress={refresh} />}
            />
          ) : (
            <EmptyState
              icon="home-outline"
              title="No projects yet"
              message="Your furnished apartments and room renders will appear here."
            />
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.xl, paddingBottom: spacing.xxl * 2 },
  header: { gap: spacing.lg, marginBottom: spacing.lg },
  titleRow: { flexDirection: 'row', alignItems: 'flex-end' },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
  },
  ctaIcon: { width: 48, height: 48, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { marginTop: spacing.md },
  loader: { marginTop: spacing.xxl },
});
