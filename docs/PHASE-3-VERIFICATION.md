# Phase 3 verification

**Production readiness: NO.** This is implemented application/integration code with local verification. No hosted schema, real account, provider payment, email delivery or actual model response has been verified in this environment. No hosted migrations, Owner assignments, accounts, bookings, payments, messages or deployment were executed.

## 1. Passenger functionality

`/passenger/register`, `/passenger/login` and passenger password recovery reuse Supabase Auth and session cookies. Registration is opt-in and requires a Turnstile widget, a matching password of at least twelve characters and verified email before any passenger profile or booking RPC. Enable Supabase email confirmation and its Turnstile CAPTCHA integration before enabling registration. Registration confirmation pages never claim an active account. Signup/email OTP and PKCE callbacks accept fixed local passenger destinations; invite/recovery handling is preserved. Passenger pages refresh sessions and redirect anonymous requests through the existing trusted-origin proxy. Staff accounts remain staff/driver accounts and cannot use passenger RPCs to acquire another role.

The passenger dashboard offers genuine profile editing, upcoming/active and completed/cancelled journeys, paginated history, event notices, logout and scoped booking detail pages. Profiles derive email exclusively from the verified Auth account. A profile is created from the customer's own submitted real name/phone; there are no default accounts or operational seeds. Historical customers/bookings are never claimed by matching a name, email, reference or UUID.

Guest booking has **not** been enabled without a client-approved identity policy. The implemented path requires a verified account. Unverified accounts cannot submit bookings or view GPS. Existing public enquiries remain available only when their genuine configuration and CAPTCHA are ready; they are not silently promoted into reservations or claimed by email matching.

## 2. Booking and pricing integration

`/book` reads published Supabase locations and fleet, accepts future UAE pickup/return times, passengers/luggage, flight number and genuine optional extras, and presents quote/review/request controls. It uses the saved passenger profile for real contact information; terminal, instructions and accessibility needs go to the booking notes for dispatcher review. Additional stops are not accepted as priced journeys without approved pricing support. Vehicle descriptions/images/capacities are actual published records. Exact availability and assigned vehicle are explicitly pending dispatch.

Owner booking enablement, genuine route durations, privacy/terms and published booking/cancellation policies are managed at `/admin/passenger-platform`, linked from Business Settings. No durations, policies or routes are invented. Missing configuration produces a useful enquiry fallback. Booking policies must be published before online booking is usable.

`passenger_quote` uses the existing fare RPC, real category/route charges and selected extras, validates capacity and configured minimum notice, and saves a ten-minute server-side quote. Creation rechecks current pricing, publication, policies, route durations and vehicle suitability under locks. Browser totals are ignored. A passenger-generated UUID protects retries; return legs are inserted atomically in deterministic pickup order. New bookings remain **pending**, with genuine generated references, existing audit/history triggers, no driver/vehicle assignment and an explicit vehicle preference. Admin confirmation uses the existing dispatch/scheduling rules; assigned confirmed trips flow to the existing Driver Portal.

Cancellation is a reasoned **request**. Operations can mark it reviewed and use existing authorized booking transitions; neither a request nor review silently cancels/refunds. Booking details display immutable policy/quote context and actual history.

## 3. Stripe architecture and configuration

Server-side checkout requires the authenticated mapped passenger, a confirmed genuine booking, an unpaid verified ledger and a positive server-calculated AED amount. `payment_reserve` serializes one payment attempt per booking. Session creation uses a stable idempotency key and stable one-hour expiry; repeat calls reuse the existing open session. Booking amount/customer identity cannot change after a payment attempt is recorded. Expired/failed checkout or mismatches require operations reconciliation rather than an automatic second charge. No automatic refund API exists.

`/api/payments/webhook` verifies the exact raw body's Stripe signature and timestamp, retrieves the actual session/intent/charge, and verifies amount, AED currency, association and paid status before submitting normalized evidence through service-only RPCs. Async failures never create revenue. Unpaid completion redirects/events do not mark paid. Event IDs deduplicate processing; charge identity deduplicates credits, and cumulative refund amounts generate only positive new refund deltas, handling duplicate/out-of-order evidence. Refund events are provider evidence, not application-issued refunds. Passenger and Admin payment displays use the existing `verified_payments` ledger; the legacy manually inaccessible `bookings.payment_status` column is not used as payment proof or rewritten to bypass its safety trigger.

Secrets are server-only. Live `sk_live_` keys are rejected unless `STRIPE_LIVE_PAYMENTS_APPROVED=true`; keep this false until merchant eligibility, policies and explicit real-charge approval are confirmed. Provider credentials are absent. Signature tests use local synthetic fixtures and make no Stripe API calls or charges. Real checkout/webhook/reconciliation testing remains pending. A crash before session attachment or a provider reconciliation failure requires retry/merchant review; no redirect alone resolves it.

## 4. AI Travel Concierge

