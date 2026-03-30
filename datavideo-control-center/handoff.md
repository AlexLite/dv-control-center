# Handoff

## Project
- Main working project: `C:\Users\pikul\Desktop\dev\DataVideo Control Center\datavideo-control-center`
- Protocol/choices runtime source: `docs/external` inside the project/release folder

## What was completed

### 1) Enum/dictionary mapping improvements
Updated backend catalog enrichment in:
- `lib/bootstrap/model-bootstrap.js`

Added/verified dictionary mapping for:
- `SYSTEM_STANDARD`
- `INPUT_STANDARD`
- `INPUT_INPUT_MODE`
- `INPUT_INPUT_FREEZE_MODE`
- `INPUT_INPUT_FRAME_MODE`
- `SYSTEM_NETWORK_IP_MODE`
- `OUTPUT_MULTIVIEWER_MODE`
- `SWITCHER_PINP1..4_BORDER_STYLE`
- Existing source/aux/output/trans/audio choices enrichment retained.

Result: menu controls render as `select` where enum exists (instead of sliders/number fields).

### 2) Model-aware visibility matrix
Refactored model registry and visibility rules in:
- `lib/model-registry.js`

Added:
- `hiddenLabelPatterns` per model
- `legacyDvip` flag (notably `se2200: true`)
- `isControlVisibleForModel(modelProfile, section, control)`

### 3) Backend catalog filtering by model
Applied model visibility filter while building catalog in:
- `lib/bootstrap/model-bootstrap.js`

So unsupported controls are excluded from model catalog at source.

### 4) Frontend model capability filtering
Updated visibility filtering in:
- `public/model-capabilities-ui.js`
- `public/app.js`

Now frontend also hides controls matching model capability rules + `hiddenLabelPatterns`.

### 5) Model status UI note
Updated:
- `public/runtime-helpers.js`

`Model:` status now appends notes when relevant:
- `legacy DVIP`
- `filtered profile`

### 6) Generated model documentation/matrix
Added script and generated artifacts:
- `tools/generate-model-docs.js`
- `data/model-control-matrix.json`
- `docs/generated/MODEL_CONTROL_MATRIX.md`

The generated matrix includes:
- control counts per model
- enum coverage
- model supports flags
- hidden patterns
- legacy flag

### 7) README update
Updated:
- `README.md`

Added section describing model visibility matrix + docs generation command.

### 8) Validation
- `npm test --silent` passes after above changes.
- `node --check` for modified JS files passes.

## Completed after handoff
### 9) Auto-hide empty menu tabs by model
Updated:
- `public/panels-ui.js`

Implemented in `buildMenuControls(deps)`:
- `hasItems` calculation per menu group (`keyer/chroma/inputs/outputs/audio/files/setup`)
- hide top tab button + corresponding `tab-*` section when group is empty
- clear group container and skip render for empty groups
- show tab/section again when group has items
- fallback to `connect` tab when current active menu tab became hidden/empty

### 10) Regression test for menu tab visibility
Added:
- `test/panels-menu-tabs.test.js`
- `package.json` (`npm test` chain includes the new test)

Test verifies:
- empty menu groups hide their tabs/sections
- empty group roots are cleared
- active hidden menu tab triggers `connect` fallback click

### 11) Model smoke test for menu tabs
Added:
- `test/menu-tabs-model-smoke.test.js`
- `package.json` (`npm test` chain includes the new test)

Smoke test validates for `se3200`, `se2200`, `se700`:
- `buildMenuControls` renders without errors on real model catalogs
- at least one menu group remains visible
- `connect` fallback does not trigger when active tab is visible
- `connect` fallback triggers when active tab is hidden (if model has hidden menu groups)

### 12) Safety guard for early UI state
Updated:
- `public/panels-ui.js`
- `test/panels-menu-tabs.test.js`

Added null-safe handling for `state.catalog` in `buildMenuControls(deps)`:
- no throw when catalog is temporarily missing before bootstrap
- fallback tab behavior remains consistent (`connect` for empty/hidden active menu tab)

Extended with additional null-safe paths:
- no throw when `deps` has no `state` at all
- safe read of menu control values via optional access in key/setup/bucket render paths

### 13) Shared tab visibility helper (dedupe)
Updated:
- `public/ui-core.js`
- `public/model-capabilities-ui.js`
- `public/panels-ui.js`

Added shared helpers in `DVIPUiCore`:
- `setTabVisible(byIdFn, tabId, visible)`
- `getActiveTabId()`
- `activateTab(tabId)`

