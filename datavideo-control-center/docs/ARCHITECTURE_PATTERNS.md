# Architecture Patterns (Context7-validated)

Date: 2026-03-11

## Goal

Reduce coupling in `public/app.js` and move to predictable, testable modules with minimal regressions.

## Selected patterns

1. ES Modules (feature split)
- Split by feature (`pip`, `flex`, `merge`, `api`, `state`) and expose narrow public API.
- Keep import/export boundaries explicit.

2. Event Bus via `EventTarget` + `CustomEvent`
- Decouple modules from direct calls.
- Use domain events (`state:changed`, `connection:changed`, `editor:dirty`, `merge:start`, `merge:stop`).

3. State-machine mindset for editor interactions
- Explicit interaction states for canvas editor:
  - `idle`
  - `hover`
  - `dragMove`
  - `dragResize`
  - `dragCrop`
  - `dragGuide`
- This can be done with plain JS first, then optionally formalized with XState if needed.

## Why these patterns

- Current `app.js` still mixes rendering, interaction, transport sync, and orchestration.
- Event bus + module boundaries reduce accidental cross-feature regressions.
- Interaction states become easier to reason about and test.

## Incremental migration plan

1. Extract `state` factory and defaults into separate module.
2. Add event bus module and route high-level transitions through events.
3. Move API + SSE logic into `api-client` module.
4. Split canvas editors into:
   - `pip-editor` (draw + mouse)
   - `flex-editor` (draw + mouse)
5. Introduce interaction-state reducer for editor mode transitions.

## Context7 sources used

- MDN JS modules guide:
  - https://github.com/mdn/content/blob/main/files/en-us/web/javascript/guide/modules/index.md
  - https://github.com/mdn/content/blob/main/files/en-us/web/javascript/reference/statements/export/index.md
- MDN EventTarget / CustomEvent:
  - https://github.com/mdn/content/blob/main/files/en-us/web/api/eventtarget/eventtarget/index.md
  - https://github.com/mdn/content/blob/main/files/en-us/web/api/customevent/index.md
  - https://github.com/mdn/content/blob/main/files/en-us/web/api/eventtarget/dispatchevent/index.md
- XState (state machine pattern reference):
  - https://github.com/statelyai/xstate/blob/main/packages/core/README.md