The existing homepage has a multilingual widget with English, Arabic, Urdu and Hindi selection, RTL question/answer presentation and human-support link. Booking detail pages can pass their one booking UUID for authenticated status assistance. `/api/concierge` calls OpenAI Responses only server-side, with a server-selected model, no mutation tools, bounded request/context/output, timeout, `store:false` and safe unavailable fallback.

The fixed `concierge_context` RPC supplies only published business/fleet/destination/fare information. Authenticated status context comes from the same ownership-enforcing booking-detail RPC and is projected to reference, status/time, verified ledger amounts and recorded flight status. Passenger contacts, instructions and GPS are excluded. Untrusted questions/record strings are treated as data; clients cannot supply SQL/tools/alternate user identity/model. The system prompt forbids fabricated fares, availability, confirmations, refunds, flight status and ETA, and directs binding quotes to the validated booking form.

Anonymous use requires a server-verified single-use Turnstile challenge and same-origin request. Persistent Supabase usage buckets enforce ten requests/hour for an authenticated subject and a shared two-hundred/hour business ceiling. Anonymous CAPTCHA tokens are pseudonymous buckets, not durable visitor identities; the global ceiling limits resets. HMAC secret protects stored identifiers, and usage stores no prompt/contact/GPS trail. Usage is removed after forty-eight hours on subsequent requests. Configure provider spending limits and review model/provider privacy retention separately.

OpenAI credentials/model are absent: no genuine model answer, multilingual accuracy or model-level prompt-injection resistance is claimed. Local tests validate structural authorization, projection and no-tool boundaries; adversarial provider/model acceptance remains required. Approved FAQs can be expressed in existing published business descriptions/policies; no unapproved business policy is generated by the application.

## 5. GPS integration

Verified account bookings automatically receive Phase 2 tracking scope from their immutable booking relationship, active profile and current Auth state, not from an email lookup. Scope is limited to confirmed/in-progress unarchived trips and expires two hours after the planned end. Client must approve this overrun limit. Legacy explicitly Owner-granted passenger tracking remains supported. Cancellation/completion and driver reassignment retain Phase 2 GPS erasure and consent revocation. Driver accounts cannot obtain passenger scope.

Booking detail reuses the actual private Realtime notification → authorized snapshot → Leaflet implementation. It shows received location/time/accuracy and actual stages, with stale/disconnected/no-GPS states, no fabricated movement or ETA. The existing driver consent/start/stop/background restrictions and retention worker are unchanged. Hosted private subscriptions, physical GPS and actual revocation remain unverified.

## 6. Database migrations and hosted status

New additive `202610120009_passenger_platform.sql` adds passenger profiles/booking ownership, route and policy settings, immutable quote context/idempotency, cancellation requests, payment attempt/event tracking, notification outbox/delivery evidence, and AI usage metadata. Private tables use RLS and explicit RPC grants; no direct passenger mutation of bookings/customers/payments/location records is granted. Operations payment/cancellation reads stay organization/role-scoped.

Original 001–008, the old driver proposal and the original seven/eight reference catalogs are unchanged. Migration 009 was applied only to disposable local PostgreSQL. The separate `schema-reference-passenger.json` records nine migrations. `npm run db:passenger-migration` is a read-only plan; apply requires the exact reviewed project-plus-migration-hash approval, verified eight-migration catalog/history, real active confirmed Owner and existing tracking retention job. Only 009 executes in a transaction with post-schema audit and ledger recording. The guarded migration-008 workflow remains separately approved and is **not automatically run**.

Use `npm run db:audit -- --with-passenger` after an approved nine-migration rollout. GitHub workflow supports explicit audit-driver/audit-passenger and passenger-plan/passenger-apply choices after the workflow reaches the default branch. An empty historical migration ledger is not authority to replay SQL. Hosted schema/user/organization state is still unknown; the client-reported original seven migrations are not a verified catalog observation.

## 7. Security and permissions evidence

Disposable PostgreSQL tests cover verified/unverified accounts, staff/driver separation, direct-table denial, own versus other account/organization access, profile disablement, UUID guessing, server quote/capacity checks, policy acknowledgement, fare manipulation, quote expiration/price changes, deterministic/idempotent atomic return booking, cancellation request/review, automatic tracking and terminal revocation, trusted-only payment evidence, amount mismatch, duplicate events/cumulative refunds, outbox leasing/stale-worker denial, delivery evidence, AI privacy/context/rate limits. Existing Admin/Driver/GPS regression assertions are retained.

Provider endpoints bound streamed raw bytes before allocation and never log credentials, prompts, passenger contacts, payment payloads or GPS. Stripe and email webhooks require provider signatures; notification worker requires a constant-time secret comparison and explicit enablement. Private passenger/tracking responses are no-store/no-referrer; geolocation remains allowed only on the Driver route. No live service-role secret is used in browser code or committed files.

