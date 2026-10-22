# HAMDI TOURISM — delivery gate

**Not ready for live client handover.** This is the current consolidated checklist;
older phase reports are historical. No production migration, email, Auth mutation,
worker activation, booking, charge or deployment was performed by this task.

## What is implemented and locally verified

- Admin `/admin`: server-enforced existing Owner binding, staff/driver invitations,
  vehicles, categories, customers, routes/fares, bookings/assignments, settings,
  reports and authorized tracking. Local tests check validation, business rules,
  RLS and conflict handling. Transport failures in record save/archive/search now
  return safe errors or failed notices, never claimed success. All login/Owner
  identity settings remain unchanged.
- Driver `/driver-account`: assigned-trip authorization, valid state transitions,
  availability, consent-based GPS, permission denial, withdrawal and stale/offline
  handling. Realtime/GPS provider and genuine-device acceptance remain unverified.
- Passenger `/passenger` and `/book`: confirmed-account gates, real-data quote and
  idempotent booking RPC integration, genuine booking details/history, cancellation
  requests and scoped tracking. Unpublished/unconfigured inventory or pricing stays
  unavailable. Profile/cancellation transport failures now report uncertainty safely.
- Groq concierge: English, Urdu, Roman Urdu and Arabic prompt/response fixtures,
  private booking projection, CAPTCHA, persistent quotas and bounded provider errors.
  Explicit model configuration is required; internal reasoning is never returned.
  **Live language, voice, CAPTCHA and provider acceptance remain unverified.**
- Brevo Owner delivery: only `Hamid.shah@mail.ru`, server-side API key/sender,
  strict verified booking payload, worker authentication, lease fencing, five-attempt
  bounded retries and stable deduplication keys. Existing passenger notices retain
  Resend. Brevo acceptance is not delivery evidence; no Brevo webhook is implemented.
- Approved cinematic black-car homepage, two-line branding, four category marketing
  visuals, responsive fleet and unavailable-booking safeguards are preserved.
  The accessible branch has a static composite hero and no playable engine asset.
  A new red-car/audio interaction is deferred; moving an independent car would need
  a separate approved asset/design and licensed recording. No replacement was made.

## Fresh hosted read-only findings

Management SQL returned `transaction_read_only=on` for the pinned project
`hzcupgjphowrzvrdffrf`; the existing HAMDI TOURISM organization matched.
The catalog exactly matches reviewed 001–009: 32 public tables, all nine ledger
versions present. The passenger outbox exists, is empty, has RLS, and its delivery
RPCs are service-only. Owner outbox/RPCs from 010/012 and unpriced enquiries from
011 are absent. No database cron command directly referencing the notification
worker/claim was found; external scheduler status cannot be inferred from that.
A separate read-only business-configuration check found no settings row for the
existing organization, Passenger bookings disabled, zero published vehicles and
zero published fares. Those are concrete live booking blockers, not missing
inventory to fill with fixtures. Only the authorized client may supply and approve
that operational configuration.

Backup and project-management metadata returned HTTP 403. This is not evidence of
no backups. No current archive/key or off-device retention evidence is available
here. The user-reported Codespace credentials and TLS success are not available
through this environment's GitHub integration; the PostgreSQL route here previously
failed at network access. No unchanged PostgreSQL retry was made.

## Recovery and migration release gate

1. Grant execution access to the existing Codespace where verified TLS works, or
   enable the approved PostgreSQL pooler route here. Do not paste credentials in
   chat. Securely configure recovery encryption/retention outside Git, create the
   current schema/data/roles archive and prove a complete isolated restore. The
   uploaded CA matches the pinned fingerprint; this alone is not a recovery point.
2. Pause all notification schedulers/workers. Confirm this on the actual serving
   host; the local disabled flag and absent matching database job are insufficient.
3. Recheck catalog/ledger and separately approve **010 then 012**, one transaction
   at a time. Do not replay 001–009. **011 is independent**, needed only for manual
   unpriced enquiry submission/review, and must not be bundled into email approval.
