# Phase 2 verification

## 1. Driver Portal functionality

Existing Supabase invitation, login, recovery, logout and session handling are reused. Active driver membership and an active mapped driver profile are required; no invited user receives Owner permissions. `/driver-account` provides UAE-date trip groups, underway trips, paginated assignments and completed history, actual flight information, vehicle, passenger contact/instructions, navigation, availability and canonical next-action controls. Loading, empty, unavailable, offline and retry states are included. Labels have an English localization foundation and user text supports automatic direction.

Database transitions enforce acceptance → en route → arrival → pickup → completion, record immutable events and preserve canonical booking status/audit rules. Reassignment clears previous unfinished progress and GPS. An already started reassigned trip requires explicit handover; no pickup timestamp is invented. One driver cannot depart on two trips. Dispatcher cancellation and reassignment remain existing authorized Admin workflows.

## 2. Migrations and application status

Original migrations 001–007, their reference catalog and the old driver proposal are unchanged. New additive `202610120008_driver_tracking.sql` was applied **only to disposable local PostgreSQL**, never to hosted Supabase. `schema-reference-driver.json` separately records the eight-migration catalog. Do not execute both the old proposal and migration 008. If the proposal is already deployed, stop for a reviewed upgrade rather than replaying either file.

`npm run db:driver-migration` is a read-only plan. It requires exact project `hzcupgjphowrzvrdffrf`, verified TLS, the seven-migration catalog/history and an existing active confirmed Owner organization. The separate apply option requires explicit approval of the project and exact migration hash. It applies only 008, validates schema and an active retention job, and records its ledger entry atomically. Failure rolls back. An empty historical ledger needs separately approved baselining, not historical SQL replay. Protected GitHub operations also include driver-plan/driver-apply; workflow changes must reach the default branch before dispatch is available.

## 3. GPS architecture and consent

Only an assigned active authenticated driver can begin sharing after recorded departure/handover. Explicit Start/I consent precedes browser geolocation permission. Server-issued per-trip consent nonces expire after two minutes; accepted updates renew them. Stops revoke the matching nonce and erase the latest fix. Late packets cannot recreate a stopped position, and stale-tab cleanup cannot revoke a newer session.

The server validates current account, organization, assignment, licence, vehicle, trip stage, coordinates, accuracy and capture age on every update. It rejects future/stale/nonfinite/out-of-order fixes and enforces a five-second rate limit. Client capture throttles to eight seconds and has no offline queue. Only the latest position is stored; no GPS trail is accumulated. Hidden/offline pages stop sharing and require manual restart. Browser background/sleep operation is not guaranteed. Device-reported location is not hardware-attested and can be spoofed by the device owner.

Private Realtime broadcasts contain only a change notification, never coordinates or passenger contacts. Receivers reauthorize through an RPC before reading a snapshot; cached subscription access therefore cannot reveal new coordinates after revocation. Visible-tab polling provides reconnect fallback. Stale positions are labeled; locations disappear after two minutes. Physical deletion uses a service-only purge and a required once-per-minute pg_cron job, removing fixes older than five minutes, expired consents and expired/revoked passenger grants. Hosted worker installation has not been tested. Client must approve these retention defaults and review Supabase backups/provider logging retention; application code does not log private locations or credentials.

Geolocation is permitted only on `/driver-account`; other pages retain denial. HTTPS is required outside loopback development.

## 4. Passenger integration

Authenticated `/track/[booking UUID]` requires an explicit Owner-created verified passenger-to-booking grant, capped at seven days and revocable. A UUID is a locator, never an authorization token. Driver identities cannot gain another driver's tracking through passenger grants. No public GPS subscription or contact directory exists. Unknown/unconfigured/unauthorized trips display unavailable.

Reusable Leaflet tracking shows actual received positions, last seen/accuracy, real trip stages and genuine configured route points only. Marker transitions animate between received endpoints, with reduced-motion support and no extrapolated movement or ETA. Map tiles load only on request, with an OpenStreetMap privacy notice. Tracking responses are private/no-store/no-referrer. Guest identity verification and automatic booking-bound access are Phase 3 prerequisites, not implemented public guest access.

## 5. Admin integration

Existing organization-scoped Live Operations now includes real tracking snapshots and stale/offline states alongside configured route maps. Booking tracking detail provides genuine driver event history. Only Owner may grant/revoke verified passenger access; operations roles may monitor their own organization. Existing assignment and vehicle controls are preserved. GPS writes and audit insertion are RPC-only, with database authorization and immutable driver event history.

## 6. Automated results

Checks completed on 2026-10-13. Fixtures and emulated coordinates exist only in disposable tests; no hosted business records were generated.

- ESLint and TypeScript: passed.
- Unit tests: 29 passed.
- Disposable PostgreSQL/RLS assertions: 139 passed, including original Admin policies, driver isolation/lifecycle, assignment/handover, consent/nonce/rate/coordinate checks, passenger revocation, private Realtime message policies, Ops monitoring/audit and purge.
- Production Next.js build: passed.
- Desktop/mobile Chromium browser tests: 26 passed, using `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:browser`. The initial run had 22 browser-launch failures because the expected Playwright download was absent; the installed Chromium resolved that environment issue, with all tests subsequently passing.

Browser GPS tests exercise the production controller using Chromium's actual Geolocation API with an explicitly emulated device in an intercepted test-only harness. They do not verify a real driver's sensor, hosted Auth sessions or hosted Realtime. Local Realtime SQL uses a test shim and cannot certify the hosted broker or cron installation.

## 7. Remaining real-client configuration

Supply real application variables and a TLS Supabase database URI securely to this execution environment; Codespaces variables do not propagate here. No secrets belong in chat or Git. Confirm real Owner display name/authority, review actual existing membership and approve any required bootstrap separately. Configure HTTPS origin, Auth redirect allowlist, SMTP and invitation/recovery delivery. Confirm real driver memberships/profiles, licences, vehicles, route coordinates and legitimate assignments; do not seed invented records.

After read-only schema/user verification, separately approve any baseline recording and migration 008 with its exact reviewed hash and retention settings. Enable private Realtime and ensure pg_cron is available; the deployment tool refuses to commit without the worker. Use genuine authorized staging inputs to test writes. Production deployment remains separately approved.

## 8. Unverified hosted behavior

Hosted connectivity, existing schema/user/membership, Owner authorization, actual login/logout/recovery, invitations, driver lifecycle writes, RLS broker authorization, passenger revocation, retention worker and physical-device GPS remain unverified because usable credentials are absent here. The client-reported original seven migrations and confirmed user are not treated as verified observations. No hosted mutation, new account, role grant or deployment was performed. **Phase 2 production readiness: NO.**

## 9. Exact Phase 3 prerequisites

First complete the hosted checks above, approved schema rollout and real Owner/driver/passenger acceptance, including negative cross-tenant tests and stop/completion/reassignment GPS revocation on actual HTTPS phones. Then implement verified passenger identity/booking binding, guest account flow and business-approved booking rules using genuine fares. Stripe requires secure server configuration, signed idempotent webhooks and approved real test transactions. OpenAI concierge requires server-only configuration, read-only published Supabase grounding, abuse/cost controls and approved privacy/language behavior. Neither payment nor AI integration is claimed in this delivery. Client legal/retention approvals and a reviewed production release/rollback plan remain required.
