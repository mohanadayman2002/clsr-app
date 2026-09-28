import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ClsrError, describeError, type ClsrApi, type ProjectSummary } from '@/api';
import { ConnectCard } from '@/components/connect';
import { FrameBox, FramePathImage } from '@/components/frame';
import { AppText, Badge, Button, Card, EmptyState } from '@/components/ui';
import { capitalize, formatRelativeDate } from '@/lib/format';
import { useResource } from '@/lib/useResource';
import { useServer } from '@/store/server';
import { radius, spacing, useAppTheme } from '@/theme';

export default function FlatsScreen() {
  const { api, demo, host, reachability, checkHealth } = useServer();
  // Don't sit through a request timeout when the health check already failed.
  const offline = !demo && reachability.state === 'unreachable';
  const { colors } = useAppTheme();
  const flats = useResource(api ? () => api.projects() : null, `${host}|${demo}`);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([flats.reload(), checkHealth()]);
    setRefreshing(false);
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.flex, { backgroundColor: colors.background }]}>
      <FlatList
        data={api ? (flats.data ?? []) : []}
        keyExtractor={(p) => String(p.number)}
        contentContainerStyle={styles.content}
        refreshControl={api ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textMuted} /> : undefined}
        ItemSeparatorComponent={() => <View style={{ height: spacing.lg }} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <AppText variant="overline">CLSR Studio</AppText>
            <AppText variant="display">Flats</AppText>
            {demo && (
              <View style={[styles.banner, { backgroundColor: colors.warningSoft }]}>
                <Ionicons name="flask-outline" size={16} color={colors.warning} />
                <AppText variant="caption" style={[styles.flex, { color: colors.warning }]}>
                  Demo data. Connect to your CLSR server in the Server tab.
                </AppText>
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => <FlatCard flat={item} api={api!} />}
        ListEmptyComponent={
          !api ? (
            <ConnectCard />
          ) : (flats.error || offline) && !flats.data ? (
            <EmptyState
              icon="cloud-offline-outline"
              title="Can't load flats"
              message={describeError(flats.error ?? new ClsrError('unreachable', ''))}
              action={
                <View style={styles.row}>
                  <Button title="Try again" variant="secondary" compact onPress={onRefresh} />
                  <Button title="Server settings" variant="ghost" compact onPress={() => router.navigate('/settings')} />
                </View>
              }
            />
          ) : flats.loading ? (
            <View style={styles.loader}>
              <ActivityIndicator color={colors.textMuted} />
              <AppText variant="caption">{demo ? 'Loading…' : `Connecting to ${host.replace(/^https?:\/\//, '')}…`}</AppText>
            </View>
          ) : (
            <EmptyState icon="home-outline" title="No flats yet" message="Finished flats from CLSR will appear here." />
          )
        }
      />
    </SafeAreaView>
  );
}

function FlatCard({ flat, api }: { flat: ProjectSummary; api: ClsrApi }) {
  const { colors } = useAppTheme();
  return (
    <Card padded={false} onPress={() => router.push(`/flat/${flat.number}`)}>
      <View style={[styles.cover, { backgroundColor: colors.surfaceMuted }]}>
        {flat.cover ? (
          <View style={StyleSheet.absoluteFill}>
            <FrameBox>{(size) => <FramePathImage api={api} path={flat.cover!} {...size} />}</FrameBox>
          </View>
        ) : (
          <Ionicons name="image-outline" size={36} color={colors.textFaint} />
        )}
        <View style={styles.number}>
          <AppText variant="label" style={styles.numberText}>
            #{flat.number}
          </AppText>
        </View>
      </View>
      <View style={styles.body}>
        <View style={styles.row}>
          <AppText variant="heading" style={styles.flex}>
            {capitalize(flat.style)}
          </AppText>
          <AppText variant="caption">{formatRelativeDate(flat.created)}</AppText>
        </View>
        <AppText variant="caption">
          {flat.rooms} rooms · {flat.frames} photos
        </AppText>
        <View style={styles.labels}>
          {flat.labels.map((l) => (
            <Badge key={l} label={capitalize(l)} />
          ))}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.xl, paddingBottom: spacing.xxl * 2 },
  header: { gap: spacing.sm, marginBottom: spacing.xl },
  banner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, marginTop: spacing.sm },
  cover: { aspectRatio: 1800 / 1350, alignItems: 'center', justifyContent: 'center' },
  number: { position: 'absolute', top: spacing.md, left: spacing.md, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 2 },
  numberText: { color: '#fff' },
  body: { padding: spacing.lg, gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  labels: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
  loader: { marginTop: spacing.xxl, alignItems: 'center', gap: spacing.sm },
});
