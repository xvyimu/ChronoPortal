# Wave 6 Dual-B · ChronoPortal · Codex

## Worktree identity

| Field | Value |
| --- | --- |
| Baseline tip | `72d7643ab6a6c1fb8368f50dcfb5da59e1918310` |
| Branch | `xvyimu/dual-b-cp-codex` |
| Worktree | `C:\Users\yuanjia\orca\workspaces\ChronoPortal\dual-b-cp-codex` |
| Scope | Documentation and static assets only; no commit, push, merge, deployment, database connection, or control-plane mutation. |

## Delivered

1. **Deployment truth aligned**
   - `README.md` and `docs/LAUNCH-CHECKLIST.md` now identify Vercel Git integration as the normal production path. GitHub Actions provides quality/build/e2e; its Netlify job remains an explicit emergency mirror.
   - `docs/ops/deploy-topology-2026-07-22.md` records sources of truth, verification, boundaries, and rollback ownership. It removes the misleading routine `vercel deploy --prod` instruction.
2. **Security-header evidence and non-production CSP guidance**
   - `docs/ops/security-headers-as-is-target-2026-07-22.md` documents checked-in headers, targets, owners, and an observed source/response drift.
   - Read-only production evidence: deployed `46e71ec38e3828b892058f7e059f88478807434b` declares `X-Frame-Options: DENY` and `Referrer-Policy: strict-origin-when-cross-origin`, while the custom domain returned `SAMEORIGIN` and `same-origin`. The responsible layer is **inference, unverified**; no configuration was changed.
   - `docs/ops/csp-dynamic-preview-canary-2026-07-22.md` now rejects the production domain as `$BASE`, adds a Preview-only environment guard, explicit stage-A fail conditions, and evidence fields that do not contain secrets.
3. **Non-production RLS audit path**
   - `docs/ops/rls-audit-nonproduction-2026-07-22.md` requires a local/isolated-CI/staging PostgreSQL URL, an explicit `BEGIN READ ONLY` transaction, target confirmation, and sanitized findings.
   - It states that a Supabase service-role API key is not a PostgreSQL connection string and that a zero exit code is execution evidence, not a policy-pass verdict.
   - The L2 hygiene and P0 board no longer direct agents to production RLS execution.
4. **PWA icons completed**
   - Added the already-declared static assets: `public/icon-192.png` (192×192), `public/icon-512.png` (512×512), and `public/favicon.ico` (including 256×256).

## Not done intentionally

- No `next.config.ts`, `proxy.ts`, CI workflow, production environment, Cloudflare/Vercel console, or Supabase schema/policy change.
- No production CSP enforce, no production `CSP_DYNAMIC=1`, no removal of production script `'unsafe-inline'`.
- No RLS connection to or change against the production database.
- No deployment, push, merge, or control-plane credential use.

## DEFER

| Deferred item | Owner | Reason / prerequisite |
| --- | --- | --- |
| Production CSP enforce or setting `CSP_DYNAMIC=1` / `CSP_SCRIPT_UNSAFE_INLINE=0` | 用户 / authorized production operator | Complete the Preview canary, retain evidence, make a separate release decision, and have a rollback plan. |
| Trace/fix live `X-Frame-Options` and `Referrer-Policy` drift | 用户 / application + platform owner | Determine whether Vercel, Cloudflare, or another response layer overrides the deployed source; validate on Preview/staging first. |
| Production RLS policy/schema changes or service-role writes | 用户 / database owner | Separate change plan with target confirmation, review, rollback, and explicit approval. |
| Cloudflare, Supabase, or Vercel console credentials and production environment flips | 用户 / authorized operator | External privileged state; outside repository-only implementation. |
| Netlify emergency mirror | 用户 / repository operator | Only for an explicitly approved incident with `workflow_dispatch` and `ALLOW_NETLIFY_MIRROR=1`. |

## Verification

| Command | Exit | Result |
| --- | ---: | --- |
| `rtk python -c "…Pillow PNG/ICO size and format assertions…"` | 0 | `icon-192.png` is 192×192 RGB PNG, `icon-512.png` is 512×512 RGB PNG, and the ICO contains 256×256. |
| `rtk node -e "…manifest/documentation contract assertions…"` | 0 | Manifest references all three icon assets; required deployment/CSP/RLS guard text exists. |
| `rtk git diff --check` | 0 | No whitespace errors. |
| `rtk pnpm exec vitest run tests/csp.test.ts tests/api-csp-report.test.ts` | 0 | 2 files / 16 tests passed. |
| `rtk pnpm run typecheck` | 0 | TypeScript clean. |
| `rtk pwsh -NoProfile -Command '$env:UPSTASH_REDIS_REST_URL=$null; $env:UPSTASH_REDIS_REST_TOKEN=$null; rtk pnpm test'` | 0 | 61 files passed, 1 skipped; 605 tests passed, 6 skipped. Child-process-only environment sanitization; no persistent environment change. |
| `rtk node scripts/audit-edge-scripts.mjs` | 0 | Read-only production audit: HTTP 200, `mangledScriptTypeCount=0`, `rocketLoaderHints=false`. |
| `rtk curl.exe -sSI https://yuanjia1314.ccwu.cc/` | 0 | Read-only header evidence captured; source/response drift recorded above. |
| `rtk pnpm run lint` | 1 | Existing lockfile dependency mismatch: `minimatch@3.1.5` requires `brace-expansion@^1.1.7`, but `pnpm-lock.yaml` resolves it to incompatible `5.0.7`; ESLint fails before linting project files. Not changed as out of scope. |

The first invocation of full tests with inherited Upstash configuration exited 1 because rate-limit HTTP calls altered mocked `fetch` counts. The clean child-process rerun above is the valid deterministic test result; no secret values are recorded here.

## Assumed cross-agent takeaways

1. Treat checked-in header intent and observed response headers as separate evidence; never infer that a source edit will win over Vercel/Cloudflare without a Preview or staging probe.
2. Make RLS inspection fail-closed against writes with an explicit read-only transaction, and never confuse a service-role API key with a database connection.
3. Keep test processes isolated from inherited runtime env; keep the lint lockfile defect as a separate dependency-maintenance task rather than mixing it into this docs/assets scope.
