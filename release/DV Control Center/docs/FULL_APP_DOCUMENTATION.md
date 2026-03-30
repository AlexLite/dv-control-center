# DataVideo Control Center — Full Project Documentation

## 1. Project Purpose

`DataVideo Control Center` is a local web application for controlling DataVideo switchers via DVIP protocol.

Primary goals:
- Advanced control over PiP and Flex geometry with visual editor.
- Centralized menu control editing (Keyer/Chroma/Inputs/Outputs/Audio/Files/Setup).
- Merge/animation engine for transition-like geometry morphing.
- Model-aware behavior with capability-based UI filtering.

Main project path:
- `C:\Users\pikul\Desktop\dev\DataVideo Control Center\datavideo-control-center`

Protocol/choices runtime source:
- `docs/external` (bundled with release)

---

## 2. Runtime Model

### 2.1 Networking
The app uses 2 switcher ports:
- Realtime port: receives state updates (SSE to browser via server bridge).
- Command port: sends control commands.

Default UI/server port:
- `9999`

### 2.2 Execution
Server:
- `node server.js`

Web UI:
- `http://localhost:9999`

---

## 3. High-Level Architecture

### 3.1 Backend
- Entry point: `server.js`
- Core modules:
  - `lib/dvip-client.js` — transport/state/cache
  - `lib/protocol-codec.js` — packet encode/decode
  - `lib/bootstrap/model-bootstrap.js` — catalog build + enum enrichment + UI profiles
  - `lib/model-registry.js` — model profiles/capabilities/visibility rules
  - `lib/merge-engine.js` — merge preset engine
- Route modules:
  - `lib/routes/control-routes.js`
  - `lib/routes/model-routes.js`
  - `lib/routes/merge-routes.js`
  - `lib/routes/system-routes.js`

### 3.2 Frontend
- Entry: `public/app.js`
- Composition/wiring modules:
  - `public/app-shell.js`
  - `public/app-bootstrap.js`
  - `public/state-sync-ui.js`
  - `public/model-capabilities-ui.js`
- Editors/renderers:
  - `public/pip-editor.js`, `public/pip-renderer.js`
  - `public/flex-editor.js`, `public/flex-renderer.js`
  - `public/merge-engine-ui.js`
- UI infra:
  - `public/panels-ui.js`
  - `public/ui-core.js`
  - `public/runtime-helpers.js`
  - `public/editor-state.js`, `public/editor-persistence.js`, `public/editor-ui-utils.js`

---

## 4. Implemented Functionality

### 4.1 Core UI tabs
Implemented tabs:
- Configuration (connect/language)
- Multiview
- P-IN-P (PiP Studio)
- Flex (Flex Studio)
- Keyer
- Chroma
- Inputs
- Outputs
- Audio
- Files
- Setup
- Raw Controls

### 4.2 PiP Studio
Implemented:
- Canvas editor (drag/resize/position)
- Scale/position/crop controls
- Guide lines, snap, safe margins
- Save/Cancel/Undo workflow
- Border controls support with model gating

### 4.3 Flex Studio
Implemented:
- Canvas editor for Flex PiP windows
- Flex banks (`Src 1` / `Src 2`)
- Flex sources (BG/FG)
- Guide/snap/safe margin behavior
- Save/Cancel/Undo workflow

### 4.4 Merge Engine
Implemented:
- Preset save/list/delete
- Run/apply/stop
- Easing modes (`Linear`, `EaseEase`, `EaseIn`, `EaseOut`)
- Duration/FPS configuration
- API endpoints for external control (including Companion-side integration paths)

### 4.5 Model detection & model-aware behavior
Implemented:
- Requested model via `DV_MODEL` (`auto`, `se3200`, `se2200`, `se1200mu`, `se700`, `se650`)
- Detection metadata in API responses
- Capability-based tab/control filtering
- Additional `hiddenLabelPatterns` filtering per model
- `legacyDvip` marker in model profile (notably `se2200`)
- Shared tab helper API for consistent tab visibility/fallback logic:
  - `DVIPUiCore.setTabVisible(byIdFn, tabId, visible)`
  - `DVIPUiCore.getActiveTabId()`
  - `DVIPUiCore.activateTab(tabId)`
- Auto-hide empty menu groups (`keyer/chroma/inputs/outputs/audio/files/setup`) with active-tab fallback to `connect`
- Header `Model:` line includes explicit capability notes when disabled (`no Flex`, `no Multiview`, `no ext border`)
- Header capability badge (`#modelCapabilities`) shows `Limits: ...` for disabled features and stays hidden when no limits apply
- Header hidden-controls badge (`#modelHiddenControls`) shows localized count of controls filtered out by current model rules
- Model notes/limits text is i18n-driven via `model.note.*`, `model.limitsLabel`, `model.limit.*` keys

