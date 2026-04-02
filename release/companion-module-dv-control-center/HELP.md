## DV Control Center Module (DVCC-only)

This Companion module controls DVCC Merge presets only (no mixer TCP connection).

Available action:
- `dvcc_merge_run_named`

Available feedback:
- `dvcc_merge_active`

Available variables:
- `$(dvcc:active_flex)`
- `$(dvcc:active_pip)`

Required setting:
- `DVCC API Base URL` (default `http://127.0.0.1:9999`)

After updating module files, restart Companion and re-add the module instance.
