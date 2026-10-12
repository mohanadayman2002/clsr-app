import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { ClsrError, HttpClsrApi, normalizeHost, type ClsrApi, type Health } from '@/api';
import { config } from '@/config';
import { secret } from '@/lib/secret';

const STORAGE_KEY = 'clsr.server.v2';
const TOKEN_KEY = 'clsr.token.v1';

/** From .env; used until the user saves a different address on the device. */
export const DEFAULT_HOST = normalizeHost(config.baseUrl);

interface StoredServer {
  host: string;
  /** Sent as X-CLSR-Token. Kept in secure storage. */
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
  token: string;
  /** The active client, or null when no address is configured. */
  api: ClsrApi | null;
  reachability: Reachability;
  /** Health from the last successful check, if any. */
  health?: Health;
  connect: (host: string, token: string) => Promise<Reachability>;
  /** Go back to the address and token from .env. */
  resetToDefaults: () => void;
  checkHealth: () => Promise<void>;
}

const ServerContext = createContext<ServerContextValue | null>(null);

async function probe(api: ClsrApi): Promise<Reachability> {
  try {
    return { state: 'ok', health: await api.health() };
  } catch (e) {
    if (e instanceof ClsrError && e.kind === 'unauthorized') return { state: 'unauthorized' };
    return { state: 'unreachable', message: e instanceof ClsrError ? e.message : 'No response' };
  }
}

const DEFAULTS: StoredServer = { host: DEFAULT_HOST, token: config.token };

export function ServerProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<StoredServer>(DEFAULTS);
  const [ready, setReady] = useState(false);
  const [reachability, setReachability] = useState<Reachability>({ state: 'unknown' });
  /** Host+token that `connect` just probed, so switching to it doesn't probe a second time. */
  const justProbed = useRef<string | undefined>(undefined);

  useEffect(() => {
    Promise.all([AsyncStorage.getItem(STORAGE_KEY), secret.get(TOKEN_KEY)])
      .then(([raw, token]) => {
        const saved = raw ? (JSON.parse(raw) as Partial<StoredServer>) : {};
        setStored({ host: saved.host || DEFAULTS.host, token: token ?? DEFAULTS.token });
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const save = useCallback((next: StoredServer) => {
    setStored(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ host: next.host })).catch(() => {});
    secret.set(TOKEN_KEY, next.token).catch(() => {});
  }, []);

  const api = useMemo<ClsrApi | null>(
    () => (stored.host ? new HttpClsrApi(stored.host, stored.token || undefined) : null),
    [stored],
  );

  const checkHealth = useCallback(async () => {
    if (!api) return;
    setReachability({ state: 'checking' });
    setReachability(await probe(api));
  }, [api]);

  useEffect(() => {
    if (!ready) return;
    if (justProbed.current === `${stored.host}|${stored.token}`) {
      justProbed.current = undefined;
      return;
    }
    checkHealth();
  }, [checkHealth, stored, ready]);

  const connect = useCallback(
    async (input: string, tokenInput: string) => {
      const host = normalizeHost(input);
      const token = tokenInput.trim();
      if (!host) return { state: 'unknown' } as const;
      setReachability({ state: 'checking' });
      const result = await probe(new HttpClsrApi(host, token || undefined));
      setReachability(result);
      // Save even when unreachable: the PC may simply be asleep or off ZeroTier.
      justProbed.current = `${host}|${token}`;
      save({ host, token });
      return result;
    },
    [save],
  );

  const value = useMemo<ServerContextValue>(
    () => ({
      ready,
      host: stored.host,
      token: stored.token,
      api,
      reachability,
      health: reachability.state === 'ok' ? reachability.health : undefined,
      connect,
      resetToDefaults: () => save(DEFAULTS),
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
