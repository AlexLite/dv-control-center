## Companion DV Control Center Module (DVCC-only)

This module now provides only DV Control Center integration.
All legacy DVIP switcher controls/actions/feedbacks are removed.

## Available

- Action: `dvcc_merge_run_named`
- Feedbacks: `dvcc_merge_active`, `dvcc_merge_active_flex`, `dvcc_merge_active_pip`
- Variables:
  - `dvcc_merge_active_flex`
  - `dvcc_merge_running_flex`
  - `dvcc_merge_active_pip`
  - `dvcc_merge_running_pip`

## API used

- `GET /api/merge/state?mode=flex`
- `GET /api/merge/state?mode=pip`
- `GET|POST /api/merge/run/<preset>?mode=flex|pip`

The module does not send `duration/fps/easing` and relies on DVCC saved settings.

## Default

- DVCC base URL: `http://127.0.0.1:9999`

## Install

1. Copy the module folder into Companion custom modules directory.
2. Restart Companion.
3. Remove and re-add module instance to refresh action/feedback schema.