Then switched model/menu tab visibility logic to use these helpers with local fallback behavior, reducing duplication and drift risk between:
- model capability tab toggles (`flex/multiview`)
- menu group tab toggles (`keyer/chroma/inputs/outputs/audio/files/setup`)
- active-tab fallback to `connect`

### 14) Regression test for model capability tab toggles
Added:
- `test/model-capabilities-tabs.test.js`
- `package.json` (`npm test` chain includes the new test)

Test verifies:
- `applyModelCapabilities` hides/shows `flex` and `multiview` tabs correctly
- active hidden tab falls back to `connect`
- shared `DVIPUiCore` tab helpers are used when available
- fallback path still works when helper is unavailable

### 15) Model restriction notes in header
Updated:
- `public/runtime-helpers.js`
- `test/runtime-model-state.test.js`
- `package.json` (`npm test` chain includes the new test)

Extended `Model:` status notes to explicitly show disabled capabilities when applicable:
- `no Flex`
- `no Multiview`
- `no ext border`

Regression test verifies:
- `model.na` rendering when model is unknown
- combined notes for legacy/filtered/capability-disabled models
- requested-vs-detected model text formatting

### 16) Regression test for shared UI tab helper
Added:
- `test/ui-core-tabs.test.js`
- `package.json` (`npm test` chain includes the new test)

Test verifies `DVIPUiCore` tab helper behavior:
- `setTabVisible` toggles both tab button and section visibility
- `getActiveTabId` resolves active tab from `.tabs button.active`
- `activateTab` clicks target tab and returns success/failure flag

### 17) Visible model limits badge in header
Updated:
- `public/index.html`
- `public/styles.css`
- `public/runtime-helpers.js`
- `test/runtime-model-state.test.js`

Added `#modelCapabilities` badge near `Model:` in header:
- hidden when no explicit limitations
- shows `Limits: ...` for disabled model capabilities (Flex / Multiview / Extended border)

Updated regression test verifies badge visibility and text content for:
- no model (`hidden`)
- legacy filtered model with multiple disabled features (`visible`)
- partial capability restrictions (`visible`)

### 18) i18n for model notes and limits
Updated:
- `public/language/translations.js`
- `public/runtime-helpers.js`
- `test/runtime-model-state.test.js`

Localized model status notes and limits badge labels via i18n keys:
- `model.note.*`
- `model.limitsLabel`
- `model.limit.*`

### 19) i18n key parity regression test
Added:
- `test/translations-model-keys.test.js`
- `package.json` (`npm test` chain includes the new test)

Test verifies model note/limits i18n keys are present and non-empty in both locales:
- `en`
- `ru`

### 20) Local run + Chrome MCP validation
Validated via local launch (`node server.js`) and browser automation (Chrome MCP):
- app loads and UI is interactive on `http://localhost:9999`
- RU/EN language switch works
- in `DV_MODEL=se700` mode, `Multiview`/`Flex` tabs are hidden as expected
- model restrictions are applied and visible

Bug found and fixed during live validation:
- `#modelCapabilities` had text but stayed hidden because JS used `style.display=''` against CSS default `display:none`
- fixed in `public/runtime-helpers.js` by setting `style.display='inline-block'`
- regression test `test/runtime-model-state.test.js` updated accordingly

### 21) Enum source metadata pipeline
Updated:
- `lib/bootstrap/model-bootstrap.js`
- `tools/generate-model-docs.js`
- `data/model-control-matrix.json` (generated)
- `docs/generated/MODEL_CONTROL_MATRIX.md` (generated)
- `test/model-enum-source.test.js`
- `package.json` (`npm test` chain includes the new test)

Added enum source attribution for controls with discrete values:
- `protocol`
- `choices`
- `manual`
- fallback `inferred`

Catalog now carries `enumSource` per enum control, and generated matrix includes:
- `enumSources` by label
- `enumSourceCounts` summary per model

### 22) Matrix enum source consistency guard
Updated:
- `tools/generate-model-docs.js`
- `data/model-control-matrix.json` (generated)
- `docs/generated/MODEL_CONTROL_MATRIX.md` (generated)
- `test/model-matrix-enum-sources.test.js`
- `package.json` (`npm test` chain includes the new test)

Fix: `enumSourceCounts` now counts unique enum labels (not duplicated controls) and matches `enumControlsCount`.

Regression test verifies:
- `enumSources`/`enumSourceCounts` exist for each model
- sum of `enumSourceCounts` equals `enumControlsCount`
- key labels in `se3200` map to expected sources (`manual/choices/protocol`)

