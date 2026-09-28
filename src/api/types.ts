/**
 * Types for the CLSR Studio HTTP API (JSON over plain HTTP, default port 8765).
 * These mirror the server payloads exactly; UI-only shapes live elsewhere.
 */

export type Vec3 = [number, number, number];
export type Tier = 'budget' | 'comfort' | 'premium';
export type Quality = 'draft' | 'preview' | 'final';

export interface Health {
  coohom: boolean;
  ollama: boolean;
  blender: boolean;
}

/** An entry of GET /api/projects. */
export interface ProjectSummary {
  number: number;
  created: string;
  style: string;
  rooms: number;
  frames: number;
  labels: string[];
  /** Server path of the cover frame, e.g. /runs/0028/result/final/frames/02_bedroom_NE_L24.png */
  cover: string | null;
}

export interface Camera {
  eye_m: Vec3;
  target_m: Vec3;
  lens_mm?: number;
  wall?: string;
}

export interface View {
  /** Frame name without lens suffix, e.g. 03_living_and_dining_NW. Used as `view` in batch. */
  stem: string;
  /** File name under /runs/<nnnn>/result/final/frames/. */
  image: string;
  lens: number;
  camera: Camera;
}

export interface Piece {
  /** e.g. "r3|sofa|0" */
  key: string;
  asset: string;
  name: string;
  model: string;
  colour: string;
  price: number;
  lo: Vec3;
  hi: Vec3;
  swappable: boolean;
}

export type DressingKind = 'art' | 'model' | 'pendant';

export interface Dressing {
  name: string;
  kind: DressingKind;
  role: string;
  label: string;
  at: Vec3;
  current: string;
  frame?: string;
  width?: number;
  room: number;
}

export interface Room {
  index: number;
  label: string;
  title: string;
  area_m2: number;
  /** [x0, y0, x1, y1] in metres. */
  rect_m: [number, number, number, number];
  views: View[];
  pieces: Piece[];
  dressing: Dressing[];
}

export interface CostRoom {
  room: number;
  title: string;
  subtotal: number;
  lines?: CostLine[];
}

export interface CostLine {
  what: string;
  role: string;
  count: number;
  each: number;
  amount: number;
  source: 'quoted' | 'estimated';
}

export interface Costs {
  currency: string;
  tier: Tier;
  total: number;
  budget: number | null;
  estimated: boolean;
  quoted_lines: number;
  rooms: CostRoom[];
}

export type JobKind = 'batch' | 'swap' | 'colour' | 'finish' | 'dressing';
export type JobStage = 'saving' | 'swap' | 'restyle' | 'render' | 'board' | 'done' | 'error';

export interface Job {
  id: string;
  kind: JobKind;
  status: 'running' | 'done' | 'error';
  stage: JobStage;
  quality: Quality;
  room?: number;
  model_name?: string;
  frames: string[];
  done_frames: number;
  message?: string;
  changes?: Change[];
  started?: number;
  finished?: number;
}

/** GET /api/project/<n> */
export interface Project {
  number: number;
  style: string;
  pack: string;
  camera_height_m: number;
  hero: string;
  costs: Costs;
  rooms: Room[];
  job: Job | null;
  history: Job[];
}

export interface JobState {
  job: Job | null;
  history: Job[];
}

export type Change =
  | { kind: 'swap'; items: string[]; model: string }
  | { kind: 'colour'; items: string[]; colour: string; name?: string }
  | { kind: 'finish'; room: number; target: 'floor' | 'wall'; finish: string }
  | {
      kind: 'dressing';
      room: number;
      piece: string;
      choice: { image: string } | { frame: string } | { model: string };
    };

export interface BuildStatus {
  number: number;
  status: string;
  error: string | null;
  mode: string;
  style: string;
  measurement?: unknown;
  build?: unknown;
  log: string[];
}

export interface Style {
  key: string;
  label: string;
  label_ar?: string;
  pack_label?: string;
  pack_exact?: boolean;
  swatch: string[];
  thesis?: string;
}

export interface CatalogModel {
  id: string;
  name: string;
  price: number;
  author?: string;
  licence?: string;
  url?: string;
  source: 'pack' | 'library';
  thumb: string | null;
}

export interface Catalog {
  asset: string;
  name: string;
  pack: string;
  models: CatalogModel[];
}

export interface DressingOption {
  id: string;
  kind?: string;
  label: string;
  pack?: string;
  price?: number;
  author?: string;
  source?: string;
  thumb: string | null;
}

export interface DressingCatalog {
  kind: string;
  role?: string;
  options: DressingOption[];
  frames?: { id: string; label: string }[];
}

export interface Finish {
  id: string;
  label: string;
  kind: 'scan' | 'paint';
  target: 'floor' | 'wall';
  /** EGP per m². */
  rate: number;
  size_m?: number;
  thumb: string | null;
  credit?: string;
  hex?: string;
}

export interface Colour {
  name: string;
  hex: string;
}

export interface Palette {
  style: string;
  pack: string;
  parts: { key: string; label: string; hex: string }[];
}

export interface UploadInput {
  /** Local file URI of the plan image. */
  uri: string;
  name: string;
  mimeType: string;
  style: string;
  tier?: Tier;
  /** Total budget in EGP; used instead of `tier` when set. */
  budget?: number;
  palette?: Record<string, string>;
}
