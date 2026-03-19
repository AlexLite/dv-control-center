## Companion DV Control Center Module

English documentation for the custom Companion module.

This module is designed to run alongside legacy `datavideo-dvip` without breaking legacy behavior.

## Scope

- Keeps standard DataVideo DVIP control/actions from the base module
- Adds DV Control Center merge integration

### Added DVCC Integration

- Action: run merge key by name (`dvcc_merge_run_named`)
- Feedback: active merge preset (`dvcc_merge_active`)
- Variables:
  - `dvcc_merge_active_flex`
  - `dvcc_merge_running_flex`
  - `dvcc_merge_active_pip`
  - `dvcc_merge_running_pip`

Module polls DVCC state from:

- `/api/merge/state?mode=flex`
- `/api/merge/state?mode=pip`

Default DVCC URL: `http://127.0.0.1:9999` (configurable in module settings).

## Install

1. Copy module folder into Companion custom modules directory.
2. Restart Companion.
3. Add module instance in Companion UI.
4. Set switcher connection fields and DVCC Base URL in config.

## Usage

- Use action `RUN (name)` to run a saved DVCC merge preset.
- Use feedback `DVCC Merge Key Active` for button color/state.

## Notes

- If the module is replaced manually, Companion restart is required.
- Active feedback depends on DVCC reported active state and preset matching.
