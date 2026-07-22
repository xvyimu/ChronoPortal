# Security headers — AS-IS vs target · 2026-07-22

## Scope and evidence

This document records repository behavior only. It does not change `next.config.ts`, `proxy.ts`, any environment variable, Cloudflare setting, or production response.

### Read-only production observation (2026-07-22)

`/build-info.json` reported deployed commit `46e71ec38e3828b892058f7e059f88478807434b`. That commit already declares `X-Frame-Options: DENY` and `Referrer-Policy: strict-origin-when-cross-origin` in `next.config.ts`; its current custom-domain response instead returned `X-Frame-Options: SAMEORIGIN` and `Referrer-Policy: same-origin`. The CSP, `Permissions-Policy`, HSTS, and `X-Content-Type-Options` values matched the checked-in contract. This is an evidence-backed source/response drift, not authorization to change any configuration. Its layer of origin is **inference, unverified** (for example an edge/platform override); an authorized operator must trace it on Preview/staging before proposing a fix.

| Evidence | What it establishes |
| --- | --- |
| `next.config.ts` | Static security headers apply to all routes; health/search/build-info additionally opt out of CDN/browser caching. |
| `lib/csp.ts` | The default flags are Report-Only on, enforcing `script-src 'unsafe-inline'` on, and dynamic nonce mode off. |
| `proxy.ts` | `CSP_DYNAMIC=1` makes the proxy attach a per-request nonce and CSP; comments limit the path to preview. |
| `tests/csp.test.ts` | Covers both default/static and opt-in nonce CSP builder behavior. |
| `docs/ops/csp-dynamic-preview-canary-2026-07-22.md` | Defines the required preview-only canary and rollback procedure. |

## Header posture

| Header / behavior | AS-IS | Target / acceptance gate | Owner |
| --- | --- | --- | --- |
| `X-Frame-Options` | Source declares `DENY`; observed production response is `SAMEORIGIN`. | Trace source/response drift in Preview or staging before any change; do not assume a code edit would alter the live header. | Application + platform owner |
| `X-Content-Type-Options` | `nosniff`. | Retain. | Application owner |
| `Referrer-Policy` | Source declares `strict-origin-when-cross-origin`; observed production response is `same-origin`. | Trace source/response drift in Preview or staging before any change. | Application + platform owner |
| `Permissions-Policy` | Camera, microphone, and geolocation denied. | Retain; add permissions only with a feature-specific review. | Application owner |
| HSTS | `max-age=31536000; includeSubDomains; preload`. | Retain; validate only on HTTPS custom domain. | Domain operator |
| Additional live headers | `expect-ct` and `X-XSS-Protection` were observed but are not declared by the checked-in `securityHeaders` array. | Treat as platform/edge behavior until the owner verifies the responsible layer. | Platform owner |
| Enforcing CSP | Static by default; `script-src` still contains `'unsafe-inline'`. | Do **not** remove it in production until the preview nonce canary and monitoring evidence pass. | Security + production operator |
| Report-Only CSP | Enabled by default; omits script `'unsafe-inline'` and reports to `/api/csp-report`. | Keep collecting explainable reports during migration. | Security + observability owner |
| Dynamic nonce CSP | Implemented but off by default (`CSP_DYNAMIC=0`). | Preview-only canary first; production requires a separate decision. | Authorized production operator |

## Safe verification

```powershell
rtk pnpm exec vitest run tests/csp.test.ts tests/api-csp-report.test.ts
rtk node scripts/audit-edge-scripts.mjs
rtk curl.exe -sSI https://yuanjia1314.ccwu.cc/
```

The first command validates the local builder contract. The second and third are read-only production checks; a passing edge audit requires `mangledScriptTypeCount=0` and `rocketLoaderHints=false`. Neither authorizes a CSP production change or resolves a source/response header drift.

## Explicitly deferred

| Action | Owner | Reason |
| --- | --- | --- |
| Set `CSP_DYNAMIC=1` or `CSP_SCRIPT_UNSAFE_INLINE=0` in Production | Authorized production operator | Alters live client execution; run the preview canary first. |
| Cloudflare Rocket Loader, minification, cache, or DNS changes | Cloudflare zone operator | External configuration and cache effects. |
| Supabase RLS policy or schema changes | Database owner | Production data-access change; outside header scope. |

For the preview-only procedure and rollback steps, use `docs/ops/csp-dynamic-preview-canary-2026-07-22.md` rather than treating this inventory as an execution runbook.
