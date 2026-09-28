import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { ClsrError, DemoClsrApi, HttpClsrApi, normalizeHost, type ClsrApi, type Health } from '@/api';

const STORAGE_KEY = 'clsr.server.v1';

interface StoredServer {
  host: string;
  demo: boolean;
}

export type Reachability =
  | { state: 'unknown' }
  | { state: 'checking' }
  | { state: 'ok'; health: Health }
  | { state: 'unreachable'; message: string };

interface ServerContextValue {
  ready: boolean;
  /** Normalised base URL, e.g. http://192.168.1.20:8765, or '' when unset. */
  host: string;
  demo: boolean;
  /** The active client, or null when neither a host nor demo mode is configured. */
  api: ClsrApi | null;
  reachability: Reachability;
  connect: (host: string) => Promise<boolean>;
  enterDemo: () => void;
  disconnect: () => void;
  checkHealth: () => Promise<void>;
}

const ServerContext = createContext<ServerContextValue | null>(null);
const demoApi = new DemoClsrApi();

async function probe(api: ClsrApi): Promise<Reachability> {
  try {
    return { state: 'ok', health: await api.health() };
  } catch (e) {
    return { state: 'unreachable', message: e instanceof ClsrError ? e.message : 'No response' };
  }
}

export function ServerProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<StoredServer>({ host: '', demo: false });
  const [ready, setReady] = useState(false);
  const [reachability, setReachability] = useState<Reachability>({ state: 'unknown' });
  /** Host that `connect` just probed, so switching to it doesn't probe a second time. */
  const justProbed = useRef<string | undefined>(undefined);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => raw && setStored({ host: '', demo: false, ...JSON.parse(raw) }))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const save = useCallback((next: StoredServer) => {
    setStored(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const api = useMemo<ClsrApi | null>(
    () => (stored.demo ? demoApi : stored.host ? new HttpClsrApi(stored.host) : null),
    [stored],
  );

  const checkHealth = useCallback(async () => {
    if (!api) return;
    setReachability({ state: 'checking' });
    setReachability(await probe(api));
  }, [api]);

  useEffect(() => {
    if (!stored.demo && justProbed.current === stored.host) {
      justProbed.current = undefined;
      return;
    }
    checkHealth();
  }, [checkHealth, stored]);

  const connect = useCallback(
    async (input: string) => {
      const host = normalizeHost(input);
      if (!host) return false;
      setReachability({ state: 'checking' });
      const result = await probe(new HttpClsrApi(host));
      setReachability(result);
      // Save even when unreachable: the PC may simply be asleep.
      justProbed.current = host;
      save({ host, demo: false });
      return result.state === 'ok';
    },
    [save],
  );

  const value = useMemo<ServerContextValue>(
    () => ({
      ready,
      host: stored.host,
      demo: stored.demo,
      api,
      reachability,
      connect,
      enterDemo: () => save({ ...stored, demo: true }),
      disconnect: () => save({ ...stored, demo: false, host: '' }),
      checkHealth,
    }),
    [ready, stored, api, reachability, connect, save, checkHealth],
  );

  return <ServerContext.Provider value={value}>{children}</ServerContext.Provider>;
}

export function useServer() {
  const ctx = useContext(ServerContext);
  if (!ctx) throw new Error('useServer must be used inside ServerProvider');
  return ctx;
}

/** The active client. Only call from screens that are shown once a server is configured. */
export function useApi(): ClsrApi {
  const { api } = useServer();
  if (!api) throw new Error('No CLSR server configured');
  return api;
}
