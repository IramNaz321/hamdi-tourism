# Passenger, Driver, booking and tracking follow-up

Reviewed 14 October 2026. Owner identity/authorization is explicitly unconfirmed.
No organization was created and no membership, hosted record, migration, permission,
email, payment or GPS record was changed in this run.

## Implemented defects, independent of Owner activation

1. **Confirmed Passenger login loop:** `requirePassenger` formerly redirected every
   passenger back to login when `HAMDI_ORGANIZATION_ID` was missing. Login recognized
   the session and redirected back to `/passenger`. Authentication is now checked
   independently of business configuration. A confirmed, non-staff account can load
   its authenticated dashboard with an honest service-unavailable state, Contact and
   Sign out. It does not query an unconfigured business, fabricate booking history
   or claim a reservation. Profile saves and quote creation refuse missing business
   configuration before calling a business RPC. Existing booking-detail/payment/status
   RPCs still enforce actual authenticated ownership; no RLS bypass was introduced.
2. **CAPTCHA-protected login/recovery:** staff/Driver and Passenger login/recovery
   forms previously did not send CAPTCHA tokens to Supabase, making them incompatible
   with a project requiring CAPTCHA on those Auth requests. When the existing public
   Turnstile key is configured, those forms now collect a token, require it before
   submission, forward it through the Supabase Auth options and reset the widget/token
   after a returned failure. Tokens are bounded and passed once to Supabase; they are
   not consumed by a separate local verification first. Signup keeps its existing
   provider token flow. This is a code-side compatibility fix, **not proof that CAPTCHA
   caused the previously reported 401**. Hosted provider secret/site-key matching,
   challenge policy and actual browser acceptance are not verified here.
3. **Driver/staff invitation transport failure:** returned Auth errors already
   attempted to revoke reserved access, but thrown network failures skipped cleanup.
   Both paths now use one helper which attempts revocation after either failure and
   explicitly reports when cleanup cannot be confirmed. Successful delivery retains
   the reservation. The existing Owner guard, real driver lookup, reservation RPC and
   non-Owner role restrictions remain unchanged. No invitation was sent in this run.
4. Passenger recovery trims email consistently; CAPTCHA-specific rejection requests
   a fresh challenge without displaying raw provider errors or credentials.

## Existing workflows preserved

- `/driver-account`: confirmed Auth session and active Driver membership, actual
  assigned-trip/profile/history RPCs, permitted trip transitions and consent-based GPS.
- `/passenger`: confirmed Auth session, actual profile/bookings/notifications once
  business configuration exists; booking detail/status/driver/tracking remain scoped
  by protected RPCs. `/passenger/login` and `/login` dispatch actual active roles.
- `/admin`: still denied unless the explicitly approved identity, actual active Owner
  membership and matching organization are present. No developer backdoor or default
  password exists. Invitations remain an authorized business operation, not public
  Driver self-approval. Existing registered accounts are not silently promoted.
- `/book`: actual published inventory/routes/fares/policies and validated quotes are
  required. Existing idempotency, booking ownership and trip-status database logic is
  retained. Real booking availability remains unavailable, not simulated.
- `/track/[id]`, Driver sharing, Owner monitoring: actual GPS consent, access revocation,
  freshness and private Realtime/RPC architecture retained. Road distance/ETA requires
  approved ORS configuration and valid fresh GPS; missing data remains unavailable.
- Cinematic hero, fleet marketing visuals, engine sound, maps and multilingual text/
  voice concierge are preserved. No design rebuild was performed.

## Fresh read-only hosted audit

The existing secure bindings still identify project `hzcupgjphowrzvrdffrf`. Auth API
is reachable; the known account is confirmed but has no staff membership. Organizations
remain empty. The account's identity as Hamid Shah is not established.

PostgreSQL connection again failed at the network stage. The binding exists; this is
not a proven password failure. No authorized SQL integration is available as an
alternative. Seventeen original tables are exposed through REST; the fifteen added
008–009 tables are not installed **or not exposed**. Direct catalog/RLS/function/
Realtime/migration-ledger verification remains unavailable. No migrations were replayed.

