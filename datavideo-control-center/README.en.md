# DataVideo Control Center

English documentation for the DVCC web application.

## Overview

DataVideo Control Center (DVCC) is a web app for DVIP-based control of DataVideo switchers.
Current main focus is SE-3200 / HS-3200, with model-aware capability gating.

## Core Features

- Connection management (command + realtime transport)
- Auto-detect / fixed model selection
- On-demand `Sync Now` refresh
- MultiView configuration
- Camera names editor
- `P-IN-P` studio (graphical PiP editor)
- `Flex` studio (graphical Flex PinP editor)
- Merge Engine (save/run animated transitions between Flex/PiP states)
- Raw DVIP controls
- Extended menu panels: Keyer / Chroma / Inputs / Outputs / Audio / Files / Setup

## Run

```bash
cd datavideo-control-center
node server.js
```

Default UI URL: `http://localhost:9999`

## Configuration

Environment variables:

- `DV_MODEL=auto` (default, tries model detection)
- `DV_MODEL=se3200` (force hybrid profile)
- `DV_MODEL=se2200|se1200mu|se700|se650` (force common profile)

Example:

```bash
DV_MODEL=auto node server.js
```

## Main API Endpoints

- `POST /api/connect`
- `POST /api/disconnect`
- `GET /api/state`
- `GET /api/catalog`
- `GET /api/events` (SSE)
- `POST /api/control`
- `POST /api/control/batch`
- `POST /api/control/get`
- `POST /api/input-name`
- `POST /api/input-name/get`

Merge API:

- `GET /api/merge/state`
- `GET /api/merge/presets`
- `POST /api/merge/presets/save`
- `POST /api/merge/presets/delete`
- `POST /api/merge/apply`
- `POST /api/merge/run`
- `POST /api/merge/stop`

Example run request:

```http
POST /api/merge/run
Content-Type: application/json

{
  "preset": "Key 2",
  "durationMs": 1500,
  "fps": 15,
  "easing": "EaseEase"
}
```

Easing values: `Linear`, `EaseEase`, `EaseIn`, `EaseOut`.

## Tests

```bash
npm test
```

Additional checks:

- `npm run generate:register-map`
- `npm run test:merge-scale`
- `npm run test:mapping`
- `npm run test:flex-subsection`
- `npm run test:smoke-api`
- `npm run test:server-composition`
- `npm run test:geometry`
- `npm run check:protocol`

## Notes

- Feature visibility in UI is model-capability based.
- Legacy `SE3200*` aliases are preserved in frontend via compatibility shim.
- Companion integration is implemented through the custom module in `../companion-module-dv-control-center`.
