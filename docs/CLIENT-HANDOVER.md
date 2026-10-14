# HAMDI TOURISM — client handover

Last reviewed: 14 October 2026. Client: Hamid Shah.

**Release decision: NOT ready for operational client handover or production launch.**
The website can be demonstrated privately. No successful real Owner, Driver or
Passenger password login was verified. No production deployment was performed.

## What changed in this completion pass

- Fixed a genuine browser blocker: the global Permissions-Policy disabled the
  microphone. It now allows same-origin microphone access, subject to browser
  permission and the existing explicit voice controls. Camera remains disabled;
  geolocation remains disabled except on the Driver route. This does not enable
  AI, upload audio or automatically grant microphone permission.
- Passenger login now recognizes an already authenticated, confirmed session and
  redirects to its actual role's portal. Recovery mode stays accessible. Membership
  query failures deny access instead of assuming a Passenger role.
- The read-only Owner session checker now requires confirmed email and the same
  approved user/organization binding as Admin server authorization. A random active
  Owner membership no longer passes the application acceptance check.
- Added `npm run check:handover`: a local read-only, secret-safe configuration and
  migration-file-integrity report. Missing core configuration returns exit 1.
  Optional providers are shown disabled; even all configuration present never
  certifies production readiness without external acceptance tests.
- Preserved the approved cinematic scene, headline, four original studio marketing
  visuals, sound controls, existing dashboards, real booking/GPS architecture and
  concise multilingual concierge. The new studio visuals are original AI-assisted
  marketing visualizations, not photographs of the client's actual fleet. Their
  provenance is retained; they never establish inventory, makes or availability.

## Actual hosted findings

A fresh `npm run check:hosted` audit used existing secure bindings to project
`hzcupgjphowrzvrdffrf`. It performed only read-only SQL attempts and HTTPS reads.
No credentials were displayed or committed.

- Public Supabase URL/key and server key passed structural checks; Auth is reachable.
- Known Auth UUID `988e629b-6770-4b93-b9ba-7c1bce325680` exists and is email-confirmed.
  This is not proof that it belongs to Hamid Shah. No staff membership was found.
- The organizations API returned an empty list. `HAMDI_ORGANIZATION_ID` and
  `HAMDI_OWNER_USER_ID` are absent. No organization or Owner was created.
- PostgreSQL connection failed at the network stage. The stored connection binding
  exists; do not assume a wrong password or request another password reset.
  No callable authorized SQL/Supabase integration was available as an alternative.
- REST exposes 17 recognized baseline tables, including `verified_payments`.
  The fifteen 008–009 tables remain not installed **or not exposed**. Direct catalog,
  constraints, functions, RLS, migration ledger and Realtime configuration cannot
  be certified from an OpenAPI listing. Missing migration history is never treated
  as an empty database.
- Public Auth registration is enabled while application Passenger registration is
  disabled. Review hosted signup/CAPTCHA/rate-limit policy before opening registration.
  SMTP, exact callback allowlist, password policy and delivery remain unverified.
- The reported password 401 is not reproduced with an authorized account. No genuine
  password/session was available. Missing authorization is a proven additional
  blocker, not proof of what caused that particular Auth rejection.

## Routes and operational status

| Feature           | Existing route / implementation                                                               | What was actually verified                                                                   |
| ----------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Client Owner      | `/login` → `/admin`; confirmed session, active Owner, approved UUID and organization required | Local dispatch/identity gates and anonymous blocking; real login not tested                  |
| Driver            | `/login` or `/passenger/login` → `/driver-account`                                            | Assigned-trip RPC/status/GPS code and local tests; hosted driver login/trips not tested      |
| Passenger         | `/passenger/login` or `/login` → `/passenger`                                                 | Private booking/profile RPC code and local tests; hosted signup/login/history not tested     |
| Booking           | `/book`, `/passenger/bookings/[id]`; actual published inventory/route/quote/ownership RPCs    | Local validation/workflow and SQL isolation tests; no hosted booking submitted               |
| Tracking          | `/track/[id]`, Driver sharing and `/admin/operations`                                         | Local consent/revocation/privacy and map code; no real device or authorized live trip tested |
| Route / ETA       | `/api/tracking/route`; server-only OpenRouteService adapter                                   | Local freshness/access/provider validation; ORS key absent, no live estimate verified        |
| Concierge         | `/api/concierge`; published Supabase context and restricted booking projection                | Local UI/voice/unavailable states; AI key absent, live AI not verified                       |
| Payments / emails | Existing Stripe / Resend adapters                                                             | Disabled/missing keys; no charge or message created                                          |

Driver uses authenticated assigned-trip/profile/history RPCs; Passenger uses
personal profile/bookings/notifications/detail RPCs. Empty results and query errors
are distinct. Admin uses actual operational queries and summary RPCs. No dashboard
was simulated for client access, and no operational seed data was created.

## Owner bootstrap: concrete plan, NOT executed

1. Client verifies that the existing UUID belongs to Hamid Shah and explicitly
   authorizes the Owner role. An email or supplied display name alone is insufficient.
2. Restore PostgreSQL protocol connectivity from a trusted authorized execution
   environment to the existing guarded `SUPABASE_DB_URL`. The current Codex network
   transport is the blocker; the secret already exists. Do not copy SQL manually.
