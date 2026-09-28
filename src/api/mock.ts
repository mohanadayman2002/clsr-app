import type { ClsrClient } from './client';
import type {
  CreateProjectInput,
  DetectedRoom,
  FloorPlanFile,
  FurnitureItem,
  Project,
  ProjectPreferences,
  ProjectStatus,
  Render,
  Room,
  RoomType,
} from './types';

/**
 * Local stand-in for the CLSR backend so the UI can be built and demoed
 * before the real API exists. Progress is derived from elapsed time, so
 * polling `getProject` walks a project through every pipeline stage.
 */

const QUEUED_MS = 1500;
const ANALYZE_MS = 4000;
const FURNISH_MS = 5000;
const RENDER_PER_ROOM_MS = 3500;

const RENDER_VIEWS = ['Wide angle', 'Eye level', 'Detail'];

const FURNITURE: Record<RoomType, [string, string][]> = {
  living: [
    ['Three-seat sofa', 'Seating'],
    ['Lounge chair', 'Seating'],
    ['Coffee table', 'Tables'],
    ['Media console', 'Storage'],
    ['Area rug', 'Textiles'],
    ['Floor lamp', 'Lighting'],
  ],
  bedroom: [
    ['Queen bed', 'Beds'],
    ['Nightstands (pair)', 'Tables'],
    ['Wardrobe', 'Storage'],
    ['Pendant light', 'Lighting'],
    ['Linen curtains', 'Textiles'],
  ],
  kitchen: [
    ['Bar stools (3)', 'Seating'],
    ['Open shelving', 'Storage'],
    ['Pendant lights', 'Lighting'],
  ],
  dining: [
    ['Dining table', 'Tables'],
    ['Dining chairs (6)', 'Seating'],
    ['Sideboard', 'Storage'],
    ['Chandelier', 'Lighting'],
  ],
  bathroom: [
    ['Vanity unit', 'Storage'],
    ['Round mirror', 'Decor'],
    ['Towel ladder', 'Accessories'],
  ],
  office: [
    ['Writing desk', 'Tables'],
    ['Task chair', 'Seating'],
    ['Bookcase', 'Storage'],
    ['Desk lamp', 'Lighting'],
  ],
  balcony: [
    ['Bistro set', 'Outdoor'],
    ['Planters', 'Decor'],
  ],
  hallway: [
    ['Console table', 'Tables'],
    ['Coat rack', 'Storage'],
    ['Runner rug', 'Textiles'],
  ],
  other: [['Storage cabinet', 'Storage']],
};

const DEFAULT_DETECTED: Omit<DetectedRoom, 'id' | 'included'>[] = [
  { name: 'Living room', type: 'living', areaSqm: 28 },
  { name: 'Kitchen', type: 'kitchen', areaSqm: 12 },
  { name: 'Master bedroom', type: 'bedroom', areaSqm: 16 },
  { name: 'Bedroom 2', type: 'bedroom', areaSqm: 11 },
  { name: 'Bathroom', type: 'bathroom', areaSqm: 6 },
  { name: 'Entrance hall', type: 'hallway', areaSqm: 7 },
  { name: 'Balcony', type: 'balcony', areaSqm: 5 },
];

interface StoredRoom {
  id: string;
  name: string;
  type: RoomType;
  areaSqm?: number;
  /** Timestamp the latest render batch for this room started (regenerate resets it). */
  renderStartedAt?: number;
  renderVersion: number;
}

interface StoredProject {
  id: string;
  name: string;
  createdAt: number;
  startedAt: number;
  floorPlan: FloorPlanFile;
  preferences: ProjectPreferences;
  rooms: StoredRoom[];
}

let counter = 0;
const newId = (prefix: string) => `${prefix}_${Date.now().toString(36)}${(counter++).toString(36)}`;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function furnitureFor(room: StoredRoom): FurnitureItem[] {
  return FURNITURE[room.type].map(([name, category], i) => ({
    id: `${room.id}_f${i}`,
    name,
    category,
  }));
}

function rendersFor(room: StoredRoom, readyAt: number): Render[] {
  return RENDER_VIEWS.map((view, i) => ({
    id: `${room.id}_v${room.renderVersion}_${i}`,
    view,
    createdAt: new Date(readyAt).toISOString(),
  }));
}

