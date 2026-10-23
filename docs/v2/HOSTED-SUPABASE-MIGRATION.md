# Hamdi V2 — hosted Supabase migration and deployment runbook

Status: implementation plan; no hosted migration has been executed by writing this document.  
Prepared: 23 October 2026.  
Audience: the colleague and Codex agent performing the migration.  
Scope: migrate `backend-v2` + `frontend-v2` to hosted Supabase, then retire the legacy V1 UI, runtime, tooling and obsolete repository content. The final repository and deployments must contain one maintained application: V2.

## 1. Objective and execution contract

Move the approved Customer → Owner → Driver → Customer completion flow from local Supabase to hosted Supabase, retaining the existing API contracts and approved UI. Deliver a separately deployed Fastify API and Vite frontend, real email-code authentication, persisted production records, and verified role isolation.

**Final success criterion: only V2 remains as the supported, runnable and deployed application; its hosted Supabase migration is verified; every required retained automated test and hosted acceptance check passes. A schema-only migration, an unchanged V1/V2 dual runtime, or a green result obtained by skipping failing V2 tests is incomplete.**

Default data strategy: **start production clean**. Migrate schema and approved reference data; create fresh production identities. Do not copy local test bookings, identities, sessions, simulated payments or audit records. If the business requests retention, follow section 12 before proceeding.

This file is an implementation specification, not a claim that the required deployment scripts already exist. Codex must implement the missing deployment/bootstrap work, test it, and record results. Reading this file alone does not authorize deleting data, reusing an unrelated hosted project, buying services or changing DNS. Follow the human operator's authorized deployment scope and confirm any unresolved target or destructive action before executing it.

### Instructions to the executing Codex agent

1. Read this entire file, repository `AGENTS.md`, `frontend-v2/AGENTS.md`, and applicable Supabase skills. Inspect the current checkout; it may have advanced since this document was prepared.
2. Preserve local development and the explicit browser-only mock mode. Keep hosted credentials separate from local configuration.
3. Work on a feature branch. Do not apply legacy root Supabase migrations to V2 or assume the root project's hosted credentials belong to V2. Retire legacy repository files only through the audited cleanup phase in section 8; preserve any required migration history and recovery material outside the active application tree.
4. Inspect current official Supabase/hosting documentation and installed CLI `--help` before running commands. Example commands below are templates; substitute the operator-confirmed project and environment.
5. Implement the hosting/migration pieces and V1 retirement described here. Do not redesign V2 or introduce Google Maps/payment integrations as part of this migration. Remove obsolete V1 code, assets, scripts, tests, configuration and documentation after auditing dependencies and preserving required records.
6. Never print secrets, paste them into chat, commit them, or place them in `VITE_*` variables. Use the hosting secret manager and ignored local environment files where necessary.
7. Rehearse on staging. Perform production cutover only after the acceptance gates pass and the operator has supplied the production target and approved business configuration.
8. End with a migration report in this same document: commit, target refs/domains (no secrets), migration versions, seed counts, test evidence, limitations, backup/rollback details, and unresolved items. Do not create a competing migration-plan document.

## 2. Current architecture and source of truth

| Concern | Current implementation | Hosted destination |
| --- | --- | --- |
| Frontend | React/Vite in `frontend-v2`, local port 4173 | Static/frontend host with SPA fallback and API reverse proxy |
| API | Fastify/TypeScript in `backend-v2`, port 4180 | Persistent Node.js 24 service/container |
| Database | Local Supabase PostgreSQL 17, port 57522 | Dedicated hosted Supabase PostgreSQL database |
| Authentication | Supabase email OTP, local Auth API port 57521 | Hosted Supabase Auth with custom SMTP |
| Email inbox | Local Mailpit, port 57524 | Real recipients' inboxes |
| Data transport | Browser → `/api/v2` → Fastify → Postgres/Auth | Same API boundary over HTTPS |
| Sessions | Real access/refresh tokens, tab-local frontend sessions | Fresh hosted sessions; local sessions are not portable |
| Shared state | PostgreSQL records, frontend refresh on focus/15-second polling | Same; Realtime is not required |
| Images | Existing frontend static assets | Ship with frontend deployment |
| Places | 72 curated UAE locations in `hamdi.places` | Seed same approved catalogue |
| Payments | Local simulated outcomes | Disabled until a separate provider integration |

Authoritative files:

- `backend-v2/supabase/migrations/20261023063806_hamdi_v2_initial.sql`: exact V2 DDL, constraints, RLS, indexes and grants.
- `backend-v2/scripts/setup-local.ts`: current local migration/seed/Owner setup; **do not execute against hosted Supabase**.
- `backend-v2/src/uae-places.ts`: complete place seed and route-zone rules.
- `frontend-v2/src/services/fixtures.ts`: category catalogue, original eight places and extras.
- `frontend-v2/src/domain.ts`: JSON payload validation contracts.
- `backend-v2/src/db.ts`: database pool, transaction and role behavior.
- `backend-v2/src/auth.ts`: hosted clients, session validation and role lookup.
- `backend-v2/src/bookings.ts`, `resources.ts`, `requests.ts`, `payments.ts`, `places.ts`: operational API behavior.
- `docs/v2/SCRUM.md`: scope and evidence of the completed local release.

The root repository currently contains a different application, Supabase scripts and database tests. Do not apply them to V2 by accident. They are retirement candidates, not part of the final supported application; section 8 defines their audited removal. The frontend Sites worker currently serves assets and SPA fallback only; it does **not** proxy the API. Vite's development proxy also does not become a production proxy automatically.

## 3. Prerequisites and target decisions

Record these before applying hosted changes:

