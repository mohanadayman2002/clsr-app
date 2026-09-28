import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

export interface Resource<T> {
  data?: T;
  error?: unknown;
  loading: boolean;
  reload: () => Promise<void>;
}

/**
 * Loads `fetcher` on mount and whenever `key` changes. Keeps the last good data
 * while reloading so screens don't flash empty on refresh or polling.
 */
export function useResource<T>(fetcher: (() => Promise<T>) | null, key: string): Resource<T> {
  // Data is tagged with the key it was loaded for, so a key change never shows stale data.
  const [loaded, setLoaded] = useState<{ key: string; value: T }>();
  const [error, setError] = useState<unknown>();
  const [loading, setLoading] = useState(!!fetcher);
  const fetcherRef = useRef(fetcher);
  useLayoutEffect(() => {
    fetcherRef.current = fetcher;
  });
  const latest = useRef(0);

  const reload = useCallback(async () => {
    const run = fetcherRef.current;
    if (!run) return;
    const id = ++latest.current;
    setLoading(true);
    try {
      const result = await run();
      if (id !== latest.current) return;
      setLoaded({ key, value: result });
      setError(undefined);
    } catch (e) {
      if (id === latest.current) setError(e);
    } finally {
      if (id === latest.current) setLoading(false);
    }
  }, [key]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data: loaded?.key === key ? loaded.value : undefined, error, loading, reload };
}
