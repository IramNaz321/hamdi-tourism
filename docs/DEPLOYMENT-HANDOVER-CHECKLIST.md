# Production deployment, recovery and acceptance

**Current release decision: NO.** A build or private Codespaces preview is not a
verified production website. No production target/domain/integration is available
in this environment, and no deployment is claimed.

## Shortest hosting setup

1. Choose and authorize the existing GitHub repository on a Next.js-compatible host
   (Vercel is a supported option). Select the reviewed feature branch, Node 24,
   `npm ci`, `npm run build`; use Next.js defaults for output. Do not click production
   Deploy or merge before approval and the live gates below are satisfied.
2. Configure the host's secure environment settings using `.env.example`. Required
   app bindings: Supabase public URL/publishable key, server-only service key, actual
   existing organization UUID and exact HTTPS origin. Owner activation is now verified and the approved UUID is configured in the local
   server environment. Configure the same server-only binding on the actual host;
   Codex settings do not transfer automatically. See
   [the current activation record](OWNER-ACTIVATION-PLAN.md). Keep the database admin URI out
   of the deployed application; it is only for trusted approved operations tooling.
3. Configure the real domain/HTTPS and exact Supabase Auth Site URL/callback allowlist,
   SMTP and matching CAPTCHA provider/site key. Verify confirmation, recovery and
   return paths through the actual host. Public-variable changes require rebuilding.
   After explicit deployment approval, smoke-test the exact deployed URL and roles.

Server-only provider keys, worker secrets and flags must never use a `NEXT_PUBLIC_`
prefix. Leave Stripe live payments, email delivery, AI and routing disabled until
approved/configured/tested. A browser microphone requires supported browser/permission;
a GPS fix requires HTTPS, explicit consent, active assignment and foreground operation.
No provider has been enabled by this task.

## Database release gate

- Review the existing supplied schema evidence and `docs/HOSTED-REPAIR-REVIEW.md`.
  Keep historical migrations 001–009 immutable; the combined
  `040-production-infrastructure.sql` is superseded and must not be executed.
  The guarded sequence is ledger-only 001–007 baseline, then separately approved
  transactional 008 Driver/GPS, 009 Passenger, and 010 owner-notification migrations.
  Details, pinned hashes, backup evidence and postflight checks are in
  `docs/GPS-PASSENGER-PRODUCTION-UNBLOCK.md`.
- Every stage requires its matching read-only catalog/history/Owner/recovery
  preflight and the exact project-plus-hash approval. Failure rolls back that
  individual stage; no automatic down migration or production fixture is approved.
  Passing local tests alone authorizes no production mutation.
- `npm run test:repair` rehearses guarded 008/009 candidates and the additive 010
  migration only in disposable PostgreSQL. It runs 210 local RLS/workflow
  assertions; the isolated test image does not verify production pg_cron, real
  provider delivery or live Realtime.
- `npm run check:handover` checks local binding names/shapes and migration integrity,
  never certifying hosted acceptance. Run HTTPS-only `check:supabase` where permitted;
  do not repeat blocked PostgreSQL attempts without a meaningful access change.

## Existing-organization Owner onboarding

Human verification that the selected Auth UUID belongs to Hamid Shah and explicit
Owner authority are required. The organization already exists; never create another.
The updated `db:owner` defaults to read-only planning and supports reviewed 007/008/009
catalogs. It refuses drift, an unconfirmed/deleted/banned user, any other Owner,
non-Owner existing membership, inactive Owner or cross-organization reassignment.

Only after identity approval may the approved UUID be configured as
`HAMDI_OWNER_USER_ID`. Apply additionally requires a real display name and the exact
approval target `hzcupgjphowrzvrdffrf:<organization-uuid>:<user-uuid>:owner`.
The transaction locks/rechecks the existing organization and memberships and inserts
at most one active Owner membership; it never creates an Auth user or organization.
Already matching active membership is a no-op. No apply invocation was made here.
The protected GitHub change environment must require an authorized reviewer; do not
copy secrets into GitHub automatically. Workflow dispatch availability also depends
on the workflow being on the repository's default branch; no merge is authorized here.