| Item | Required decision/value |
| --- | --- |
| Supabase ownership | Operator-approved organization/account |
| Staging project | Dedicated project name, ref and region |
| Production project | Dedicated project name, ref and region |
| Existing target data | Confirm empty/new; otherwise inventory and back up before planning merge |
| Database compatibility | Query local/remote PostgreSQL versions; local configuration uses major 17 |
| Frontend host/domain | HTTPS domain and deployment mechanism |
| API host | Node 24 support, health checks, secret storage, connectivity to Supabase |
| Routing | Prefer same-origin `/api/v2` reverse proxy |
| Owner | Real dedicated email and display name; no `@hamdi.local` account |
| Email | SMTP provider, verified From domain/address, SMTP credentials |
| Commercial configuration | Approved base fares, route factors, extras, return pricing and durations |
| Booking policy | Owner-approved handling of unpaid bookings while online payments are disabled |
| Operations | Backup/recovery capability, monitoring recipient and release owner |

Do not assume a project seen in a connected Supabase account is the correct destination. Verify project reference and organization. Keep local, staging and production secrets isolated. A hosted staging project may incur costs; use operator-approved provisioning.

## 4. Exact schema inventory

Apply the canonical migration file rather than rebuilding SQL from this inventory. `hamdi` is a private schema; do not expose it through the Data API. Every application table has RLS enabled. Supabase manages the `auth` schema.

Notation: `?` means nullable; other columns are NOT NULL. Defaults shown below are part of the current migration.

| Table | Columns and defaults | Purpose |
| --- | --- | --- |
| `hamdi.auth_challenges` | `id uuid PK default gen_random_uuid()`; `email text`; `attempts integer default 0`; `expires_at timestamptz default now()+10 minutes` | Temporary server-side OTP challenge tracking |
| `hamdi.bookings` | `id uuid PK`; `reference text UNIQUE`; `customer_id uuid`; `driver_id uuid?`; `vehicle_id uuid?`; `status text`; `pickup_at timestamptz`; `data jsonb`; `revision bigint default 1`; `created_at timestamptz default now()` | Booking state, indexed ownership/assignment, version and complete booking payload |
| `hamdi.custom_requests` | `id uuid PK`; `reference text UNIQUE`; `email text`; `data jsonb`; `created_at timestamptz default now()` | Special requests/custom quote workflow and linked booking information |
| `hamdi.drivers` | `id uuid PK default gen_random_uuid()`; `name text`; `email text UNIQUE`; `phone text`; `licence_number text default empty`; `licence_until date`; `active boolean default false`; `available boolean default true`; `onboarding_status text default invited`; `invited_at timestamptz default now()`; `submitted_at timestamptz?`; `created_at timestamptz default now()` | Invited, onboarded and approved driver resources |
| `hamdi.events` | `id bigint GENERATED ALWAYS AS IDENTITY PK`; `booking_id uuid?`; `actor_id uuid?`; `action text`; `at timestamptz default now()` | Server audit events |
| `hamdi.idempotency` | `actor text`; `key text`; `operation text`; `target text`; `created_at timestamptz default now()`; composite PK `(actor,key)` | Prevent duplicate operations on retries |
| `hamdi.places` | `id text PK`; `data jsonb`; `country_code text`; `source text`; `verified_at timestamptz default now()` | UAE searchable catalogue |
| `hamdi.profiles` | `user_id uuid PK`; `role text default customer`; `name text default Customer`; `email text UNIQUE`; `driver_id uuid? UNIQUE`; `active boolean default true` | Protected application role/profile |
| `hamdi.quotes` | `id uuid PK`; `data jsonb`; `expires_at timestamptz`; `created_at timestamptz default now()` | Server-priced, expiring standard quotes |
| `hamdi.vehicles` | `id uuid PK default gen_random_uuid()`; `name text`; `category_id text`; `registration text UNIQUE`; `registration_until date`; `passengers integer`; `bags integer`; `active boolean default true`; `created_at timestamptz default now()` | Individual fleet assets, distinct from category catalogue |

### Relationships

- `profiles.user_id` → `auth.users.id`, ON DELETE CASCADE.
- `profiles.driver_id` → `drivers.id`.
- `bookings.customer_id` → `auth.users.id`.
- `bookings.driver_id` → `drivers.id`.
- `bookings.vehicle_id` → `vehicles.id`.
- `events.actor_id` → `auth.users.id`; `events.booking_id` → `bookings.id`.
- Place IDs, quote links and other IDs embedded in JSON are validated by application logic; do not invent foreign keys that are absent from the migration.

### Important constraints and indexes

- Booking statuses: `pending`, `confirmed`, `in_progress`, `completed`, `cancelled`.
- Booking JSON `id`/`status` must match their corresponding relational columns.
- Paid amount cannot be negative; refund amount must be between zero and paid amount.
- Profile roles: `customer`, `owner`, `driver`. Exactly driver profiles have a non-null `driver_id`.
- Driver email must be lowercase; name length 2–100; onboarding states `invited`, `submitted`, `approved`.
- Vehicle categories: `sedan`, `luxury`, `family`; passenger capacity 1–7, bag capacity 0–6.
- Places country must be `AE`; source must be `catalog` or `google` (only catalogue is currently used).
- Auth challenge attempts are constrained to 0–6; the endpoint applies its own stricter retry logic.
- Booking indexes: `(customer_id,created_at DESC)`, `(driver_id,pickup_at)`, `(status,pickup_at)`.
- Partial unique indexes permit only one `in_progress` booking per assigned driver and fleet vehicle.
- Custom request index: `(email,created_at DESC)`.
- Scheduling conflicts also depend on API transaction/advisory locks; indexes alone do not replace the API.

### JSONB contracts

Keep payloads compatible with `frontend-v2/src/domain.ts` and backend DTOs. Do not populate production booking JSON manually.

