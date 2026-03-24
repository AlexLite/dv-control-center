# Technical Audit (DataVideo Control Center)

Date: 2026-03-11

## Current hotspots

1. `public/app.js` is too large (~2800 lines)
- Mixes state, API client, UI rendering, canvas interaction, editor history, and transport mapping.
- High change coupling: small feature edits risk regressions in unrelated tabs.

2. UI state and transport state are tightly coupled
- Data mapping from panel registers to UI fields is directly embedded in view code.
- Hard to add features (for example new Flex/PiP fields) without touching many sections.

3. Repeated canvas interaction logic
- PiP and Flex mouse/edit flows are very similar.
- Divergence risk: fixes can land in one editor and be missed in another.

4. Server API surface is centralized in one file (`server.js`)
- Works now, but routing, validation, and transport orchestration are all in one place.
- Scaling endpoints will become harder over time.

## What was cleaned now

- Removed runtime/temp logs from project root:
  - `.run-9999-err.log`
  - `.run-9999-out.log`
  - `.run-err.log`
  - `.run-out.log`
  - `server-9999.err.log`
  - `server-9999.out.log`
  - `server.job.log`
- Removed test artifact:
  - `data/merge-presets.test.json`

## Decomposition applied now

- Added `public/ui-geometry.js` and moved shared geometry/math helpers there:
  - `clamp`
  - `rawPosToPct`
  - `pctToRawPos`
  - `rawScaleToPct`
  - `pctToRawScale`
  - `flexToCanvas`
  - `flexFromCanvasRect`
  - `getGuidePixelsFromList`
  - `snapRectGeneric`
- Connected this module in `public/index.html` before `app.js`.
- `public/app.js` now consumes shared helpers from `window.DVIPShared`.

This keeps behavior unchanged while reducing local complexity in `app.js`.

## Recommended next decomposition (safe sequence)

1. Extract editor history/dirty-lock subsystem from `app.js` to `public/editor-state.js`
2. Extract PiP canvas interaction to `public/pip-editor.js`
3. Extract Flex canvas interaction to `public/flex-editor.js`
4. Extract API client + SSE wiring to `public/api-client.js`
5. Split backend routes from `server.js` into `lib/routes/*.js`

Each step should be done with small PR-sized patches and a manual smoke check in UI.

## Validation done after cleanup/refactor

- JS syntax check:
  - `node --check public/app.js`
  - `node --check public/ui-geometry.js`
  - `node --check public/merge-engine-ui.js`
- Merge scale regression test:
  - `node test/merge-scale.test.js` -> passed



## Legacy compatibility

- Legacy namespace aliases `SE3200*` are retained via `public/namespace-alias.js`.
- Legacy `public/mapping-se3200.js` remains as a shim to `public/mapping-dvip.js`.
