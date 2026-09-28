import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import type { DetectedRoom, FloorPlanFile, ProjectPreferences } from '@/api';

import { useSettings } from './settings';

/** State for the multi-step "new project" flow. Lives only while the flow is open. */
interface DraftContextValue {
  floorPlan?: FloorPlanFile;
  setFloorPlan: (file?: FloorPlanFile) => void;
  name: string;
  setName: (name: string) => void;
  preferences: ProjectPreferences;
  setPreferences: (patch: Partial<ProjectPreferences>) => void;
  rooms: DetectedRoom[];
  setRooms: (rooms: DetectedRoom[]) => void;
}

const DraftContext = createContext<DraftContextValue | null>(null);

export function DraftProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const [floorPlan, setFloorPlan] = useState<FloorPlanFile>();
  const [name, setName] = useState('');
  const [preferences, setPrefs] = useState<ProjectPreferences>({
    style: settings.defaultStyle,
    budget: settings.defaultBudget,
  });
  const [rooms, setRooms] = useState<DetectedRoom[]>([]);

  const value = useMemo(
    () => ({
      floorPlan,
      setFloorPlan,
      name,
      setName,
      preferences,
      setPreferences: (patch: Partial<ProjectPreferences>) => setPrefs((p) => ({ ...p, ...patch })),
      rooms,
      setRooms,
    }),
    [floorPlan, name, preferences, rooms],
  );
  return <DraftContext.Provider value={value}>{children}</DraftContext.Provider>;
}

export function useDraft() {
  const ctx = useContext(DraftContext);
  if (!ctx) throw new Error('useDraft must be used inside DraftProvider');
  return ctx;
}
