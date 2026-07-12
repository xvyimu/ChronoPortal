# 启动 Cloudflare Named Tunnel → 本机原生 embed (127.0.0.1:18003)
# 固定域名: https://embed.aijiaqi.ccwu.cc
# 用法: powershell -NoProfile -File D:\nav-site\scripts\start-embed-tunnel.ps1

$ErrorActionPreference = "Stop"
$Root = "D:\nav-site"
$cf = "C:\Users\yuanjia\.local\bin\cloudflared.exe"
$tunnelId = "7acf685a-67f8-4301-b680-2c4cd8001a72"
$cfg = Join-Path $env:USERPROFILE ".cloudflared\config-nav-site-embed.yml"
$pidFile = Join-Path $Root ".cloudflared-named.pid"
$outLog = Join-Path $Root ".cloudflared-named.out.log"
$errLog = Join-Path $Root ".cloudflared-named.err.log"
$hostname = "embed.aijiaqi.ccwu.cc"

if (-not (Test-Path $cf)) { throw "cloudflared not found: $cf" }
if (-not (Test-Path $cfg)) { throw "missing config $cfg" }

# ensure origin up
try {
  $h = Invoke-WebRequest -Uri "http://127.0.0.1:18003/health" -UseBasicParsing -TimeoutSec 3
  if ($h.StatusCode -ne 200) { throw "origin unhealthy" }
} catch {
  Write-Host "origin down — starting native embed first"
  & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $Root "scripts\start-embed-native.ps1")
}

if (Test-Path $pidFile) {
  $old = (Get-Content $pidFile -Raw).Trim()
  if ($old -match '^\d+$') {
    $p = Get-Process -Id ([int]$old) -ErrorAction SilentlyContinue
    if ($p) {
      Write-Host "tunnel already running pid=$old"
      exit 0
    }
  }
  Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
}

# stop other cloudflared (quick tunnel leftovers)
Get-Process cloudflared -ErrorAction SilentlyContinue | ForEach-Object {
  Write-Host "stopping other cloudflared pid=$($_.Id)"
  Stop-Process -Id $_.Id -Force
}
Start-Sleep -Seconds 1

$proc = Start-Process -FilePath $cf `
  -ArgumentList @("tunnel", "--config", $cfg, "run", $tunnelId) `
  -WindowStyle Hidden -PassThru `
  -RedirectStandardOutput $outLog -RedirectStandardError $errLog
$proc.Id | Set-Content $pidFile -Encoding ascii -NoNewline
Write-Host "pid=$($proc.Id) https://$hostname"

$ok = $false
for ($i = 1; $i -le 30; $i++) {
  Start-Sleep -Seconds 2
  if ($proc.HasExited) {
    Write-Host "exited; see $errLog"
    if (Test-Path $errLog) { Get-Content $errLog -Tail 30 }
    exit 1
  }
  try {
    $r = Invoke-WebRequest -Uri "https://$hostname/health" -UseBasicParsing -TimeoutSec 8
    if ($r.StatusCode -eq 200) {
      Write-Host "HEALTH $($r.Content)"
      $ok = $true
      break
    }
  } catch { Write-Host "WAIT $i" }
}
if (-not $ok) { Write-Host "health timeout"; exit 1 }
Set-Content (Join-Path $Root ".embed-tunnel-url.local") "https://$hostname" -Encoding ascii -NoNewline
Write-Host "OK https://$hostname"
