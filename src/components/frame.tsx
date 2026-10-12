import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useEffect, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { framePath, type ClsrApi, type Room, type View as FrameView } from '@/api';
import type { Hotspot } from '@/lib/hotspots';
import { shadow, typography, useAppTheme } from '@/theme';

/** CLSR frames are rendered at 1800×1350. */
export const FRAME_ASPECT = 1800 / 1350;

/** Measures its own width and lays children out on a FRAME_ASPECT box. */
export function FrameBox({
  children,
  style,
}: {
  children: (size: { width: number; height: number }) => ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const [width, setWidth] = useState(0);
  const height = width / FRAME_ASPECT;
  return (
    <View style={[{ width: '100%', aspectRatio: FRAME_ASPECT }, style]} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && children({ width, height })}
    </View>
  );
}

/** One rendered view of a room. */
export function FrameImage({
  api,
  number,
  room,
  view,
  width,
  height,
  bust,
}: {
  api: ClsrApi;
  number: number;
  room: Room;
  view: FrameView;
  width: number;
  height: number;
  bust?: number;
}) {
  return (
    <Image
      source={api.imageSource(framePath(number, view.image, bust))}
      style={{ width, height }}
      contentFit="cover"
      transition={150}
      recyclingKey={view.image}
      accessibilityLabel={`${room.title}, ${view.camera.wall ?? ''} view`}
    />
  );
}

/** A frame referenced only by server path, e.g. a project cover. */
export function FramePathImage({ api, path, width, height }: { api: ClsrApi; path: string; width: number; height: number }) {
  return <Image source={api.imageSource(path)} style={{ width, height }} contentFit="cover" transition={150} />;
}

const DOT = 14;
const RING = 34;

/** Tappable, softly pulsing dots over a frame. Positions come from `roomHotspots`. */
export function HotspotLayer({
  hotspots,
  width,
  height,
  selectedId,
  queuedIds,
  onPress,
}: {
  hotspots: Hotspot[];
  width: number;
  height: number;
  selectedId?: string;
  queuedIds?: Set<string>;
  onPress: (hotspot: Hotspot) => void;
}) {
  const { colors } = useAppTheme();
  const [pulse] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(pulse, { toValue: 1, duration: 2200, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const press = (h: Hotspot) => {
    if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
    onPress(h);
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {hotspots.map((h) => {
        const selected = h.id === selectedId;
        const queued = queuedIds?.has(h.id);
        const x = h.u * width;
        const y = h.v * height;
        return (
          <View key={h.id} style={[styles.spot, { left: x - RING / 2, top: y - RING / 2 }]} pointerEvents="box-none">
            {!selected && (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.ring,
                  {
                    borderColor: colors.accent,
                    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0] }),
                    transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }) }],
                  },
                ]}
              />
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Change ${h.label}`}
              hitSlop={12}
              onPress={() => press(h)}
              style={[
                styles.dot,
                selected && styles.dotSelected,
                {
                  backgroundColor: colors.accent,
                  borderColor: selected ? colors.text : '#FFFFFF',
                },
              ]}>
              {!selected && <View style={[styles.core, { backgroundColor: queued ? colors.text : '#FFFFFF' }]} />}
            </Pressable>
            {selected && (
              <View
                pointerEvents="none"
                style={[styles.callout, h.u > 0.6 ? { right: RING - 2 } : { left: RING - 2 }, { backgroundColor: colors.surface, borderColor: colors.surface }, shadow]}>
                <Text style={[typography.overline, { color: colors.accent }]} numberOfLines={1}>
                  {h.label}
                </Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  spot: { position: 'absolute', width: RING, height: RING, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: RING, height: RING, borderRadius: RING / 2, borderWidth: 2.5 },
  dot: {
    width: DOT + 6,
    height: DOT + 6,
    borderRadius: (DOT + 6) / 2,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  dotSelected: { width: 24, height: 24, borderRadius: 12, borderWidth: 3 },
  core: { width: 6, height: 6, borderRadius: 3 },
  callout: {
    position: 'absolute',
    top: RING / 2 - 13,
    height: 26,
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: 13,
    borderWidth: 1,
    maxWidth: 200,
  },
});
