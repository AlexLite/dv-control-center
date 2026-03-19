# Tray Launcher (Windows)

This launcher starts `node server.js` in background and keeps a tray icon.

Tray menu:
- `Open GUI` — opens `http://localhost:9999`
- `Refresh` — restarts Node server process
- `Close` — stops server and exits launcher

## Build

Requirements:
- .NET 8 SDK
- Node.js available in `PATH` on target machine

Build command:

```powershell
cd tools\tray-launcher
.\build-launcher.ps1
```

Published exe:

`tools\tray-launcher\bin\Release\net8.0-windows\win-x64\publish\DataVideoControlCenter.Launcher.exe`

Renamed copy:

`tools\tray-launcher\bin\Release\net8.0-windows\win-x64\publish\DV Control Center.exe`

Deploy to a single project folder:

```powershell
cd tools\tray-launcher
.\publish-to-project.ps1
```

This creates:

`launcher\DV Control Center.exe`

## Run

Recommended:
- Place `DataVideoControlCenter.Launcher.exe` in project root near `server.js`, then run it.

Alternative:
- Run with explicit project path:

```powershell
"DV Control Center.exe" --project-dir "C:\path\to\datavideo-control-center"
```

## Tray Icon

The launcher embeds DataVideo domain favicon (`www.datavideo.com`) as tray icon resource.

Logs:
- `logs\launcher.log` in project directory.
