import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { ClsrError, DemoClsrApi, HttpClsrApi, normalizeHost, type ClsrApi, type Health } from '@/api';
import { secret } from '@/lib/secret';

const STORAGE_KEY = 'clsr.server.v1';
const TOKEN_KEY = 'clsr.token.v1';

/** The studio PC's ZeroTier address; offered until the user saves another. */
export const DEFAULT_HOST = 'http://10.37.122.125:8765';

interface StoredServer {
  host: string;
  demo: boolean;
  /** Sent as X-CLSR-Token when the server runs with CLSR_TOKEN set. Kept in secure storage. */
  token: string;
}

export type Reachability =
  | { state: 'unknown' }
  | { state: 'checking' }
  | { state: 'ok'; health: Health }
  | { state: 'unauthorized' }
  | { state: 'unreachable'; message: string };

interface ServerContextValue {
  ready: boolean;
  /** Normalised base URL, e.g. http://10.37.122.125:8765, or '' when unset. */
  host: string;
  demo: boolean;
  token: string;
  /** The active client, or null when neither a host nor demo mode is configured. */
  api: ClsrApi | null;
  reachability: Reachability;
  connect: (host: string, token: string) => Promise<Reachability>;
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
    if (e instanceof ClsrError && e.kind === 'unauthorized') return { state: 'unauthorized' };
    return { state: 'unreachable', message: e instanceof ClsrError ? e.message : 'No response' };
  }
}

export function ServerProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<StoredServer>({ host: '', demo: false, token: '' });
  const [ready, setReady] = useState(false);
  const [reachability, setReachability] = useState<Reachability>({ state: 'unknown' });
  /** Host+token that `connect` just probed, so switching to it doesn't probe a second time. */
  const justProbed = useRef<string | undefined>(undefined);

  useEffect(() => {
    Promise.all([AsyncStorage.getItem(STORAGE_KEY), secret.get(TOKEN_KEY)])
      .then(([raw, token]) => setStored({ host: '', demo: false, ...(raw ? JSON.parse(raw) : {}), token: token ?? '' }))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const save = useCallback((next: StoredServer) => {
    setStored(next);
    const { token, ...rest } = next;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(rest)).catch(() => {});
    secret.set(TOKEN_KEY, token).catch(() => {});
  }, []);

  const api = useMemo<ClsrApi | null>(
    () => (stored.demo ? demoApi : stored.host ? new HttpClsrApi(stored.host, stored.token || undefined) : null),
    [stored],
  );

  const checkHealth = useCallback(async () => {
    if (!api) return;
    setReachability({ state: 'checking' });
    setReachability(await probe(api));
  }, [api]);

  useEffect(() => {
    if (!stored.demo && justProbed.current === `${stored.host}|${stored.token}`) {
      justProbed.current = undefined;
      return;
    }
    checkHealth();
  }, [checkHealth, stored]);

  const connect = useCallback(
    async (input: string, tokenInput: string) => {
      const host = normalizeHost(input);
      const token = tokenInput.trim();
      if (!host) return { state: 'unknown' } as const;
      setReachability({ state: 'checking' });
      const result = await probe(new HttpClsrApi(host, token || undefined));
      setReachability(result);
      // Save even when unreachable: the PC may simply be asleep or off the VPN.
      justProbed.current = `${host}|${token}`;
      save({ host, demo: false, token });
      return result;
    },
    [save],
  );

  const value = useMemo<ServerContextValue>(
    () => ({
      ready,
      host: stored.host,
      demo: stored.demo,
      token: stored.token,
      api,
      reachability,
      connect,
      enterDemo: () => save({ ...stored, demo: true }),
      disconnect: () => save({ host: '', demo: false, token: '' }),
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
