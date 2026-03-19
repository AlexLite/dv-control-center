# v0.1.1

Repository cleanup release.

## Changes

- Removed duplicated runtime binaries from source tree:
  - `datavideo-control-center/DV Control Center.exe`
  - `datavideo-control-center/DataVideoControlCenter.Launcher.exe`
  - `datavideo-control-center/launcher/*.exe`
- Removed legacy runners from source tree:
  - `datavideo-control-center/run-9999.cmd`
  - `datavideo-control-center/run-9999.ps1`
- Kept runtime package as canonical in:
  - `release/DV Control Center`
- Updated `.gitignore` to prevent re-adding source-level launcher binaries.

## Notes

- Launch binaries are now expected only in release artifacts.
- Source tree remains focused on code, docs, tests, and build scripts.
