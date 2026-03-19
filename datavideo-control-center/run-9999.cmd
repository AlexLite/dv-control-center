@echo off
cd /d "%~dp0"
set PORT=9999
echo Starting DataVideo Control Center on http://localhost:%PORT%
echo Press Ctrl+C to stop.
node server.js