### 4.6 Enum mapping and dictionaries
Implemented:
- Protocol + choices-based enum enrichment.
- Extra explicit dictionaries added for controls where protocol is sparse.
- Menu controls render as dropdowns when enum is available.
- Choice enrichment is model-aware for key source families (notably `AUDIO_SOURCE` on `se3200`/`se1200mu`/`se2200`).
- Model-specific wipe pattern enum is enabled for `se2200` (`SWITCHER_WIPE_PATTERN_NUM` from `CHOICES_WIPE_2200`).
- Choice normalization filters out action-only labels like `[Release]` from enum lists exposed to UI/catalog.
- Missing `flag` enums are auto-filled as manual `OFF/ON` without overriding existing semantic enums.
- Enum controls carry source attribution in catalog/matrix:
  - `protocol`
  - `choices`
  - `manual`
  - fallback `inferred`

Examples covered:
- `SYSTEM_STANDARD`, `INPUT_STANDARD`
- `INPUT_INPUT_MODE`, `INPUT_INPUT_FREEZE_MODE`, `INPUT_INPUT_FRAME_MODE`
- `SYSTEM_NETWORK_IP_MODE`
- `SYSTEM_AUTO_SAVE_ENABLE` (`OFF/ON`)
- `SYSTEM_ASPECT` (`OFF/ON`)
- `SYSTEM_GENLOCK_ENABLE` (`OFF/ON`)
- `SYSTEM_SERIAL_MODE` (`OFF/ON`)
- `SYSTEM_AUDIO_ANALOG_LEVEL` (`OFF/ON`)
- `SYSTEM_PREF_TRANSP_MENUS` (`OFF/ON`)
- `SYSTEM_PREF_SMALL_MENUS` (`OFF/ON`)
- `OUTPUT_GPI_OUT_ENABLE` (`OFF/ON`)
- `AUDIO_SDI1..6_ENABLE` (`OFF/ON`)
- `AUDIO_HDMI1..3_ENABLE` (`OFF/ON`)
- `SWITCHER_KEY1..4_CHROMA_ENABLE` (`OFF/ON`)
- `SWITCHER_KEY1..4_MASK_ENABLE` (`OFF/ON`)
- `SWITCHER_DSK1/2_KEYER_ON` (`OFF/ON`)
- `SWITCHER_KEY1..4_KEYER_ON` (`OFF/ON`)
- `SWITCHER_DSK1/2_LINEAR_KEY_INVERT` (`OFF/ON`)
- `SWITCHER_KEY1..4_LINEAR_KEY_INVERT` (`OFF/ON`)
- `OUTPUT_MULTIVIEWER_MODE`
- `SWITCHER_PINP1..4_BORDER_STYLE`

### 4.7 Generated model matrix
Implemented generation:
- `tools/generate-model-docs.js`
- output files:
  - `data/model-control-matrix.json`
  - `docs/generated/MODEL_CONTROL_MATRIX.md`

Contains per-model:
- control counts
- enum counts
- supports flags
- hidden patterns
- legacy marker

---

## 5. API Surface (Current)

Core:
- `POST /api/connect`
- `POST /api/disconnect`
- `POST /api/control`
- `POST /api/control/batch`
- `POST /api/control/get`
- `GET /api/catalog`
- `GET /api/state`
- `GET /api/events`

Model:
- `GET /api/models`
- `POST /api/model/detect`
- `POST /api/state/refresh`

Input names:
- `POST /api/input-name`
- `POST /api/input-name/get`

Merge:
- `GET /api/merge/state`
- `GET /api/merge/presets`
- `POST /api/merge/presets/save`
- `POST /api/merge/presets/delete`
- `POST /api/merge/apply`
- `POST /api/merge/run`
- `POST /api/merge/stop`

---

## 6. Storage / Persistence

Runtime and generated data:
- `data/state-cache.json`
- `data/connection-config.json` (if enabled by runtime flow)
- `data/merge-presets.json`
- `data/register-map.full.json`
- `data/model-control-matrix.json`

Browser local storage used for editor preferences.

---

## 7. Testing and Quality

Test command:
- `npm test`

Current suite includes:
- merge scale behavior
- mapping contracts
- legacy mapping shim
- flex subsection behavior
- server composition
- merge API smoke
- calibration geometry
- menu tabs visibility + fallback:
  - `test/panels-menu-tabs.test.js`
- menu tabs model smoke (`se3200` / `se2200` / `se700`):
  - `test/menu-tabs-model-smoke.test.js`
- model capabilities tab visibility/fallback (including shared helper path):
  - `test/model-capabilities-tabs.test.js`
- model header state notes rendering:
  - `test/runtime-model-state.test.js`
- shared UI core tab helper behavior:
  - `test/ui-core-tabs.test.js`
- i18n key parity for model notes/limits:
  - `test/translations-model-keys.test.js`
- enum source attribution in model catalog:
  - `test/model-enum-source.test.js`
- model-specific choices mapping for constrained profiles:
  - `test/model-specific-source-choices.test.js`
- model-specific wipe pattern mapping (`se2200`):
  - `test/model-specific-wipe-pattern.test.js`
