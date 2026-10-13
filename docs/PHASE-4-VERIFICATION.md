# Phase 4 — safe hosted verification and launch preparation

Reviewed on October 13, 2026, starting from `e48fbe6` on `feat/hamdi-tourism-application`.

**Current status: production readiness NO.** Secure bindings are now available and read-only Supabase HTTPS API verification succeeds. The confirmed Auth account has no staff membership, and organizations are empty. Direct PostgreSQL catalog access still fails at network transport before authentication. See the current [Final launch report](FINAL-LAUNCH-REPORT.md). The sections below retain historical missing-configuration findings and must not be interpreted as the current blocker.

## What is known and what is reported

| Finding                                  | Evidence                                                                                                               |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Hosted public schema has 17 tables       | Client-reported; not independently read in this run                                                                    |
| Hosted `verified_payments` exists        | Client-reported; does not certify its RLS or a working Stripe integration                                              |
| Hosted migration-history table is absent | Client-reported; **never** means the business database is empty                                                        |
| Local 001–007 reference                  | Verified files/hashes; 17 expected public tables                                                                       |
| Local 001–008 reference                  | Verified files/hashes; 22 expected public tables                                                                       |
| Local 001–009 reference                  | Verified files/hashes; 32 expected public tables                                                                       |
| Existing confirmed Auth UUID             | Client-reported `988e629b-6770-4b93-b9ba-7c1bce325680`; current confirmation/ban/deletion/membership remain unverified |
| Owner authority and real display name    | Client confirmation/explicit permission approval remain necessary; no automatic promotion                              |
| Actual hosted 008/009 definitions        | Unverified; count alone cannot distinguish a matching baseline from drift/partial application                          |

The reported table count is consistent with the original seven-migration baseline. It is **not** proof that the baseline matches, or authority to apply 008/009. Comparing constraints, indexes, triggers, function definitions/execution permissions and RLS policies against all three references must come first. An old driver proposal or partial rollout must be reviewed separately, not blindly replayed.

## Configuration results — names/status only

`npm run check:hosted` reports the following without printing connection strings, keys or password values:

