import { framePath, type ClsrApi } from './client';
import { ClsrError } from './errors';
import type { Costs, Dressing, Piece, Project, ProjectSummary, Room, Vec3, View } from './types';

/**
 * Sample data in the exact shape of the CLSR API, used when no server is
 * configured. There are no real photos; the app draws frames from the camera
 * and geometry below using the same projection as the hotspots.
 */

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function piece(room: number, asset: string, i: number, name: string, price: number, colour: string, lo: Vec3, hi: Vec3): Piece {
  return { key: `r${room}|${asset}|${i}`, asset, name, model: `funiture/demo/${asset}.blend`, colour, price, lo, hi, swappable: true };
}

function view(stem: string, lens: number, wall: string, eye: Vec3, target: Vec3): View {
  return { stem, image: `${stem}_L${lens}.png`, lens, camera: { eye_m: eye, target_m: target, lens_mm: lens, wall } };
}

function art(room: number, name: string, at: Vec3, width: number): Dressing {
  return { name, kind: 'art', role: 'art', label: 'Picture', at, current: 'designs/modern/art/demo.jpg', frame: 'black', width, room };
}

const LIVING: Room = {
  index: 3,
  label: 'living and dining',
  title: 'Living and dining',
  area_m2: 31.9,
  rect_m: [0, 0, 6.38, 5.0],
  views: [
    view('03_living_and_dining_NW', 16, 'NW', [0.35, 4.65, 1.3], [5.6, 0.9, 1.3]),
    view('03_living_and_dining_SE', 16, 'SE', [6.03, 0.35, 1.3], [1.0, 4.3, 1.3]),
  ],
  pieces: [
    piece(3, 'sofa', 0, 'Sofa', 38000, '#55595c', [0.9, 0.15, 0], [3.3, 1.1, 0.85]),
    piece(3, 'coffee_table', 0, 'Coffee table', 9500, '#8a6a4f', [1.55, 1.55, 0], [2.65, 2.15, 0.42]),
    piece(3, 'armchair', 0, 'Armchair', 14500, '#b9a58c', [3.6, 0.5, 0], [4.4, 1.3, 0.8]),
    piece(3, 'rug', 0, 'Rug', 7200, '#d8cfc2', [1.1, 1.3, 0], [3.1, 2.8, 0.01]),
    piece(3, 'tv_unit', 0, 'TV unit', 11000, '#3b3633', [1.2, 4.55, 0], [3.2, 4.95, 0.5]),
    piece(3, 'dining_table', 0, 'Dining table', 16000, '#7b5a40', [4.4, 2.9, 0], [6.0, 3.9, 0.76]),
    ...[
      [4.55, 2.4],
      [5.4, 2.4],
      [4.55, 3.95],
      [5.4, 3.95],
    ].map(([x, y], i) => piece(3, 'dining_chair', i, 'Dining chair', 3200, '#2f2c2a', [x, y, 0], [x + 0.45, y + 0.45, 0.9])),
  ],
  dressing: [
    art(3, 'Art_sofa_3', [2.1, 0.03, 1.55], 0.56),
    { name: 'Pendant_dining', kind: 'pendant', role: 'pendant', label: 'Pendant light', at: [5.2, 3.4, 2.05], current: 'designs/modern/pendant/globe.blend', room: 3 },
    { name: 'Plant_corner', kind: 'model', role: 'plant', label: 'Plant', at: [0.35, 0.35, 0.7], current: 'designs/modern/plant/fig.blend', room: 3 },
  ],
};

const BEDROOM: Room = {
  index: 6,
  label: 'bedroom',
  title: 'Bedroom',
  area_m2: 14.4,
  rect_m: [6.5, 0, 10.3, 3.8],
  views: [view('06_bedroom_E', 16, 'E', [10.0, 1.9, 1.3], [6.5, 1.9, 1.3]), view('06_bedroom_NE', 24, 'NE', [10.0, 3.5, 1.3], [7.0, 1.0, 1.3])],
  pieces: [
    piece(6, 'bed', 0, 'Bed', 42000, '#cfc6ba', [6.55, 0.9, 0], [8.65, 2.9, 0.95]),
    piece(6, 'nightstand', 0, 'Nightstand', 4800, '#8a6a4f', [6.55, 0.35, 0], [7.0, 0.8, 0.55]),
    piece(6, 'nightstand', 1, 'Nightstand', 4800, '#8a6a4f', [6.55, 3.0, 0], [7.0, 3.45, 0.55]),
    piece(6, 'rug', 0, 'Rug', 5400, '#e3dbd0', [7.4, 0.7, 0], [9.4, 3.1, 0.01]),
    piece(6, 'wardrobe', 0, 'Wardrobe', 27000, '#efe9e1', [9.3, 3.2, 0], [10.25, 3.75, 2.2]),
  ],
  dressing: [art(6, 'Art_bed_1', [6.52, 1.9, 1.55], 0.9)],
};

