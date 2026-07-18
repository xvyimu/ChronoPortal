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
$healthHeaders = @{ "User-Agent" = "nav-site-embed-client/1.0" }

if (-not (Test-Path $cf)) { throw "cloudflared not found: $cf" }
if (-not (Test-Path $cfg)) { throw "missing config $cfg" }

function Test-PublicHealth {
  try {
    $r = Invoke-WebRequest -Uri "https://$hostname/health" -Headers $healthHeaders -UseBasicParsing -TimeoutSec 8
    return ($r.StatusCode -eq 200)
  } catch {
    return $false
  }
}

# ensure origin up
try {
  $h = Invoke-WebRequest -Uri "http://127.0.0.1:18003/health" -UseBasicParsing -TimeoutSec 3
  if ($h.StatusCode -ne 200) { throw "origin unhealthy" }
} catch {
  Write-Host "origin down — starting native embed first"
  & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $Root "scripts\start-embed-native.ps1")
}

# Already healthy publicly? reuse whatever tunnel is serving it.
if (Test-PublicHealth) {
  Write-Host "public health already OK https://$hostname — skip restart"
  Set-Content (Join-Path $Root ".embed-tunnel-url.local") "https://$hostname" -Encoding ascii -NoNewline
  exit 0
}

if (Test-Path $pidFile) {
  $old = (Get-Content $pidFile -Raw).Trim()
  if ($old -match '^\d+$') {
    $p = Get-Process -Id ([int]$old) -ErrorAction SilentlyContinue
    if ($p) {
      Write-Host "pidfile tunnel running pid=$old but public health fail — will try restart if stoppable"
      try {
        Stop-Process -Id ([int]$old) -Force -ErrorAction Stop
        Start-Sleep -Seconds 1
      } catch {
        Write-Host "WARN cannot stop pid=$old ($($_.Exception.Message)); will start another instance"
      }
    }
  }
  Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
}

# Best-effort stop other cloudflared. Access-denied is non-fatal.
Get-Process cloudflared -ErrorAction SilentlyContinue | ForEach-Object {
  Write-Host "stopping other cloudflared pid=$($_.Id)"
  try {
    Stop-Process -Id $_.Id -Force -ErrorAction Stop
  } catch {
    Write-Host "WARN cannot stop cloudflared pid=$($_.Id): $($_.Exception.Message)"
  }
}
Start-Sleep -Seconds 1

# If another session's tunnel recovered health after origin came up, done.
if (Test-PublicHealth) {
  Write-Host "public health OK after origin wait — reuse existing tunnel"
  Set-Content (Join-Path $Root ".embed-tunnel-url.local") "https://$hostname" -Encoding ascii -NoNewline
  exit 0
}

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
    if (Test-PublicHealth) {
      Write-Host "external tunnel healthy despite local exit"
      exit 0
    }
    exit 1
  }
  if (Test-PublicHealth) {
    Write-Host "HEALTH ok"
    $ok = $true
    break
  }
  Write-Host "WAIT $i"
}
if (-not $ok) { Write-Host "health timeout"; exit 1 }
Set-Content (Join-Path $Root ".embed-tunnel-url.local") "https://$hostname" -Encoding ascii -NoNewline
Write-Host "OK https://$hostname"
