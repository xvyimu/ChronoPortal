# Redeploy nav-site-embed-proxy Worker (workers:write via wrangler OAuth)
# 用法: powershell -NoProfile -File D:\nav-site\scripts\deploy-embed-proxy-worker.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
if (-not (Test-Path $Root)) { $Root = "D:\nav-site" }
$WorkerJs = Join-Path $Root "workers\nav-site-embed-proxy.js"
if (-not (Test-Path $WorkerJs)) { throw "missing $WorkerJs" }

$env:EMBED_PROXY_WORKER_JS = $WorkerJs

python -c @'
import json, os, re, urllib.request
from pathlib import Path

cfg = Path.home().joinpath(".wrangler/config/default.toml").read_text(encoding="utf-8")
m = re.search(r'oauth_token\s*=\s*"([^"]+)"', cfg)
if not m:
    raise SystemExit("no oauth_token — run: npx wrangler login")
token = m.group(1)
account_id = "1f96bc464a296cbf14ed104073ccba08"
script_name = "nav-site-embed-proxy"
worker_js = Path(os.environ["EMBED_PROXY_WORKER_JS"]).read_text(encoding="utf-8")

boundary = "----FormBoundary7MA4YWxkTrZu0gW"
meta = json.dumps({"main_module": "worker.js", "compatibility_date": "2026-07-01"})
parts = [
    f"--{boundary}\r\nContent-Disposition: form-data; name=\"metadata\"; filename=\"metadata.json\"\r\nContent-Type: application/json\r\n\r\n{meta}\r\n",
    f"--{boundary}\r\nContent-Disposition: form-data; name=\"worker.js\"; filename=\"worker.js\"\r\nContent-Type: application/javascript+module\r\n\r\n{worker_js}\r\n",
    f"--{boundary}--\r\n",
]
body = "".join(parts).encode("utf-8")
url = f"https://api.cloudflare.com/client/v4/accounts/{account_id}/workers/scripts/{script_name}"
req = urllib.request.Request(url, data=body, method="PUT")
req.add_header("Authorization", f"Bearer {token}")
req.add_header("Content-Type", f"multipart/form-data; boundary={boundary}")
with urllib.request.urlopen(req, timeout=60) as resp:
    data = json.loads(resp.read().decode())
if not data.get("success"):
    raise SystemExit(json.dumps(data, indent=2)[:800])
print("upload ok", (data.get("result") or {}).get("id"))

url2 = f"https://api.cloudflare.com/client/v4/accounts/{account_id}/workers/scripts/{script_name}/subdomain"
req2 = urllib.request.Request(url2, data=json.dumps({"enabled": True}).encode(), method="POST")
req2.add_header("Authorization", f"Bearer {token}")
req2.add_header("Content-Type", "application/json")
with urllib.request.urlopen(req2, timeout=30) as resp:
    print("subdomain", json.loads(resp.read().decode()).get("success"))

probe = f"https://{script_name}.xiej4352.workers.dev/health"
with urllib.request.urlopen(urllib.request.Request(probe, headers={"User-Agent": "node"}), timeout=30) as resp:
    print("health", resp.status, resp.read().decode()[:120])
'@

if ($LASTEXITCODE -ne 0) { throw "deploy failed" }
Write-Host "OK https://nav-site-embed-proxy.xiej4352.workers.dev"