const BATHROOM: Room = {
  index: 1,
  label: 'bathroom',
  title: 'Bathroom',
  area_m2: 5.3,
  rect_m: [0, 5.1, 2.4, 7.3],
  views: [view('01_bathroom_N', 16, 'N', [1.2, 7.05, 1.3], [1.2, 5.1, 1.3])],
  pieces: [
    piece(1, 'vanity', 0, 'Vanity', 12500, '#e7e1d8', [0.1, 5.15, 0], [1.0, 5.65, 0.85]),
    piece(1, 'toilet', 0, 'Toilet', 6800, '#fafafa', [1.6, 5.15, 0], [2.0, 5.85, 0.8]),
  ],
  dressing: [],
};

const ROOMS = [BATHROOM, LIVING, BEDROOM];

function costs(tier: Costs['tier']): Costs {
  const rooms = ROOMS.map((r) => ({
    room: r.index,
    title: r.title,
    subtotal: r.pieces.reduce((s, p) => s + p.price, 0) + Math.round(r.area_m2 * 1450),
  }));
  return { currency: 'EGP', tier, total: rooms.reduce((s, r) => s + r.subtotal, 0), budget: null, estimated: true, quoted_lines: 0, rooms };
}

const PROJECTS: { number: number; style: string; created: string }[] = [
  { number: 28, style: 'japandi', created: '2026-09-26T18:20:11' },
  { number: 27, style: 'modern', created: '2026-09-25T04:41:02' },
];

export class DemoClsrApi implements ClsrApi {
  readonly isDemo = true;

  resolve(path: string) {
    return path;
  }

  /** The room and view a demo frame path refers to, so it can be drawn instead of loaded. */
  frameFor(path: string): { room: Room; view: View } | undefined {
    const image = path.split('?')[0].split('/').pop();
    for (const room of ROOMS) {
      const view = room.views.find((v) => v.image === image);
      if (view) return { room, view };
    }
    return undefined;
  }

  async health() {
    return { coohom: true, ollama: true, blender: true };
  }

  async projects(): Promise<ProjectSummary[]> {
    await delay(300);
    return PROJECTS.map((p) => ({
      ...p,
      rooms: ROOMS.length,
      frames: ROOMS.reduce((s, r) => s + r.views.length, 0),
      labels: ROOMS.map((r) => r.label),
      cover: framePath(p.number, '06_bedroom_NE_L24.png'),
    }));
  }

  async project(n: number): Promise<Project> {
    await delay(300);
    const meta = PROJECTS.find((p) => p.number === n);
    if (!meta) throw new ClsrError('not_found', `No flat ${n}`, 404);
    return {
      number: n,
      style: meta.style,
      pack: meta.style,
      camera_height_m: 1.3,
      hero: '03_living_and_dining_NW_L16',
      costs: costs('comfort'),
      rooms: ROOMS,
      job: null,
      history: [],
    };
  }

  async job() {
    return { job: null, history: [] };
  }

  async costs(_n: number, tier: Costs['tier'] = 'comfort') {
    return costs(tier);
  }

  private unsupported(): never {
    throw new ClsrError('unsupported', 'Not available in demo mode. Connect to a CLSR server to use this.');
  }

  catalog = async () => this.unsupported();
  dressing = async () => this.unsupported();
  finishes = async () => this.unsupported();
  styles = async () => this.unsupported();
  colours = async () => this.unsupported();
  palette = async () => this.unsupported();
  status = async () => this.unsupported();
  batch = async () => this.unsupported();
  undo = async () => this.unsupported();
  upload = async () => this.unsupported();
}
