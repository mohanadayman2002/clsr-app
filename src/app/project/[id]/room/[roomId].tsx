import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { clsr, type Render, type RoomType } from '@/api';
import { RenderImage } from '@/components/media';
import { AppText, Badge, Button, Card, Chip, EmptyState, IconButton, SectionHeader } from '@/components/ui';
import { DESIGN_STYLES, ROOM_TYPES } from '@/lib/catalog';
import { formatArea } from '@/lib/format';
import { shareRender } from '@/lib/share';
import { useProject, useProjects } from '@/store/projects';
import { radius, spacing, useAppTheme } from '@/theme';

export default function RoomScreen() {
  const { id, roomId } = useLocalSearchParams<{ id: string; roomId: string }>();
  const { project } = useProject(id);
  const { upsert } = useProjects();
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const [viewer, setViewer] = useState<Render>();
  const [regenerating, setRegenerating] = useState(false);

  const room = project?.rooms.find((r) => r.id === roomId);
  if (!project || !room) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        {project ? <EmptyState icon="help-circle-outline" title="Room not found" message="It may have been removed." /> : <ActivityIndicator />}
      </View>
    );
  }

  const meta = ROOM_TYPES[room.type];
  const imageWidth = width - spacing.xl * 2;
  const imageHeight = Math.round(imageWidth * 0.75);
  const busy = room.status !== 'ready';
  const readyRooms = project.rooms.filter((r) => r.status === 'ready');

  const regenerate = () =>
    Alert.alert('Regenerate renders?', `CLSR will produce a new set of renders for ${room.name}.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Regenerate',
        onPress: async () => {
          setRegenerating(true);
          try {
            upsert(await clsr.regenerateRoom(project.id, room.id));
            setPage(0);
          } catch (e) {
            Alert.alert('Could not regenerate', e instanceof Error ? e.message : 'Please try again.');
          } finally {
            setRegenerating(false);
          }
        },
      },
    ]);

  const furnitureByCategory = room.furniture.reduce<Record<string, string[]>>((acc, item) => {
    (acc[item.category] ??= []).push(item.name);
    return acc;
  }, {});

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      {readyRooms.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.switcherBleed}
          contentContainerStyle={styles.switcher}>
          {readyRooms.map((r) => (
            <Chip
              key={r.id}
              label={r.name}
              icon={ROOM_TYPES[r.type].icon}
              selected={r.id === room.id}
              onPress={() => r.id !== room.id && router.setParams({ roomId: r.id })}
            />
          ))}
        </ScrollView>
      )}

      <View style={styles.header}>
        <AppText variant="title">{room.name}</AppText>
        <View style={styles.badges}>
          {room.name !== meta.label && <Badge label={meta.label} />}
          {room.areaSqm != null && <Badge label={formatArea(room.areaSqm)!} />}
          <Badge label={DESIGN_STYLES[project.preferences.style].label} tone="accent" />
        </View>
      </View>

      <View style={[styles.gallery, { height: imageHeight }]}>
        {busy ? (
          <View style={[styles.busy, { backgroundColor: colors.surfaceMuted }]}>
            <ActivityIndicator color={colors.accent} />
            <AppText variant="label">Rendering new views…</AppText>
            <AppText variant="caption">This room will refresh automatically.</AppText>
          </View>
        ) : (
          <>
            <FlatList
              key={room.id}
              data={room.renders}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(r) => r.id}
              onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / imageWidth))}
              renderItem={({ item }) => (
                <Pressable onPress={() => setViewer(item)} style={{ width: imageWidth, height: imageHeight }} accessibilityLabel={`Open ${item.view} render`}>
                  <RenderImage render={item} roomType={room.type} showLabel />
                </Pressable>
              )}
            />
            <View style={styles.dots}>
              {room.renders.map((r, i) => (
                <View key={r.id} style={[styles.dot, { opacity: i === page ? 1 : 0.45 }]} />
              ))}
            </View>
            <View style={styles.expand}>
              <Ionicons name="expand-outline" size={16} color="#fff" />
            </View>
          </>
        )}
      </View>

      {!busy && room.renders[page] && (
        <AppText variant="caption" style={styles.viewLabel}>
          {room.renders[page].view} · {page + 1} of {room.renders.length}
        </AppText>
      )}

      <View style={styles.actions}>
        <Button
          title="Share"
          icon="share-outline"
          variant="secondary"
          style={styles.flex}
          disabled={busy}
          onPress={() => room.renders[page] && shareRender(room.renders[page])}
        />
        <Button
          title="Regenerate"
          icon="refresh"
          variant="secondary"
          style={styles.flex}
          disabled={busy}
          loading={regenerating}
          onPress={regenerate}
        />
      </View>

      <View>
        <SectionHeader title="Furnished with" action={<AppText variant="caption">{room.furniture.length} items</AppText>} />
        <Card style={styles.furniture}>
          {Object.entries(furnitureByCategory).map(([category, items]) => (
            <View key={category} style={styles.category}>
              <AppText variant="caption" style={styles.categoryLabel}>
                {category}
              </AppText>
              {items.map((name) => (
                <View key={name} style={styles.item}>
                  <View style={[styles.bullet, { backgroundColor: colors.accent }]} />
                  <AppText variant="body">{name}</AppText>
                </View>
              ))}
            </View>
          ))}
          {room.furniture.length === 0 && <AppText variant="caption">Furniture details will appear here.</AppText>}
        </Card>
      </View>

      <RenderViewer render={viewer} roomType={room.type} onClose={() => setViewer(undefined)} />
    </ScrollView>
  );
}

/** Full-screen render viewer with pinch-to-zoom on iOS. */
function RenderViewer({ render, roomType, onClose }: { render?: Render; roomType: RoomType; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  return (
    <Modal visible={!!render} animationType="fade" onRequestClose={onClose} supportedOrientations={['portrait', 'landscape']}>
      <View style={styles.viewer}>
        <ScrollView
          maximumZoomScale={4}
          minimumZoomScale={1}
          centerContent
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.viewerContent}>
          <View style={{ width, height: Math.min(height, width * 0.75) }}>
            {render && <RenderImage render={render} roomType={roomType} showLabel contentFit="contain" />}
          </View>
        </ScrollView>
        <SafeAreaView style={styles.viewerBar} edges={['top']} pointerEvents="box-none">
          <IconButton icon="close" accessibilityLabel="Close viewer" onPress={onClose} />
          {render && (
            <IconButton icon="share-outline" accessibilityLabel="Share render" onPress={() => shareRender(render)} />
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.xl, paddingTop: spacing.sm, gap: spacing.lg, paddingBottom: spacing.xxl * 2 },
  switcher: { gap: spacing.sm, paddingHorizontal: spacing.xl, paddingBottom: spacing.xs },
  switcherBleed: { marginHorizontal: -spacing.xl },
  header: { gap: spacing.sm },
  badges: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  gallery: { borderRadius: radius.lg, overflow: 'hidden' },
  busy: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  dots: { position: 'absolute', bottom: spacing.md, alignSelf: 'center', flexDirection: 'row', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: radius.pill, backgroundColor: '#fff' },
  expand: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: radius.pill,
    padding: 6,
  },
  viewLabel: { textAlign: 'center', marginTop: -spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.md },
  furniture: { gap: spacing.lg },
  category: { gap: spacing.xs },
  categoryLabel: { textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: '600' },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bullet: { width: 6, height: 6, borderRadius: 3 },
  viewer: { flex: 1, backgroundColor: '#000' },
  viewerContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
  viewerBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
});
