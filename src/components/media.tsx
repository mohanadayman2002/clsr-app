import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import type { FloorPlanFile, Render, RoomType } from '@/api';
import { ROOM_TYPES } from '@/lib/catalog';
import { useAppTheme } from '@/theme';

import { AppText } from './ui';

/** Shows a render, or a room-themed placeholder when no image is available yet (mock mode). */
export function RenderImage({
  render,
  roomType,
  style,
  showLabel,
  contentFit = 'cover',
}: {
  render?: Render;
  roomType: RoomType;
  style?: StyleProp<ViewStyle>;
  showLabel?: boolean;
  contentFit?: 'cover' | 'contain';
}) {
  const [failed, setFailed] = useState(false);
  const meta = ROOM_TYPES[roomType];

  if (render?.uri && !failed) {
    return (
      <Image
        source={{ uri: render.uri }}
        style={[styles.fill, style as object]}
        contentFit={contentFit}
        transition={200}
        onError={() => setFailed(true)}
        accessibilityLabel={`${meta.label} render, ${render.view}`}
      />
    );
  }

  return (
    <LinearGradient colors={meta.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.placeholder, style]}>
      <Ionicons name={meta.icon} size={40} color="rgba(255,255,255,0.9)" />
      {showLabel && render && (
        <AppText variant="caption" style={styles.placeholderLabel}>
          {render.view} · preview
        </AppText>
      )}
    </LinearGradient>
  );
}

/** The user's uploaded floor plan, or a drawn stand-in when there is no local file. */
export function FloorPlanPreview({ file, style }: { file: FloorPlanFile; style?: StyleProp<ViewStyle> }) {
  const { colors } = useAppTheme();
  const isImage = file.uri && file.mimeType.startsWith('image/');

  if (isImage) {
    return (
      <View style={[styles.planFrame, { backgroundColor: colors.surfaceMuted }, style]}>
        <Image source={{ uri: file.uri }} style={styles.fill} contentFit="contain" />
      </View>
    );
  }

  return (
    <View style={[styles.planFrame, styles.center, { backgroundColor: colors.surfaceMuted }, style]}>
      <Ionicons name={file.mimeType === 'application/pdf' ? 'document-text-outline' : 'grid-outline'} size={36} color={colors.textMuted} />
      <AppText variant="caption" numberOfLines={1} style={styles.planName}>
        {file.name}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { width: '100%', height: '100%' },
  placeholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', gap: 8 },
  placeholderLabel: { color: 'rgba(255,255,255,0.95)', fontWeight: '600' },
  planFrame: { width: '100%', height: '100%', overflow: 'hidden' },
  center: { alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12 },
  planName: { maxWidth: '90%' },
});
