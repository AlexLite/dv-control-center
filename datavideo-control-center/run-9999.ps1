$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

$env:PORT = "9999"
Write-Host "Starting DataVideo Control Center on http://localhost:$env:PORT"
Write-Host "Press Ctrl+C to stop."
node .\server.js