The reviewed nine migration files and guarded scripts remain unchanged. After network
access is restored, the existing read-only catalog comparison must precede any exact
missing-migration proposal and explicit approval. The client need not copy SQL.
Existing SQL delegation and single-client Owner hardening remain release blockers
as documented in CLIENT-HANDOVER.md; the application restriction alone does not change
hosted database privileges.

## External blockers, distinct from code completion

- No legitimate Passenger/Driver password or genuine authorized session is available
  in this environment: **no real-account registration/login/logout/recovery test was
  executed**. No test account was created; no password was requested in chat.
- Real organization configuration and published business fleet/routes/fares/policies
  are missing. Missing organization no longer causes the confirmed Passenger loop,
  but cannot enable operational profile/quote/history services without actual setup.
- Driver invitations/approval require an authorized Owner and verified email delivery.
  Existing active authorized drivers are not gated on the Owner environment binding.
- PostgreSQL transport and hosted 008–009 compatibility must be verified before Driver/
  Passenger database functionality can be certified.
- SMTP/callback allowlist, CAPTCHA provider policy and real confirmation/recovery
  delivery remain unverified. Do not enable signup merely to pass a UI demonstration.
- No real device, authorized assigned trip or ORS key is available for live GPS/ETA
  acceptance. AI, payment and notification credentials are also absent/disabled.
- No verified deployment target/domain, credentials or deployment integration is
  available. No production deployment was attempted or claimed.

## Deployment and handover

The existing CI and production build remain the preparation path. `npm run
check:handover` is a local secret-safe configuration/migration-integrity gate; missing
bindings intentionally return exit 1. It never applies hosted SQL. Secure configuration,
actual business data and explicit deployment authorization are prerequisites to launch.

Private Codespaces demonstration: preserve local edits, safely sync
`feat/hamdi-tourism-application`, run `npm run dev`, then use **Ports → 3000 → Open in
Browser**, leaving visibility **Private**. No Codespace forwarding connection/name
exists in this Codex environment, so no exact private preview URL can be verified here.
Do not treat that development preview as production.

Final current-run test outcomes are recorded below after completion. Local tests use
isolated fixtures and disposable PostgreSQL; they never seed hosted operational data.

## Completed test outcomes

- 74 unit tests passed, including missing-business authentication/dashboard regression,
  invitation compensation on returned/thrown failures, bounded CAPTCHA options and
  existing login/Owner/booking/tracking validation.
- All 54 existing desktop/mobile browser tests passed; 2 added CAPTCHA form-browser
  tests also passed. The added tests render actual Staff/Passenger form components
  against explicit offline action/challenge fixtures and verify submission gating,
  token forwarding and reset after failure. They do not contact Supabase/Turnstile.
- 195 disposable local PostgreSQL assertions passed. Hosted records were untouched.
- `check:handover` intentionally returns exit 1 for absent organization/approved Owner
  bindings. `check:hosted` remains incomplete due to PostgreSQL network transport.

Auth CAPTCHA setup: the application's public Turnstile site key and the CAPTCHA
provider/secret configured in **Supabase Authentication → Attack Protection** must
belong to the same approved provider setup. Exact dashboard labels may differ.
`TURNSTILE_SECRET_KEY` in the app remains for its separate enquiry/concierge checks;
it does not configure Supabase Auth's provider secret. Do not verify the same
single-use Auth token twice. Public-variable changes require rebuilding the website.
No provider settings were changed by this task.

Final production build, ESLint and TypeScript passed. A local `npm run start`
production-server smoke check returned HTTP 200 for `/`, `/login`,
`/passenger/login`, `/passenger/register`; anonymous `/admin`, `/driver-account`
and `/passenger` returned HTTP 303. Registration rendering does not mean signup
is enabled. No password was submitted. All 44 production browser JavaScript chunks
were checked; neither configured service-role key nor database URL was present.
This local server check is not a public production deployment.
