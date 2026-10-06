import type { Camera, Room, Vec3 } from '@/api/types';

import { project } from './hotspots';

const CEILING_M = 2.7;
const SAMPLES = 32;

export interface Stroke {
  points: [number, number][];
  kind: 'shell' | 'piece' | 'art';
  /** The item's own colour (pieces only). */
  colour?: string;
}

/**
 * Projects a 3D segment into image-fraction coordinates. The segment is
 * sampled so parts behind the camera are cut rather than wrapped.
 */
function segment(cam: Camera, a: Vec3, b: Vec3, aspect: number): [number, number][][] {
  const runs: [number, number][][] = [];
  let run: [number, number][] = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const t = i / SAMPLES;
    const p = project(cam, [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t], aspect);
    if (p) run.push([p.u, p.v]);
    else if (run.length) {
      runs.push(run);
      run = [];
    }
  }
  if (run.length > 1) runs.push(run);
  return runs;
}

function box(lo: Vec3, hi: Vec3): [Vec3, Vec3][] {
  const [x0, y0, z0] = lo;
  const [x1, y1, z1] = hi;
  const c = (x: number, y: number, z: number): Vec3 => [x, y, z];
  const bottom = [c(x0, y0, z0), c(x1, y0, z0), c(x1, y1, z0), c(x0, y1, z0)];
  const top = [c(x0, y0, z1), c(x1, y0, z1), c(x1, y1, z1), c(x0, y1, z1)];
  const edges: [Vec3, Vec3][] = [];
  for (let i = 0; i < 4; i++) {
    edges.push([bottom[i], bottom[(i + 1) % 4]], [top[i], top[(i + 1) % 4]], [bottom[i], top[i]]);
  }
  return edges;
}

/** Line drawing of a room from a camera: walls, furniture boxes and pictures. Demo mode only. */
export function roomWireframe(room: Room, cam: Camera, aspect: number): Stroke[] {
  const strokes: Stroke[] = [];
  const add = (edges: [Vec3, Vec3][], kind: Stroke['kind'], colour?: string) => {
    for (const [a, b] of edges) {
      for (const points of segment(cam, a, b, aspect)) strokes.push({ points, kind, colour });
    }
  };

  const [x0, y0, x1, y1] = room.rect_m;
  add(box([Math.min(x0, x1), Math.min(y0, y1), 0], [Math.max(x0, x1), Math.max(y0, y1), CEILING_M]), 'shell');

  for (const p of room.pieces) add(box(p.lo, p.hi), 'piece', p.colour);

  for (const d of room.dressing) {
    if (d.kind !== 'art') continue;
    const w = (d.width ?? 0.6) / 2;
    const h = w * 0.75;
    // Hang the picture flat against whichever wall it is closest to.
    const onXWall = Math.min(Math.abs(d.at[0] - x0), Math.abs(d.at[0] - x1)) < Math.min(Math.abs(d.at[1] - y0), Math.abs(d.at[1] - y1));
    const [ax, ay, az] = d.at;
    const lo: Vec3 = onXWall ? [ax, ay - w, az - h] : [ax - w, ay, az - h];
    const hi: Vec3 = onXWall ? [ax, ay + w, az + h] : [ax + w, ay, az + h];
    add(box(lo, hi), 'art');
  }
  return strokes;
}
