# ========================================================
# EventLand Single-Domain Automated Build & Deploy Script
# Hosts both React Frontend and .NET Web API on https://eventland.pk
# ========================================================

param(
    [string]$PublishPath = "C:\inetpub\eventland-api"
)

$ErrorActionPreference = "Stop"

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host " EventLand Single-Domain Deployment Pipeline" -ForegroundColor Cyan
Write-Host " Target Domain: https://eventland.pk" -ForegroundColor Cyan
Write-Host " Destination:   $PublishPath" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$FrontendDir = Join-Path $ScriptDir "frontend"
$BackendDir  = Join-Path $ScriptDir "backend\src\EventLand.Api"

# --- 1. Build React Frontend ---
Write-Host "`n>>> [1/4] Building React Frontend with Vite..." -ForegroundColor Yellow
Push-Location $FrontendDir
try {
    npm run build
} finally {
    Pop-Location
}

# --- 2. Publish ASP.NET Core Backend ---
Write-Host "`n>>> [2/4] Publishing ASP.NET Core Web API..." -ForegroundColor Yellow
Push-Location $BackendDir
try {
    dotnet publish -c Release -o "$PublishPath"
} finally {
    Pop-Location
}

# --- 3. Copy Frontend Dist to wwwroot ---
Write-Host "`n>>> [3/4] Copying compiled frontend into backend wwwroot..." -ForegroundColor Yellow
$WwwRoot = Join-Path $PublishPath "wwwroot"
if (-not (Test-Path $WwwRoot)) {
    New-Item -ItemType Directory -Path $WwwRoot | Out-Null
}

$DistPath = Join-Path $FrontendDir "dist"
Copy-Item -Path "$DistPath\*" -Destination $WwwRoot -Recurse -Force

Write-Host "Copied frontend assets to: $WwwRoot" -ForegroundColor Green

# --- 4. Recycle IIS AppPool ---
Write-Host "`n>>> [4/4] Recycling IIS Application Pool..." -ForegroundColor Yellow
$AppCmd = "$env:SystemRoot\system32\inetsrv\appcmd.exe"
if (Test-Path $AppCmd) {
    try {
        & $AppCmd recycle apppool "eventland-api"
        Write-Host "Successfully recycled IIS AppPool 'eventland-api'" -ForegroundColor Green
    } catch {
        Write-Warning "Could not recycle AppPool automatically. You can restart it manually in IIS Manager."
    }
} else {
    Write-Host "IIS appcmd not found locally; skipping AppPool recycle." -ForegroundColor DarkGray
}

Write-Host "`n====================================================" -ForegroundColor Green
Write-Host " DEPLOYMENT READY!" -ForegroundColor Green
Write-Host " Single-domain site is live at: https://eventland.pk" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Green

