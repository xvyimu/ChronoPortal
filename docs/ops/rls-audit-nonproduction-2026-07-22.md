# RLS audit — local / CI / staging only · 2026-07-22

## Boundary

`scripts/rls-audit.sql` contains catalog and table **SELECT** statements only. It is an inventory tool, not a migration, policy repair, or proof that the returned policies are correct. This runbook authorizes only local, CI-isolated, or approved staging targets; it does not authorize an agent to connect to production, change RLS, use a service-role key, or write a database.

Use a PostgreSQL connection string for the non-production database. A Supabase `service_role` API key is not a PostgreSQL connection string and must not be used here.

## Required target checks

Before execution, the operator must confirm all of the following out of band:

- The database is local, an ephemeral CI database, or the approved staging database — never the production project.
- The connection string is supplied only through a local secret store or the CI secret mechanism and is not echoed, committed, or attached to artifacts.
- The database name, project/ref, and server address match the approved non-production target.
- The audit runs in an explicit `READ ONLY` transaction. A mutation in the reviewed SQL then fails instead of silently changing state.

## Local or staging procedure

Set the placeholder locally without recording its value:

```powershell
$env:CHRONOPORTAL_RLS_AUDIT_DATABASE_URL = "postgresql://<non-production-target>"
```

Confirm the target first, then run the exact checked-in SQL in one read-only transaction:

```powershell
rtk psql -X --set ON_ERROR_STOP=1 --dbname "$env:CHRONOPORTAL_RLS_AUDIT_DATABASE_URL" --command "SELECT current_database(), current_user, inet_server_addr();"
rtk psql -X --set ON_ERROR_STOP=1 --dbname "$env:CHRONOPORTAL_RLS_AUDIT_DATABASE_URL" --command "BEGIN READ ONLY" --file scripts/rls-audit.sql --command "ROLLBACK"
```

The second command must exit zero to establish that the query set executed. It does **not** mean the RLS posture passed; review the returned enabled flags, policies, and privileges against the expectations in the SQL comments. Record only a sanitized result summary (target class, commit, timestamp, exit code, pass/fail findings); never capture a connection string.

## CI procedure

Run only after CI has provisioned and migrated an isolated database. Inject its URL through the CI secret mechanism, execute the same two commands, and restrict artifacts to sanitized text output. Do not point a CI secret at production and do not turn this inventory query into a production gate.

Recommended CI result contract:

| Result | Meaning |
| --- | --- |
| `psql` non-zero | Infrastructure/query failure; do not infer RLS safety. |
| `psql` zero with unexpected policy rows | Audit ran; open a security finding. Do not auto-repair policies. |
| `psql` zero with reviewed expected rows | Non-production evidence only; production remains untouched. |

## Findings and escalation

- Missing RLS, broad `anon` writes, or policy mismatches are findings to document and have the database owner review.
- A proposed policy change requires a separate change plan, target confirmation, rollback path, and explicit user approval.
- This wave defers all production RLS changes and all production connections.

## Related files

- Query set: `scripts/rls-audit.sql`
- Hygiene board: `docs/ops/L2-P0-action-board-2026-07-22.md`
- Security-header boundary: `docs/ops/security-headers-as-is-target-2026-07-22.md`
