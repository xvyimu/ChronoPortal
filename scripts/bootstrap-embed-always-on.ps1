# One-shot: ensure local embed origin + Named Tunnel + logon autostart.
# Usage: powershell -NoProfile -File D:\nav-site\scripts\bootstrap-embed-always-on.ps1

$ErrorActionPreference = "Stop"
$Root = "D:\nav-site"
Set-Location $Root

$ensure = Join-Path $Root "scripts\ensure-embed-stack.ps1"
$install = Join-Path $Root "scripts\install-embed-autostart.ps1"

if (-not (Test-Path $ensure)) { throw "missing $ensure" }
if (-not (Test-Path $install)) { throw "missing $install" }

Write-Host "== ensure embed stack =="
& powershell -NoProfile -ExecutionPolicy Bypass -File $ensure
$ensureCode = $LASTEXITCODE

Write-Host "== install logon autostart =="
& powershell -NoProfile -ExecutionPolicy Bypass -File $install

Write-Host "== health checks =="
function Try-Get([string]$Url) {
  try {
    $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 12 -UserAgent "node"
    return "OK $($r.StatusCode) len=$($r.RawContentLength)"
  } catch {
    return "FAIL $($_.Exception.Message)"
  }
}

Write-Host ("local 18003: " + (Try-Get "http://127.0.0.1:18003/health"))
Write-Host ("tunnel:      " + (Try-Get "https://embed.aijiaqi.ccwu.cc/health"))
Write-Host ("worker:      " + (Try-Get "https://nav-site-embed-proxy.xiej4352.workers.dev/health"))

$task = Get-ScheduledTask -TaskName "nav-site-embed-stack" -ErrorAction SilentlyContinue
if ($task) {
  Write-Host "scheduled: $($task.TaskName) state=$($task.State)"
} else {
  Write-Host "scheduled: MISSING"
}

if ($ensureCode -ne 0) { exit $ensureCode }
Write-Host "DONE bootstrap-embed-always-on"
