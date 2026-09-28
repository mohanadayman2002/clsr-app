import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { clsr, type CreateProjectInput, type Project } from '@/api';
import { isProcessing } from '@/lib/catalog';

const POLL_INTERVAL_MS = 1500;

interface ProjectsContextValue {
  projects: Project[];
  loading: boolean;
  error?: string;
  refresh: () => Promise<void>;
  create: (input: CreateProjectInput) => Promise<Project>;
  remove: (id: string) => Promise<void>;
  /** Store an updated project coming from a detail fetch or mutation. */
  upsert: (project: Project) => void;
}

const ProjectsContext = createContext<ProjectsContextValue | null>(null);

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    try {
      const list = await clsr.listProjects();
      setProjects(list);
      setError(undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load projects');
    } finally {
      setLoading(false);
    }
  }, []);

  const upsert = useCallback((project: Project) => {
    setProjects((prev) => {
      const exists = prev.some((p) => p.id === project.id);
      return exists ? prev.map((p) => (p.id === project.id ? project : p)) : [project, ...prev];
    });
  }, []);

  const create = useCallback(
    async (input: CreateProjectInput) => {
      const project = await clsr.createProject(input);
      upsert(project);
      return project;
    },
    [upsert],
  );

  const remove = useCallback(async (id: string) => {
    await clsr.deleteProject(id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }, []);

  useEffect(() => {
    // State is only set after the fetch resolves, not synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  // Keep list cards moving while any project is still in the pipeline.
  const anyProcessing = projects.some((p) => isProcessing(p.status));
  useEffect(() => {
    if (!anyProcessing) return;
    const timer = setInterval(refresh, POLL_INTERVAL_MS * 2);
    return () => clearInterval(timer);
  }, [anyProcessing, refresh]);

  const value = useMemo(
    () => ({ projects, loading, error, refresh, create, remove, upsert }),
    [projects, loading, error, refresh, create, remove, upsert],
  );
  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>;
}

export function useProjects() {
  const ctx = useContext(ProjectsContext);
  if (!ctx) throw new Error('useProjects must be used inside ProjectsProvider');
  return ctx;
}

/** A single project, polled from CLSR while its pipeline is running. */
export function useProject(id: string | undefined) {
  const { projects, upsert } = useProjects();
  const project = projects.find((p) => p.id === id);
  const [error, setError] = useState<string>();
  const inFlight = useRef(false);

  const reload = useCallback(async () => {
    if (!id || inFlight.current) return;
    inFlight.current = true;
    try {
      const latest = await clsr.getProject(id);
      upsert(latest);
      setError(undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load project');
    } finally {
      inFlight.current = false;
    }
  }, [id, upsert]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);

  const shouldPoll = !project || isProcessing(project.status) || project.rooms.some((r) => r.status !== 'ready');
  useEffect(() => {
    if (!shouldPoll || error) return;
    const timer = setInterval(reload, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [shouldPoll, error, reload]);

  return { project, error, reload };
}
