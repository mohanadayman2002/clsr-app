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

On first launch the address field is prefilled with the studio PC's ZeroTier address, `http://10.37.122.125:8765`. Tap **Connect**, or change the address; the port is added if you leave it out. The **access token** field is only needed if the server runs with `CLSR_TOKEN` set. You can change both later in the **Server** tab, and they are remembered (the token goes in the Keychain/Keystore). Or tap **Try demo**. Demo mode uses built-in sample flats and draws each frame as a line drawing from its camera data, since there are no real photos.

## Status

| # | Feature | State |
| --- | --- | --- |
| – | Server address, health check, unreachable-server handling, demo mode | done |
| 1 | Browse flats → rooms → photos, swipe between views | done (pinch-zoom not yet) |
| 2 | Hotspots on photos → picker | dots and detail sheet done; pickers next |
| 3 | Queue changes → `batch` render → wait → undo | next |
| 4 | Costs: room subtotals and whole-flat bill | totals shown; full bill next |
| 5 | Upload a plan with style and budget, follow `/api/status` | next |

## Layout

```
src/
  api/
    types.ts     Server payloads, typed exactly as the API returns them
    client.ts    ClsrApi interface + framePath()
    http.ts      Real client: base-URL normalising, timeouts, {"error"} → ClsrError (409 → "busy")
    demo.ts      Sample flats in the same shape as the API
    errors.ts    ClsrError kinds and user-facing messages
  lib/
    hotspots.ts  project() + aim points + declutter + grouping (unit-tested)
    wireframe.ts Line drawings of rooms for demo mode
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

- Every request, image loads included, carries `X-CLSR-Token` when a token is set. A **401** shows as "token rejected" and a **409** as "this flat is being changed". Neither is treated as a crash.
- If the health check fails, the app shows the unreachable state right away instead of waiting for request timeouts.

The server uses plain HTTP on a LAN or VPN address, so `app.json` allows cleartext traffic. On Android this is `usesCleartextTraffic` via `expo-build-properties`. On iOS it is the ATS `NSAllowsArbitraryLoads` setting plus a local-network usage string. Tighten this if the server ever moves to a hosted HTTPS address.