- `bookings.data`: identifiers/reference; customer/contact; journey and UAE place IDs; category ID; server offer; flight/notes; status/payment status; duration/expected end; nullable assignment; paid/refunded amounts; cancellation request/decision; outbound/return leg timestamps; assigned-driver history; activity feed; optional pickup/destination labels.
- `bookings.data.vehicleId` is a **category** ID; relational `bookings.vehicle_id` and `assignment.fleetVehicleId` identify an **individual fleet vehicle**. Do not substitute one for the other.
- `quotes.data`: quote ID, journey, eligible category offers, expiry, duration. Standard quotes expire after 15 minutes in current code.
- `custom_requests.data`: customer request/contact, journey details, lifecycle, Owner offer and resulting booking link. Use the current request/response contracts for exact structure.
- `places.data`: `id`, `name`, `shortName`, `type` (`airport` or `destination`), `city`, `countryCode: AE`, `source: catalog`. Coordinates are not required for catalogue selection.
- Monetary amounts are integer AED minor units: `18000` = AED 180.00. Preserve integers throughout.
- Journey inputs are UAE local time (`+04:00`); stored timestamps use timezone-aware PostgreSQL values. Hosting/server timezone must not alter journey interpretation.

### Roles, policies and privileged access

The migration creates `hamdi_api` as NOLOGIN, NOSUPERUSER, NOBYPASSRLS and grants it to `postgres`. It receives schema access, table grants and sequence usage. `visibleRead()` sets JWT claims transaction-locally and runs `SET LOCAL ROLE hamdi_api`.

Current SELECT policies:

| Table | `hamdi_api` visibility |
| --- | --- |
| `bookings` | Customer's own bookings, currently assigned Driver's bookings, or active Owner |
| `custom_requests` | Matching verified profile email or active Owner |
| `drivers` | Own driver record or active Owner |
| `profiles` | Own profile or active Owner |
| `vehicles` | Owner, or vehicle associated with the current Driver's booking |
| `places`, `quotes` | SELECT policy allows reads by this internal role; API still controls public responses |
| `events`, `idempotency`, `auth_challenges` | No end-user policies; accessed through privileged server operations |

`hamdi.driver_id()` and `hamdi.is_owner()` are SECURITY DEFINER helpers in the private schema, with empty search path, non-null `auth.uid()` checks, PUBLIC execution revoked and execution granted to `hamdi_api`.

**Critical hosting compatibility check:** current server mutations and `auth.sessions` revocation checks use the privileged database connection. Read RLS does not make privileged writes safe by itself; API authorization is required. Do not replace the connection with `hamdi_api` or a generic restricted user without implementing/testing all needed permissions and write behavior. Prefer a dedicated runtime login after reviewing the required privilege model; if retaining the current privileged connection for initial parity, explicitly record the decision, protect it server-side and restrict database network access where supported. Migration credentials and runtime credentials should be separate where feasible. Do not grant public browser roles access to `hamdi` to solve permission errors.

## 5. Seed data: what moves and what stays empty

### Production seed manifest

| Dataset | Source | Initial action |
| --- | --- | --- |
| UAE places | `backend-v2/src/uae-places.ts` plus eight original fixture locations | Idempotently insert/upsert 72 approved entries |
| Owner identity/profile | Operator-supplied real email/name | Create through Auth Admin API and insert protected `owner` profile |
| Category catalogue | `frontend-v2/src/services/fixtures.ts` | Already code-owned; no category table to seed |
| Extras | Same fixtures file | Already code-owned; no extras table to seed |
| Base fares | `backend-v2/src/bookings.ts` | Code-owned; approve before deploy |
| Route factors/durations | `backend-v2/src/uae-places.ts` | Code-owned; approve before deploy |
| Drivers and fleet | Owner resource workflows | Empty initially; add actual approved resources |
| Customers | Email OTP registration | Empty initially; real users register |
| Bookings/custom requests/quotes | Real user workflows | Empty initially |
| Events/idempotency/challenges | Runtime operations | Empty initially |

Do not import `frontend-v2/src/services/mock.ts` examples or browser localStorage. Those belong to the standalone mock experience.

### Complete UAE catalogue

Keep stable IDs from the exported `uaePlaces` array. Original IDs are `dxb`, `dwc`, `marina`, `downtown`, `palm`, `auh`, `abudhabi`, `sharjah`. Additional IDs are generated as `uae:` followed by a lowercase, non-alphanumeric-to-hyphen slug with trailing hyphen removed. Use the source export rather than manually retyping IDs.

| Emirate/city | Count | Included places |
| --- | --- | --- |
| Dubai | 28 | Dubai International Airport (DXB); Al Maktoum International Airport (DWC); Dubai Marina; Downtown Dubai; Palm Jumeirah; Jumeirah Beach Residence (JBR); Business Bay; Deira; Bur Dubai; Jumeirah; Al Barsha; Dubai Hills; Dubai Silicon Oasis; Dubai Sports City; Dubai Festival City; Dubai Creek Harbour; Dubai International Financial Centre (DIFC); Dubai Healthcare City; Dubai Internet City; Dubai Media City; Jebel Ali; Dubai Parks and Resorts; Expo City Dubai; Mirdif; International City; Al Qusais; Dubai South; Hatta |
| Abu Dhabi | 16 | Zayed International Airport (AUH); Abu Dhabi city; Yas Island; Saadiyat Island; Al Reem Island; Abu Dhabi Corniche; Khalifa City; Al Raha Beach; Masdar City; Mussafah; Al Maryah Island; Sheikh Zayed Grand Mosque; Al Ain city; Al Ain Zoo; Liwa Oasis; Ruwais |
| Sharjah | 10 | Sharjah city; Sharjah International Airport (SHJ); Al Majaz; Al Khan; Al Qasba; Muwaileh; University City Sharjah; Khor Fakkan; Kalba; Dibba Al Hisn |
| Ajman | 4 | Ajman city; Ajman Corniche; Al Zorah; Masfout |
| Umm Al Quwain | 3 | Umm Al Quwain city; Al Sinniyah Island; Falaj Al Mualla |
| Ras Al Khaimah | 6 | Ras Al Khaimah International Airport (RKT); Ras Al Khaimah city; Al Marjan Island; Al Hamra Village; Mina Al Arab; Jebel Jais |
| Fujairah | 5 | Fujairah International Airport (FJR); Fujairah city; Al Aqah; Dibba Al Fujairah; Snoopy Island |
| **Total** | **72** | **Seven emirates** |

