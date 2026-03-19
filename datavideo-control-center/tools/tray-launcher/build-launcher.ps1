$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

dotnet publish .\DataVideoControlCenter.Launcher.csproj `
  -c Release `
  -r win-x64 `
  --self-contained false `
  -p:PublishSingleFile=true `
  -p:IncludeNativeLibrariesForSelfExtract=true

if ($LASTEXITCODE -ne 0) {
  throw "dotnet publish failed with exit code $LASTEXITCODE"
}

Write-Host ""
Write-Host "Done. EXE path:"
Write-Host "$scriptDir\bin\Release\net8.0-windows\win-x64\publish\DataVideoControlCenter.Launcher.exe"
Write-Host ""
Write-Host "Optional renamed copy:"
Write-Host "$scriptDir\bin\Release\net8.0-windows\win-x64\publish\DV Control Center.exe"
Copy-Item -Force "$scriptDir\bin\Release\net8.0-windows\win-x64\publish\DataVideoControlCenter.Launcher.exe" "$scriptDir\bin\Release\net8.0-windows\win-x64\publish\DV Control Center.exe"
