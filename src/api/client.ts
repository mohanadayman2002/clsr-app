import type { CreateProjectInput, DetectedRoom, FloorPlanFile, Project } from './types';

/**
 * Everything the app needs from the CLSR system.
 *
 * The UI only talks to this interface. `MockClsrClient` implements it today;
 * a real HTTP implementation goes next to it once the API spec is available.
 */
export interface ClsrClient {
  /** True when this client is a local simulation, not the real CLSR backend. */
  readonly isMock: boolean;

  /** Detect rooms in a floor plan so the user can review them before generating. */
  analyzeFloorPlan(file: FloorPlanFile): Promise<DetectedRoom[]>;

  /** Upload the floor plan and start the furnish + render pipeline. */
  createProject(input: CreateProjectInput): Promise<Project>;

  listProjects(): Promise<Project[]>;

  /** Fetch the latest state of a project. Polled while the pipeline runs. */
  getProject(id: string): Promise<Project>;

  deleteProject(id: string): Promise<void>;

  /** Ask CLSR for a fresh set of renders for one room. */
  regenerateRoom(projectId: string, roomId: string): Promise<Project>;

  /** Restart a failed project. */
  retryProject(id: string): Promise<Project>;
}
