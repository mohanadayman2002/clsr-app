import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Switch, View } from 'react-native';

import { FlowScreen } from '@/components/flow';
import { FloorPlanPreview } from '@/components/media';
import { AppText, Badge, Button, Card } from '@/components/ui';
import { DESIGN_STYLES, ROOM_TYPES } from '@/lib/catalog';
import { formatArea } from '@/lib/format';
import { useDraft } from '@/store/draft';
import { useProjects } from '@/store/projects';
import { radius, spacing, useAppTheme } from '@/theme';

export default function RoomsStep() {
  const { floorPlan, name, preferences, rooms, setRooms } = useDraft();
  const { create } = useProjects();
  const { colors } = useAppTheme();
  const [submitting, setSubmitting] = useState(false);

  const included = rooms.filter((r) => r.included);
  const toggle = (id: string, value: boolean) =>
    setRooms(rooms.map((r) => (r.id === id ? { ...r, included: value } : r)));

  const generate = async () => {
    if (!floorPlan) return;
    setSubmitting(true);
    try {
      const project = await create({ name: name.trim(), floorPlan, preferences, rooms });
      router.dismissTo('/');
      router.push(`/project/${project.id}`);
    } catch (e) {
      Alert.alert('Could not start the project', e instanceof Error ? e.message : 'Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <FlowScreen
      step={3}
      title="Review rooms"
      subtitle="We found these rooms in your plan. Turn off any you don't need rendered."
      footer={
        <Button
          title={`Furnish & render ${included.length} room${included.length === 1 ? '' : 's'}`}
          icon="sparkles-outline"
          loading={submitting}
          disabled={included.length === 0}
          onPress={generate}
        />
      }>
      {floorPlan && (
        <Card padded={false} style={styles.summary}>
          <View style={styles.thumb}>
            <FloorPlanPreview file={floorPlan} />
          </View>
          <View style={styles.summaryBody}>
            <AppText variant="heading" numberOfLines={1}>
              {name}
            </AppText>
            <View style={styles.badges}>
              <Badge label={DESIGN_STYLES[preferences.style].label} tone="accent" />
              <Badge label={`${rooms.length} rooms found`} />
            </View>
          </View>
        </Card>
      )}

      <Card padded={false}>
        {rooms.map((room, i) => {
          const meta = ROOM_TYPES[room.type];
          return (
            <View
              key={room.id}
              style={[styles.room, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
              <View style={[styles.roomIcon, { backgroundColor: colors.surfaceMuted }]}>
                <Ionicons name={meta.icon} size={20} color={room.included ? colors.text : colors.textFaint} />
              </View>
              <View style={styles.flex}>
                <AppText variant="label" color={room.included ? 'text' : 'textFaint'}>
                  {room.name}
                </AppText>
                <AppText variant="caption">{[meta.label, formatArea(room.areaSqm)].filter(Boolean).join(' · ')}</AppText>
              </View>
              <Switch
                value={room.included}
                onValueChange={(v) => toggle(room.id, v)}
                trackColor={{ true: colors.accent, false: colors.border }}
                thumbColor="#FFFFFF"
                accessibilityLabel={`Include ${room.name}`}
              />
            </View>
          );
        })}
      </Card>

      <AppText variant="caption" style={styles.note}>
        Renders usually take a few minutes. You can leave the app — we&apos;ll keep working.
      </AppText>
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  summary: { flexDirection: 'row' },
  thumb: { width: 96, height: 96 },
  summaryBody: { flex: 1, padding: spacing.md, justifyContent: 'center', gap: spacing.sm },
  badges: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  room: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  roomIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  note: { textAlign: 'center' },
});
