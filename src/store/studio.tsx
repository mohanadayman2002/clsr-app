import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import type { Change, Job, JobState, Quality } from '@/api';

import { useServer } from './server';

const POLL_MS = 2500;

/** A change the user has picked but not rendered yet. */
export interface QueuedChange {
  /** One queued change per target: picking again for the same target replaces it. */
  target: string;
  /** Hotspot id in the room, so its dot can show as queued. */
  hotspotId: string;
  room: number;
  change: Change;
  /** "Sofa → Oslo sofa" */
  title: string;
  detail?: string;
  /** Price difference in EGP, when known. Always an estimate. */
  delta?: number;
  swatch?: string;
  thumb?: string | null;
}

interface FlatState {
  queue: QueuedChange[];
  jobState?: JobState;
  /** Bumped when a render finishes, so screens refetch and images bust their cache. */
  version: number;
  /** Last job that finished while the app was watching, for a "done" note. */
  finished?: Job;
  /** The view the user was last looking at, used as `view` for draft renders. */
  lastView?: string;
}

interface StudioContextValue {
  flats: Record<number, FlatState>;
  enqueue: (n: number, item: QueuedChange) => void;
  dequeue: (n: number, target: string) => void;
  clearQueue: (n: number) => void;
  setLastView: (n: number, view: string) => void;
  /** Send the queue as one batch. Throws ClsrError (e.g. busy) without clearing the queue. */
  render: (n: number, quality: Quality, view?: string) => Promise<Job>;
  undo: (n: number, historyId: string) => Promise<Job>;
  refreshJob: (n: number) => Promise<void>;
  dismissFinished: (n: number) => void;
}

const StudioContext = createContext<StudioContextValue | null>(null);

/**
 * A job occupies the server until /job returns `job: null`. A job object that
 * reports done or error has also finished, so either signal counts.
 */
export const isActive = (job: Job | null | undefined): job is Job => !!job && job.status !== 'done' && job.status !== 'error';
const EMPTY: FlatState = { queue: [], version: 0 };

export function StudioProvider({ children }: { children: ReactNode }) {
  const { api, host } = useServer();
  const [flats, setFlats] = useState<Record<number, FlatState>>({});
  const flatsRef = useRef(flats);
  useEffect(() => {
    flatsRef.current = flats;
  });

  // A different server means different flats.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFlats({});
  }, [host]);

  const patch = useCallback((n: number, fn: (s: FlatState) => Partial<FlatState>) => {
    setFlats((all) => {
      const current = all[n] ?? EMPTY;
      return { ...all, [n]: { ...current, ...fn(current) } };
    });
  }, []);

  /** Store a fresh job state; notice when a running job has finished. */
  const absorb = useCallback(
    (n: number, next: JobState) => {
      patch(n, (s) => {
        const wasRunning = isActive(s.jobState?.job) ? s.jobState?.job : undefined;
        const nowRunning = isActive(next.job);
        if (wasRunning && !nowRunning) {
          const finished = next.job?.id === wasRunning.id ? next.job : (next.history.find((h) => h.id === wasRunning.id) ?? { ...wasRunning, status: 'done' as const });
          return { jobState: next, version: s.version + 1, finished };
        }
        return { jobState: next };
      });
    },
    [patch],
  );

  const refreshJob = useCallback(
    async (n: number) => {
      if (!api) return;
      try {
        absorb(n, await api.job(n));
      } catch {
        // Polling failures are transient; the next tick retries.
      }
    },
    [api, absorb],
  );

  // One poller for every flat with a running job.
  useEffect(() => {
    const timer = setInterval(() => {
      for (const [n, s] of Object.entries(flatsRef.current)) {
        if (isActive(s.jobState?.job)) refreshJob(Number(n));
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [refreshJob]);

  const render = useCallback(
    async (n: number, quality: Quality, view?: string) => {
      if (!api) throw new Error('Not connected');
      const queue = flatsRef.current[n]?.queue ?? [];
      const job = await api.batch(
        n,
        queue.map((q) => q.change),
        quality,
        view,
      );
      patch(n, (s) => ({ queue: [], finished: undefined, jobState: { job, history: s.jobState?.history ?? [] } }));
      return job;
    },
    [api, patch],
  );

  const undo = useCallback(
    async (n: number, historyId: string) => {
      if (!api) throw new Error('Not connected');
      const job = await api.undo(n, historyId);
      patch(n, (s) => ({ finished: undefined, jobState: { job, history: s.jobState?.history ?? [] } }));
      return job;
    },
    [api, patch],
  );

  const value = useMemo<StudioContextValue>(
    () => ({
      flats,
      enqueue: (n, item) => patch(n, (s) => ({ queue: [...s.queue.filter((q) => q.target !== item.target), item] })),
      dequeue: (n, target) => patch(n, (s) => ({ queue: s.queue.filter((q) => q.target !== target) })),
      clearQueue: (n) => patch(n, () => ({ queue: [] })),
      setLastView: (n, view) => patch(n, () => ({ lastView: view })),
      render,
      undo,
      refreshJob,
      dismissFinished: (n) => patch(n, () => ({ finished: undefined })),
    }),
    [flats, patch, render, undo, refreshJob],
  );

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
}

export function useStudio() {
  const ctx = useContext(StudioContext);
  if (!ctx) throw new Error('useStudio must be used inside StudioProvider');
  return ctx;
}

/** Everything a screen needs about one flat's edits and render job. Starts watching the job. */
export function useFlatStudio(n: number) {
  const studio = useStudio();
  const { refreshJob } = studio;
  useEffect(() => {
    refreshJob(n);
  }, [n, refreshJob]);
  const state = studio.flats[n] ?? EMPTY;
  const job = state.jobState?.job;
  return {
    ...state,
    job,
    running: isActive(job),
    history: state.jobState?.history ?? [],
    enqueue: (item: QueuedChange) => studio.enqueue(n, item),
    dequeue: (target: string) => studio.dequeue(n, target),
    clearQueue: () => studio.clearQueue(n),
    setLastView: (view: string) => studio.setLastView(n, view),
    render: (quality: Quality, view?: string) => studio.render(n, quality, view),
    undo: (id: string) => studio.undo(n, id),
    dismissFinished: () => studio.dismissFinished(n),
  };
}
