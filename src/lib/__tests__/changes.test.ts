import type { Dressing, Piece, Room } from '@/api/types';

import { artChange, colourChange, dressingModelChange, finishChange, swapChange } from '../changes';
import { finishArea, groupPieces, roomNames } from '../rooms';

const piece = (i: number): Piece => ({
  key: `r2|dining_chair|${i}`,
  asset: 'dining_chair',
  name: 'Dining chair',
  model: 'funiture/packs/neoclassic/Chair-Old.blend',
  colour: '#333333',
  price: 3000,
  lo: [0, 0, 0],
  hi: [0.5, 0.5, 0.9],
  swappable: true,
});

const art: Dressing = {
  kind: 'art',
  name: 'Art_bed_2',
  room: 2,
  role: 'art',
  label: 'Picture',
  at: [9.3, -5.4, 1.4],
  current: 'designs/neoclassic/art/cameo_0.jpg',
  frame: 'gold',
  width: 0.8,
};

const room = (index: number, title: string, rect: Room['rect_m'] = [0, 0, 4, 3]): Room => ({
  index,
  label: title.toLowerCase(),
  title,
  area_m2: 12,
  rect_m: rect,
  views: [],
  pieces: [piece(0), piece(1), piece(2), piece(3)],
  dressing: [art],
});

describe('roomNames', () => {
  it('numbers repeated titles and leaves unique ones alone', () => {
    const names = roomNames([room(0, 'Bathroom'), room(1, 'Bedroom'), room(2, 'Bathroom'), room(3, 'Living and dining')]);
    expect([...names.values()]).toEqual(['Bathroom 1', 'Bedroom', 'Bathroom 2', 'Living and dining']);
  });
});

describe('groupPieces', () => {
  it('groups by asset so four chairs are one entry', () => {
    const groups = groupPieces(room(2, 'Dining').pieces);
    expect(groups.get('dining_chair')).toHaveLength(4);
  });
});

describe('change payloads match the batch format in /api/docs', () => {
  const r = room(2, 'Bedroom');
  const chairs = r.pieces;

  it('swap: every piece key in items, catalogue id as model', () => {
    const q = swapChange(r, chairs, { id: 'funiture/packs/neoclassic/Chair-New One.blend', name: 'New One', price: 4500, source: 'pack', thumb: '/thumbs/x/Chair-New One.png' });
    expect(q.change).toEqual({
      kind: 'swap',
      items: ['r2|dining_chair|0', 'r2|dining_chair|1', 'r2|dining_chair|2', 'r2|dining_chair|3'],
      model: 'funiture/packs/neoclassic/Chair-New One.blend',
    });
    expect(q.delta).toBe((4500 - 3000) * 4);
  });

  it('colour: hex and name', () => {
    expect(colourChange(r, chairs, { name: 'Slate', hex: '#2f4f4f' }).change).toEqual({
      kind: 'colour',
      items: chairs.map((p) => p.key),
      colour: '#2f4f4f',
      name: 'Slate',
    });
  });

  it('finish: room, target and finish id', () => {
    const q = finishChange(r, 'wall', { id: 'paint_sage', label: 'Sage', kind: 'paint', target: 'wall', rate: 150, thumb: null, hex: '#8f9a80' });
    expect(q.change).toEqual({ kind: 'finish', room: 2, target: 'wall', finish: 'paint_sage' });
  });

  it('dressing art: choice uses `art` and `frame`, and later picks merge', () => {
    const print = artChange(r, art, { art: { id: 'designs/neoclassic/art/arches_2.jpg', label: 'Arches', thumb: null } });
    expect(print.change).toEqual({ kind: 'dressing', room: 2, piece: 'Art_bed_2', choice: { art: 'designs/neoclassic/art/arches_2.jpg' } });
    expect(print.thumb).toBe('/art/designs/neoclassic/art/arches_2.jpg');

    const both = artChange(r, art, { frame: { id: 'black', label: 'Black' } }, print);
    expect(both.change).toEqual({
      kind: 'dressing',
      room: 2,
      piece: 'Art_bed_2',
      choice: { art: 'designs/neoclassic/art/arches_2.jpg', frame: 'black' },
    });
    expect(both.title).toBe('Picture → Arches · Black frame');
    expect(both.target).toBe(print.target);
  });

  it('dressing model: choice uses `model`', () => {
    const lamp: Dressing = { ...art, kind: 'model', name: 'Lamp_1', role: 'floor_lamp', label: 'Floor lamp' };
    expect(dressingModelChange(r, lamp, { id: 'funiture/lamps/Arc.blend', label: 'Arc', thumb: null }).change).toEqual({
      kind: 'dressing',
      room: 2,
      piece: 'Lamp_1',
      choice: { model: 'funiture/lamps/Arc.blend' },
    });
  });
});

describe('finishArea', () => {
  it('uses floor area for floors and perimeter × 2.7 m for walls', () => {
    const r = room(1, 'Bedroom', [7.5, -7.6, 11, -5]);
    expect(finishArea(r, 'floor')).toBe(12);
    expect(finishArea(r, 'wall')).toBeCloseTo(2 * (3.5 + 2.6) * 2.7);
  });
});