Example place row:

```json
{
  "id": "dxb",
  "data": {
    "id": "dxb",
    "name": "Dubai International Airport (DXB)",
    "shortName": "Dubai Airport (DXB)",
    "type": "airport",
    "city": "Dubai",
    "countryCode": "AE",
    "source": "catalog"
  },
  "country_code": "AE",
  "source": "catalog"
}
```

### Code-owned commercial defaults requiring sign-off

| Category | Passengers | Bags | Base fare |
| --- | --- | --- | --- |
| `sedan` | 3 | 3 | AED 180.00 |
| `luxury` | 3 | 3 | AED 260.00 |
| `family` | 7 | 6 | AED 320.00 |

Extras per booked leg: child seat AED 35.00; meet & greet AED 50.00. Current return transfer is 90% of the outbound transfer; extras are charged on both legs.

Route rules are evaluated in this order:

| Match | Factor | Duration |
| --- | --- | --- |
| Either name contains Liwa or Ruwais | 4.0 | 240 minutes |
| Either name contains Hatta, Khor Fakkan, Kalba, Dibba, Al Ain, Jebel Jais or Masfout | 2.8 | 150 minutes |
| Same city | 1.0 | 45 minutes |
| Either city is Abu Dhabi | 2.2 | 110 minutes |
| Either city is Fujairah or Ras Al Khaimah | 2.4 | 130 minutes |
| Either city is Umm Al Quwain | 1.8 | 85 minutes |
| Other intercity route | 1.3 | 60 minutes |

These are sample commercial zones and duration estimates, not road-distance/traffic calculations. Hosting does not make them authoritative. Obtain approval or change them through reviewed code before public booking launch.

### Hosted bootstrap to implement

Create a separate script, for example `backend-v2/scripts/bootstrap-hosted.ts`, with a documented npm command. This script is **not present yet**.

Required behavior:

1. Accept explicitly selected staging/production credentials through environment/secrets. Require an expected project ref and verify the Supabase URL matches it. Check the database target independently against operator-provided connection details/project mapping; do not assume the Auth URL proves the database connection points to the same project. Fail on localhost targets or absent Owner email.
2. Never call `supabase status` to discover local credentials, overwrite `.env.local`, enable local test mode, or invoke database reset.
3. Import the existing `uaePlaces` source. Validate 72 unique IDs and the seven city counts above. Use parameterized queries in a transaction.
4. Upsert catalogue entries by stable ID. On conflict update the approved `data`, `country_code` and `source`; do not delete unrelated places or overwrite operational tables. Define whether `verified_at` changes on approved catalogue updates.
5. Provision the Owner through Supabase Auth Admin API; use its returned UUID as `profiles.user_id`. Normalize email and never derive authorization from editable user metadata.
6. Handle retries safely. If a matching Auth identity exists, resolve it through the Admin API and verify its profile role. Do not auto-promote an existing Customer/Driver. If identity creation succeeds but profile insertion fails, report/reconcile the orphan safely before retrying; avoid deleting an identity that existed before this run.
7. Insert the Owner profile with approved name, `role=owner`, `driver_id=NULL`, `active=true`. Require explicit review for any pre-existing inactive or inconsistent Owner record rather than silently reactivating it.
8. Print only sanitized project identity, counts and success/failure. Rerun must produce the same rows without duplicates.

## 6. Required code and infrastructure changes

Implement and review these before production; they are not completed by changing environment values alone.

- **Backend listener:** `src/main.ts` currently binds `127.0.0.1`. Make the bind address configurable. Use the deployment platform's required address, commonly `0.0.0.0` inside a container; keep local default behavior.
- **Production environment validation:** fail fast for missing/malformed hosted URL, keys, database connection and application origin; reject `LOCAL_TEST_MODE=true` in production (existing guard must remain). Require HTTPS application/Auth URLs in hosted mode.
- **Hosted development/staging guard:** `src/auth.ts` currently rejects non-local Supabase unless `NODE_ENV=production`. Run staging with production behavior or introduce an explicit, validated deployment-environment setting. Do not remove target protection globally.
- **Database connection:** configure TLS with certificate verification and the correct direct/session-pool endpoint for the API host's network. Size the current pool (`max=10`, `min=2`) for instance count and hosted connection budget. Never resolve TLS errors by disabling verification globally.
- **Database compatibility:** prove `SET LOCAL ROLE`, JWT claim settings, advisory locks, transactions and `auth.sessions` reads work through the selected connection. Use a dedicated migration connection; do not blindly use transaction pooling without compatibility tests.
- **Deployment packaging:** backend imports TypeScript from `../frontend-v2/src/domain.ts` and `../frontend-v2/src/services/fixtures.ts`. Deployment must retain these sibling paths, or refactor shared contracts into a package with regression verification. Uploading only the backend directory will fail.
- **Runtime command:** current `npm start` uses `tsx`, which is a devDependency. Either include it in the runtime image or implement a tested build/start strategy. Do not use `npm ci --omit=dev` with the current start command and expect it to work.
- **Routing:** implement production reverse proxy for `/api/v2/*` before SPA fallback, forwarding method/body, Authorization and Idempotency-Key headers and returning JSON/status unchanged. Keep frontend and API same-origin where possible. If separate browser origins are required, implement/test explicit CORS including preflight; the current origin check does not implement cross-origin CORS.
- **Proxy trust/rate limiting:** configure trusted proxies according to host topology so limits distinguish real clients without trusting spoofed forwarding headers. Review behavior across multiple API instances; in-memory limits are instance-local.
- **Frontend build:** set `VITE_DATA_SOURCE=api`, retain `/api/v2` base URL, verify no mock fallback or demo role controls operate in hosted mode. Check production payment-unavailable and catalogue messaging.
- **Operational controls:** configure health checks, graceful shutdown, redacted logs, database connection failure handling and alerting. Preserve existing token/header log redaction.
- **Automated checks:** keep local integration tests local. Add a separate explicitly targeted hosted smoke path; do not repoint all local tests at production.