### 23) Catalog API enumSource contract test
Added:
- `test/catalog-enum-source-route.test.js`
- `package.json` (`npm test` chain includes the new test)

Test validates `/api/catalog` response includes `enumSource` on enum controls and checks representative labels for `se3200`:
- `SYSTEM_NETWORK_IP_MODE => manual`
- `SWITCHER_KEY1_SPLIT_SRC => choices`
- `STATUS_SYSTEM_CONNECTION_STATUS => protocol`

### 24) Enum source markers in generated markdown
Updated:
- `tools/generate-model-docs.js`
- `docs/generated/MODEL_CONTROL_MATRIX.md` (generated)
- `test/model-matrix-doc-enum-source.test.js`
- `package.json` (`npm test` chain includes the new test)

`Enum Coverage` lines now include source marker per label:
- format: ``- <LABEL> [<source>]: ...``
- source from union of model enum sources (`protocol`/`choices`/`manual`/`inferred`)

### 25) Register-map enumSource propagation
Updated:
- `tools/generate-register-map.js`
- `test/register-map-enum-source.test.js`
- `package.json` (`npm test` chain includes the new test)

`generate-register-map` now propagates `enumSource` (`protocol`/`null`) into output maps:
- `byKey.*.enumSource`
- `byLabel.*.enumSource`
- `sections[*].enumSource`

### 26) Generated register-map enumSource integration test
Added:
- `test/register-map-generated-file.test.js`
- `package.json` (`npm test` chain includes the new test)

Integration test runs `tools/generate-register-map.js` and validates `data/register-map.full.json`:
- structure exists (`byLabel`/`byKey`/`sections`)
- enum controls include `enumSource=protocol`
- non-enum controls include `enumSource=null`

### 27) enumSource domain guard
Updated:
- `lib/bootstrap/model-bootstrap.js`
- `test/enum-source-domain.test.js`
- `package.json` (`npm test` chain includes the new test)

Added enumSource normalization and domain guard:
- allowed values: `protocol`, `choices`, `manual`, `inferred`
- invalid/unknown source values are normalized to fallback/null
- regression test validates domain in both catalog and generated matrix

### 28) Generated docs consistency guard
Added:
- `test/model-docs-generation-consistency.test.js`
- `package.json` (`npm test` chain includes the new test)

Integration test runs `tools/generate-model-docs.js` and validates consistency between:
- `data/model-control-matrix.json`
- `docs/generated/MODEL_CONTROL_MATRIX.md`

Checks include:
- each model section exists in markdown
- each model's enum controls count line matches JSON
- each model's enum source summary line exactly matches JSON-derived values

### 29) Manual ON/OFF enum expansion for discrete fields
Updated:
- `lib/bootstrap/model-bootstrap.js`
- `data/model-control-matrix.json` (generated)
- `docs/generated/MODEL_CONTROL_MATRIX.md` (generated)
- `test/manual-binary-enums.test.js`
- `package.json` (`npm test` chain includes the new test)

Added manual enum mapping (`OFF/ON`) for clearly discrete controls:
- `SYSTEM_AUTO_SAVE_ENABLE`
- `SWITCHER_KEY1..4_CHROMA_ENABLE`
- `SWITCHER_KEY1..4_MASK_ENABLE`

Regression test validates for `se3200`, `se2200`, `se700`:
- enum values exist and are exactly `[OFF, ON]`
- `enumSource` is `manual`

### 30) Manual ON/OFF enum expansion for keyer/invert fields
Updated:
- `lib/bootstrap/model-bootstrap.js`
- `test/manual-binary-enums.test.js`
- `test/model-matrix-doc-enum-source.test.js`
- `data/model-control-matrix.json` (generated)
- `docs/generated/MODEL_CONTROL_MATRIX.md` (generated)

Added manual enum mapping (`OFF/ON`) for additional discrete controls:
- `SWITCHER_DSK1_KEYER_ON`
- `SWITCHER_DSK2_KEYER_ON`
- `SWITCHER_KEY1..4_KEYER_ON`
- `SWITCHER_DSK1_LINEAR_KEY_INVERT`
- `SWITCHER_DSK2_LINEAR_KEY_INVERT`
- `SWITCHER_KEY1..4_LINEAR_KEY_INVERT`

Regression coverage:
- extended `test/manual-binary-enums.test.js` for new labels across `se3200`, `se2200`, `se700`
- stabilized `test/model-matrix-doc-enum-source.test.js` to check a robust manual marker present in top-coverage markdown

