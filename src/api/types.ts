/**
 * Domain types shared by the UI and the CLSR client.
 *
 * These are the app's own view of the data. When the CLSR API spec lands,
 * map its payloads onto these types inside the client implementation so the
 * screens don't need to change.
 */

export type RoomType =
  | 'living'
  | 'bedroom'
  | 'kitchen'
  | 'dining'
  | 'bathroom'
  | 'office'
  | 'balcony'
  | 'hallway'
  | 'other';

export type DesignStyle =
  | 'modern'
  | 'scandinavian'
  | 'minimalist'
  | 'japandi'
  | 'industrial'
  | 'classic'
  | 'bohemian'
  | 'mid-century';

export type BudgetTier = 'essential' | 'comfort' | 'premium';

export type ProjectStatus =
  | 'queued'
  | 'analyzing'
  | 'furnishing'
  | 'rendering'
  | 'completed'
  | 'failed';

export type RoomStatus = 'pending' | 'rendering' | 'ready' | 'failed';

export interface FloorPlanFile {
  /** Local or remote URI. Missing for server-side demo projects. */
  uri?: string;
  name: string;
  mimeType: string;
  width?: number;
  height?: number;
  size?: number;
}

export interface Render {
  id: string;
  /** Rendered image URI. Missing while the mock is in use. */
  uri?: string;
  /** Human label for the camera view, e.g. "Wide angle". */
  view: string;
  createdAt: string;
}

export interface FurnitureItem {
  id: string;
  name: string;
  category: string;
}

export interface Room {
  id: string;
  name: string;
  type: RoomType;
  areaSqm?: number;
  status: RoomStatus;
  renders: Render[];
  furniture: FurnitureItem[];
}

export interface ProjectPreferences {
  style: DesignStyle;
  budget: BudgetTier;
  notes?: string;
}

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  floorPlan: FloorPlanFile;
  preferences: ProjectPreferences;
  status: ProjectStatus;
  /** Overall progress between 0 and 1. */
  progress: number;
  rooms: Room[];
  error?: string;
}

/** A room found in the floor plan before generation, which the user can review. */
export interface DetectedRoom {
  id: string;
  name: string;
  type: RoomType;
  areaSqm?: number;
  included: boolean;
}

export interface CreateProjectInput {
  name: string;
  floorPlan: FloorPlanFile;
  preferences: ProjectPreferences;
  rooms: DetectedRoom[];
}
