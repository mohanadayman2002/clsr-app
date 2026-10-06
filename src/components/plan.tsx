import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, Path, Pattern, Rect } from 'react-native-svg';

import type { Room } from '@/api';
import { typography, useAppTheme } from '@/theme';

/** Half the horizontal field of view for a 36 mm-wide sensor. */
const halfFov = (lens: number) => Math.atan(18 / (lens || 16));

interface Props {
  rooms: Room[];
  width: number;
  /** Room index to emphasise. */
  highlightRoom?: number;
  /** View stem whose camera is "you are here". */
  activeView?: string;
  /** Small, label-free version for overlays. */
  compact?: boolean;
  onRoomPress?: (room: Room) => void;
  onViewPress?: (room: Room, viewIndex: number) => void;
}

/**
 * The flat drawn from each room's rect_m, north up, with a cone for every
 * camera. Rooms and cameras are tappable.
 */
export function FloorPlan({ rooms, width, highlightRoom, activeView, compact, onRoomPress, onViewPress }: Props) {
  const { colors } = useAppTheme();

  const geo = useMemo(() => {
    const rects = rooms.map((r) => {
      const [a, b, c, d] = r.rect_m;
      return { room: r, x0: Math.min(a, c), y0: Math.min(b, d), x1: Math.max(a, c), y1: Math.max(b, d) };
    });
    const minX = Math.min(...rects.map((r) => r.x0));
    const maxX = Math.max(...rects.map((r) => r.x1));
    const minY = Math.min(...rects.map((r) => r.y0));
    const maxY = Math.max(...rects.map((r) => r.y1));
    const pad = compact ? 0.35 : 0.5;
    const top = compact ? pad : 1.1; // room for the dimension line
    const scale = width / (maxX - minX + pad * 2);
    const height = (maxY - minY + pad + top) * scale;
    // World y points north, screen y points down.
    const at = (x: number, y: number): [number, number] => [(x - minX + pad) * scale, (maxY - y + top) * scale];
    return { rects, minX, maxX, maxY, scale, height, at, top };
  }, [rooms, width, compact]);

  const { rects, scale, height, at } = geo;
  const wall = compact ? 1.25 : 2;

  const cones = rooms.flatMap((room) =>
    room.views.map((view, i) => {
      const { eye_m: e, target_m: t } = view.camera;
      const heading = Math.atan2(t[1] - e[1], t[0] - e[0]);
      const half = halfFov(view.camera.lens_mm ?? view.lens);
      const length = compact ? 1.4 : 1.1;
      const p = (angle: number) => at(e[0] + Math.cos(angle) * length, e[1] + Math.sin(angle) * length);
      const [ex, ey] = at(e[0], e[1]);
      const [lx, ly] = p(heading + half);
      const [rx, ry] = p(heading - half);
      return { key: view.stem, room, index: i, ex, ey, d: `M${ex},${ey} L${lx},${ly} L${rx},${ry} Z`, active: view.stem === activeView };
    }),
  );

  const [dimX0, dimY] = at(geo.minX, geo.maxY + geo.top * 0.55);
  const [dimX1] = at(geo.maxX, geo.maxY);

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Defs>
          <Pattern id="grid" width={scale * 0.5} height={scale * 0.5} patternUnits="userSpaceOnUse">
            <Circle cx={1} cy={1} r={0.8} fill={colors.textFaint} opacity={0.5} />
          </Pattern>
        </Defs>
        {!compact && <Rect width={width} height={height} fill="url(#grid)" />}

        {rects.map(({ room, x0, y0, x1, y1 }) => {
          const [ax, ay] = at(x0, y1);
          const [bx, by] = at(x1, y0);
          const lit = room.index === highlightRoom;
          return (
            <Rect
              key={room.index}
              x={ax}
              y={ay}
              width={bx - ax}
              height={by - ay}
              fill={lit ? colors.accentSoft : colors.surface}
              stroke={lit ? colors.accent : colors.line}
              strokeWidth={wall}
            />
          );
        })}

        {!compact && (
          <G>
            <Line x1={dimX0} y1={dimY} x2={dimX1} y2={dimY} stroke={colors.textFaint} strokeWidth={1} />
            <Line x1={dimX0} y1={dimY - 5} x2={dimX0} y2={dimY + 5} stroke={colors.textFaint} strokeWidth={1} />
            <Line x1={dimX1} y1={dimY - 5} x2={dimX1} y2={dimY + 5} stroke={colors.textFaint} strokeWidth={1} />
          </G>
        )}

        {cones.map((c) => (
          <G key={c.key}>
            <Path d={c.d} fill={colors.accent} opacity={c.active ? 0.55 : compact ? 0.18 : 0.22} />
            <Circle cx={c.ex} cy={c.ey} r={c.active ? 4 : 2.5} fill={c.active ? colors.accent : colors.text} />
          </G>
        ))}
      </Svg>

      {!compact && (
        <>
          <View style={[styles.dimLabel, { left: dimX0, width: dimX1 - dimX0, top: dimY - 18 }]} pointerEvents="none">
            <Text style={[typography.mono, styles.tiny, { color: colors.textMuted, backgroundColor: colors.background }]}>
              {(geo.maxX - geo.minX).toFixed(2)} m
            </Text>
          </View>
          <View style={[styles.north, { right: 6, top: 4 }]} pointerEvents="none">
            <Text style={[typography.overline, { color: colors.textMuted }]}>N ↑</Text>
          </View>
        </>
      )}

      {onRoomPress &&
        rects.map(({ room, x0, y0, x1, y1 }) => {
          const [ax, ay] = at(x0, y1);
          const [bx, by] = at(x1, y0);
          const small = bx - ax < 80 || by - ay < 48;
          return (
            <Pressable
              key={room.index}
              accessibilityRole="button"
              accessibilityLabel={`Open ${room.title}`}
              onPress={() => onRoomPress(room)}
              style={({ pressed }) => [
                styles.roomHit,
                { left: ax, top: ay, width: bx - ax, height: by - ay },
                pressed && { backgroundColor: colors.accentSoft },
              ]}>
              {!compact && (
                <View style={styles.roomLabel} pointerEvents="none">
                  <Text style={[typography.overline, { color: colors.text, fontSize: small ? 8 : 10 }]} numberOfLines={2}>
                    {room.title}
                  </Text>
                  <Text style={[typography.mono, styles.tiny, { color: colors.textMuted }]}>{room.area_m2} m²</Text>
                </View>
              )}
            </Pressable>
          );
        })}

      {onViewPress &&
        cones.map((c) => (
          <Pressable
            key={c.key}
            accessibilityRole="button"
            accessibilityLabel={`Open ${c.room.title} view ${c.index + 1}`}
            hitSlop={6}
            onPress={() => onViewPress(c.room, c.index)}
            style={[styles.camHit, { left: c.ex - 14, top: c.ey - 14 }]}
          />
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tiny: { fontSize: 10, lineHeight: 13, paddingHorizontal: 4 },
  dimLabel: { position: 'absolute', alignItems: 'center' },
  north: { position: 'absolute' },
  roomHit: { position: 'absolute', alignItems: 'center', justifyContent: 'center', padding: 4 },
  roomLabel: { alignItems: 'center', gap: 2 },
  camHit: { position: 'absolute', width: 28, height: 28, borderRadius: 14 },
});