function materialize(stored: StoredProject, now = Date.now()): Project {
  const elapsed = now - stored.startedAt;
  const renderStart = QUEUED_MS + ANALYZE_MS + FURNISH_MS;
  const total = renderStart + stored.rooms.length * RENDER_PER_ROOM_MS;

  let status: ProjectStatus;
  if (elapsed < QUEUED_MS) status = 'queued';
  else if (elapsed < QUEUED_MS + ANALYZE_MS) status = 'analyzing';
  else if (elapsed < renderStart) status = 'furnishing';
  else status = 'rendering';

  const rooms: Room[] = stored.rooms.map((room, i) => {
    const pipelineReadyAt = stored.startedAt + renderStart + (i + 1) * RENDER_PER_ROOM_MS;
    const readyAt = room.renderStartedAt
      ? Math.max(pipelineReadyAt, room.renderStartedAt + RENDER_PER_ROOM_MS)
      : pipelineReadyAt;
    const renderingFrom = readyAt - RENDER_PER_ROOM_MS;
    const ready = now >= readyAt;
    return {
      id: room.id,
      name: room.name,
      type: room.type,
      areaSqm: room.areaSqm,
      status: ready ? 'ready' : now >= renderingFrom && status === 'rendering' ? 'rendering' : 'pending',
      renders: ready ? rendersFor(room, readyAt) : [],
      furniture: elapsed >= renderStart ? furnitureFor(room) : [],
    };
  });

  const allReady = rooms.every((r) => r.status === 'ready');
  if (status === 'rendering' && allReady) status = 'completed';

  return {
    id: stored.id,
    name: stored.name,
    createdAt: new Date(stored.createdAt).toISOString(),
    updatedAt: new Date(Math.min(now, stored.startedAt + total)).toISOString(),
    floorPlan: stored.floorPlan,
    preferences: stored.preferences,
    status,
    progress: status === 'completed' ? 1 : Math.min(0.99, elapsed / total),
    rooms,
  };
}

function seed(): StoredProject[] {
  const longAgo = Date.now() - 1000 * 60 * 60 * 26;
  const id = 'demo_sample';
  return [
    {
      id,
      name: 'Sample apartment',
      createdAt: longAgo,
      startedAt: longAgo,
      floorPlan: { name: 'sample-plan.png', mimeType: 'image/png' },
      preferences: { style: 'japandi', budget: 'comfort' },
      rooms: DEFAULT_DETECTED.slice(0, 5).map((r, i) => ({
        ...r,
        id: `${id}_r${i}`,
        renderVersion: 0,
      })),
    },
  ];
}

export class MockClsrClient implements ClsrClient {
  readonly isMock = true;
  private projects: StoredProject[] = seed();

  async analyzeFloorPlan(_file: FloorPlanFile): Promise<DetectedRoom[]> {
    await delay(1800);
    return DEFAULT_DETECTED.map((r) => ({ ...r, id: newId('det'), included: true }));
  }

  async createProject(input: CreateProjectInput): Promise<Project> {
    await delay(900);
    const now = Date.now();
    const stored: StoredProject = {
      id: newId('prj'),
      name: input.name,
      createdAt: now,
      startedAt: now,
      floorPlan: input.floorPlan,
      preferences: input.preferences,
      rooms: input.rooms
        .filter((r) => r.included)
        .map((r) => ({
          id: newId('room'),
          name: r.name,
          type: r.type,
          areaSqm: r.areaSqm,
          renderVersion: 0,
        })),
    };
    this.projects.unshift(stored);
    return materialize(stored);
  }

  async listProjects(): Promise<Project[]> {
    await delay(250);
    return this.projects.map((p) => materialize(p));
  }

  async getProject(id: string): Promise<Project> {
    await delay(150);
    return materialize(this.find(id));
  }

  async deleteProject(id: string): Promise<void> {
    await delay(300);
    this.projects = this.projects.filter((p) => p.id !== id);
  }

  async regenerateRoom(projectId: string, roomId: string): Promise<Project> {
    await delay(400);
    const project = this.find(projectId);
    const room = project.rooms.find((r) => r.id === roomId);
    if (!room) throw new Error('Room not found');
    room.renderStartedAt = Date.now();
    room.renderVersion += 1;
    return materialize(project);
  }

  async retryProject(id: string): Promise<Project> {
    await delay(400);
    const project = this.find(id);
    project.startedAt = Date.now();
    project.rooms.forEach((r) => (r.renderStartedAt = undefined));
    return materialize(project);
  }

  private find(id: string): StoredProject {
    const project = this.projects.find((p) => p.id === id);
    if (!project) throw new Error('Project not found');
    return project;
  }
}
