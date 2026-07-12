# 停止本机原生 embed 服务
# 用法: powershell -NoProfile -File D:\nav-site\scripts\stop-embed-native.ps1

$ErrorActionPreference = "Continue"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
if (-not (Test-Path $Root)) { $Root = "D:\nav-site" }
$PidFile = Join-Path $Root ".embed-native.pid"
$Port = if ($env:EMBED_PORT) { [int]$env:EMBED_PORT } else { 18003 }

if (Test-Path $PidFile) {
  $old = (Get-Content $PidFile -Raw).Trim()
  if ($old -match '^\d+$') {
    $p = Get-Process -Id ([int]$old) -ErrorAction SilentlyContinue
    if ($p) {
      Stop-Process -Id ([int]$old) -Force
      Write-Host "stopped pid=$old"
    } else {
      Write-Host "stale pid file $old"
    }
  }
  Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
} else {
  Write-Host "no pid file"
}

$listeners = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
foreach ($c in $listeners) {
  $procId = $c.OwningProcess
  try {
    $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$procId" -ErrorAction SilentlyContinue
    if ($proc -and $proc.CommandLine -match "embed-server") {
      Stop-Process -Id $procId -Force
      Write-Host "stopped port $Port pid=$procId"
    }
  } catch {}
}

Write-Host "done"
