# CLSR Studio mobile

Android and iOS client for **CLSR Studio**. A user uploads a 2D floor plan; the server builds, furnishes and renders the flat; the user retouches rooms by tapping hotspots on the photos.

**Stack:** Expo (SDK 57) with React Native, TypeScript and Expo Router. It is one codebase for Android and iOS, it builds in the cloud with EAS (no Mac needed), and the UI already existed here.

## Running

```bash
npm install
npx expo start      # a = Android, i = iOS, w = web
npm test            # hotspot maths
npm run typecheck
npm run lint
```

### Configure the backend

Copy `.env.example` to `.env` and fill in the token:

```
EXPO_PUBLIC_CLSR_URL=http://10.37.122.125:8765
EXPO_PUBLIC_CLSR_TOKEN=<value of CLSR_TOKEN on the server>
```

`.env` is git-ignored. Both values change when the backend moves off the studio PC, so they live in config, not source. They are inlined into the app bundle, so the token is a shared key for this deployment rather than a per-user secret. The **Studio link** screen can override the address and token on a device; "Reset to default" goes back to `.env`.

### Reaching the server

The backend is a Windows PC on the ZeroTier network `743993800fc8ab19`. The phone must join that network and be authorised by its owner before the app can connect. If `/api/health` times out, the PC is off, asleep, off ZeroTier, or its firewall is blocking port 8765.

There is no demo mode and no sample data: everything shown comes from the server.

## Status

| # | Feature | State |
| --- | --- | --- |
| – | Server address and token from `.env`, health check, unreachable/401 handling | done |
| 1 | Browse flats → rooms → photos, swipe between views | done (pinch-zoom not yet) |
| 2 | Hotspots on photos → picker | dots and detail sheet done; pickers next |
| 3 | Queue changes → `batch` render → wait → undo | next |
| 4 | Costs: room subtotals and whole-flat bill | totals shown; full bill next |
| 5 | Upload a plan with style and budget, follow `/api/status` | next |

## Design

A light, playful "sunny studio": warm cream background, plum text instead of black, coral (`#FF6B4A`) for anything you can act on, and white cards with soft shadows. Headings are set in Fraunces (serif), interface text in Inter, and measurements and prices in JetBrains Mono.

- **Room colours** (`roomTint` in `src/theme`): every room type has its own pastel fill and strong ink, picked from its label (living = peach, bedroom = lilac, bathroom = sky, kitchen = butter, balcony = mint…). The same colour is used on the plan, room chips, carousel cards, receipt lines and the "next room" card.
- **Floor plan** (`src/components/plan.tsx`): the flat drawn from each room's `rect_m`, north up, with rooms filled in their colours and a coral cone for every camera (its angle comes from the lens). Tap a room, or a cone to open that exact view. The same component is the mini-map on the room screen.
- **Hotspots**: coral dots with white rings and a pulsing halo, so they stand out on bright renders.
- **The bill** is a receipt with dotted price lines and a tilted "Estimate · not a quotation" stamp, so an estimate never reads as a quote.
- **Decoration**: soft colour blobs behind the headlines, a yellow "№" sticker on flat covers, and a floating pill tab bar.

Tokens live in `src/theme`; shared pieces (`Leader`, `Stamp`, `RoomChip`, `Blobs`, `LiveDot`, `PressableScale`) live in `src/components/ui.tsx`.

## Layout

```
src/
  api/
    types.ts     Server payloads, typed exactly as the API returns them
    client.ts    ClsrApi interface + framePath()
    http.ts      Real client: base-URL normalising, timeouts, {"error"} → ClsrError (409 → "busy")
    errors.ts    ClsrError kinds and user-facing messages
  lib/
    hotspots.ts  project() + aim points + declutter + grouping (unit-tested)
  store/server.tsx  Saved host, active client, health state
  app/            (tabs)/index = flats, (tabs)/settings = server, flat/[number], flat/[number]/room/[index]
```

## Hotspots

`src/lib/hotspots.ts` follows the brief:

- `project()` is copied line for line.
- Furniture is aimed at the centre of the box, 62% of the way up. Flat items (under 5 cm tall, like rugs) are aimed at the near edge, 15 cm inside, at their top.
- Floor: the point 1.7–5 m ahead of the camera that lands nearest v = 0.72. Walls: where the view leaves `rect_m`, at z = 1.95 m.
- Dots outside u 0.04–0.96 or v 0.05–0.95 are dropped. The rest are sorted nearest-first, and any dot within 0.065 (in width units) of a kept one is dropped.
- Furniture is grouped by `asset`: one dot changes every piece of that asset in the room.

The tests check the maths against hand-computed values. They have not yet been checked against a real Cycles frame.

## Networking

- Every request, image loads included, carries `X-CLSR-Token`. API calls send `Accept: application/json`; with `text/html` the server answers with an HTML sign-in page instead of a JSON error.
- A **401** shows as "token rejected". A **409** means the server's single render slot is busy (one job at a time across all flats); it is shown as "the server is busy", not as an error in the request.
- Server paths are percent-encoded per segment before use (model and image names contain spaces), and frames get `?t=<ms>` after a render so image caches don't show the old picture.
- If the health check fails, the app shows the unreachable state right away instead of waiting for request timeouts.

The server is plain HTTP on a private IP, which both platforms block by default. `app.json` allows it:

- **Android:** `usesCleartextTraffic: true` via `expo-build-properties`. Verified in the generated release manifest (`src/main/AndroidManifest.xml`), not only the debug one.
- **iOS:** an App Transport Security exception (`NSAllowsArbitraryLoads`, `NSAllowsLocalNetworking`) plus `NSLocalNetworkUsageDescription`. Verified in the generated `Info.plist`.

Expo Go already allows cleartext, so the first test that proves this config is a development or release build on a real device over ZeroTier. Tighten it when the backend moves to HTTPS.