4. After 010, confirm table/trigger/RPCs/RLS/grants and no previously attempted
   queued/sending notices. After 012, confirm persistent `first_attempt_at`, one-minute
   leases/retries and ten-minute expiry. Do not invoke claim functions during a
   read-only preflight; those functions mutate the queue.
5. Coordinate the new worker with 012: old claim payloads fail closed in new code.
   If ambiguous old sends exist, reconcile provider evidence before cutover.
   Keep delivery disabled until a separate controlled-test approval.

Rollback: pause workers first. Restore the two captured pre-012 function definitions
and matching prior application only after provider reconciliation. Do not drop the
outbox or replay 010. Function rollback cannot unsend mail or recover contacts
already purged by normal processing; current recovery evidence is mandatory.
Never blindly switch providers or requeue uncertain sends.

## One prepared test email — no booking fixture

Run `npm run check:booking-email` in the actual serving environment. It is offline,
prints only safe checks and the draft, and has **no sending/database path**.
Configure private `BREVO_API_KEY`, `BREVO_SENDER_EMAIL=irumnaaz2020@gmail.com` and
an independent `NOTIFICATION_WORKER_SECRET` of at least 32 characters. Keep
`NOTIFICATION_EMAIL_ENABLED=false`. Sender verification is client-reported here.

- To: `Hamid.shah@mail.ru` only; no CC/BCC.
- Subject: **TEST — Not a Real Booking**
- Text: HAMDI TOURISM transactional email delivery test. This is not a booking,
  confirmation or passenger request. No booking or passenger data is included.
  Please confirm receipt privately.

Sending this single standalone test needs separate explicit approval; do not create
an outbox row or fake booking for it. After approval, confirm the provider message
ID and receipt in the real Mail.ru inbox/Brevo logs. A successful provider API call
is insufficient to call delivery verified. Testing this draft does not prove the
booking trigger; separately approve a genuine operational booking acceptance test.

## Client-controlled configuration and acceptance

- Owner privately signs in at `/login`, reaches `/admin`, refreshes and signs out.
  Verify protected access with each genuine role; no passwords are requested or reset.
- In Admin, enter actual contact/policies/business settings, genuine licensed fleet,
  locations/routes, capacity, availability and client-approved fares. Publish only
  approved records. Researched prices remain unpublished references/drafts.
- Complete one separately authorized genuine Passenger enquiry/quote/booking through
  Admin assignment and Driver lifecycle, including duplicate submission, conflicts,
  cancellation review, privacy and denial of unrelated users.
- Test GPS on consenting actual phones over HTTPS: permit/deny, start/stop, stale GPS,
  reassignment and trip completion. Verify passenger/Admin see only permitted fixes.
- Run live Groq checks with the account's configured model and browser CAPTCHA in
  Codespaces; review native Urdu/Arabic and Roman Urdu quality privately. Keep public
  concierge disabled until approved acceptance, including voice fallback/mute/stop.
- Select authorized hosting, domain and support owner. Configure server-only bindings,
  exact HTTPS origin and matching Supabase Auth callback/confirmation/recovery URLs,
  SMTP and Turnstile hostname. Never put the database administrator URL in the web
  application's public environment. Deployment requires separate approval.
- After approved deployment, verify the real public URL, all role routes, security
  headers, logs without personal data, scheduler authentication, failed notifications,
  provider quota, GPS retention and encrypted backup/restore cadence. Document who
  monitors incidents and how the client reaches support. No live URL is verified here.

## Reproducible local checks

`npm run typecheck`, `npm run lint`, `npm test`, `npm run test:db`,
`npm run test:repair`, `npm run build`, and `npm run test:browser`.
The database suites use disposable fixtures only; browser suites disable provider
flags and clear keys before build/runtime. Mock accounts and emulated GPS/voice
are not live acceptance. `check:booking-email` being BLOCKED here is an expected
configuration result, not a failing application test.

Final local verification for this pass: **111 unit tests; 223 disposable SQL/RLS
assertions in both database suites; 82 desktop/mobile browser tests; TypeScript,
ESLint and production build all PASS**. Fleet captures were visually inspected on
desktop and mobile. Generated screenshots were not included as code changes.
No authenticated real-account or real-provider success is claimed by these tests.
