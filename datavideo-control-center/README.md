# DataVideo Control Center

��������� web-��������� ��� ������������ ���������� DataVideo SE-3200 ����� DVIP.

## ��� ���� � UI

- ����������� � ������ (command/realtime)
- ��������� ������������ ������ � ����� (`Model: ...`)
- ������ `Sync Now` (on-demand refresh ��������� � ������)
- MultiView
- ����� �����
- Pip Studio
- Flex Studio
- Merge Engine
- Raw Controls
- Keyer/Chroma/Inputs/Outputs/Audio/Files/Setup: ���������� �� �������� HS-3200 (��� menu-��������, ����� ���, ��� ��� �������� � ��������� ������ PiP/Flex/Multiview)
- Inputs/Outputs/Audio/Files/Setup ������� �� ���������� ��������� ��� �������� ������� � ����������

## ������

```bash
cd datavideo-control-center
node server.js
```

�� ��������� UI �������� �� `http://localhost:9999`.

## ������������� Model Mapping (���� 1)

�������� ������� ������ ������� � ����� �������� ������ �� ������ ����� env:

- `DV_MODEL=auto` (�������������, ��������������� ����� �����������; ������� � ������ hybrid)
- `DV_MODEL=se3200` (fixed, hybrid: `protocol_3200 + protocol_common`)
- `DV_MODEL=se2200|se1200mu|se700|se650` (common: `protocol_common`)

������ �������:

```bash
DV_MODEL=auto node server.js
```

API:

- `GET /api/models` � ������� ������ � ������ ���������.
- `GET /api/catalog` � ���������� `model` � `modelSelection`.
- `POST /api/model/detect` � ����������� ��������� ���������������.
- `GET /api/state` � ���������� `model` � `modelSelection`.

Frontend namespace:

- ����� ������� namespace: `DVIP*`.
- ��� �������� ������������� ��������� alias `SE3200*` ����� `public/namespace-alias.js`.

### UI Model Capabilities (�������������)

������ capability-gating � UI �������� � `public/model-capabilities-ui.js`:

- ������ ����� ������� `supports` (`state.modelSelection.detected.supports` / `state.model.supports`).
- ���������� ���������� ������� � ��������� ������ UI �� ������������ ������.
- ���������� Raw Controls �� model capabilities.
- `app-shell.js` ���������� ���������� capability-������ � ���� ������ (� fallback).
����������: ������� UI ��-�������� ������������ �� SE-3200 extended-���� (Flex Studio / ����������� PiP). ��� ������ ������� ��� backend-ready ���� ��������, UI-��������� ����� ��������� ������.

## �����

```bash
npm test
```

�������� ���������� ��������:

- `npm run generate:register-map` � ������������� ������ ����� ��������� � `data/register-map.full.json` �� `protocol_3200 + protocol_common`.
- `npm run test:merge-scale` � interpolation scale ��� merge engine.
- `npm run test:mapping` � ����������� �������� mapping � `% <-> raw`.
- `npm run test:flex-subsection` � �������� ������ `subSection` ��� Flex Src 1/2.
- `npm run test:smoke-api` � �������������� smoke merge API (save/list/run/delete presets).
- `npm run test:server-composition` � smoke �������� server composition (bootstrap/routes/client/http utils).
- `npm run test:geometry` � �������� ��������� � round-trip ��� canvas geometry (PIP/Flex).
- `npm run check:protocol` � ������� ��� �������� label/id �� `protocol_3200.js` (GitHub/Bitfocus �����).

## CI

�������� GitHub Actions workflow:

- `.github/workflows/ci.yml`
- ��������� `node --check` ��� �������� frontend ������� � `npm test`.

## API

������� endpoint'�:

- `POST /api/connect`
- `POST /api/disconnect`
- `POST /api/control`
- `POST /api/control/batch`
- `POST /api/control/get`
- `POST /api/input-name`
- `POST /api/input-name/get`
- `GET /api/catalog`
- `GET /api/state`
- `GET /api/events` (SSE)

Merge Engine endpoint'�:

- `GET /api/merge/state`
- `GET /api/merge/presets`
- `POST /api/merge/presets/save`
- `POST /api/merge/presets/delete`
- `POST /api/merge/apply`
- `POST /api/merge/run`
- `POST /api/merge/stop`

## Merge Engine (��� Companion)

������ ������� �������� � �������:

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

