DV Control Center beta deploy package

Contents:
- server.js + lib/ + public/ + data/
- package.json
- run-9999.cmd / run-9999.ps1
- DV Control Center.exe (tray launcher)

Run backend:
1) Install Node.js 18+
2) In this folder run: npm install
3) Start: run-9999.cmd

Run tray launcher:
- Start "DV Control Center.exe"
- Optional explicit path:
  "DV Control Center.exe" --project-dir "<this folder>"
