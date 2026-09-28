import { Image } from 'expo-image';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Polyline, Rect } from 'react-native-svg';

import { DemoClsrApi, framePath, type ClsrApi, type Room, type View as FrameView } from '@/api';
import type { Hotspot } from '@/lib/hotspots';
import { roomWireframe } from '@/lib/wireframe';
import { useAppTheme } from '@/theme';

import { AppText } from './ui';

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
      source={{ uri: api.resolve(framePath(number, view.image, bust)) }}
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
  return <Image source={{ uri: api.resolve(path) }} style={{ width, height }} contentFit="cover" transition={150} />;
}

function DemoFrame({ room, view, width, height }: { room: Room; view: FrameView; width: number; height: number }) {
  const strokes = useMemo(() => roomWireframe(room, view.camera, FRAME_ASPECT), [room, view]);
  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Rect x={0} y={0} width={width} height={height} fill="#EFEAE3" />
        {strokes.map((s, i) => (
          <Polyline
            key={i}
            points={s.points.map(([u, v]) => `${u * width},${v * height}`).join(' ')}
            stroke={s.colour}
            strokeWidth={s.width}
            strokeLinejoin="round"
            fill="none"
          />
        ))}
      </Svg>
      {width >= 240 && (
        <View style={styles.demoTag}>
          <AppText variant="caption" style={styles.demoTagText}>
            Demo frame · drawn from camera data
          </AppText>
        </View>
      )}
    </View>
  );
}

const DOT = 26;

/** Tappable dots over a frame. Positions come from `roomHotspots`. */
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
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {hotspots.map((h) => {
        const selected = h.id === selectedId;
        const queued = queuedIds?.has(h.id);
        return (
          <Pressable
            key={h.id}
            accessibilityRole="button"
            accessibilityLabel={`Change ${h.label}`}
            hitSlop={10}
            onPress={() => onPress(h)}
            style={[
              styles.dot,
              {
                left: h.u * width - DOT / 2,
                top: h.v * height - DOT / 2,
                borderColor: selected ? colors.accent : '#FFFFFF',
                backgroundColor: selected || queued ? colors.accent : 'rgba(20,19,17,0.45)',
              },
            ]}>
            <View style={[styles.dotCore, { backgroundColor: queued ? '#FFFFFF' : selected ? '#FFFFFF' : colors.accent }]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  demoTag: { position: 'absolute', left: 8, bottom: 8, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  demoTagText: { color: '#fff', fontSize: 11 },
  dot: {
    position: 'absolute',
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  dotCore: { width: 8, height: 8, borderRadius: 4 },
});