��� `easing`: `Linear`, `EaseEase`, `EaseIn`, `EaseOut`.

## ������������

- Backend merge-������ �������� � `lib/merge-engine.js`.
- DVIP transport client ������� � `lib/dvip-client.js`.
- DVIP packet codec/helpers �������� � `lib/protocol-codec.js`.
- HTTP helpers (`json`/`readBody`) �������� � `lib/http-utils.js`.
- Backend model/catalog bootstrap ������� � `lib/bootstrap/model-bootstrap.js`.
- Frontend merge-������ �������� � `public/merge-engine-ui.js`.
- ����� ��������������/ui ������� �������� � `public/ui-geometry.js`.
- ����� ��������� UI/mapping �������� � `public/constants.js`.
- Core UI helpers (menus/select/canvas sync) �������� � `public/ui-core.js`.
- ������� ��������� �������� � `public/app-state.js`.
- API/SSE ������ ������� � `public/api-client.js`.
- Mapping/ID/convert helpers �������� � `public/mapping-dvip.js`.
- Legacy `public/mapping-se3200.js` �������� ��� compatibility shim �� `public/mapping-dvip.js`.
- Transport API (`sendControl`/`sendRawControl`) ������� � `public/transport-api.js`.
- Model capability-gating ������� � `public/model-capabilities-ui.js`.
- App shell/wiring (tabs, hotkeys, connection/events) ������� � `public/app-shell.js`.
- Bootstrap � init sequence �������� � `public/app-bootstrap.js`.
- State->UI sync ������� � `public/state-sync-ui.js`.
- Editor session state (capture/restore/history/hooks) ������� � `public/editor-state.js`.
- Editor persistence (localStorage/guides json IO) ������� � `public/editor-persistence.js`.
- Editor UI utils (bind/normalize/set-window-inputs) ������� � `public/editor-ui-utils.js`.
- Runtime helpers (connection state/locks/default windows/canvas converters) �������� � `public/runtime-helpers.js`.
- Base canvas geometry (������� ��������� ��� PIP/Flex) �������� � `public/canvas-geometry.js`.
- Pip/Flex controls cards �������� � `public/controls-ui.js`.
- Actions (apply/save/banks) �������� � `public/control-actions.js`.
- Pip mouse/editor ������ �������� � `public/pip-editor.js`.
- Flex mouse/editor ������ �������� � `public/flex-editor.js`.
- Pip/Flex renderer �������� � `public/pip-renderer.js` � `public/flex-renderer.js`.

### ������� �������� frontend �������

`index.html` ���������� ������ �� `app.js` � ��������� �������:

1. `canvas-geometry.js`
2. `ui-geometry.js`
3. `language/translations.js`
4. `language/i18n.js`
5. `constants.js`
6. `app-state.js`
7. `api-client.js`
8. `ui-core.js`
9. `mapping-dvip.js`
10. `transport-api.js`
11. `model-capabilities-ui.js`
12. `app-shell.js`
13. `panels-ui.js`
14. `state-sync-ui.js`
15. `editor-state.js`
16. `editor-persistence.js`
17. `editor-ui-utils.js`
18. `runtime-helpers.js`
19. `controls-ui.js`
20. `control-actions.js`
21. `app-bootstrap.js`
22. `pip-renderer.js`
23. `flex-renderer.js`
24. `pip-editor.js`
25. `flex-editor.js`
26. `namespace-alias.js`
27. `app.js`
28. `merge-engine-ui.js`

## Smoke Check (UI)

����������� ������ ��� ����� ���������:

1. ������� `Pip Studio`, ������� `PIP 1`, �������� `Scale`, ������ `Save PIP`.
2. ���������, ��� ����� � �������� �������� `Scale` ���������� ������������.
3. ������� `Flex Studio`, ��� `Flex Src 1` ��������� `Scale 100`, ��������� Key (`Save Preset` � Merge).
4. ��� `Flex Src 1` ��������� `Scale 75`, ��������� ������ Key.
5. ��������� `Run` ����� key � ���������, ��� ����������� ������ `Scale`, � �� ������ `X/Y`.
6. ����������� `Flex Src 1/2` � ���������, ��� ��������� �� �����������.

��������� �������� ��� Merge Scale: `docs/SMOKE_MERGE_UI.md`.

## �����

- ����������� ����� � ������ ����� ����: `docs/TECH_AUDIT.md`.