## 7. Environment and Auth configuration

Backend environment (placeholders only; inject through secrets):

```dotenv
NODE_ENV=production
PORT=<platform-port>
APP_ORIGIN=https://<frontend-domain>
LOCAL_TEST_MODE=false
SUPABASE_URL=https://<confirmed-project-ref>.supabase.co
SUPABASE_ANON_KEY=<project-public-client-key-compatible-with-current-code>
SUPABASE_SERVICE_ROLE_KEY=<server-only-admin-key-compatible-with-current-code>
DATABASE_URL=<verified-TLS-database-or-session-pool-connection-string>
```

The variable names above match current code. Verify current Supabase key formats/library support when provisioning; if adopting newer publishable/secret keys, test the auth/admin flows and update configuration documentation consistently. Never ship the service key or database URL in frontend code. An `OWNER_EMAIL` value only affects provisioning when the new bootstrap script implements it; it does not change runtime authorization by itself. Host/bind and certificate settings must use the actual variable names introduced during implementation, not assumed names.

Frontend build configuration:

```dotenv
VITE_DATA_SOURCE=api
VITE_API_BASE_URL=/api/v2
```

Changing Vite values requires rebuilding the frontend. Current `.env.example` defaults to mock mode; do not accidentally publish that build.

Configure separately in each hosted Supabase project:

1. Email provider enabled; OTP sign-in/signup behavior matched to current `signInWithOtp` + `verifyOtp(type=email)` flow.
2. Six-digit email OTP because the API currently accepts exactly six digits. Review OTP expiry against the application's ten-minute challenge expiry; verify resend, expired and invalid-code behavior.
3. Custom SMTP with verified sender domain, SPF/DKIM and the provider's required DNS settings. Configure the templates used for new-user signup and existing-user login to visibly include the token; test both, not only magic-link login.
4. Correct Site URL and exact redirect allowlist for that environment; do not use unrestricted production wildcards.
5. Appropriate email/Auth rate limits, refresh rotation and session settings. Supabase Auth is called by the backend, so test shared backend-egress/IP rate-limit behavior under expected traffic rather than assuming browser IPs reach Auth directly.
6. Public registration produces Customer access only. Owner provisioning and Driver invitation remain privileged operations.
7. Driver invitation currently creates an Auth identity/profile then requests an OTP. Verify actual delivery and failure handling; the UI must surface failed invitation delivery rather than implying success.
8. Keep `hamdi` absent from exposed schemas. Do not add broad `anon`/`authenticated` grants.

Hosted dashboard settings and SMTP configuration are not automatically deployed from local `config.toml`; reproduce and verify them explicitly.

## 8. Ordered execution plan

### Phase A — inventory and preparation

- [ ] Record target decisions from section 3 and current commit SHA.
- [ ] Confirm local checkout is clean or preserve the operator's unrelated changes.
- [ ] Inventory existing hosted target schemas/data, if any; take a backup before modifying a non-empty project.
- [ ] Preserve local database data/volumes; do not reset the working demo.
- [ ] Implement hosting/bootstrap changes from sections 5–7 with focused tests.
- [ ] Review runtime privileges, dependency packaging, TLS and proxy behavior.

### Phase B — local validation

Run from repository root (Node 24, dependencies installed in both V2 packages):

```sh
npm --prefix backend-v2 ci
npm --prefix frontend-v2 ci
npm --prefix backend-v2 run typecheck
npm --prefix frontend-v2 run typecheck
npm --prefix frontend-v2 test
npm --prefix frontend-v2 run build
npm --prefix frontend-v2 run test:sites
```

With the local Supabase stack available and the existing ignored local backend environment configured:

```sh
npm --prefix backend-v2 test
```

The backend integration suite creates real local test identities/records. It is not a production smoke test. Root `test:db`/`test:browser` primarily concern the separate legacy application; inspect their scope before using their results as V2 evidence. Rehearse schema/bootstrap on a disposable target rather than resetting the operator's populated local database.

### Phase C — apply to hosted staging

Use the CLI installed in `backend-v2`, not an unrelated global version. The following are command templates, not commands already executed:

```sh
cd backend-v2
npm exec -- supabase --help
npm exec -- supabase link --help
npm exec -- supabase db push --help
npm exec -- supabase migration list --help
```

After login through the approved credential mechanism, verify the project ref and explicitly link staging:

```sh
npm exec -- supabase link --project-ref <confirmed-staging-project-ref>
npm exec -- supabase migration list --linked
npm exec -- supabase db push --linked --dry-run
```

Review the dry run: it must contain the V2 migration(s) from this directory only. If supported flags differ, use installed help and document the equivalent. If remote history or schema is unexpected, stop and reconcile; do not use history repair to conceal a mismatch. Custom role creation/grants may need hosted administrator privileges: test them here and add a reviewed follow-up migration if needed, rather than exposing private tables.

Then apply:

```sh
npm exec -- supabase db push --linked
npm exec -- supabase migration list --linked
```

Do not use `db reset --linked`, `--include-seed`, a local full-cluster dump, or root legacy migrations. The current V2 config has no SQL seed files; places and Owner are provisioned separately.

- [ ] Run the newly implemented hosted bootstrap with explicit staging secrets/ref.
- [ ] Run it again and verify idempotency and unchanged Owner/row identities.
- [ ] Configure SMTP/Auth settings and deploy staging API/frontend.
- [ ] Run schema checks and the complete staged acceptance matrix below.

### Phase D — retire V1 and consolidate the repository

Perform cleanup on the feature branch after staging demonstrates V2 parity, then rerun staging from the cleaned checkout **before production cutover**. The user explicitly requires removal of the old UI/code and unrelated obsolete content. Do not stop at adding a deprecation banner or hiding V1 routes.

#### D1. Produce a dependency and retention inventory

