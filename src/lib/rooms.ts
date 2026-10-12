import type { Piece, Room } from '@/api/types';

/** Rough wall height for estimating paint and wall-finish areas. */
const WALL_HEIGHT_M = 2.7;

/**
 * Display names that stay distinct when titles repeat: a flat with four
 * bathrooms gets "Bathroom 1" … "Bathroom 4". Unique titles are left alone.
 */
export function roomNames(rooms: Room[]): Map<number, string> {
  const totals = new Map<string, number>();
  for (const r of rooms) totals.set(r.title, (totals.get(r.title) ?? 0) + 1);
  const seen = new Map<string, number>();
  const names = new Map<number, string>();
  for (const r of rooms) {
    if ((totals.get(r.title) ?? 0) < 2) {
      names.set(r.index, r.title);
    } else {
      const n = (seen.get(r.title) ?? 0) + 1;
      seen.set(r.title, n);
      names.set(r.index, `${r.title} ${n}`);
    }
  }
  return names;
}

/** Pieces grouped by asset, in the server's order: four dining chairs are one group. */
export function groupPieces(pieces: Piece[]): Map<string, Piece[]> {
  const groups = new Map<string, Piece[]>();
  for (const p of pieces) groups.set(p.asset, [...(groups.get(p.asset) ?? []), p]);
  return groups;
}

export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/** Area a floor or wall finish covers in a room, in m². Walls are estimated from the room's outline. */
export function finishArea(room: Room, target: 'floor' | 'wall'): number {
  if (target === 'floor') return room.area_m2;
  const [x0, y0, x1, y1] = room.rect_m;
  return 2 * (Math.abs(x1 - x0) + Math.abs(y1 - y0)) * WALL_HEIGHT_M;
}