### 31) Manual ON/OFF enum expansion for system menu prefs
Updated:
- `lib/bootstrap/model-bootstrap.js`
- `test/manual-binary-enums.test.js`
- `data/model-control-matrix.json` (generated)
- `docs/generated/MODEL_CONTROL_MATRIX.md` (generated)

Added manual enum mapping (`OFF/ON`) for:
- `SYSTEM_PREF_TRANSP_MENUS`
- `SYSTEM_PREF_SMALL_MENUS`

Regression test coverage extended in `test/manual-binary-enums.test.js` for `se3200`, `se2200`, `se700`.

### 32) Manual ON/OFF enum expansion for audio/gpi enables
Updated:
- `lib/bootstrap/model-bootstrap.js`
- `test/manual-binary-enums.test.js`
- `data/model-control-matrix.json` (generated)
- `docs/generated/MODEL_CONTROL_MATRIX.md` (generated)

Added manual enum mapping (`OFF/ON`) for discrete enable controls:
- `OUTPUT_GPI_OUT_ENABLE`
- `AUDIO_SDI1..6_ENABLE`
- `AUDIO_HDMI1..3_ENABLE`

Regression test coverage extended in `test/manual-binary-enums.test.js`:
- validates new enable labels where present for `se3200`, `se2200`, `se700`

### 33) Hidden controls badge in header
Updated:
- `public/index.html`
- `public/styles.css`
- `public/runtime-helpers.js`
- `public/language/translations.js`
- `test/runtime-model-state.test.js`
- `test/translations-model-keys.test.js`

Added header badge `#modelHiddenControls`:
- shows localized text with hidden controls count (`model.hiddenControls`)
- uses existing model visibility logic (`DVIPModelCapabilitiesUi.isRawControlVisible`)
- hidden when count is zero or model is unavailable

Regression coverage:
- runtime test verifies visible/hidden behavior and count text
- translations parity test verifies `model.hiddenControls` key for `en` and `ru`

### 34) Model-specific choices enrichment (audio/source sets)
Updated:
- `lib/bootstrap/model-bootstrap.js`
- `test/model-specific-source-choices.test.js`
- `package.json` (`npm test` chain includes the new test)
- `data/model-control-matrix.json` (generated)
- `docs/generated/MODEL_CONTROL_MATRIX.md` (generated)

Enrichment now selects choice sets by model profile (`se3200`, `se1200mu`, `se700/se650`, `se2200`) with safe fallback:
- source bundles resolved per model before `setChoiceValues`
- `AUDIO_SOURCE` now uses model-specific choices where available (e.g. `se2200: Fixed/Follow`, `se1200mu: In1..In6`, `se3200: In1..In12`)

Regression test verifies model-specific `AUDIO_SOURCE` behavior and `enumSource=choices` for constrained model profiles.

### 35) Release-label filtering for enum choices
Updated:
- `lib/bootstrap/model-bootstrap.js`
- `test/choices-release-filter.test.js`
- `package.json` (`npm test` chain includes the new test)
- `data/model-control-matrix.json` (generated)
- `docs/generated/MODEL_CONTROL_MATRIX.md` (generated)

Choice normalization now excludes action-style labels containing `[Release]` before publishing enum values to catalog/UI.

Regression test verifies on `se2200`:
- `AUDIO_SOURCE` contains stable labels (`Fixed`, `Follow`)
- `[Release]` labels are not present in enum values

### 36) Model-specific wipe pattern enum (SE-2200)
Updated:
- `lib/bootstrap/model-bootstrap.js`
- `test/model-specific-wipe-pattern.test.js`
- `package.json` (`npm test` chain includes the new test)
- `data/model-control-matrix.json` (generated)
- `docs/generated/MODEL_CONTROL_MATRIX.md` (generated)

Added model-scoped choices enrichment:
- `SWITCHER_WIPE_PATTERN_NUM` uses `CHOICES_WIPE_2200` for `se2200`
- other models keep numeric/range behavior (no forced enum)

Regression test validates:
- `se2200` exposes wipe pattern enum values (`Wipe 1` ... `BDR`) with `enumSource=choices`
- `se3200` remains without forced enum values for this control

### 37) Manual ON/OFF enum expansion for system flags
Updated:
- `lib/bootstrap/model-bootstrap.js`
- `test/manual-binary-enums.test.js`
- `data/model-control-matrix.json` (generated)
- `docs/generated/MODEL_CONTROL_MATRIX.md` (generated)

