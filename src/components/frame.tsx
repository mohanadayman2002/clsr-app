import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
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
import Svg, { Defs, LinearGradient as SvgGradient, Polyline, Rect, Stop } from 'react-native-svg';

import { DemoClsrApi, framePath, type ClsrApi, type Room, type View as FrameView } from '@/api';
import type { Hotspot } from '@/lib/hotspots';
import { roomWireframe, type Stroke } from '@/lib/wireframe';
import { typography, useAppTheme } from '@/theme';

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

/**
 * One rendered view of a room. In demo mode there are no photos, so the room
 * is drawn from its camera and geometry with the same projection the hotspots use.
 */
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
  if (api.isDemo) return <DemoFrame room={room} view={view} width={width} height={height} />;
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
  if (api instanceof DemoClsrApi) {
    const frame = api.frameFor(path);
    return frame ? <DemoFrame {...frame} width={width} height={height} /> : null;
  }
  return <Image source={api.imageSource(path)} style={{ width, height }} contentFit="cover" transition={150} />;
}

function DemoFrame({ room, view, width, height }: { room: Room; view: FrameView; width: number; height: number }) {
  const { colors } = useAppTheme();
  const strokes = useMemo(() => roomWireframe(room, view.camera, FRAME_ASPECT), [room, view]);
  const styleFor = (s: Stroke) =>
    s.kind === 'shell'
      ? { stroke: colors.line, strokeWidth: 1.2, opacity: 0.7 }
      : s.kind === 'art'
        ? { stroke: colors.accent, strokeWidth: 1.6, opacity: 1 }
        : { stroke: colors.text, strokeWidth: 1.3, opacity: 0.85 };
  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Defs>
          <SvgGradient id="room" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#1E1B17" />
            <Stop offset="0.55" stopColor="#15130F" />
            <Stop offset="1" stopColor="#201C17" />
          </SvgGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill="url(#room)" />
        {strokes.map((s, i) => (
          <Polyline
            key={i}
            points={s.points.map(([u, v]) => `${u * width},${v * height}`).join(' ')}
            {...styleFor(s)}
            strokeLinejoin="round"
            strokeLinecap="round"
            fill="none"
          />
        ))}
      </Svg>
      {width >= 380 && (
        <View style={styles.demoTag}>
          <Text style={[typography.overline, styles.demoTagText, { color: colors.textMuted }]}>Demo · line render from camera data</Text>
        </View>
      )}
    </View>
  );
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
                  backgroundColor: selected || queued ? colors.accent : 'rgba(15,14,12,0.55)',
                  borderColor: selected ? colors.text : colors.accent,
                },
              ]}>
              {!selected && <View style={[styles.core, { backgroundColor: queued ? colors.onAccent : colors.accent }]} />}
            </Pressable>
            {selected && (
              <View
                pointerEvents="none"
                style={[styles.callout, h.u > 0.6 ? { right: RING - 2 } : { left: RING - 2 }, { backgroundColor: colors.overlay, borderColor: colors.accent }]}>
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
  demoTag: { position: 'absolute', left: 10, bottom: 10 },
  demoTagText: { fontSize: 9 },
  spot: { position: 'absolute', width: RING, height: RING, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: RING, height: RING, borderRadius: RING / 2, borderWidth: 1.5 },
  dot: {
    width: DOT + 6,
    height: DOT + 6,
    borderRadius: (DOT + 6) / 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
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
