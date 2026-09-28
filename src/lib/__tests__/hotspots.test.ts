import type { Camera, Room } from '@/api/types';

import { declutter, floorAim, furnitureAim, MIN_DOT_SPACING, project, roomHotspots, wallAim } from '../hotspots';

const ASPECT = 1800 / 1350;

// Camera at the origin looking along +x, lens 16 mm.
const cam: Camera = { eye_m: [0, 0, 1.3], target_m: [10, 0, 1.3], lens_mm: 16 };

describe('project', () => {
  it('puts a point straight ahead at eye height on the centre column, shifted up by 0.09·aspect', () => {
    const p = project(cam, [4, 0, 1.3], ASPECT)!;
    expect(p.u).toBeCloseTo(0.5);
    expect(p.v).toBeCloseTo(0.5 - 0.09 * ASPECT);
    expect(p.z).toBeCloseTo(4);
  });

  it('maps +y (to the left when looking along +x) to smaller u', () => {
    // forward = (1,0) → right = (0,-1): a point at y=+1 is to the left.
    const p = project(cam, [4, 1, 1.3], ASPECT)!;
    expect(p.u).toBeCloseTo(0.5 - (16 / 36) * (1 / 4));
  });

  it('maps higher points to smaller v', () => {
    const low = project(cam, [4, 0, 0], ASPECT)!;
    const high = project(cam, [4, 0, 2.5], ASPECT)!;
    expect(high.v).toBeLessThan(low.v);
    expect(low.v).toBeCloseTo(0.5 - ((16 / 36) * (-1.3 / 4) + 0.09) * ASPECT);
  });

  it('returns null behind or too close to the camera', () => {
    expect(project(cam, [-1, 0, 1], ASPECT)).toBeNull();
    expect(project(cam, [0.2, 0, 1], ASPECT)).toBeNull();
  });

  it('defaults to a 16 mm lens and ignores target height', () => {
    const a = project({ eye_m: [0, 0, 1.3], target_m: [5, 0, 0] }, [4, 1, 1], ASPECT)!;
    const b = project(cam, [4, 1, 1], ASPECT)!;
    expect(a.u).toBeCloseTo(b.u);
    expect(a.v).toBeCloseTo(b.v);
  });
});

describe('furnitureAim', () => {
  it('aims at the box centre at 62% of its height', () => {
    expect(furnitureAim([1, 1, 0], [3, 2, 1], cam.eye_m)).toEqual([2, 1.5, 0.62]);
  });

  it('aims at the near edge of a flat item, slightly inside, at its top', () => {
    const [x, y, z] = furnitureAim([2, -1, 0], [4, 1, 0.01], cam.eye_m);
    expect(x).toBeCloseTo(2.15); // near edge is x=2 from a camera at x=0
    expect(y).toBeCloseTo(0); // camera is within the rug's y span
    expect(z).toBeCloseTo(0.01);
  });
});

describe('floorAim / wallAim', () => {
  const rect: Room['rect_m'] = [-0.2, -3, 6, 3];

  it('picks a floor point ahead of the camera near v = 0.72', () => {
    const p = floorAim(cam, rect, ASPECT)!;
    expect(p.z).toBeGreaterThanOrEqual(1.7 - 1e-9);
    expect(p.z).toBeLessThanOrEqual(5 + 1e-9);
    expect(p.u).toBeCloseTo(0.5);
    // Nothing in the 0.1 m sampling grid beats it.
    for (let d = 1.7; d <= 5; d += 0.1) {
      const q = project(cam, [d, 0, 0], ASPECT)!;
      expect(Math.abs(p.v - 0.72)).toBeLessThanOrEqual(Math.abs(q.v - 0.72) + 1e-12);
    }
  });

  it('only uses floor points inside the room', () => {
    const p = floorAim(cam, [-0.2, -3, 2.5, 3], ASPECT)!;
    expect(p.z).toBeLessThanOrEqual(2.5);
  });

  it('puts the wall point where the view leaves the room, at 1.95 m', () => {
    expect(wallAim(cam, rect)).toEqual([6, 0, 1.95]);
    const diag: Camera = { eye_m: [0, 0, 1.3], target_m: [1, 1, 1.3] };
    const [x, y] = wallAim(diag, [-1, -1, 4, 2])!;
    expect(x).toBeCloseTo(2);
    expect(y).toBeCloseTo(2);
  });

  it('accepts rectangles given in either corner order', () => {
    expect(wallAim(cam, [6, 3, -0.2, -3])).toEqual([6, 0, 1.95]);
  });
});

describe('declutter', () => {
  const dot = (u: number, v: number, z: number) => ({ u, v, z });

  it('drops dots outside the safe frame', () => {
    const kept = declutter([dot(0.03, 0.5, 1), dot(0.5, 0.96, 1), dot(0.5, 0.5, 1)], ASPECT);
    expect(kept).toEqual([dot(0.5, 0.5, 1)]);
  });

  it('keeps the nearest of overlapping dots', () => {
    const far = dot(0.5, 0.5, 5);
    const near = dot(0.52, 0.5, 2);
    expect(declutter([far, near], ASPECT)).toEqual([near]);
  });

  it('measures vertical spacing in width units', () => {
    // 0.07 of height is 0.07/aspect ≈ 0.0525 of width: too close.
    const kept = declutter([dot(0.5, 0.5, 1), dot(0.5, 0.57, 2)], ASPECT);
    expect(kept).toHaveLength(1);
    const apart = declutter([dot(0.5, 0.5, 1), dot(0.5, 0.5 + (MIN_DOT_SPACING + 0.01) * ASPECT, 2)], ASPECT);
    expect(apart).toHaveLength(2);
  });
});

describe('roomHotspots', () => {
  const room: Room = {
    index: 3,
    label: 'living and dining',
    title: 'Living and dining',
    area_m2: 30,
    rect_m: [-0.2, -3, 6, 3],
    views: [],
    pieces: [0, 1, 2, 3].map((i) => ({
      key: `r3|dining_chair|${i}`,
      asset: 'dining_chair',
      name: 'Dining chair',
      model: 'm.blend',
      colour: '#333333',
      price: 3000,
      lo: [4 + (i % 2) * 0.8, -1 + Math.floor(i / 2) * 1.6, 0] as [number, number, number],
      hi: [4.45 + (i % 2) * 0.8, -0.55 + Math.floor(i / 2) * 1.6, 0.9] as [number, number, number],
      swappable: true,
    })),
    dressing: [],
  };

  it('groups pieces by asset into one dot that targets them all', () => {
    const dots = roomHotspots(room, cam, ASPECT);
    const chairs = dots.filter((d) => d.target.kind === 'furniture');
    expect(chairs).toHaveLength(1);
    expect(chairs[0].target).toEqual({
      kind: 'furniture',
      asset: 'dining_chair',
      items: ['r3|dining_chair|0', 'r3|dining_chair|1', 'r3|dining_chair|2', 'r3|dining_chair|3'],
    });
    expect(chairs[0].label).toBe('Dining chair ×4');
  });

  it('adds floor and wall dots', () => {
    const kinds = roomHotspots(room, cam, ASPECT).map((d) => d.target.kind);
    expect(kinds).toContain('floor');
    expect(kinds).toContain('wall');
  });
});