Notification architecture uses idempotent event keys and a leased outbox with five attempts, retry spacing and provider idempotency keys. The optional Resend adapter reports **accepted** after a successful API response, and **delivered** only after a signature-verified delivery webhook. Unknown evidence requires provider retry. Email remains disabled; Resend/provider choice, verified sending domain and real sending approval are external prerequisites. A protected scheduler must POST `/api/notifications/run`; no external workflow automation platform is added. Failed/expired checkout and permanently failed delivery require operations review, not fabricated completion.

## 8. Automated results

Checks completed on 2026-10-13:

- `npm install`: completed; Stripe/Svix adapters added and lockfile updated.
- ESLint: passed with no warnings.
- TypeScript: passed.
- Production Next.js build: passed.
- Unit tests: **42 passed**, including existing regressions, passenger validation, streamed body limits, local provider signature/tamper/expiry checks and privacy projections.
- Disposable PostgreSQL/RLS: **195 assertions passed** (original 139 plus 56 passenger/provider/outbox/privacy checks).
- Desktop/mobile Chromium: **32 passed** using the installed Chromium via `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium`.
- Supabase connection check: **blocked at configuration** — missing/invalid public variables; no hosted checks ran. Database/provider variables are not injected into this execution environment.

Initial browser runs exposed a test-harness JSX error, stale navigation expectation and streamed passenger redirect; these were corrected and subsequent checks passed. A nondeterministic return-leg ordering discovered during payment assertions was fixed in the booking RPC, with database assertions subsequently passing.

Fixtures exist only in disposable databases, local cryptographic tests and an intercepted browser component harness. No hosted customer, driver, booking, fare, revenue, GPS, account, charge or message was generated.

Browser booking interaction tests render the actual production component with test-only action adapters in an intercepted route. They check input retention, quote invalidation and pending-request wording; they do **not** certify hosted signup/booking/payment success. Other browser checks exercise the actual running unconfigured website and unavailable provider endpoints. Existing GPS tests use explicitly emulated device coordinates, not physical sensors.

## 9. Remaining external setup

Securely inject real Supabase application credentials, the correct TLS database URI and organization identifier into this execution environment; Codespaces secrets are separate. Confirm actual schema/confirmed Auth user/memberships read-only, obtain real Owner identity/authority and separately approve any required bootstrap/baseline. Review and separately approve migrations 008 and 009 with their exact hashes and retention policies; no manual SQL copying is required with the guarded scripts.

Provide genuine published fleet/capacity/images, locations/routes, route durations, fares/extras, cancellation/booking/terms/privacy policies and minimum-notice rules. Approve account registration, configure Supabase email confirmation, Turnstile CAPTCHA, SMTP/rate limits and exact HTTPS Auth callback origins. Enable `PASSENGER_AUTH_ENABLED` only after these checks; verify real registration, verification/recovery, logout and cookie refresh. Anonymous guest booking/access remains disabled pending a separate approved identity flow.

For Stripe: securely configure test merchant/API/webhook, verify UAE merchant eligibility, stage actual signed events and reconciliation, then separately authorize live-mode flag and any real charge. For OpenAI: set a permitted model/key, HMAC rate secret, budget limits and privacy/language acceptance. For notifications: approve Resend or adapt the isolated provider module to the client's approved provider, verify domain/key/Svix webhook, configure protected scheduler and only then enable real sending. Do not post keys/passwords in chat or Git.

## 10. Final production acceptance checklist

- [ ] Read-only hosted catalog, project identity, real Auth user and actual Owner/membership verified.
- [ ] Client Owner authorization and each required permission/schema/baseline mutation approved and recorded.
- [ ] Approved 008 then 009 applied once; nine-migration audit passes, active GPS retention job verified.
- [ ] Genuine configuration published; empty businesses show honest unavailable/empty states.
- [ ] Real passenger registration/email verification/login/recovery/logout/session tested on exact HTTPS origin.
- [ ] Two real authorized test accounts verify cross-account/cross-tenant denials; no guessed IDs grant access.
- [ ] Genuine client-approved one-way/return requests, expired/changed quotes, capacity and duplicate submissions accepted/rejected correctly; Admin review/dispatch and Driver lifecycle verified.
- [ ] Real passenger privacy, consent, GPS stop/reassignment/end/stale/background behavior verified on physical phones and hosted private Realtime.
- [ ] Stripe test-mode checkout/signature/retry/duplicate/async/refund/reconciliation accepted; merchant eligibility and explicit live-charge authorization obtained before live mode.
- [ ] Real model tested in four languages against missing facts and adversarial prompts; authorized booking projection/privacy/budget controls accepted.
- [ ] Approved notification provider/scheduler retry/duplicate/bounce/delivery evidence tested without unauthorized customer sends.
- [ ] Client legal/retention/provider-processing requirements reviewed, including backups, account deletion/retention and anonymous guest policy.
- [ ] Hosting/secrets/origin/security and rollback/monitoring reviewed; exact release receives separate deployment approval and live smoke test.
