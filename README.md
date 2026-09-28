# CLSR mobile app

Android and iOS app for **CLSR**: upload a 2D floor plan, and CLSR furnishes the apartment and produces renders of every room.

Built with Expo (SDK 57), React Native, TypeScript and Expo Router.

## Status

The UI is complete and runs against a **mock CLSR client**. The mock simulates the full pipeline, so every screen can be exercised. The real API integration is waiting on the CLSR spec (see [Connecting CLSR](#connecting-clsr)).

## Running

```bash
npm install
npx expo start          # then press a for Android, i for iOS, w for web
npm run typecheck
npm run lint
```

## Screens

| Route | Screen |
| --- | --- |
| `/onboarding` | Three-slide intro, shown once |
| `/` (tab) | Projects list, "New project" entry point, demo-mode banner |
| `/settings` (tab) | Connection status, default style/budget, notifications, replay intro |
| `/new` | Step 1: upload the floor plan (camera, photo library, or file/PDF) |
| `/new/details` | Step 2: project name, design style, budget, notes |
| `/new/rooms` | Step 3: review the detected rooms, include or exclude each, start generation |
| `/project/[id]` | Pipeline progress (uploaded → reading layout → furnishing → rendering), room grid, brief, floor plan |
| `/project/[id]/room/[roomId]` | Render gallery with full-screen viewer, share, regenerate, furniture list, room switcher |

Light and dark mode both follow the system setting.

## Project layout

```
src/
  app/          Expo Router routes (screens and layouts only)
  api/
    types.ts    Domain types the UI uses (Project, Room, Render, …)
    client.ts   ClsrClient interface: everything the app needs from CLSR
    mock.ts     MockClsrClient: time-based simulation of the pipeline
    index.ts    Exports the `clsr` client instance used by the app
  components/   Shared UI (ui.tsx), media (renders / floor plan), project cards, flow layout
  store/        React context: projects (with polling), settings (persisted), new-project draft
  lib/          Catalog of room types, styles and budgets; formatting; sharing
  theme/        Colours (light/dark), spacing, radius, typography
```

## Connecting CLSR

Screens never call the network directly. They go through the `ClsrClient` interface in `src/api/client.ts`:

- `analyzeFloorPlan(file)`: detect rooms for the review step
- `createProject(input)`: upload the plan and preferences, start the pipeline
- `listProjects()` / `getProject(id)`: `getProject` is polled every 1.5 s while a project is processing
- `deleteProject(id)`, `regenerateRoom(projectId, roomId)`, `retryProject(id)`

To integrate:

1. Implement `ClsrClient` over the real API, for example in `src/api/http.ts`, and map the CLSR payloads onto the types in `src/api/types.ts`.
2. Select it in `src/api/index.ts`, for example when `EXPO_PUBLIC_CLSR_API_URL` is set.
3. Adjust `types.ts` and `PIPELINE_STAGES` in `src/lib/catalog.ts` if CLSR reports different stages, and swap polling for push or websockets if the API supports them.
4. Download remote render URLs before sharing (see the TODO in `src/lib/share.ts`).

Placeholders to confirm: the bundle ID `com.clsr.app` in `app.json`, the app icon and splash assets, and authentication (none yet).