- [ ] Inspect imports, scripts, asset URLs, workflows, environment names, deployment targets and documentation links using `rg` and the tracked file list. Classify each root-level area as V1-only, V2-required, shared or historical/recovery material. Record the actual removal/retention decisions in this document's execution report.
- [ ] Check both V2 packages' imports outside their directories. In particular, preserve the backend's imports from frontend domain/fixtures until packaging is deliberately changed.
- [ ] Inventory root `public/` assets and compare them with V2 references before deleting. Preserve copyright/licence notices for retained assets and dependencies.
- [ ] Preserve locked V2 root requirements, backlog, Scrum delivery evidence, approved designs, this runbook and relevant operational documentation. Remove superseded V1 documentation and screenshots from the maintained tree once any needed knowledge has been incorporated into V2 documentation.
- [ ] Record the last V1 commit/release and the location of required backups/recovery records. Git history can retain old source; no active V1 copy is needed inside the V2 repository. Do not delete external databases, volumes, hosted projects or backups as a side effect of repository cleanup.

#### D2. Remove the legacy application and obsolete content

The following paths currently exist and are **candidates to audit and remove**, not an instruction for blind recursive deletion:

| Area | Required final disposition |
| --- | --- |
| Root `src/` | Remove the V1 Next.js routes, UI components, API/server actions and libraries after confirming no V2 dependency |
| Root `public/`, `preview/` | Remove V1-only assets/previews; retain or relocate any V2-required assets with updated references |
| Root `supabase/` | Remove V1 schema/config/tests from the active repo after preserving any required historical record; keep `backend-v2/supabase/` authoritative for V2 |
| Root `scripts/` | Remove V1 repair, migration, concierge, payment and verification tools; replace only with necessary V2 orchestration/verification tools |
| Root `tests/` and `playwright.config.ts` | Retire tests/config that exclusively test deleted V1 behavior; migrate any still-relevant business/security checks into a V2 suite before removing their old implementation |
| Root Next.js configs/generated declarations | Remove V1-only `next.config.ts`, `next-env.d.ts`, `postcss.config.mjs`, `components.json` and obsolete TS/ESLint configuration once references are resolved |
| Root `package.json` / lockfile | Replace legacy application commands/dependencies with V2-only orchestration; regenerate the lockfile with npm rather than editing it manually |
| `.github/workflows/ci.yml` | Replace legacy validation with the complete V2 checks in D4; do not leave root legacy browser/DB checks as the only green signal |
| `.github/workflows/supabase-operations.yml` | Remove/replace V1-specific database operations, inputs and project bindings; any replacement must explicitly target V2 and preserve safe deployment controls |
| Root `.env.example` and deployment config | Remove V1-only `NEXT_PUBLIC_*`, Stripe/concierge/legacy project settings; document actual V2 runtime/build configuration |
| Root docs and screenshots outside `docs/v2` | Remove obsolete V1 product/launch/repair reports; retain only relevant shared/legal material or updated V2 instructions |
| `.next/`, obsolete build outputs/caches | Remove obsolete local V1 artifacts where safe; update ignore rules so generated artifacts are not committed. Never delete ignored credential files or unrelated local data blindly |

Do not automatically delete everything outside the two V2 packages. Keep repository governance, `.github` configuration that remains applicable, licence/notices, Node/npm settings and V2 orchestration. Conversely, do not retain V1 solely because it lives at root.

#### D3. Make V2 the only default development/build/deployment path

- [ ] Keep the two V2 package directories unless a separately tested restructuring is necessary. The `-v2` suffix is acceptable; having a second maintained application is not.
- [ ] Provide documented root commands for V2 development, lint, typecheck, tests, build and local database setup. Ensure they invoke the correct package/schema and preserve production/local environment separation.
- [ ] Retain separate package lockfiles or deliberately introduce a workspace; do not combine dependency-management strategies accidentally.
- [ ] Remove Next.js and V1-only runtime/dev dependencies once no retained source/config uses them. Preserve dependencies required by V2 runtime packaging and verification.
- [ ] Update root `README.md`, `.env.example`, `AGENTS.md` and package documentation to describe only the maintained V2 app. Remove obsolete Next.js-specific generated guidance once Next.js is fully retired; preserve applicable agent guidance and approved V2 requirements. If any Next.js code must be edited before removal, follow its installed version's documentation first.
- [ ] Remove stale route/asset imports, dead scripts, obsolete secrets references and V1 navigation/deployment entry points. Keep explicit V2 mock mode as a supported development/demo adapter; it is not V1.
- [ ] Retire V1 deployment routes/jobs when V2 production cutover is verified. Remove obsolete host environment bindings and revoke legacy credentials only after checking ownership/dependencies and obtaining any needed operator authorization. Keep recoverable backups under the agreed retention policy.

#### D4. Establish complete V2 verification and CI

The old root workflow invokes V1 checks. It must be replaced with checks that actually exercise the cleaned V2 application. Do not simply remove failing checks and declare the repository green.

- [ ] Configure a V2 lint command covering both packages and retained scripts. Do not leave the ESLint setup dependent on removed Next.js packages.
- [ ] Run both package typechecks, frontend unit/service tests, backend integration tests, frontend production build and retained Sites packaging tests.
- [ ] Provision an isolated local Supabase stack in CI; apply the actual V2 migration and reference/bootstrap data using test-only identities. Run the backend database/API tests there, not against hosted production.
- [ ] Add or retain a repeatable V2 browser suite for Customer → Owner → Driver → Customer completion, including return trips, custom quotes, cancellation and negative role access. Existing V1 browser tests are not a substitute.
- [ ] Verify RLS, unauthorized reads/writes, transaction conflict/idempotency safeguards and migration/seed reproducibility. Map any valuable retiring V1 test intent to relevant V2 behavior; features explicitly outside V2 scope do not require resurrection.
- [ ] Verify production API packaging/startup, HTTPS proxy/deep-link behavior, secret isolation and disabled test money controls. Use staging smoke checks for the real SMTP/hosted environment.
- [ ] Pin reproducible test commands in root scripts and CI. Document any new script names in this runbook after implementation. A required check may not be skipped, disabled, marked allowed-to-fail or weakened to achieve green status.
- [ ] From a fresh checkout, install only declared dependencies and run the entire final root validation sequence. Assert every root command and workflow resolves, with no references to deleted V1 files.
- [ ] Deploy the cleaned branch to staging and rerun the hosted acceptance matrix. Record test counts, CI link/commit and sanitized browser/API evidence. All required checks must pass on the exact release commit.

