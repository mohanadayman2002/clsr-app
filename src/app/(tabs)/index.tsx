import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ClsrError, describeError, type ClsrApi, type ProjectSummary } from '@/api';
import { ConnectCard } from '@/components/connect';
import { FrameBox, FramePathImage } from '@/components/frame';
import { StatusLine } from '@/components/status';
import { AppText, Blobs, Button, EmptyState, PressableScale, RoomChip } from '@/components/ui';
import { capitalize, formatRelativeDate } from '@/lib/format';
import { useResource } from '@/lib/useResource';
import { useServer } from '@/store/server';
import { confetti, fonts, radius, shadow, spacing, TAB_BAR_CLEARANCE, typography, useAppTheme } from '@/theme';

const pad2 = (n: number) => String(n).padStart(2, '0');

export default function FlatsScreen() {
  const { api, host, reachability, checkHealth } = useServer();
  // Don't sit through a request timeout when the health check already failed.
  const healthError =
    reachability.state === 'ok' || reachability.state === 'checking' || reachability.state === 'unknown'
      ? undefined
      : new ClsrError(reachability.state, '');
  const { colors } = useAppTheme();
  const flats = useResource(api ? () => api.projects() : null, host);
  const [refreshing, setRefreshing] = useState(false);
  // New flats appear when a build finishes; refresh whenever this tab comes back.
  const { reload } = flats;
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );
  const count = flats.data?.length ?? 0;
  const { width } = useWindowDimensions();

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
            <Blobs width={width} height={230} inset={spacing.xl} />
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
              <AppText variant="overline">{`Calling ${host.replace(/^https?:\/\//, '')}`}</AppText>
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
    <PressableScale onPress={() => router.push(`/flat/${flat.number}`)} style={[styles.card, shadow, { backgroundColor: colors.surface }]}>
      <View style={[styles.coverWrap, { backgroundColor: colors.surfaceMuted }]}>
        {flat.cover ? (
          <FrameBox>{(size) => <FramePathImage api={api} path={flat.cover!} {...size} />}</FrameBox>
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="image-outline" size={36} color={colors.textFaint} />
          </View>
        )}
        <View style={[styles.sticker, { backgroundColor: confetti.sun }]}>
          <Text style={[typography.display, styles.stickerText, { color: colors.text }]}>
            <Text style={{ fontFamily: fonts.displayItalic }}>№</Text>
            {flat.number}
          </Text>
        </View>
        <View style={[styles.position, { backgroundColor: colors.surface }]}>
          <Text style={[typography.overline, { color: colors.textMuted, fontSize: 10 }]}>{position}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.titleRow}>
          <AppText variant="title" style={styles.flex}>
            {capitalize(flat.style)}
          </AppText>
          <AppText variant="overline" color="textFaint">
            {formatRelativeDate(flat.created)}
          </AppText>
        </View>
        <AppText variant="caption">
          {flat.rooms} rooms · {flat.frames} photos
        </AppText>
        <View style={styles.chips}>
          {flat.labels.map((l) => (
            <RoomChip key={l} label={l} small />
          ))}
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.xl, paddingTop: spacing.lg, paddingBottom: TAB_BAR_CLEARANCE },
  header: { gap: spacing.lg, marginBottom: spacing.xl },
  count: { marginTop: spacing.xs },
  card: { borderRadius: radius.xl, padding: 10 },
  coverWrap: { borderRadius: radius.lg, overflow: 'hidden' },
  placeholder: { aspectRatio: 1800 / 1350, alignItems: 'center', justifyContent: 'center' },
  sticker: {
    position: 'absolute',
    left: spacing.md,
    bottom: spacing.md,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 2,
    transform: [{ rotate: '-4deg' }],
  },
  stickerText: { fontSize: 28, lineHeight: 36 },
  position: { position: 'absolute', top: spacing.md, right: spacing.md, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  cardBody: { paddingHorizontal: spacing.sm, paddingTop: spacing.md, paddingBottom: spacing.sm, gap: spacing.xs },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  loader: { marginTop: spacing.xxl, alignItems: 'center', gap: spacing.md },
});
