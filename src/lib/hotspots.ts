import type { Camera, Room, Vec3 } from '@/api/types';

/**
 * Hotspot placement for CLSR frames.
 *
 * Cameras are level, with a 36 mm sensor fitted to the image width and the frame
 * shifted down by 0.09 of the width. `project` is the server's reference
 * implementation; keep it byte-for-byte equivalent.
 */

export interface Projection {
  /** 0..1 across the image width. */
  u: number;
  /** 0..1 down the image height. */
  v: number;
  /** Depth along the view direction, metres. */
  z: number;
}

export function project(cam: Camera, p: Vec3, aspect: number): Projection | null {
  const e = cam.eye_m;
  const t = cam.target_m;
  const f = (cam.lens_mm || 16) / 36;
  let fx = t[0] - e[0];
  let fy = t[1] - e[1];
  const n = Math.hypot(fx, fy);
  fx /= n;
  fy /= n;
  const rx = fy;
  const ry = -fx; // right = forward × up
  const vx = p[0] - e[0];
  const vy = p[1] - e[1];
  const vz = p[2] - e[2];
  const z = vx * fx + vy * fy; // depth along view direction
  if (z < 0.25) return null; // behind or too close
  const x = vx * rx + vy * ry;
  return { u: 0.5 + (f * x) / z, v: 0.5 - ((f * vz) / z + 0.09) * aspect, z };
}

export type HotspotTarget =
  /** One dot per asset: changes every piece with that asset in the room (e.g. all dining chairs). */
  | { kind: 'furniture'; asset: string; items: string[] }
  | { kind: 'dressing'; piece: string }
  | { kind: 'floor' }
  | { kind: 'wall' };

export interface Hotspot extends Projection {
  id: string;
  label: string;
  target: HotspotTarget;
}

/** Items with a height below this are flat (rugs) and aimed at their near edge. */
const FLAT_HEIGHT_M = 0.05;
/** How far inside a flat item's edge its dot sits. */
const FLAT_INSET_M = 0.15;
const FURNITURE_HEIGHT_FRACTION = 0.62;
const FLOOR_MIN_M = 1.7;
const FLOOR_MAX_M = 5;
const FLOOR_STEP_M = 0.1;
const FLOOR_TARGET_V = 0.72;
const WALL_HEIGHT_M = 1.95;
const U_RANGE: [number, number] = [0.04, 0.96];
const V_RANGE: [number, number] = [0.05, 0.95];
/** Minimum spacing between dots, in image-width units. */
export const MIN_DOT_SPACING = 0.065;

type Rect = { x0: number; y0: number; x1: number; y1: number };