3. Run the existing read-only catalog audit and `db:owner` dry-run. Confirm actual
   tables, existing users, memberships and organizations again immediately before
   any proposed mutation. Preserve existing data; never replay 001–007 blindly.
4. Present the result for explicit approval. Only if the live organization count is
   still zero and the verified user has no membership, the existing bootstrap script
   would create **one** HAMDI TOURISM organization and **one** active Owner membership
   attached to that existing Auth UUID, in a guarded transaction with rollback.
   It does not create an Auth account, password, customer, driver, vehicle or booking.
   Existing business/membership conflicts cause refusal, not a duplicate or promotion.
5. After that approved execution, securely set the returned organization UUID and
   explicitly approved Owner UUID in the website runtime. Never place server secrets
   in public environment bindings or client code.
6. Compare the catalog with reviewed migration references before proposing 008,
   then 009. Existing migration scripts require explicit project/hash approval and
   verify expected schema state; they are not run automatically by the app.

The Admin application gate is restricted to the approved client identity. Existing
SQL retains a delegated-staff model. Direct API/RLS exclusivity to a single client
must also be reviewed/hardened through separately approved SQL after catalog access
is restored. `supabase/proposals/client-owner-lock.sql` is review-only and unapplied;
it addresses role changes and is not by itself a full single-client RLS policy.

## Client checklist after approved setup

- Verify Owner login, refresh and logout using the password only on the real HTTPS
  website. Confirm anonymous, Passenger and Driver accounts cannot open Admin.
- Configure real contact details, support, policies, capacity/luggage information,
  routes, fares and published approved fleet records. Do not enable confirmed booking
  while these are absent. The existing booking-unavailable state is intentional.
- Invite actual drivers through the authorized Owner workflow. Confirm their email,
  active membership, associated driver profile and assignments. Verify a real Driver
  sees only their own trips and allowed trip transitions.
- Configure exact HTTPS callback URLs, SMTP, CAPTCHA and signup abuse controls.
  Use a legitimate authorized Passenger account to verify confirmation, recovery,
  own-booking visibility and other-passenger isolation.
- Obtain approval before operational booking mutations, emails or payment acceptance.
  Prefer an explicitly authorized staging environment for full end-to-end acceptance.
- Verify consent-based GPS on actual phones during an authorized assigned trip:
  timestamps, fresh/stale state, passenger access, end/withdrawal revocation and Owner
  monitoring. Enable routing only with approved provider credentials/privacy/quotas.
- Configure AI/model and spending limits only if desired; test grounded business
  answers and authorized booking projection in all four languages. Voice depends
  on browser support and permission; it is not guaranteed by a passing mock test.

## Production deployment

No verified deployment target/domain or deployment credentials/integration were
available. `NEXT_PUBLIC_SITE_URL` being configured is not proof of a live deployment.
No public production URL is claimed. No merge or deployment was performed.

Required before deployment: choose/authorize the actual Next.js-compatible target
and domain; configure secure runtime/build variables there; finish hosted database,
identity, policies and acceptance; set the exact HTTPS Supabase Site URL/callbacks
and CAPTCHA hostname; build with the target public variables; run deployed HTTPS
role/login/session/booking smoke tests. Optional payment/AI/routing services stay
explicitly disabled until approved/configured/tested. CI already runs lint,
TypeScript, unit, disposable SQL, build and browser checks; no pipeline applies hosted
migrations automatically.

## Private Codespaces preview

This Codex machine is separate from your Codespace. No Codespace name or forwarding
connection is available here, so an exact working private preview URL cannot be
invented or opened remotely.

In the **existing** Codespace on `feat/hamdi-tourism-application`:

1. Preserve any local edits, then fast-forward the branch from GitHub. If Git reports
   local conflicts, stop and preserve them; do not reset or overwrite secret files.
2. Run `npm run dev` in the repository. It listens on port 3000. Existing Codespaces
   secure environment bindings remain separate from Codex and must be present there.
3. Open **Ports → 3000 → Open in Browser**, leaving port visibility **Private**.
   This opens the actual interactive website. Codespaces is a development preview,
   not production. Keep the exact preview callback origin allowed in Supabase for
   confirmation/recovery; normal password login still needs the real account setup.

## Test results

Final counts and outcomes are recorded after the current run below. Local mock
accounts/fixtures are confined to tests and disposable databases and were never
inserted into hosted Supabase. Tests do not substitute for real credential login.

Final results: **67 unit tests passed; 54 desktop/mobile browser tests passed;
195 assertions passed against a disposable local PostgreSQL database**. ESLint,
TypeScript and `npm run build` passed. The browser tests include real HTTP
Permissions-Policy assertions and private-route checks, plus isolated browser GPS,
voice and booking fixtures. No test inserted hosted records or used a real password.
The final production build's 44 browser JavaScript chunks were checked for the
configured service-role key and PostgreSQL URL: neither secret value was present.
This does not certify third-party providers or real account acceptance.

`npm run check:handover` correctly returned exit 1 for missing organization and
approved Owner bindings. `npm run check:hosted` reported incomplete verification
because PostgreSQL transport failed, while read-only HTTPS checks succeeded. Those
are release blockers, not passing integration results.

Configured development runtime smoke checks returned HTTP 200 for `/`, `/login`
and `/passenger/login`; anonymous `/admin`, `/driver-account` and `/passenger`
returned private/no-store HTTP 303 redirects. The homepage served the corrected
microphone policy. This proves route behavior, not authenticated account access.
