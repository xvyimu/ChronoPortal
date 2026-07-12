# 本机原生启动 embed 服务（不依赖 Docker Desktop）
# 用法: powershell -NoProfile -File D:\nav-site\scripts\start-embed-native.ps1
# 默认: 127.0.0.1:18003 + .embed-api-key.local；cloudflared 隧道可继续指同一端口

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
if (-not (Test-Path $Root)) { $Root = "D:\nav-site" }

$HostBind = if ($env:EMBED_HOST) { $env:EMBED_HOST } else { "127.0.0.1" }
$Port = if ($env:EMBED_PORT) { [int]$env:EMBED_PORT } else { 18003 }
$KeyFile = Join-Path $Root ".embed-api-key.local"
$PidFile = Join-Path $Root ".embed-native.pid"
$OutLog = Join-Path $Root ".embed-native.out.log"
$ErrLog = Join-Path $Root ".embed-native.err.log"
$Script = Join-Path $Root "scripts\embed-server.py"

if (-not (Test-Path $Script)) { throw "missing $Script" }
if (-not (Test-Path $KeyFile)) { throw "missing $KeyFile — 先写入 API key" }

$key = (Get-Content $KeyFile -Raw).Trim()
if (-not $key) { throw "empty API key in $KeyFile" }

# 若 Docker 容器占着端口，先停（可选；失败不致命）
try {
  $running = docker ps --filter "name=nav-site-embed-prod" --format "{{.Names}}" 2>$null
  if ($running -eq "nav-site-embed-prod") {
    Write-Host "stopping docker container nav-site-embed-prod (free port $Port)"
    docker stop nav-site-embed-prod | Out-Null
  }
} catch {}

# 已有本机进程
if (Test-Path $PidFile) {
  $old = (Get-Content $PidFile -Raw).Trim()
  if ($old -match '^\d+$') {
    $p = Get-Process -Id ([int]$old) -ErrorAction SilentlyContinue
    if ($p) {
      Write-Host "already running pid=$old ($($p.ProcessName))"
      exit 0
    }
  }
  Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
}

# 端口占用检查
$listen = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($listen) {
  throw "port $Port already in use (OwningProcess=$($listen.OwningProcess -join ','))"
}

$python = (Get-Command python -ErrorAction Stop).Source
$env:EMBED_SERVER_API_KEY = $key
$env:EMBED_PORT = "$Port"
# 固定生产模型；忽略会话里可能残留的 bge-m3 等错误值
# 若要覆盖：启动前显式设 EMBEDDING_MODEL_OVERRIDE
if ($env:EMBEDDING_MODEL_OVERRIDE) {
  $env:EMBEDDING_MODEL = $env:EMBEDDING_MODEL_OVERRIDE
} else {
  $env:EMBEDDING_MODEL = "BAAI/bge-small-zh-v1.5"
}
# 默认用本地 HF 缓存；需要联网补全时设 EMBED_HF_OFFLINE=0
if ($env:EMBED_HF_OFFLINE -ne "0") {
  $env:HF_HUB_OFFLINE = "1"
  $env:TRANSFORMERS_OFFLINE = "1"
}

Write-Host "starting native embed: $python $Script --host $HostBind --port $Port"
$proc = Start-Process -FilePath $python `
  -ArgumentList @($Script, "--host", $HostBind, "--port", "$Port") `
  -WorkingDirectory $Root `
  -RedirectStandardOutput $OutLog `
  -RedirectStandardError $ErrLog `
  -WindowStyle Hidden `
  -PassThru

$proc.Id | Set-Content -Path $PidFile -Encoding ascii -NoNewline
Write-Host "pid=$($proc.Id) out=$OutLog err=$ErrLog"

$ok = $false
for ($i = 1; $i -le 60; $i++) {
  Start-Sleep -Seconds 2
  if ($proc.HasExited) {
    Write-Host "process exited code=$($proc.ExitCode)"
    if (Test-Path $ErrLog) { Get-Content $ErrLog -Tail 40 }
    if (Test-Path $OutLog) { Get-Content $OutLog -Tail 40 }
    Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
    exit 1
  }
  try {
    $r = Invoke-WebRequest -Uri "http://${HostBind}:${Port}/health" -UseBasicParsing -TimeoutSec 3
    if ($r.StatusCode -eq 200) {
      Write-Host "HEALTH $($r.Content)"
      $ok = $true
      break
    }
  } catch {
    Write-Host "WAIT $i"
  }
}

if (-not $ok) {
  Write-Host "health timeout; see $OutLog / $ErrLog"
  exit 1
}

Write-Host "OK native embed on http://${HostBind}:${Port}"
