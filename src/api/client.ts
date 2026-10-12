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

/** Everything the app calls on CLSR. Implemented over HTTP by `HttpClsrApi`. */
export interface ClsrApi {
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

/**
 * Server path of a rendered frame. Pass `bust` (a millisecond timestamp) after
 * a render: the same URL returns a new picture, and image caches would keep the old one.
 */
export function framePath(number: number, image: string, bust?: number): string {
  const path = `/runs/${String(number).padStart(4, '0')}/result/final/frames/${image}`;
  return bust ? `${path}?t=${bust}` : path;
}

/** Swatch image for a floor or wall finish. */
export const swatchPath = (finishId: string) => `/swatch/${finishId}`;

/** Image of a print: `/art/` + the print's path, e.g. designs/neoclassic/art/cameo_0.jpg. */
export const artPath = (current: string) => `/art/${current.replace(/^\/+/, '')}`;

/**
 * Percent-encodes each segment of a server path (model and image names contain
 * spaces). Segments are decoded first so an already-encoded path is not encoded twice.
 * The query string is left as is.
 */
export function encodePath(path: string): string {
  const q = path.indexOf('?');
  const [pathname, query] = q === -1 ? [path, ''] : [path.slice(0, q), path.slice(q)];
  const encoded = pathname
    .split('/')
    .map((seg) => {
      let raw = seg;
      try {
        raw = decodeURIComponent(seg);
      } catch {
        // Not valid percent-encoding; encode it as typed.
      }
      return encodeURIComponent(raw);
    })
    .join('/');
  return encoded + query;
}
