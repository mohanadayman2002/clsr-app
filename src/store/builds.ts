import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const KEY = 'clsr.builds.v1';

/** A build started from this device, remembered so the user can come back to its log. */
export interface StartedBuild {
  number: number;
  style: string;
  /** Epoch ms. */
  started: number;
}

async function read(): Promise<StartedBuild[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StartedBuild[]) : [];
  } catch {
    return [];
  }
}

async function write(list: StartedBuild[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(list)).catch(() => {});
}

export async function rememberBuild(build: StartedBuild) {
  const list = await read();
  await write([build, ...list.filter((b) => b.number !== build.number)]);
}

export async function forgetBuild(number: number) {
  await write((await read()).filter((b) => b.number !== number));
}

export async function findBuild(number: number) {
  return (await read()).find((b) => b.number === number);
}

/** Builds started here that have not finished yet. Reloads on `reload()`. */
export function useStartedBuilds() {
  const [builds, setBuilds] = useState<StartedBuild[]>([]);
  const reload = useCallback(async () => setBuilds(await read()), []);
  useEffect(() => {
    // State is set after the read resolves, not synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);
  return { builds, reload };
}
