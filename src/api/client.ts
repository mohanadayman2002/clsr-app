import type {
  BuildStatus,
  Catalog,
  Change,
  Colour,
  Costs,
  DressingCatalog,
  Finish,
  Health,
  Job,
  JobState,
  Palette,
  Project,
  ProjectSummary,
  Quality,
  Style,
  Tier,
  UploadInput,
} from './types';

/**
 * Everything the app calls on CLSR Studio. `HttpClsrApi` talks to the real
 * server; `DemoClsrApi` serves built-in sample data so the app is usable
 * without one.
 */
export interface ClsrApi {
  readonly isDemo: boolean;

  /** Absolute URL for a server path such as `/thumbs/...` or `/runs/...`. */
  resolve(path: string): string;

  /** Image source for a server path, carrying the access token header when one is set. */
  imageSource(path: string): { uri: string; headers?: Record<string, string> };

  health(): Promise<Health>;
  projects(): Promise<ProjectSummary[]>;
  project(n: number): Promise<Project>;
  job(n: number): Promise<JobState>;
  costs(n: number, tier?: Tier): Promise<Costs>;

  catalog(asset: string, run: number): Promise<Catalog>;
  dressing(kind: 'art' | 'model', run: number, role?: string): Promise<DressingCatalog>;
  finishes(target: 'floor' | 'wall'): Promise<Finish[]>;
  styles(): Promise<Style[]>;
  colours(): Promise<Colour[]>;
  palette(style: string): Promise<Palette>;

  status(n: number): Promise<BuildStatus>;
  batch(n: number, changes: Change[], quality: Quality, view?: string): Promise<Job>;
  undo(n: number, historyId: string): Promise<Job>;
  upload(input: UploadInput): Promise<{ number: number; mode: string }>;
}

/** Server path of a rendered frame; `bust` is appended as ?t= after a re-render. */
export function framePath(number: number, image: string, bust?: number): string {
  const path = `/runs/${String(number).padStart(4, '0')}/result/final/frames/${image}`;
  return bust ? `${path}?t=${bust}` : path;
}
