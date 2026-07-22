# Deploy topology — AS-IS · 2026-07-22

## Scope

This is a documentation-only alignment of the checked-in deployment contract. It does not change a Vercel, Cloudflare, Netlify, GitHub, or production environment setting.

## AS-IS (checked into this repository)

| Concern | Source of truth | Current behavior |
| --- | --- | --- |
| Production application | `docs/PRODUCTION-RUNBOOK.md` | Vercel project `nav-site` serves the custom domain. |
| Normal production trigger | `.github/workflows/ci.yml` comments + `docs/LAUNCH-CHECKLIST.md` | An approved `master` update is deployed through Vercel Git integration; the workflow has no Vercel deploy step. |
| Repository CI | `.github/workflows/ci.yml` | `quality` → `build` → `e2e` runs for `master` pushes and PRs. |
| Netlify | `.github/workflows/ci.yml` | Emergency mirror only: it requires `workflow_dispatch` and `ALLOW_NETLIFY_MIRROR=1`; it is not the production path. |
| Production evidence | `scripts/probe-production.mjs` | Verify the custom domain and `/build-info.json`, not only a preview or a deployment URL. |

## Operator path

1. Obtain approval for the code change and update `master` through the normal repository process.
2. Wait for Vercel Git integration to mark the matching production deployment Ready.
3. Record the deployed commit and verify the custom domain:

   ```powershell
   pnpm run verify:production -- --base-url https://yuanjia1314.ccwu.cc --expect-commit <HEAD>
   ```

4. If the deployment is bad, use the Vercel rollback/revert procedure in `docs/PRODUCTION-RUNBOOK.md`; rerun the same custom-domain probe.

## Deliberate boundaries

| Deferred action | Owner | Why it is deferred |
| --- | --- | --- |
| Vercel production env changes, manual production deployment, or rollback | Authorized production operator | External state with user impact; requires explicit approval. |
| Enable the Netlify mirror or change its repository variable | Authorized repository operator | Emergency-only workflow may mirror/force-update its remote branch. |
| DNS, Cloudflare proxy/cache, or Pages/Workers changes | Authorized DNS/Cloudflare operator | Not represented by a safe repository-only change. |

## Documentation contract

README and `docs/LAUNCH-CHECKLIST.md` intentionally do not present `vercel deploy --prod` as the routine path. A direct CLI production deployment is a separately authorized break-glass action, not a replacement for the Git-integrated release trail.
