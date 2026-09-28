import type { ClsrApi } from './client';
import { ClsrError } from './errors';
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

const DEFAULT_PORT = 8765;
const TIMEOUT_MS = 10000;
const UPLOAD_TIMEOUT_MS = 120000;

/** Turns "192.168.1.20", "pc.local:9000" or "http://host:8765/" into a base URL. */
export function normalizeHost(input: string): string {
  let host = input.trim().replace(/\/+$/, '');
  if (!host) return '';
  if (!/^https?:\/\//i.test(host)) host = `http://${host}`;
  const url = host.replace(/^https?:\/\//i, '');
  const hasPort = /:\d+$/.test(url.split('/')[0]);
  return hasPort ? host : `${host}:${DEFAULT_PORT}`;
}

export class HttpClsrApi implements ClsrApi {
  readonly isDemo = false;

  constructor(readonly baseUrl: string) {}

  resolve(path: string): string {
    return /^https?:\/\//i.test(path) ? path : `${this.baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
  }

  private async request<T>(path: string, init?: RequestInit, timeoutMs = TIMEOUT_MS): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let res: Response;
    try {
      res = await fetch(this.resolve(path), { ...init, signal: controller.signal });
    } catch {
      throw new ClsrError('unreachable', `Can't reach ${this.baseUrl}`);
    } finally {
      clearTimeout(timer);
    }

    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = undefined;
    }
    if (res.ok) return body as T;

    const serverError = (body as { error?: unknown } | undefined)?.error;
    const message = serverError ? String(serverError) : `Server responded ${res.status}`;
    const kind = res.status === 409 ? 'busy' : res.status === 404 ? 'not_found' : res.status === 400 ? 'bad_request' : 'server';
    throw new ClsrError(kind, message, res.status);
  }

  private post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  health() {
    return this.request<Health>('/api/health', undefined, 5000);
  }
  projects() {
    return this.request<ProjectSummary[]>('/api/projects');
  }
  project(n: number) {
    return this.request<Project>(`/api/project/${n}`);
  }
  job(n: number) {
    return this.request<JobState>(`/api/project/${n}/job`);
  }
  costs(n: number, tier?: Tier) {
    return this.request<Costs>(`/api/project/${n}/costs${tier ? `?tier=${tier}` : ''}`);
  }
  catalog(asset: string, run: number) {
    return this.request<Catalog>(`/api/catalog?asset=${encodeURIComponent(asset)}&run=${run}`);
  }
  dressing(kind: 'art' | 'model', run: number, role?: string) {
    const roleParam = role ? `&role=${encodeURIComponent(role)}` : '';
    return this.request<DressingCatalog>(`/api/dressing?kind=${kind}${roleParam}&run=${run}`);
  }
  async finishes(target: 'floor' | 'wall') {
    const res = await this.request<{ finishes: Finish[] }>(`/api/finishes?target=${target}`);
    return res.finishes;
  }
  styles() {
    return this.request<Style[]>('/api/styles');
  }
  colours() {
    return this.request<Colour[]>('/api/colours');
  }
  palette(style: string) {
    return this.request<Palette>(`/api/palette?style=${encodeURIComponent(style)}`);
  }
  status(n: number) {
    return this.request<BuildStatus>(`/api/status/${n}`);
  }
  async batch(n: number, changes: Change[], quality: Quality, view?: string) {
    const res = await this.post<{ job: Job }>(`/api/project/${n}/batch`, { changes, quality, view });
    return res.job;
  }
  async undo(n: number, historyId: string) {
    const res = await this.post<{ job: Job }>(`/api/project/${n}/undo`, { id: historyId });
    return res.job;
  }
  upload(input: UploadInput) {
    const form = new FormData();
    // React Native's FormData accepts a { uri, name, type } file descriptor.
    form.append('file', { uri: input.uri, name: input.name, type: input.mimeType } as unknown as Blob);
    form.append('mode', 'auto');
    form.append('road', 'assets');
    form.append('style', input.style);
    if (input.budget != null) form.append('budget', String(input.budget));
    else if (input.tier) form.append('tier', input.tier);
    if (input.palette) form.append('palette', JSON.stringify(input.palette));
    return this.request<{ number: number; mode: string }>('/api/upload', { method: 'POST', body: form }, UPLOAD_TIMEOUT_MS);
  }
}
