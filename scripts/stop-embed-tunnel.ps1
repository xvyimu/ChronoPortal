# 停止 Named Tunnel cloudflared
$ErrorActionPreference = "Continue"
$Root = "D:\nav-site"
$pidFile = Join-Path $Root ".cloudflared-named.pid"
if (Test-Path $pidFile) {
  $old = (Get-Content $pidFile -Raw).Trim()
  if ($old -match '^\d+$') {
    $p = Get-Process -Id ([int]$old) -ErrorAction SilentlyContinue
    if ($p) {
      Stop-Process -Id ([int]$old) -Force
      Write-Host "stopped pid=$old"
    }
  }
  Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
}
Get-Process cloudflared -ErrorAction SilentlyContinue | ForEach-Object {
  Stop-Process -Id $_.Id -Force
  Write-Host "stopped cloudflared pid=$($_.Id)"
}
Write-Host "done"
