# Missing Supabase migration history

`42P01` for `supabase_migrations.schema_migrations` means the CLI ledger is absent,
not that application migrations were never executed. SQL Editor's row limit is
unrelated. Do not replay 001–007 or insert guessed migration versions.

`npm run db:history` is the read-only check for this condition. It checks
`to_regclass` first and never reads the absent relation. `db:audit` uses the same
helper. Both keep project/TLS guards and never create tables or change records.
Regression tests cover absent/present history and ensure SELECT-only access.

On 14 October 2026 Codex ran the hosted audit and history check. PostgreSQL access
remained blocked at the network stage; HTTPS reads succeeded. Environment metadata
confirmed the pooler hostname is already in the published allowlist and no network
update is pending. No password failure was proved and no new secret was requested.
An authorized PostgreSQL-capable connection is required to verify actual schema
and prepare an exact baseline. Existing `db:baseline` defaults to read-only planning;
its apply mode requires matching actual schema and explicit project approval.
No baseline, migration, role assignment or hosted mutation was executed.

This code prevents the missing-relation diagnostic error; it does not claim the
hosted ledger was created or the network blocker resolved. No manual SQL is needed
from the client once a usable authorized connection is available.