### Phase E — production cutover

- [ ] Confirm the V1 cleanup phase and all V2 checks pass on the release commit.
- [ ] Confirm production target and approved fares/policies with operator.
- [ ] Record backup/restore procedure and release artifacts; back up existing target data if present.
- [ ] Link the **production** project explicitly, then repeat migration list/dry run review. A previous staging link must never be assumed to be production.
- [ ] Apply the reviewed V2 migrations and approved reference seed/Owner bootstrap.
- [ ] Configure production SMTP/Auth and host secrets, with test mode disabled.
- [ ] Deploy API, then API-mode frontend and reverse proxy using matching contract versions.
- [ ] Run production smoke tests with dedicated operator-owned accounts and clearly identified smoke records. Avoid broad integration suites and synthetic real charges.
- [ ] Open traffic/change DNS only after checks pass and operator-authorized cutover is ready.
- [ ] Verify the public frontend, API routes and deployment jobs all resolve to V2; retire remaining V1 live routes/jobs without removing required recovery records.
- [ ] Monitor Auth delivery, API errors, database connections, latency and booking failures.

## 9. SQL verification pack

Run through an approved administrative SQL connection on the confirmed target. These queries are read-only. Never log the connection string.

```sql
-- Server compatibility and application tables.
select version();
select table_name
from information_schema.tables
where table_schema = 'hamdi' and table_type = 'BASE TABLE'
order by table_name;
-- Expected: the ten tables listed in section 4.

-- All application tables must have RLS enabled.
select c.relname, c.relrowsecurity
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'hamdi' and c.relkind = 'r'
order by c.relname;

-- Role/policy/index inventory; compare to the canonical migration.
select rolname, rolsuper, rolcanlogin, rolbypassrls
from pg_roles where rolname = 'hamdi_api';
select tablename, policyname, roles, cmd, qual
from pg_policies where schemaname = 'hamdi'
order by tablename, policyname;
select tablename, indexname, indexdef
from pg_indexes where schemaname = 'hamdi'
order by tablename, indexname;

-- Seed shape: 72 total; seven city counts from section 5.
select count(*) total, count(distinct id) unique_ids
from hamdi.places where country_code = 'AE' and source = 'catalog';
select data->>'city' city, count(*)
from hamdi.places where country_code = 'AE' and source = 'catalog'
group by data->>'city' order by city;
select id from hamdi.places
where data->>'id' is distinct from id
   or data->>'countryCode' is distinct from country_code
   or data->>'source' is distinct from source;
-- Expected: zero inconsistent place rows.

-- Owner bootstrap consistency (sanitize emails in any shared output).
select p.role, p.active, count(*)
from hamdi.profiles p join auth.users u on u.id = p.user_id
where p.role = 'owner' and lower(u.email) = p.email
  and p.driver_id is null
group by p.role, p.active;
-- Clean bootstrap: exactly one active Owner before additional provisioning.

-- Clean production baseline: all zero before smoke/user activity.
select 'bookings' dataset, count(*) from hamdi.bookings
union all select 'custom_requests', count(*) from hamdi.custom_requests
union all select 'quotes', count(*) from hamdi.quotes
union all select 'drivers', count(*) from hamdi.drivers
union all select 'vehicles', count(*) from hamdi.vehicles
union all select 'events', count(*) from hamdi.events
union all select 'idempotency', count(*) from hamdi.idempotency
union all select 'auth_challenges', count(*) from hamdi.auth_challenges;
```

Also inspect migration history using the CLI, check Data API exposed-schema configuration in the dashboard, and run Supabase security advisors. An empty advisor report alone does not validate API authorization or privileged writes. Test role visibility through the actual runtime connection; do not infer it from the SQL editor, which uses elevated privileges.

## 10. Acceptance matrix

Record actual results, references and sanitized evidence. Local previous test passes are not proof of hosted compatibility.

| Area | Required hosted proof |
| --- | --- |
| V2-only repository | No runnable V1 UI/server, V1-only dependencies, scripts, active workflows, deployment entry points or obsolete documentation; fresh root commands exercise only V2 |
| Complete test gate | All required retained lint/typecheck/unit/service/database/API/browser/build/packaging checks pass on the exact cleaned release commit; no skipped required checks |
| Deployment | HTTPS page/deep-link refresh works; `/api/v2/health` reports PostgreSQL/Auth and `localTestMode=false`; API routes return JSON rather than SPA HTML |
| Catalogue | Search/select across all seven emirates; exactly 72 seed IDs; reject unknown place IDs |
| Auth | New and existing Customer receive six-digit codes in real inboxes; correct/incorrect/expired/resend paths; refresh, logout and revoked sessions behave correctly |
| Roles | Customer cannot use Owner/Driver endpoints, change role, or read another Customer's booking; Driver cannot access another Driver's assignments |
| Resources | Owner invites Driver; Driver submits onboarding; Owner activates; Owner adds real staging fleet data; invalid/expired documents and incompatible capacity are rejected |
| Booking | Server quote → Customer booking → Owner review/assignment → confirmation; same persisted booking visible to correct roles |
| Driver | Assigned Driver starts/completes valid scheduled trip; duplicate action does not duplicate events/state; Customer/Owner observe completion |
| Return trip | Outbound completion keeps return outstanding; final completion requires both legs; assignment is locked after first start |
| Scheduling | Overlap conflict, concurrent assignment, one active trip per resource, and deactivation safeguards remain effective |
| Custom quote | Guest request → Owner offer → same verified Customer acceptance → one linked booking; duplicate acceptance safe |
| Cancellation | Customer requests; Owner approves/declines; approved cancellation releases assignments; cancellation does not invent a refund |
| Payments | Test-payment action rejected; checkout/refund returns explicit unconfigured behavior; UI does not claim a real charge/refund succeeded |
| Persistence | API restart/deploy and fresh browser session retain records; no browser localStorage dependency for shared business data |
| Secrets | No privileged keys/DB credentials in bundle, source maps, logs, responses or repository |
| Infrastructure | TLS-valid DB connection; selected connection handles transactions/role switching/session lookups; pool remains within budget |
| Recovery | Previous app release redeploy rehearsed on staging; backup restore path documented and verified where available |

