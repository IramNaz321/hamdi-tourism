# Existing-project operations and verification

Target project: `hzcupgjphowrzvrdffrf`. The client reports applying migrations 001–007 manually and confirming a real Auth user. This is reported status, not hosted verification. No command auto-replays those migrations.

## Secure access

Codespaces variables do not transfer to Codex. Enter `SUPABASE_DB_URL` in this environment's secure variable settings. Obtain the URI from the project's Connect dialog, selecting a reachable direct or session-pooler connection. Never paste it in chat or put it in tracked files. The guard checks the project hostname or project-qualified pooler username, the `postgres` database, and verified TLS. It rejects URI overrides. Custom DNS aliases are deliberately rejected. Pooler connection errors must be diagnosed without disabling certificate verification. Transactions enforce read-only mode for audits and plans.

For the first audit, a dedicated database role needs catalog reads plus reads of `storage.buckets` and the migration ledger if present. Owner planning additionally needs restricted reads of Auth UUID/confirmation status and organization/membership metadata. Do not grant a read-only role mutation rights merely to run an audit. A project administrator can supply a separate privileged connection temporarily after approval for bootstrap/baseline. A database administrator credential has wider powers than these tools exercise: restrict access, time-limit it and revoke it after use. Application runtime needs only the public key and narrowly used server API key, not the database administrator URI.

Local ignored `.env.local` is also supported. Existing process environment bindings take precedence. No helper displays secrets or writes environment files. A service API key alone cannot inspect PostgreSQL policy/function catalog definitions; it is not a substitute for the database audit connection.

## Verification and proposed changes

- `npm run db:audit`: read-only catalog comparison against the seven locally tested migrations; also checks private storage and Realtime. Unknown/missing/changed schema objects stop the process. PostgreSQL version formatting differences can cause a conservative mismatch; review the actual definition rather than accepting it blindly. It does not prove hosted Auth, SMTP or all role behavior.
- `npm run db:baseline`: read-only plan for missing migration ledger entries, after a matching audit. SQL Editor runs may leave the CLI ledger empty despite a fully installed schema.
- `npm run db:owner -- --user-id <confirmed-real-uuid>`: read-only owner plan. The real display name is optional for planning and mandatory for application with `--name`. The named Auth account must exist, be confirmed and not deleted. Existing active owner membership is reported without changes. Existing non-owner membership or any existing business without this membership requires a separate reviewed recovery/attachment plan; no automatic promotion or duplicate business is allowed.

After the client confirms their authority to assign the specified person, review the concrete plan and request approval. Only then execute the matching guarded `--apply --approve hzcupgjphowrzvrdffrf:<user-uuid>` owner operation. It uses one transaction and an advisory lock, rechecks the schema and user, and creates only organization/membership. It does not create an Auth user or operational fixtures. Record the returned genuine organization UUID in hosting settings as `HAMDI_ORGANIZATION_ID`.

Baseline is a separate database mutation: require separate approval before `npm run db:baseline -- --apply --approve hzcupgjphowrzvrdffrf:baseline`. It records verified migration versions without replaying original SQL. Existing unknown migration versions abort. Changes are transactional and serialized. Never baseline based only on the client's report or an empty migration history screen.

## Future migrations and deployment

Do not edit historical migration files. Prepare subsequent schema changes as new migrations, with rollback/risk notes and local database tests. The committed reference includes migration hashes and fails if those originals change. `npm run db:reference` regenerates expected metadata only in a disposable local PostgreSQL 17 container; never point it at Supabase. It contains no business records. New migrations require a reviewed reference strategy for the prior deployed state and final expected state before application; the current baseline handles the seven existing migrations only.

Once the seven-migration baseline is verified and recorded, a trusted deployment runner can use a pinned Supabase CLI to link the confirmed project, inspect migration history and run `supabase db push --dry-run`. The dry-run is a proposal, not approval. Review pending file identities and backup/restore readiness before explicitly authorizing `supabase db push`. Do not invoke that command during startup, regular CI or a pull-request preview. No database migration or production deployment is triggered by merging application code.

The manual `Approved Supabase operations` GitHub workflow provides audit/plan/apply entry points with serialized execution and no secrets in command arguments. Configure protected environments `hamdi-supabase-read` and `hamdi-supabase-change`, each with appropriately scoped `SUPABASE_DB_URL`. **Require an authorized client reviewer for the change environment**, prohibit self-review where supported, and restrict deployment branches. Approval text is an additional target guard, not proof of human authority. The workflow becomes dispatchable after its definition exists on the repository's default branch; until merged, the agent runs the same commands in its securely configured environment. Do not mistake protected workflow approval for production hosting deployment.

Choose the real hosting target and origin before production deployment. Set secrets in that host, configure exact Auth redirect URLs/custom SMTP, build/check the actual release, present the release/rollback plan, and obtain explicit deployment approval. This work has not deployed a site.

## Real owner session and feature acceptance

Optionally supply a short-lived genuine owner access token securely as `HAMDI_OWNER_ACCESS_TOKEN`, alongside application public configuration and the real organization UUID. `npm run check:owner` validates that token with Supabase Auth, checks active owner membership, exercises actual session/RLS reads for management tables and calls the real dashboard RPC. It does not print the token or personal records, refresh sessions, impersonate the owner via a service key, write rows, or prove browser login/logout. Revoke/expire this temporary token after verification. Do not send it in chat.

Complete real browser acceptance using the verified owner's own sign-in: login, denied anonymous Admin access, logout, recovery/invite delivery and token expiry, and session refresh. Review exact Site URL/templates before invitations. Database errors must remain errors rather than synthetic zero totals. New businesses have zero totals and empty lists.

Writing tests against the hosted business requires explicit mutation approval plus genuine client-approved inputs. Verify actual drivers and licences, registered vehicles and capacities, real served locations/routes/fares, then real customer-requested bookings. Never create sample fixtures, payments or GPS locations on this project. Use archive/restore only with approval and preserve audit/history. Existing local automated tests use disposable fixtures and never connect to hosted Supabase.

Phase 1 acceptance remains incomplete until hosted schema, owner, Auth/email, CRUD/settings/staff roles and permissions are verified. Driver Portal/GPS changes require reviewed new schema/RLS and consent/retention decisions. Passenger accounts, payments and AI require provider choices, real credentials, payment/webhook verification, location-sharing privacy controls and client decisions. No simulated payment success, driver movement or concierge responses will be substituted for these integrations.

## Driver/GPS migration 008

Keep the original seven-migration reference unchanged. `npm run db:audit` checks that baseline; `npm run db:audit -- --with-driver` checks the separate eight-migration reference plus an active once-per-minute pg_cron retention job. `npm run db:reference -- --with-driver` rebuilds only the driver reference using disposable PostgreSQL.

Set the genuine `HAMDI_ORGANIZATION_ID` securely alongside database/application configuration. `npm run db:driver-migration` prepares a read-only plan and prints a project-plus-hash approval target. Only after explicit authorization use `npm run db:driver-migration -- --apply --approve <reviewed-target>`. The transaction refuses schema drift, incorrect historical ledger, missing active confirmed Owner or missing retention worker. It applies only 008; it never repeats 001–007 or seeds records. The old driver proposal must not be applied alongside 008; an already applied proposal needs a separately reviewed upgrade.

Protected workflow choices include driver-plan and driver-apply once this workflow is on the default branch. The apply approval field must contain the exact reviewed target. See [Phase 2 verification](PHASE-2-VERIFICATION.md) for scope, consent, retention and hosted acceptance gates.
