$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectDir = Resolve-Path (Join-Path $scriptDir "..\..")
$publishDir = Join-Path $scriptDir "bin\Release\net8.0-windows\win-x64\publish"
$targetDir = Join-Path $projectDir "launcher"
$targetExe = Join-Path $targetDir "DV Control Center.exe"

Set-Location $scriptDir

dotnet publish .\DataVideoControlCenter.Launcher.csproj `
  -c Release `
  -r win-x64 `
  --self-contained false `
  -p:PublishSingleFile=true `
  -p:IncludeNativeLibrariesForSelfExtract=true

New-Item -ItemType Directory -Force $targetDir | Out-Null
Copy-Item -Force (Join-Path $publishDir "DataVideoControlCenter.Launcher.exe") $targetExe

Write-Host ""
Write-Host "Launcher copied to:"
Write-Host $targetExe
Write-Host ""
Write-Host "Recommended run command:"
Write-Host "`"$targetExe`" --project-dir `"$projectDir`""