App-level identity binding does not itself harden direct SQL/API role assignment.
Review the existing Owner-lock proposal and the actual delegated-role RLS model
before claiming single-client database Admin exclusivity. No Owner access is granted
by this handover document or by setting an unverified display name.

## Backups and recovery

Before any approved production change, the project administrator must confirm which
Supabase backups/PITR are actually available for the current plan and a recoverable
restore point. Do not assume PITR is enabled. Verify recovery on an approved isolated
staging target first. Database backups and Storage object/media recovery are separate;
protect both and keep any exports encrypted, access-limited and out of Git/chat.
GPS/customer-data retention and backup retention must follow the client's policy.

Execute one reviewed transaction at a time in an approved maintenance window. Index
creation can lock writes; the candidates set lock/statement timeouts. On failure,
rollback an aborted transaction and investigate before replay. After real records
use the new module, dropping its tables/functions is destructive and is not an
acceptable automatic rollback. Prefer a reviewed forward repair or separately
approved restore/reconciliation of real bookings and payment evidence. Do not replay
emails, charges or refunds merely because a request timed out. Verify provider
idempotency and actual records first.

## Final live acceptance — all unchecked until actually performed

- [ ] Hosted schema, functions, constraints, RLS, grants, media and private Realtime
      match the reviewed repair; retention worker is active and verified.
- [ ] Real Hamid Shah account identity is verified and the exact Owner assignment is
      approved. No other account can use Admin, including direct API role escalation.
- [ ] Real Owner, consenting Driver and Passenger each sign in, refresh and sign out;
      confirmation, expired links, recovery, CAPTCHA failure and unauthorized routes work.
- [ ] Owner manages actual settings, inventory, locations, routes and fares. Missing
      configuration keeps booking unavailable; existing records are never overwritten.
- [ ] A separately authorized staging request creates genuine, idempotent booking legs;
      stale prices/policies, capacity/schedule conflicts and other-passenger access fail.
- [ ] Driver sees only assigned trips and completes the allowed lifecycle; reassignment,
      deactivation and revoked sessions immediately lose access as designed.
- [ ] Actual-phone GPS permission/consent, moving fixes, timestamps, stale/offline state,
      trip end and withdrawal are tested. Passenger and Owner see only authorized data.
- [ ] Approved routing and AI providers return genuine results; unavailable states remain
      clear. Multilingual text/voice, microphone denial/mute/stop are tested on real devices.
- [ ] If payments/emails are enabled, approved staging/provider acceptance passes without
      unauthorized charges or messages. Backup recovery is demonstrated.
- [ ] Authorized deployment has a verified HTTPS URL, exact Auth redirects, secure bindings,
      passing browser checks and a support owner. Client receives the operating guide.

No production password, booking, charge, notification, invitation or GPS write is
created to tick these boxes without separate authorization. Local fixtures are not
real-account acceptance.

## Automated approved repair path — no manual SQL copying

On a trusted runner with authorized PostgreSQL access, `npm run db:repair -- --step
settings` (or `driver`, then `passenger`) defaults to **read-only planning**. It does
not require Owner activation. It verifies project/organization, selects the exact
reviewed 007/008/009 catalog, and compares normalized function/constraint/index/
trigger/policy/schema/grant/Storage/Realtime fingerprints with hash-only references
created from disposable databases. Anonymous/authenticated privilege drift blocks
execution; legitimate additional privileges of Supabase's trusted service role are
not treated as client permissions. Required provider-table RLS and Auth capabilities
are checked without imposing mock-system table column layouts on Supabase.

A pending plan returns the exact SQL file SHA-256 and approval target. Only the
explicit `--apply --approve <exact-returned-target>` path can execute that fixed
reviewed file; caller-supplied SQL paths are rejected. A fully matching installed
stage returns a no-op. Partial/drifted installations fail closed. No CLI ledger is
created or guessed. SQL completion reports commit status separately from production
readiness; real account/booking/retention/deployment acceptance still remains.

The protected operations workflow has `repair-*-plan` / `repair-*-apply` choices.
Do not confuse those with legacy migration-ledger operations. No workflow was
triggered, secret copied or PostgreSQL connection attempted by this delivery run.
Source/hash reference refresh is an explicit disposable-test operation; the running
repair/Owner tools never learn or overwrite their expected references from production.