- release-label filtering for choices-based enums:
  - `test/choices-release-filter.test.js`
- default fill for missing flag enums (with non-override guard):
  - `test/flag-default-enum-fill.test.js`
- flag enum coverage across all model profiles:
  - `test/flag-enum-coverage.test.js`
- global absence of `[Release]` labels in catalog enums:
  - `test/no-release-labels-in-catalog-enums.test.js`
- coverage for boolean-like `int` controls (`_ENABLE`/`_ON`/`_INVERT`) enum presence:
  - `test/int-boolean-enum-coverage.test.js`
- byLabel enum source normalization and coverage:
  - `test/bylabel-enum-source-coverage.test.js`
- alignment of enumSource between `sections.controls` and `byLabel`:
  - `test/enum-source-alignment.test.js`
- unique enum option ids per control:
  - `test/enum-ids-unique-per-control.test.js`
- model matrix enum source consistency:
  - `test/model-matrix-enum-sources.test.js`
- catalog API enum source contract:
  - `test/catalog-enum-source-route.test.js`
- generated matrix markdown source markers:
  - `test/model-matrix-doc-enum-source.test.js`
- register-map enum source propagation:
  - `test/register-map-enum-source.test.js`
- generated register-map enum source integration:
  - `test/register-map-generated-file.test.js`
- enumSource domain guard (catalog + matrix):
  - `test/enum-source-domain.test.js`
- generated docs consistency (matrix JSON vs markdown):
  - `test/model-docs-generation-consistency.test.js`
- manual binary enum mapping guard:
  - `test/manual-binary-enums.test.js`

Static checks commonly used:
- `node --check <file>`

---

## 8. Known Nuances / Important Technical Details

1. Auto-detect mode and catalog scope
- `DV_MODEL=auto` starts with broad/hybrid catalog.
- Frontend capability filters still apply after detection updates.

2. `se2200` profile
- Marked as `legacyDvip` in model profile.
- Current implementation is safe filtered behavior, not full dedicated legacy runtime parity.

3. Enum coverage
- Most critical enums are mapped.
- Some controls remain numeric/range-based where docs do not provide reliable discrete dictionaries.

4. README encoding
- Existing `README.md` has mojibake/encoding artifacts in some environments.
- Source content is still usable, but rendering may look broken depending on console/editor encoding.

5. Early UI/bootstrap safety
- Menu rendering is null-safe for partially initialized frontend state.
- `buildMenuControls(deps)` tolerates missing `state/catalog` and keeps fallback behavior deterministic.

---

## 9. What Is Not Fully Implemented Yet

1. Full SE-2200 native legacy runtime parity
- Current state: filtered support profile.
- Missing: dedicated legacy command/state pipeline parity end-to-end.

2. Complete enum extraction from all manuals
- Current state: partial explicit additions + protocol/choices enrichment.
- Missing: exhaustive manual-driven enum catalog for every ambiguous int field.

3. Per-model deep UI tailoring beyond capability filtering
- Current state: control/tab filtering is implemented.
- Missing: full custom UX layouts per hardware family.

4. Final real-device geometry validation for all models
- Current state: shared base canvas geometry for all models.
- Missing: validated per-model geometry on real hardware chains.

---

## 10. Roadmap (Recommended)

### Phase A — Protocol completeness
- Expand enum dictionaries from manuals where values are definitive.
- Add confidence markers for enum sources (`protocol`, `choices`, `manual`, `inferred`).

### Phase B — Legacy model hardening
- Build dedicated legacy path for `se2200` (transport + control map + state decode parity).
- Add hardware-backed smoke tests for legacy mode.

### Phase C — UX hardening
- Continue menu/tab auto-pruning and model-driven section simplification.
- Add explicit UI badges for hidden/unsupported blocks.

### Phase D — Operational quality
- Add release checklist and environment sanity checks.
- Add regression snapshots for major model profiles.

---

## 11. Operational Checklist

Before testing with hardware:
1. Verify host/realtime/command ports.
2. Start server on expected port (`9999` unless overridden).
3. Confirm model line in header and capability notes.
4. Use `Sync Now` once after connect.
5. Validate critical controls on device (PiP/Flex source/position/scale/crop).

Before release/deploy:
1. `npm test`
2. regenerate matrices if model mapping changed:
   - `node tools/generate-model-docs.js`
3. verify `docs/generated/MODEL_CONTROL_MATRIX.md` updated.

---

## 12. Related Documentation

- `README.md`
- `handoff.md`
- `docs/TECH_AUDIT.md`
- `docs/ARCHITECTURE_PATTERNS.md`
- `docs/SMOKE_MERGE_UI.md`
- `docs/generated/MODEL_CONTROL_MATRIX.md`

---

## 13. Change Policy Note

Given active development and real hardware integration, prefer incremental and reversible changes:
- avoid destructive git operations
- keep model filtering explicit and auditable
- validate any mapping change with tests + real hardware checks when possible



