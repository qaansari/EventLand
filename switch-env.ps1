param([ValidateSet("local", "live")][string]$Target = "local")

$envFile = "frontend\.env.local"

if ($Target -eq "local") {
    @"
VITE_BACKEND_URL=http://localhost:4257
VITE_APP_ENV=local
"@ | Set-Content $envFile
    Write-Host "✅ Switched to LOCAL backend (localhost:4257)" -ForegroundColor Green
}
else {
    @"
VITE_BACKEND_URL=https://api.eventland.pk
VITE_APP_ENV=production
"@ | Set-Content $envFile
    Write-Host "✅ Switched to LIVE backend (api.eventland.pk)" -ForegroundColor Cyan
}