Production-mode trip starts enforce scheduling checks; staging fixtures must use eligible times or a controlled clock/testing approach. Do not turn on `LOCAL_TEST_MODE` in a hosted production-mode process to make the test pass.

## 11. Rollback and operational handover

- Before cutover record application release IDs, migration versions, project ref, configuration version and backup location/access instructions without secrets.
- A frontend/API deployment failure should normally roll back the application to the prior compatible artifact while preserving hosted data. Avoid reversing schema automatically.
- If writes have reached hosted production, do not point users back to an old local database: new bookings would be stranded. Pause new writes if needed, retain a recoverable hosted copy, and reconcile records before reopening traffic.
- Prefer additive schema migrations and forward fixes. A restore can discard newer writes; identify the recovery timestamp, preserve/export later records, and require operator review before restoring.
- Hosted staging smoke records can remain clearly tagged for evidence or be cleaned through a reviewed targeted procedure. Do not truncate shared production tables to remove test data.
- Keep local development available. Subsequent database changes must be committed as V2 migrations and rehearsed on staging before production deployment.
- Record backup schedule, recovery objectives, alert routing, SMTP ownership, secret rotation responsibility and ongoing connection/capacity checks.

## 12. Optional path: preserve selected local operational data

This is not the default. Execute only if the operator explicitly identifies local records that must survive.

1. Inventory selected Auth users, profiles, drivers, vehicles, places, bookings, custom requests, audit events and required idempotency records. Identify any simulated money state or test identities to exclude. Back up source and target.
2. Choose a supported Auth migration strategy after checking current documentation. Fresh Admin API identities get new UUIDs; local access/refresh tokens and sessions must not be copied into active production use.
3. If creating new Auth IDs, build a protected old→new mapping. Rewrite relational user references and all relevant JSON references (`customerId`, activity/assignment history or request links as applicable), plus actor/idempotency references. Preserve Driver/fleet IDs consistently or map every reference to them as well.
4. Load parent data first: Auth identities → Drivers/fleet → profiles → bookings/custom requests → events/idempotency. Resolve any payload cross-links explicitly. Let new quotes/challenges/sessions be created naturally rather than carrying over expired transient data.
5. Revalidate every JSON payload against current domain schemas and constraints. Reconcile booking totals and paid/refunded values; simulated local money must never be presented as an actual payment.
6. Preserve event identity values only with a deliberate import procedure and reset sequence state correctly afterward. Validate counts, referential integrity, linked payloads and role visibility.
7. Freeze source writes for final copy, validate, switch all roles together, require fresh sign-in, and document exactly which records moved. Never use an indiscriminate local cluster dump/restore over managed Supabase schemas.

## 13. Completion checklist and migration report

- [ ] Dedicated staging/production targets verified; no legacy database/project deleted or overwritten by migration.
- [ ] V1 UI/runtime/code and obsolete assets, tests, scripts, dependencies, configuration and documentation removed after dependency audit.
- [ ] V2 is the only maintained application and default development/build/deployment target; no active V1 routes/jobs remain after cutover.
- [ ] Fresh-checkout root verification and CI exercise the complete V2 stack; every required retained test/check passes on the exact release commit with no weakened gates.
- [ ] Canonical schema and migration history match; ten RLS-enabled tables present.
- [ ] Exactly 72 valid UAE catalogue entries seeded; rerun is idempotent.
- [ ] Fresh real Owner provisioned safely; no role escalation path.
- [ ] Commercial defaults and unpaid booking policy approved.
- [ ] Real OTP delivery verified for Customer, Owner and Driver.
- [ ] Production-compatible API packaging, listener, TLS, privileges and proxy verified.
- [ ] Frontend built in API mode; secrets remain server-only.
- [ ] Hosted acceptance matrix passes, including return trips and negative authorization tests.
- [ ] Local test money controls disabled; real payments remain explicitly unavailable.
- [ ] Backup, rollback and monitoring instructions handed over.
- [ ] Final report completed below; no unverified claims of completion.

### Execution report — fill during migration

- Implementing colleague / date:
- Branch / commit / PR:
- Last V1 release / retained recovery location:
- V1 paths removed / shared files retained and reasons:
- Final root commands / V2 CI workflow and exact passing commit:
- Staging project ref / region:
- Production project ref / region:
- Frontend domain / API host:
- Applied migration version(s):
- Runtime database privilege decision / TLS / connection mode:
- Reference seed count / city counts / rerun result:
- Owner provisioning result (no secret values):
- SMTP delivery evidence / Auth settings checked:
- Fare and booking policy approval:
- Local checks run / results:
- Hosted acceptance evidence / booking references:
- Backup location / restore verification / prior release ID:
- Cutover time / monitoring results:
- Remaining limitations / follow-up work:

## 14. Official references

Recheck these at execution time because hosted platform behavior and CLI flags can change:

- [Supabase environment and migration workflow](https://supabase.com/docs/guides/deployment/managing-environments)
- [Custom SMTP for Supabase Auth](https://supabase.com/docs/guides/auth/auth-smtp)
- [Passwordless email authentication](https://supabase.com/docs/guides/auth/auth-email-passwordless)
- [Database connection options](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Production checklist](https://supabase.com/docs/guides/deployment/going-into-prod)
- [Supabase CLI reference](https://supabase.com/docs/reference/cli/introduction)
