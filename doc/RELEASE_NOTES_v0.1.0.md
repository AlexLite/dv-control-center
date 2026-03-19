# v0.1.0

Initial public release of **DV Control Center** and custom **Companion module** integration.

## Included

- DV Control Center web app (backend + frontend)
- Runtime package in `release/DV Control Center`
- Custom Companion module `companion-module-dv-control-center`
- Base upstream snapshot `companion-module-datavideo-dvip-master`
- Project docs and protocol references

## Key Features

- DVIP control for DataVideo switchers (focus on SE-3200/HS-3200)
- PiP/Flex graphical editors
- Merge Engine (save/run transition keys)
- Companion action for merge key by name: `dvcc_merge_run_named`
- Companion feedback for active merge key: `dvcc_merge_active`
- Companion variables for merge active/running states

## Repository Updates in this release

- Root README with full install/deploy guide
- Root CI workflow (`.github/workflows/ci.yml`)
- Legacy module snapshot moved to `archive/dv-control-center-0.5`
- Initial tag and publish baseline

## Notes

- If Companion module files are updated manually, restart Companion to reload the module.
- Merge active feedback depends on DVCC state matching logic / active preset reporting.