- `SUPABASE_DB_URL`: **missing**. PostgreSQL schema/history/Auth-user/membership inspection cannot run.
- `NEXT_PUBLIC_SUPABASE_URL` plus `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: **missing or invalid as a usable connection**. Auth settings and anonymous RLS probes cannot run. No guessed key is used.
- `SUPABASE_SERVICE_ROLE_KEY`: **missing or invalid**. Optional Auth Admin read-back cannot run; this key is not needed for the SQL audit when the authorized database account has sufficient read access.
- `HAMDI_ORGANIZATION_ID`: **missing or invalid**. Actual business association is not established.
- Website origin: **local development only**, not a verified production/Codespaces HTTPS origin.

Codespaces bindings are separate from the active Codex execution environment. Environment-variable presence is not successful authentication. No secrets were written, changed, committed or displayed.

## Safe implementation completed

Added **`npm run check:hosted`**, a read-only discovery/audit command that:

1. Validates local reference hashes and the exact project `hzcupgjphowrzvrdffrf` before connecting.
2. Enforces verified TLS, `default_transaction_read_only=on`, a repeatable-read/read-only transaction and bounded connection/query timeouts. It has no migration/apply path.
3. Reads the catalog and migration ledger independently, comparing all 7/8/9 references. A missing ledger produces a ledger-only baseline plan, never SQL replay. Schema drift, partial installation, duplicate or conflicting history blocks the plan.
4. Inspects only the specified Auth user's confirmation/deletion/ban flags and membership role/active/organization match. It checks the configured organization's eligible Owner without creating users, organizations or memberships.
5. Checks private media configuration, operational Realtime publication and the actual retention-job metadata. Broker/session/device behavior still needs acceptance testing.
6. Uses public Auth settings for signup/email-confirmation checks and anonymous read probes for minimal identifier projections; it prints no private rows. Optional existing service-key access uses only GET reads of the specified Auth user/membership.
7. Rejects API mutation methods and credential-bearing redirects, bounds requests, and classifies authentication, authorization, network, TLS or configuration failures using codes rather than raw error messages.

The existing `check:supabase` now respects approved passenger signup mode and checks mandatory email confirmation instead of incorrectly requiring signup to be disabled in every mode. API probes use minimal fields, GET/HEAD-only fetching and validated server-key types. The Owner bootstrap tool now rejects currently banned users before planning/applying; this is a **code guard only**, not a permission change.

The protected GitHub operations workflow now offers `verify-read-only`. It cannot be dispatched through this new choice until the workflow exists on the default branch; this task does **not** merge or deploy it. The direct command works on the existing feature branch today.

Public Auth settings cannot establish private Site URL/redirect allowlist, SMTP, CAPTCHA/password/abuse configuration. No management API credential/connector is available for those settings. They remain explicitly unverified. Metadata/anonymous probes also do not prove authenticated RLS role isolation or operational writes.

## Exact conditional execution plan — not executed

The next session first runs `npm run check:hosted` after secure access is supplied. It never invokes app quote/booking/payment/GPS/notification RPCs as part of an audit.

| Actual full catalog match                                            | Safe next plan after explicit approval                                                                                                                                                                                                                                   |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 001–007, missing/partial matching ledger                             | Record **only** existing matching 001–007 ledger entries with `db:baseline`; never run their SQL. Verify actual Owner/organization and obtain any separate bootstrap approval. Then separately approve/apply only 008, audit it, then separately approve/apply only 009. |
| 001–008                                                              | Skip 008 entirely. Review actual retention worker and infrastructure. Baseline only matching history using `db:baseline -- --with-driver` if necessary, then separately approve only 009.                                                                                |
| 001–009                                                              | Skip both 008 and 009. Baseline matching history using `db:baseline -- --with-passenger` only if separately approved. Continue actual Auth/business/provider acceptance.                                                                                                 |
| Drift, partial application, unknown history or extra access policies | Stop migration application. Prepare a reviewed additive repair based on actual findings; no drops, resets, destructive SQL or historical replay.                                                                                                                         |

Existing guarded scripts provide the concrete transactional implementation; the beginner does not need to copy SQL. Baseline recording itself is a hosted mutation and needs approval. Owner bootstrap is separate and requires the real identity, authority and reviewed existing state; never duplicate or silently attach an organization/user.

Pending candidate files and current reviewed hashes:

| File                                  | SHA-256                                                            | Exact approval target if proved needed                 |
| ------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------ |
| `202610120008_driver_tracking.sql`    | `b4224e941c97339f67da406dda898dcb7a3ea50f5b6b692e95c8c2eb339fe1e1` | `hzcupgjphowrzvrdffrf:driver-tracking:b4224e941c97`    |
| `202610120009_passenger_platform.sql` | `f19619e42e0ec5797afe782e21d45b0f1c6bbc59b1b1013cd76907aff5c2675c` | `hzcupgjphowrzvrdffrf:passenger-platform:f19619e42e0e` |

These targets are identifiers, **not credentials or current permission to execute**. Hashes must still match the reviewed files when presenting the actual approval. Baseline approval target is `hzcupgjphowrzvrdffrf:baseline`, with the exact matched-stage command reviewed before execution. Migration 008 requires a verified active tracking retention worker, and 009 verifies the eight-migration history/Owner foundation before applying. Missing worker/infrastructure needs separate review, not replay of already installed DDL.

## Actual local verification

- ESLint: passed without warnings.
- TypeScript: passed.
- Unit tests: **53 passed**, including eleven new schema-stage/ledger/secret-safe error/Auth policy/read-only method checks.
- Disposable PostgreSQL/RLS: **195 assertions passed**; no hosted project is contacted by this suite.
- Production Next.js build: passed.
- `check:hosted`: correctly exits nonzero at missing/invalid configuration, with **no hosted checks performed**.
- Browser tests were not rerun for this CLI/documentation change; Phase 3's historical 32 desktop/mobile passes are recorded separately and are not hosted Auth evidence.
- Original SQL migrations 001–009 and all three schema reference files are unchanged.

No hosted SQL, baseline record, account creation/promotion, booking, charge, message, GPS record, merge or deployment occurred.

## Shortest next actions

**Only action needed from the beginner now:** save the actual project's PostgreSQL connection URI as **`SUPABASE_DB_URL` in this active Codex environment's secure secrets**, then return to this conversation. Use Supabase **Connect → Session pooler** if that is the provided accessible endpoint; use the real current password within the secure binding and never paste the URI/password in chat. An existing authorized read-only database account is sufficient if it can read catalog/history, the target Auth flags, organization/membership, Storage/publication/cron metadata. Do not create or grant a new role for this task without separate approval. The verifier itself enforces read-only access even if the supplied account has broader privileges.

After that, the agent retries the read-only catalog/Auth/membership audit autonomously and presents the verified, exact mutation plan for approval. Application keys/organization/HTTPS origin and private Auth settings are addressed securely after the foundation is known; provider setup and real account/device/business acceptance remain launch gates. No Stripe charge, customer message or test production booking is authorized by supplying the connection.

**Roman Urdu:** Abhi hosted database ready hone ki tasdeeq nahin hui. Sirf `SUPABASE_DB_URL` active Codex environment ke secure Secrets mein save karein; chat mein password ya connection string na bhejein. Phir main read-only audit karunga aur zaroori tabdeeliyon ki alag ijazat loonga.

## Follow-up connection discovery — October 13, 2026

Rechecked the current runtime (including the ignored local environment through the existing safe loader), the Codex environment draft metadata, and the tools available to this session. `SUPABASE_DB_URL` is still missing in the process. The draft already lists six pending direct runtime-variable requirements, including `SUPABASE_DB_URL`; declaration/pending status does not supply a usable value or activate a connection. No requirement was duplicated and no credential values were inspected or printed.

No authorized Supabase database integration is callable in this session. `npm run check:hosted` again exits nonzero at configuration validation: database binding missing, application public/server configuration unusable. No database or API request was attempted. This does not establish a network failure, incorrect database password or actual hosted installation state. The reported 17 tables/history remain client-reported until a connection permits independent inspection.

The single next action remains secure entry of **`SUPABASE_DB_URL`** into this active Codex environment. Navigation: open **Codex → Settings → Environments**, select the environment attached to **`IramNaz321/hamdi-tourism`**, then open **Edit/configuration** and locate the existing pending **`SUPABASE_DB_URL`** runtime-variable requirement. Supply the actual project PostgreSQL URI using the environment's secure credential entry, save the configuration and activate/publish the update if that UI requires it. This needs a direct runtime binding; an HTTPS-only network-proxy credential cannot supply a PostgreSQL connection URI to Node.js. Specific environment links are not provided because this session exposes draft metadata, not a verified environment settings URL. Never paste the URI/password in chat or store it in the repository.

After secure configuration is saved, return to the conversation. The agent will recheck runtime availability and retry the read-only audit; no manual SQL is required. Hosted mutations/Owner permissions still require separate explicit approval. No merge or deployment occurred.

## Current published-environment follow-up

The final completion task now has valid-shaped Supabase bindings. Node's supported HTTPS proxy enabled actual Auth/API reads: the specified account exists and is email-confirmed, membership is absent, organizations are empty, and 17 public API tables are exposed. PostgreSQL inspection remains blocked by network/DNS and an HTTP CONNECT 403 for the pooler's port 5432. A saved pooler-host allowlist update requires publication; activation must be followed by a new connection test. Do not treat historical missing-secret findings as the current blocker or assume a table count proves the SQL catalog. See [Final launch report](FINAL-LAUNCH-REPORT.md) for current verified evidence, pending Owner authorization, exact blockers and the launch package.
