import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ClsrError, describeError, type ClsrApi, type ProjectSummary } from '@/api';
import { ConnectCard } from '@/components/connect';
import { FrameBox, FramePathImage } from '@/components/frame';
import { StatusLine } from '@/components/status';
import { AppText, Button, EmptyState, PressableScale } from '@/components/ui';
import { capitalize, formatRelativeDate } from '@/lib/format';
import { useResource } from '@/lib/useResource';
import { useServer } from '@/store/server';
import { fonts, radius, spacing, TAB_BAR_CLEARANCE, typography, useAppTheme } from '@/theme';

const pad2 = (n: number) => String(n).padStart(2, '0');

export default function FlatsScreen() {
  const { api, demo, host, reachability, checkHealth } = useServer();
  // Don't sit through a request timeout when the health check already failed.
  const healthError =
    demo || reachability.state === 'ok' || reachability.state === 'checking' || reachability.state === 'unknown'
      ? undefined
      : new ClsrError(reachability.state, '');
  const { colors } = useAppTheme();
  const flats = useResource(api ? () => api.projects() : null, `${host}|${demo}`);
  const [refreshing, setRefreshing] = useState(false);
  const count = flats.data?.length ?? 0;

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
        ItemSeparatorComponent={() => <View style={{ height: spacing.xl }} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <StatusLine />
            <View>
              <AppText variant="hero">Every room,</AppText>
              <Text style={[typography.hero, { fontFamily: fonts.displayItalic, color: colors.accent }]}>rendered.</Text>
            </View>
            {api && count > 0 && (
              <AppText variant="overline" style={styles.count}>
                {pad2(count)} {count === 1 ? 'flat' : 'flats'} in the studio
              </AppText>
            )}
          </View>
        }
        renderItem={({ item, index }) => <FlatCard flat={item} api={api!} position={`${pad2(index + 1)}/${pad2(count)}`} />}
        ListEmptyComponent={
          !api ? (
            <ConnectCard />
          ) : (flats.error || healthError) && !flats.data ? (
            <EmptyState
              icon={reachability.state === 'unauthorized' ? 'key-outline' : 'cloud-offline-outline'}
              title={reachability.state === 'unauthorized' ? 'Locked out' : 'The studio is quiet'}
              message={describeError(flats.error ?? healthError)}
              action={
                <View style={styles.row}>
                  <Button title="Try again" variant="secondary" compact onPress={onRefresh} />
                  <Button title="Studio link" variant="ghost" compact onPress={() => router.navigate('/settings')} />
                </View>
              }
            />
          ) : flats.loading ? (
            <View style={styles.loader}>
              <ActivityIndicator color={colors.accent} />
              <AppText variant="overline">{demo ? 'Loading' : `Calling ${host.replace(/^https?:\/\//, '')}`}</AppText>
            </View>
          ) : (
            <EmptyState icon="cube-outline" title="Nothing on the easel" message="Finished flats from CLSR will appear here." />
          )
        }
      />
    </SafeAreaView>
  );
}

function FlatCard({ flat, api, position }: { flat: ProjectSummary; api: ClsrApi; position: string }) {
  const { colors } = useAppTheme();
  return (
    <PressableScale onPress={() => router.push(`/flat/${flat.number}`)} style={[styles.card, { backgroundColor: colors.surface }]}>
      {flat.cover ? (
        <FrameBox>{(size) => <FramePathImage api={api} path={flat.cover!} {...size} />}</FrameBox>
      ) : (
        <View style={[styles.placeholder, { backgroundColor: colors.surfaceMuted }]}>
          <Ionicons name="image-outline" size={36} color={colors.textFaint} />
        </View>
      )}
      <LinearGradient colors={['rgba(15,14,12,0)', 'rgba(15,14,12,0.35)', 'rgba(15,14,12,0.96)']} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />

      <Text style={[typography.overline, styles.position, { color: colors.text }]}>{position}</Text>

      <View style={styles.caption}>
        <View style={styles.titleRow}>
          <Text style={[typography.display, styles.number, { color: colors.text }]}>
            <Text style={{ fontFamily: fonts.displayItalic, color: colors.accent }}>№</Text>
            {flat.number}
          </Text>
          <View style={styles.flex}>
            <Text style={[typography.italic, { color: colors.text }]}>{capitalize(flat.style)}</Text>
            <Text style={[typography.overline, { color: colors.textFaint, fontSize: 10 }]}>{formatRelativeDate(flat.created)}</Text>
            <Text style={[typography.overline, { color: colors.textMuted, fontSize: 10 }]}>
              {flat.rooms} rooms · {flat.frames} frames
            </Text>
          </View>
        </View>
        <Text style={[typography.overline, { color: colors.textMuted, fontSize: 10 }]} numberOfLines={1}>
          {flat.labels.join('  /  ')}
        </Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.xl, paddingTop: spacing.lg, paddingBottom: TAB_BAR_CLEARANCE },
  header: { gap: spacing.lg, marginBottom: spacing.xl },
  count: { marginTop: spacing.xs },
  card: { borderRadius: radius.xl, overflow: 'hidden' },
  placeholder: { aspectRatio: 1800 / 1350, alignItems: 'center', justifyContent: 'center' },
  position: { position: 'absolute', top: spacing.lg, right: spacing.lg, fontSize: 10 },
  caption: { position: 'absolute', left: spacing.lg, right: spacing.lg, bottom: spacing.lg, gap: spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md },
  number: { fontSize: 46, lineHeight: 50 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  loader: { marginTop: spacing.xxl, alignItems: 'center', gap: spacing.md },
});