Added manual enum mapping (`OFF/ON`) for flag-like system controls:
- `SYSTEM_ASPECT`
- `SYSTEM_GENLOCK_ENABLE`
- `SYSTEM_SERIAL_MODE`
- `SYSTEM_AUDIO_ANALOG_LEVEL`

Regression coverage extended in `test/manual-binary-enums.test.js` for constrained profiles.

### 38) Default enum fill for missing flag controls
Updated:
- `lib/bootstrap/model-bootstrap.js`
- `test/flag-default-enum-fill.test.js`
- `package.json` (`npm test` chain includes the new test)

Added fallback enrichment pass:
- for `type=flag` controls without enum values, assign manual `OFF/ON`
- does not override existing enums if already present (e.g. `FTB_TRANS_DIRN` keeps `FORWARD/REVERSE`)

Regression test verifies:
- missing flag enum gets `OFF/ON` with `enumSource=manual`
- existing non-boolean flag enum labels remain preserved

### 39) Flag enum coverage guard
Added:
- `test/flag-enum-coverage.test.js`
- `package.json` (`npm test` chain includes the new test)

Coverage guard verifies for `se3200`, `se2200`, `se1200mu`, `se700`, `se650`:
- every `type=flag` control in catalog has enum values after enrichment

### 40) Global guard for `[Release]` labels in catalog enums
Added:
- `test/no-release-labels-in-catalog-enums.test.js`
- `package.json` (`npm test` chain includes the new test)

Guard verifies for `se3200`, `se2200`, `se1200mu`, `se700`, `se650`:
- no enum value label in generated catalog contains `[Release]`

### 41) Coverage guard for boolean-like `int` controls
Added:
- `test/int-boolean-enum-coverage.test.js`
- `package.json` (`npm test` chain includes the new test)

Guard verifies for `se3200`, `se2200`, `se1200mu`, `se700`, `se650`:
- all `type=int` controls with labels ending in `_ENABLE`, `_ON`, `_INVERT` have enum values

### 42) byLabel enumSource normalization + coverage guard
Updated:
- `lib/bootstrap/model-bootstrap.js`
- `test/bylabel-enum-source-coverage.test.js`
- `package.json` (`npm test` chain includes the new test)

Added post-merge normalization in `createCatalog`:
- for each `byLabel` enum control, `enumSource` is normalized using section-level sources fallback
- prevents enum controls with `values` but empty/missing `enumSource`

Coverage guard verifies for all main model profiles:
- every `byLabel` enum control has non-empty `enumSource`
- `enumSource` is in allowed domain (`protocol|choices|manual|inferred`)

### 43) section/byLabel enumSource alignment guard
Updated:
- `lib/bootstrap/model-bootstrap.js`
- `test/enum-source-alignment.test.js`
- `package.json` (`npm test` chain includes the new test)

Added final alignment pass in enrichment:
- section-level enum controls and `byLabel` entries now share one canonical `enumSource`
- prevents drift after late-stage choice/manual enrichment

Regression test verifies for `se3200`, `se2200`, `se1200mu`, `se700`, `se650`:
- every enum control in sections has the same `enumSource` as corresponding `byLabel` entry

### 44) Enum option id uniqueness guard
Added:
- `test/enum-ids-unique-per-control.test.js`
- `package.json` (`npm test` chain includes the new test)

Guard verifies for main model profiles:
- each enum control in `catalog.byLabel` has unique option ids (no duplicate `id` values inside one control)

## Recommended immediate next step
- Optional: manual smoke in browser for model switches (`se3200`, `se2200`, `se700`) to validate visual behavior in live UI (automated model smoke test is already in place).

## Quick file list touched in this phase
- `lib/model-registry.js`
- `lib/bootstrap/model-bootstrap.js`
- `public/model-capabilities-ui.js`
- `public/app.js`
- `public/runtime-helpers.js`
- `tools/generate-model-docs.js`
- `data/model-control-matrix.json` (generated)
- `docs/generated/MODEL_CONTROL_MATRIX.md` (generated)
- `README.md`
- `public/panels-ui.js`
- `public/model-capabilities-ui.js`
- `public/ui-core.js`
- `test/panels-menu-tabs.test.js`
- `test/menu-tabs-model-smoke.test.js`
- `test/model-capabilities-tabs.test.js`
- `test/runtime-model-state.test.js`
- `test/ui-core-tabs.test.js`
- `test/translations-model-keys.test.js`
- `test/model-enum-source.test.js`
- `package.json`
- `public/index.html`
- `public/styles.css`
- `public/runtime-helpers.js`

