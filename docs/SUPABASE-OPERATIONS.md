# Existing-project operations and verification

Target project: `hzcupgjphowrzvrdffrf`. The client reports applying migrations 001–007 manually and confirming a real Auth user. This is reported status, not hosted verification. No command auto-replays those migrations.

For the read-only PostgreSQL 17 backup procedure, including Codespaces secret setup and coverage limitations, see [DATABASE-BACKUP.md](DATABASE-BACKUP.md). The backup is a logical dump and does not include Storage object bytes or project-level settings.

## Secure access

Codespaces variables do not transfer to Codex. Enter `SUPABASE_DB_URL` in this environment's secure variable settings. Obtain the URI from the project's Connect dialog, selecting a reachable direct or session-pooler connection. Never paste it in chat or put it in tracked files. The guard checks the project hostname or project-qualified pooler username, the `postgres` database, and verified TLS. It rejects URI overrides. Custom DNS aliases are deliberately rejected. Pooler connection errors must be diagnosed without disabling certificate verification. Transactions enforce read-only mode for audits and plans.

For the first audit, a dedicated database role needs catalog reads plus reads of `storage.buckets` and the migration ledger if present. Owner planning additionally needs restricted reads of Auth UUID/confirmation status and organization/membership metadata. Do not grant a read-only role mutation rights merely to run an audit. A project administrator can supply a separate privileged connection temporarily after approval for bootstrap/baseline. A database administrator credential has wider powers than these tools exercise: restrict access, time-limit it and revoke it after use. Application runtime needs only the public key and narrowly used server API key, not the database administrator URI.

Local ignored `.env.local` is also supported. Existing process environment bindings take precedence. No helper displays secrets or writes environment files. A service API key alone cannot inspect PostgreSQL policy/function catalog definitions; it is not a substitute for the database audit connection.

## Verification and proposed changes

- `npm run db:audit`: read-only catalog comparison against the seven locally tested migrations; also checks private storage and Realtime. Unknown/missing/changed schema objects stop the process. PostgreSQL version formatting differences can cause a conservative mismatch; review the actual definition rather than accepting it blindly. It does not prove hosted Auth, SMTP or all role behavior.
- `npm run db:baseline`: read-only plan for missing migration ledger entries, after a matching audit. SQL Editor runs may leave the CLI ledger empty despite a fully installed schema.
- `npm run db:owner -- --organization-id <existing-org-uuid> --user-id <verified-real-user-uuid>`: read-only Owner plan. Defaults to the configured existing organization and selects a matching reviewed 007/008/009 catalog. No organization or Auth account is created. Existing non-Owner/inactive/cross-business membership or any other Owner requires review; it is never automatically promoted, reactivated or reassigned.

After verified client identity/authority and concrete change approval, configure the approved `HAMDI_OWNER_USER_ID` securely. Apply additionally requires `--name` with the confirmed display name and `--apply --approve hzcupgjphowrzvrdffrf:<organization-uuid>:<user-uuid>:owner`. The configured organization and approved user must match before a connection opens. An existing matching active Owner membership is a no-op. This task does not authorize or execute Owner activation. See [deployment/identity acceptance](DEPLOYMENT-HANDOVER-CHECKLIST.md).

## Future migrations and deployment

Do not edit historical migration files. Prepare subsequent schema changes as new migrations, with rollback/risk notes and local database tests. The committed references include migration hashes and fail if those originals change. `npm run db:reference` regenerates expected metadata only in a disposable local PostgreSQL 17 container; `--with-owner-notifications` generates the complete ten-migration reference. Never point it at Supabase. New migrations require a reviewed reference strategy for the prior deployed state and final expected state before application; the original seven-migration baseline remains distinct from the 008–010 catalogs.

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

## Passenger platform migration 009

See [Phase 3 verification](PHASE-3-VERIFICATION.md). Original seven/eight catalogs remain distinct from `supabase/schema-reference-passenger.json`. The migration-008 review/approval is separate and must finish first. `npm run db:passenger-migration` is a read-only plan against the exact verified eight-migration catalog/history and actual confirmed Owner organization. After explicit reviewed project/hash authorization, `npm run db:passenger-migration -- --apply --approve <reviewed-target>` applies only 009 transactionally and records its ledger entry after full schema/retention checks.

`npm run db:audit -- --with-passenger` audits the deployed nine-migration catalog. `npm run db:reference -- --with-passenger` generates that reference locally in disposable PostgreSQL. Owner email notifications are in separate immutable migration 010, with its own guarded runner (`npm run db:owner-notification-migration`) and complete catalog (`npm run db:audit -- --with-owner-notifications`). Never replay historical SQL, run test fixtures on hosted databases or dispatch apply without client approval.

Booking enablement and genuine route durations/policies are configured by authorized staff at `/admin/passenger-platform`. Registration, live Stripe and email delivery remain separately opt-in with secure provider setup. Scheduled notification delivery requires an approved protected host scheduler calling the secret-authenticated POST endpoint; no n8n/workflow platform is required. Readiness depends on hosted acceptance, not a merged code branch.

## Read-only hosted discovery

`npm run check:hosted` compares all three reviewed catalogs without guessing installation state from a table count or empty/missing ledger. It enforces read-only PostgreSQL sessions and GET/HEAD-only API probes, reports only safe status/identifiers, and never applies SQL or creates accounts. See [Phase 4 verification](PHASE-4-VERIFICATION.md) for current findings, exact conditional migration plan and the one missing secure connection. Protected workflow choice `verify-read-only` becomes dispatchable after the workflow reaches the default branch; direct execution works on the feature branch now.