function toRect(r: Room['rect_m']): Rect {
  return { x0: Math.min(r[0], r[2]), y0: Math.min(r[1], r[3]), x1: Math.max(r[0], r[2]), y1: Math.max(r[1], r[3]) };
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

function forward(cam: Camera): [number, number] {
  const fx = cam.target_m[0] - cam.eye_m[0];
  const fy = cam.target_m[1] - cam.eye_m[1];
  const n = Math.hypot(fx, fy);
  return [fx / n, fy / n];
}

/** Aim point for a piece of furniture given its bounding box. */
export function furnitureAim(lo: Vec3, hi: Vec3, eye: Vec3): Vec3 {
  const height = hi[2] - lo[2];
  if (height >= FLAT_HEIGHT_M) {
    return [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, lo[2] + height * FURNITURE_HEIGHT_FRACTION];
  }
  // Flat item: the point of its footprint nearest the camera, pulled a little inside.
  const aim = (axis: 0 | 1): number => {
    const a = Math.min(lo[axis], hi[axis]);
    const b = Math.max(lo[axis], hi[axis]);
    const inset = Math.min(FLAT_INSET_M, (b - a) / 4);
    return clamp(eye[axis], a + inset, b - inset);
  };
  return [aim(0), aim(1), hi[2]];
}

/** Floor aim: a point 1.7–5 m ahead, inside the room, whose projection lands nearest v ≈ 0.72. */
export function floorAim(cam: Camera, rect: Room['rect_m'], aspect: number): Projection | null {
  const r = toRect(rect);
  const [fx, fy] = forward(cam);
  let best: Projection | null = null;
  for (let d = FLOOR_MIN_M; d <= FLOOR_MAX_M + 1e-9; d += FLOOR_STEP_M) {
    const x = cam.eye_m[0] + fx * d;
    const y = cam.eye_m[1] + fy * d;
    if (x < r.x0 || x > r.x1 || y < r.y0 || y > r.y1) continue;
    const p = project(cam, [x, y, 0], aspect);
    if (p && (!best || Math.abs(p.v - FLOOR_TARGET_V) < Math.abs(best.v - FLOOR_TARGET_V))) best = p;
  }
  return best;
}

/** Wall aim: where the view direction leaves the room rectangle, at z ≈ 1.95 m. */
export function wallAim(cam: Camera, rect: Room['rect_m']): Vec3 | null {
  const r = toRect(rect);
  const [fx, fy] = forward(cam);
  const [ex, ey] = cam.eye_m;
  // Ray/box exit: the smallest positive distance to a boundary in the direction of travel.
  const exits: number[] = [];
  if (fx > 1e-9) exits.push((r.x1 - ex) / fx);
  if (fx < -1e-9) exits.push((r.x0 - ex) / fx);
  if (fy > 1e-9) exits.push((r.y1 - ey) / fy);
  if (fy < -1e-9) exits.push((r.y0 - ey) / fy);
  const t = Math.min(...exits.filter((d) => d > 0));
  if (!Number.isFinite(t)) return null;
  return [ex + fx * t, ey + fy * t, WALL_HEIGHT_M];
}

const inFrame = (p: Projection) => p.u >= U_RANGE[0] && p.u <= U_RANGE[1] && p.v >= V_RANGE[0] && p.v <= V_RANGE[1];

/**
 * Drops dots outside the safe frame, then keeps the nearest of any dots closer
 * than `MIN_DOT_SPACING` (measured in width units, so v is scaled by 1/aspect).
 */
export function declutter<T extends Projection>(dots: T[], aspect: number, spacing = MIN_DOT_SPACING): T[] {
  const kept: T[] = [];
  for (const dot of dots.filter(inFrame).sort((a, b) => a.z - b.z)) {
    const clash = kept.some((k) => Math.hypot(dot.u - k.u, (dot.v - k.v) / aspect) < spacing);
    if (!clash) kept.push(dot);
  }
  return kept;
}

/** All tappable dots for one view of a room. */
export function roomHotspots(room: Room, cam: Camera, aspect: number): Hotspot[] {
  const candidates: Hotspot[] = [];

  // Furniture, grouped by asset: the dot sits on the nearest visible member of the group.
  const groups = new Map<string, Room['pieces']>();
  for (const piece of room.pieces) {
    if (!piece.swappable) continue;
    groups.set(piece.asset, [...(groups.get(piece.asset) ?? []), piece]);
  }
  for (const [asset, pieces] of groups) {
    const visible = pieces
      .map((p) => project(cam, furnitureAim(p.lo, p.hi, cam.eye_m), aspect))
      .filter((p): p is Projection => !!p && inFrame(p))
      .sort((a, b) => a.z - b.z);
    if (!visible[0]) continue;
    const count = pieces.length;
    candidates.push({
      ...visible[0],
      id: `furniture:${asset}`,
      label: count > 1 ? `${pieces[0].name} ×${count}` : pieces[0].name,
      target: { kind: 'furniture', asset, items: pieces.map((p) => p.key) },
    });
  }

  for (const d of room.dressing) {
    const p = project(cam, d.at, aspect);
    if (p) candidates.push({ ...p, id: `dressing:${d.name}`, label: d.label, target: { kind: 'dressing', piece: d.name } });
  }

  const floor = floorAim(cam, room.rect_m, aspect);
  if (floor) candidates.push({ ...floor, id: 'floor', label: 'Floor', target: { kind: 'floor' } });

  const wallPoint = wallAim(cam, room.rect_m);
  const wall = wallPoint && project(cam, wallPoint, aspect);
  if (wall) candidates.push({ ...wall, id: 'wall', label: 'Walls', target: { kind: 'wall' } });

  return declutter(candidates, aspect);
}
