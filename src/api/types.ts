/**
 * Types for the CLSR HTTP API (JSON over plain HTTP, port 8765), following
 * GET /api/docs. Fields the docs don't pin down are optional or loosely typed:
 * the live server is the source of truth.
 */

export type Vec3 = [number, number, number];
export type Tier = 'budget' | 'comfort' | 'premium';
export type Quality = 'draft' | 'preview' | 'final';

export interface Health {
  /** The plan reader can be driven. False: no new flats can start. */
  coohom: boolean;
  /** The design model. False still builds, with rule-based layouts. */
  ollama: boolean;
  /** The renderer. False: nothing can be built or changed. */
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

/** "art" for prints; lamps, plants and rugs are models in a role. */
export type DressingKind = 'art' | 'model' | 'pendant' | (string & {});

export interface Dressing {
  name: string;
  kind: DressingKind;
  role: string;
  label: string;
  at: Vec3;
  /** For art, a path under /art/, e.g. designs/neoclassic/art/cameo_0.jpg. */
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

export type JobKind = 'batch' | 'swap' | 'colour' | 'finish' | 'dressing' | 'undo' | (string & {});

/** A render job. The server is busy while GET /job returns a non-null job. */
export interface Job {
  id: string;
  kind?: JobKind;
  status?: string;
  stage?: string;
  quality?: Quality;
  room?: number;
  model_name?: string;
  frames?: string[];
  done_frames?: number;
  message?: string;
  changes?: Change[];
  /** Epoch seconds. */
  started?: number;
  finished?: number;
}

export interface Plan {
  key: string;
  label: string;
  /** Ready-to-use server path, e.g. /runs/0029/input.png */
  url: string;
}

/** GET /api/project/<n> */
export interface Project {
  number: number;
  style: string;
  pack: string;
  camera_height_m: number;
  hero: string;
  costs: Costs;
  plans?: Plan[];
  map?: { walls?: unknown[]; holes?: unknown[]; rooms?: unknown[]; bounds?: unknown[] };
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
      /** Prints: `art` (a path like designs/<style>/art/<file>.jpg) and/or `frame`. Lamps, plants, rugs: `model`. */
      choice: { art?: string; frame?: string; model?: string };
    };

export type BuildStage =
  | 'queued'
  | 'capturing'
  | 'measuring'
  | 'building'
  | 'done'
  | 'error'
  | 'awaiting_measurement'
  | (string & {});

/** GET /api/status/<n> */
export interface BuildStatus {
  number: number;
  status: BuildStage;
  /** Set when status is "error". */
  error: string | null;
  style: string;
  mode: string;
  measurement?: unknown;
  spans?: unknown[];
  coohom_scale?: number | null;
  /** The real build log, last 200 lines. */
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
  /** Local file URI of the plan image (PNG or JPG). */
  uri: string;
  name: string;
  mimeType: string;
  /** A key from /api/styles. */
  style: string;
  tier?: Tier;
  /** Total budget in EGP, used instead of `tier`. Under 1000 is ignored by the server. */
  budget?: number;
  /** Changed colour parts from /api/palette. */
  palette?: Record<string, string>;
}
