# Hamdi Tourism — final launch report

October 13, 2026. Existing feature branch, PR #1. **Production readiness: NO.** The design is suitable for client review; the business platform must not be offered for live operational use yet.

## Completed code and design

Existing Next.js 16 Admin, Driver and Passenger functionality is preserved: role-protected management, genuine fare validation, atomic pending one-way/return bookings, driver lifecycle/audit, private consent-based GPS, scoped passenger history/cancellation/tracking, signed Stripe ledger processing, multilingual read-only OpenAI concierge and notification outbox/delivery evidence. No operational data was fabricated or seeded.

Midnight Luxury defaults now use charcoal `#111827`, champagne `#C5A46D`, ivory `#F8F6F1` and white. Navigation, hero typography, controls, panels, forms, status notices and maps share the theme; owner-saved runtime colors still override defaults. Gold buttons use dark text for contrast. Forms/touch targets are mobile-friendly, font sizing avoids iOS focus zoom, RTL table foundations remain, and desktop/mobile checks include 320px overflow.

The original car is now a red coupe-SUV illustration with user-triggered V8-style synthesized firing harmonics/exhaust texture, subtle rev animation, persistent mute, keyboard operation and reduced motion. It remains present even with a real published hero image. There is no autoplay or microphone capture. No licensed genuine BMW recording was available; the sound is expressly an approximation and the illustration is not an authentic BMW photograph, endorsement or actual fleet record. Physical iOS/Android audio quality still requires acceptance.

Added an explicit `OPENAI_CONCIERGE_ENABLED=false` default. A key alone cannot activate real AI usage. Existing live Stripe and real email enablement gates remain. GPS waiting messages are clearer; original private-channel/refetch authorization, expiry, consent and retention rules remain unchanged.

Browser checks now build separately into `.next-test` with all Supabase/provider credentials removed, preventing regression tests from writing to the real project or incurring provider usage. The actual production build remains `.next`. Generated output is excluded from Git/ESLint. Actual desktop/mobile PNGs were regenerated, decoded and visually opened; see [Preview](PREVIEW.md).

## Real hosted verification results

Newly published bindings are present and structurally valid. Initial native Node fetch ignored the supported HTTPS proxy; enabling Node 24's `--use-env-proxy` fixed API connectivity while retaining certificate verification. Runtime startup and read-only preflight scripts now use this supported flag.

Read-only requests to **`hzcupgjphowrzvrdffrf`** actually established:

- Public Supabase Auth endpoint is reachable and accepts the configured publishable key.
- Email confirmation is required according to public Auth settings.
- Hosted public signup is enabled, while application passenger signup is disabled: review required; no Auth setting was changed.
- Auth user **`988e629b-6770-4b93-b9ba-7c1bce325680` exists and is email-confirmed**, via the authorized Auth Admin GET endpoint. This is not Owner authorization or a tested login.
- That account has **no staff membership**.
- Authorized `organizations` read returned **no organizations**. There is no real organization UUID to configure yet; none was invented.
- Service-authorized API schema exposes **17 recognized public tables**, matching the original seven-migration table names, including `verified_payments`. This is API exposure evidence, not a full SQL catalog match.
- Anonymous operational reads of drivers, vehicles, bookings, customers, staff and business settings were denied.
- Driver GPS/passenger/profile/quote/payment-attempt/outbox tables from 008–009 are not exposed through the API. Full installation/partial drift still needs PostgreSQL inspection.

**Still unverified:** PostgreSQL constraints/indexes/triggers/function definitions/RLS catalogs, actual migration-history schema, cron job, private Realtime broker, authenticated role isolation/session/email flows, operational writes, real GPS, Stripe/OpenAI/email integrations. The prior report that the migration ledger is absent remains client-reported; the API cannot prove its private-schema state. No user/password sign-in or account impersonation was attempted.

## Exact connection blocker and saved configuration

`SUPABASE_DB_URL` now exists and passes the project/URI guard. Its session-pooler endpoint uses port 5432. Native DNS/TCP failed before database authentication; an HTTP CONNECT probe to the configured endpoint returned **403**. No PostgreSQL password acceptance/rejection was established. Do not reset credentials based on this network failure or disable TLS.

The published network policy allowed the project API but omitted its actual pooler hostname. A narrowly scoped configuration draft now adds **`aws-0-ap-northeast-1.pooler.supabase.com`**, preserving the existing `api.github.com`/project rules and package-manager preset. The platform confirmed the save with **`requires_publish: true`**. Saving a draft does not activate it; review/save/publish is required. Even after activation, PostgreSQL CONNECT port support must be retested; allowlisting a hostname alone is not proof of supported PostgreSQL transport. If it remains blocked, use an authorized PostgreSQL-capable runner/integration for the same guarded audit; do not tunnel around policy or expose credentials.

No deployment token or approved hosting destination is available. No public/private remote deployment, merge or domain change was performed.

## Actual test results

- ESLint and TypeScript: passed after excluding generated `.next-test` output.
- Unit tests: **55 passed**.
- Disposable PostgreSQL/RLS: **195 assertions passed**. Includes tenant isolation, financial evidence/idempotency/refunds, assigned-driver lifecycle, passenger access, GPS consent/revocation/retention and outbox controls.
- Production build: passed with the current environment.
- Isolated production-style browser build: passed.
- Desktop/mobile Chromium: **44 passed**, including new theme/CTA contrast tests, forms, public/protected routes, car audio lifecycle, reduced motion, RTL concierge fallback, genuine GPS-controller permission tests and isolated booking-component interactions.
- PNG decode/open checks: desktop 1280×4388 and mobile 1082×21228 physical pixels (mobile device scale); valid PNGs. No fake fleet/location was introduced to make screenshots attractive.

Browser GPS is explicitly emulated test-device data; local booking/provider fixtures stay local. These passes do not certify real hosted bookings, physical sensors, broker authorization or provider payments/messages/model output. No real charge, booking, driver, GPS fix, customer email or OpenAI request was created.

## Required client approvals and exact rollout

The pooler hostname update is now **published and verified in the current configuration**. PostgreSQL still fails at transport before authentication, even though proxy CONNECT now returns 200. The next action is to run the existing read-only `npm run check:hosted` through the PostgreSQL-capable Codespaces runner with its secure database binding. No SQL copying or repeated publication is necessary. See the latest [Phase 4 retry](PHASE-4-VERIFICATION.md#post-publication-postgresql-retry--october-13-2026).

After actual catalog verification:

1. If 001–007 fully match and the ledger is absent, present the ledger-only baseline plan for explicit approval; never replay 001–007. If 008/009 already fully match, baseline only matching history and skip their SQL. Partial/unknown schema requires a reviewed additive repair.
2. Present the concrete Owner plan for the existing confirmed Auth UUID. The client identifies the business owner as **Hamid Shah**. Verify the account-to-person relationship and obtain explicit client authority and permission-change approval. Current API evidence suggests one new genuine organization/membership is needed; the guarded tool rechecks inside a transaction and refuses duplicates. No account is recreated.
3. Separately approve migration 008 and its exact hash, GPS visibility/consent/retention defaults and verified retention worker. Audit after applying once.
4. Separately approve migration 009 and its exact hash. Audit the nine-migration catalog/history. See [Phase 4](PHASE-4-VERIFICATION.md) for guarded commands/current approval identifiers.
5. Publish genuine contact/policies, actual fleet/capacity/licences, served locations/coordinates, route durations/fares/extras and minimum notice through authorized Owner/Admin UI. Set the actual resulting organization UUID. A missing business does not get sample records.
6. Complete real authorized staging acceptance before enabling live bookings/provider usage. Any genuine staging writes/messages/payments need approved inputs and execution scope.

No authorization for mutations is implied by uploaded credentials, a confirmed email, this report, Git push or PR merge. Owner assignment, schema application, real charges/messages/AI enablement and production deployment remain separate gates.

## Deployment and client handover package

Use [Client handover](CLIENT-HANDOVER.md), [Launch checklist](LAUNCH.md), [Supabase operations](SUPABASE-OPERATIONS.md) and `.env.example`. Recommended hosting supports Node **24**, HTTPS and Next.js 16 App Router/Server Actions. Vercel is an option; no project/domain/account is assumed or created. Confirm the client's domain/merchant/provider ownership, configure DNS only after choosing/approving the host, and keep preview forwarding private.

Secure hosting requirements:

- Public Supabase URL/publishable key; server-only service key; genuine `HAMDI_ORGANIZATION_ID`; exact `NEXT_PUBLIC_SITE_URL`. The PostgreSQL URI belongs to trusted operations, not browser/normal runtime. Never commit real values.
- Exact HTTPS Supabase Site URL and `/auth/confirm`, `/auth/callback` signup/recovery redirects. Configure real SMTP/templates, email confirmation, Turnstile CAPTCHA/rate/password requirements. Public signup policy must match the approved registration mode.
- Genuine Turnstile site/secret keys and hostname. Verify actual enquiry challenge; no fabricated security success.
- Stripe test merchant/key and signed webhook at `/api/payments/webhook`; subscribe to completed/async success/async failure/refund events. Confirm UAE eligibility, genuine amount/currency, retries/refunds/reconciliation before explicit live-charge approval and `STRIPE_LIVE_PAYMENTS_APPROVED=true`. No automatic refunds.
- OpenAI server key, permitted model, HMAC rate secret, provider spend limits/privacy approval, multilingual/adversarial acceptance. Enable `OPENAI_CONCIERGE_ENABLED` only after explicit usage approval.
- Approved email provider/domain/from address, signing secret and protected outbox scheduler; `/api/notifications/run` uses worker authentication, `/api/notifications/webhook` verifies delivery signatures. Keep `NOTIFICATION_EMAIL_ENABLED=false` until genuine sending is approved. Accepted messages are not claimed delivered.
- Allow actual API/Storage/Realtime, configured providers and on-demand OpenStreetMap tiles in the chosen hosting network. No n8n or automation platform is required.
- Verify Owner login/logout/recovery/session refresh, staff/driver/passenger role separation, private GPS revocation on stop/completion/reassignment, stale/offline/background behavior, cron retention and real devices. Browser background tracking is not continuous tracking.
- Backups/restore, legal/provider-processing and retention/erasure policy, monitoring/rollback, administrator MFA decision and exact release approval remain launch requirements.

**Client delivery verdict:** share the design screenshots/private preview for review now. Do not hand over the website as a functioning production business platform until Owner/schema/configuration and hosted acceptance gates pass.

## Final client fleet and preview update

The homepage now carries Midnight Luxury through the services, fleet, destinations and contact sections, with ivory cards for readable forms. Existing Admin/Driver/Passenger functionality was reused. The BMW X6-inspired red interaction remains separate from the bookable fleet. No authentic photograph or licensed recording is claimed.

Added `/fleet`, published-only `/fleet/[id]`, shared responsive vehicle photographs and actual passenger/luggage capacities, and booking vehicle preference links. Unknown or unpublished IDs return 404. Missing luggage capacity is explicitly unpublished; no capacity is invented. Photos preserve the full car with responsive aspect ratios, lazy loading and async decoding. Upload processing remains the existing validated image pipeline. Private signed image URLs are not placed in a public optimizer cache; failed/expired URLs show an honest fallback.

**Actual asset inventory:** repository and available uploads contain no client-approved vehicle photographs or confirmed client fleet model list. Read-only hosted queries returned **zero published non-archived vehicles**, **zero published photograph references**, and **zero root entries in `business-media`**. The storage listing is a read operation despite its SDK HTTP POST transport. No uploads, signed-URL creation, publication or business records were performed during this inventory. Missing assets are the client's exact approved fleet list and licensed photographs for those models, plus corresponding genuine published vehicle/capacity/luggage records. Do not substitute stock luxury cars. Owner setup/authorization must precede business publication.

The multilingual concierge system instruction now limits answers to 1–3 sentences about Hamdi transfers, bookings, UAE airport travel, pricing and trip assistance, with a fixed unrelated-topic response (translated when appropriate). Actual provider output remains unverified because OpenAI is not configured/enabled. No AI request or spend was incurred. Real GPS/map code is preserved and local privacy/device-controller tests pass; hosted GPS, Realtime and physical-device acceptance remain pending. No moving marker was fabricated for screenshots.

All **12** homepage/gallery/fleet/booking/tracking/concierge PNGs were regenerated from the actual running isolated production-style application, decoded with Sharp and visually inspected as a contact sheet. Both homepage screenshots include the genuine empty fleet gallery. Browser tests used no hosted credentials; these are honest missing-configuration screens, not successful booking/tracking/chatbot demonstrations. Production server startup was also verified and the homepage returned HTTP 200. No externally forwarded URL or deployment capability is available in this environment; a loopback address is not a usable client preview link. [Preview and all screenshots](PREVIEW.md) gives the existing Codespaces private browser-preview path.

Current checks: clean ESLint, TypeScript, production build, 55 unit tests, 195 disposable PostgreSQL assertions and 44 desktop/mobile browser tests. These do not make the hosted business production-ready. Hosted API access succeeds, but PostgreSQL transport remains blocked; there is still no organization or Owner membership. Migrations, permissions and deployment were not changed.

## Final client requirements and corrections

**Brand: HAMDI TOURISM. Client/business owner name supplied: Hamid Shah.** This identity statement is not an authorization to change the confirmed Auth account's permissions. No Owner assignment has been performed.

The homepage fleet, `/fleet`, `/book`, passenger vehicle selector, transfer enquiry and Admin category selectors now share exactly four client-approved category labels:

| Category            | Client service description | Existing database code |
| ------------------- | -------------------------- | ---------------------- |
| Normal Sedan        | 3 passengers               | `sedan`                |
| Luxury Sedan        | 3 passengers               | `luxury`               |
| 7-Seater            | 7 seats                    | `van`                  |
| 5-Passenger Vehicle | 5 passengers               | `suv`                  |

The internal codes remain compatible with existing database constraints and pricing/booking RPCs; no migration or record relabel was executed. Category cards are service descriptions, not fleet records. Individual vehicles retain their actual published names, capacity, luggage and UUIDs. Passenger filtering never creates a selectable vehicle for an empty category; quoting is disabled without a selected real vehicle. The owner must confirm classification/capacity/photograph rights before publishing real records. No make/model, registration, availability or price is fabricated. Matching approved published photographs fill each category; currently all slots honestly show missing photographs. Four professionally licensed category photos are still needed. No stock photo licensing was presumed.

**Text and voice concierge:** English, Arabic, Urdu and Hindi use the existing grounded, authenticated-booking-scoped OpenAI path. Voice input uses browser speech recognition, only after a microphone click, with native permission handling, explicit browser-provider audio processing disclosure, transcript review before submission, denial/unavailable states and a stop control. Spoken responses use only device-local synthesis voices, start muted, require unmute plus a separate Read answer aloud click, and stop on mute, Stop voice, language change, close or hidden tab. Missing device voices produce an explicit text fallback. There is no automatic voice submission/playback or microphone capture on page load. Browser/OS speech recognition availability, external speech-provider privacy and physical device/language quality require client acceptance; no audio is stored by the application. OpenAI is still not configured/enabled, so real AI answers are not claimed tested.

**Admin and GPS:** existing authenticated dashboard/navigation, reports, assignments, settings, logout, Driver portal, scoped consent-based Leaflet/OpenStreetMap/Realtime tracking and real endpoint coordinates are preserved. The confirmed account still lacks Owner/staff membership. Desktop/mobile Admin captures show the genuine secure login redirect; an authenticated dashboard screenshot is blocked by missing authorized access, and was not fabricated. No actual trip, coordinates, moving marker or ETA was created.

**Current verification:** ESLint, TypeScript and production build pass. **55 unit tests**, **195 disposable PostgreSQL assertions** and **44 desktop/mobile browser checks** pass, including category consistency, microphone click/review/mute/cleanup, permission denial and genuine login/Admin protection. Speech APIs in browser tests are explicitly mocked device responses; hosted Auth/physical microphone/model/GPS acceptance remains unverified. Read-only hosted audit was rerun with the same results: API accessible, account confirmed, no membership/organizations, 17 API-exposed tables, PostgreSQL network blocked. No SQL/migration/record/permission/message/payment/deployment mutations were performed.

All 16 desktop/mobile PNGs show actual running UI, including four categories, homepage, chatbot with voice controls, booking, tracking, login and protected Admin access. They were decoded and visually checked. There is no external browser-forwarding capability or approved hosting destination here; the Codespaces private Ports → 3000 → Open in Browser procedure remains the real preview route. No publicly accessible website URL is claimed.

## Latest network publication result

The user-published hostname update was verified in the new runtime configuration. `SUPABASE_DB_URL` exists and the project guard passes. Native DNS/TCP remain unavailable; the configured proxy now grants CONNECT (200), but closes normal PostgreSQL SSL negotiation and the direct-TLS PostgreSQL attempt before a usable database session. Certificate verification was retained. This is still a transport blocker, not evidence of a wrong password. HTTPS API checks continue to succeed, showing the confirmed user without membership/organization and the original 17 API-exposed public tables. Full catalog/ledger verification, migration 008–009 necessity and Owner bootstrap remain blocked. No hosted mutation occurred. See [Phase 4](PHASE-4-VERIFICATION.md) for exact evidence and the single next runner action; earlier draft-publication instructions are historical and superseded.

## Final black-car and real-login correction — October 13, 2026

**Client priority remains blocked externally: an actual authorized Owner login has not been verified.** No password, session token, generated magic link, fabricated account or RLS bypass was used to claim access.

The entire red illustrated SVG car and skyline were removed. Category photo placeholders no longer contain drawn car icons, and the live map uses a position marker rather than a cartoon car emoji. Original click-triggered V8-style synthesis, mute, immediate stop, keyboard behavior and reduced-motion behavior are preserved. The image-click interaction accepts only a separately approved real photograph; no photo is currently configured. The two-line HAMDI / TOURISM wordmark is centered with a readable champagne-gold subtitle and reduced letter spacing across navbar, staff login, Admin, Driver, Passenger, booking and gallery branding. Existing business features and four category labels remain.

**Photograph requirement is not complete.** No approved real black luxury-sedan photograph or four licensed category photographs were available in the repository, uploads or published fleet. The external Commons licensing source was unreachable from this restricted environment. No generated car, unknown-license stock image or unrelated make/model was substituted. A reviewed photo manifest at `src/content/vehicle-photos.json` holds empty slots, not invented inventory. Approved images need local file, accurate alternative text, photographer credit, source and licence; see [Vehicle photographs](VEHICLE-PHOTOS.md). Hero images must be a real black luxury sedan, separately labelled editorial and not company ownership/availability/BMW make or engine. Owner-published actual fleet records remain the only bookable vehicles.

**Authentication diagnosis and code fixes:** read-only project API checks accept the configured public/server keys and verify the confirmed target account. It still has no staff membership and no organization. A password/token 401 is distinct from missing Admin permission; no actual password sign-in was attempted without the account holder. Login now distinguishes invalid credentials, unconfirmed email, rate limits, generic 401 and unavailable provider, without raw error/secret disclosure. It catches transport failures, checks actual active membership after successful Auth, and routes through the existing role rules. Missing membership goes to access-pending; it never receives Owner privileges. Password reset catches transport/provider failures and uses the existing validated HTTPS callback; actual SMTP delivery and the user's password setup remain unverified. Password update checks membership errors/active roles while preserving passenger recovery. Session/cookie refresh, protected routes and logout remain in place.

**Exact proposed privileged operation, not executed:** after verified schema/ledger and client identity/authority approval, recheck eligible Auth user `988e629b-6770-4b93-b9ba-7c1bce325680`, all organizations and membership inside the guarded transaction. If still empty, create one genuine Hamdi Tourism organization, then one active `owner` staff membership for that existing account with display name **Hamid Shah**, copying its real Auth email. Use existing `scripts/database/owner.ts`, which refuses duplicate business/membership and rolls back on failed checks. Set only the resulting organization UUID securely. Do not create another Auth user or any operational records. This account's ownership/authority still requires client confirmation and separate explicit execution approval; an email confirmation alone is not enough. PostgreSQL transport remains blocked, so no schema approval or permission mutation is currently safe to execute. Full hosted migration 008–009 status is still unverified; see [Phase 4](PHASE-4-VERIFICATION.md).

**Actual checks:** clean ESLint, TypeScript, production build, 56 unit tests and 46 desktop/mobile browser checks. Browser tests exercise sound, keyboard/mute/no autoplay, centered gold wordmarks, missing-photo honesty, four categories, login/protected routes, booking controls, GPS consent and concierge voice controls. No simulated authenticated dashboard was used. Development server startup and homepage/login/protected Admin/fleet requests were checked with actual environment bindings; this proves code/runtime routing, not account-holder sign-in. The cloud machine has no connected Codespaces runtime or external port-forwarding URL. Existing Codespaces uses `npm run dev`, private port 3000, Node 24; its actual secret bindings and login cannot be certified remotely. Real Owner login/logout, password-reset delivery, physical GPS/Realtime and configured OpenAI remain live acceptance gates. No hosted mutation, message, charge, merge or deployment occurred.

## Static real-photo showcase completion — October 13, 2026

The missing-photo hero has been replaced by a **real black luxury-sedan photograph bundled locally**, independent of Supabase fleet state. Four photographic category cards retain the exact client-approved names/capacities. Selected images are photographic derivatives from a public Wikimedia asset mirror, with individual CC BY-SA/public-domain/CC0 records, photographer credits, original source/licence links, pinned upstream Git revision and SHA-256 provenance. No drawings or generated cars were added. See [Vehicle photo licensing](VEHICLE-PHOTOS.md). The provided assets are native 512×256 derivatives, not falsely claimed original-resolution photographs.

The homepage no longer displays unavailable-photo wording in the hero. It shows a separate booking-unavailable notice when the real published fleet is empty. Marketing photos never become selectable operational vehicles, never generate fares, and never imply company ownership or actual photographed seating configuration. The car photograph itself is an accessible click/keyboard target for the existing V8-style synth; mute, no autoplay and immediate stop remain verified. Responsive layout keeps the full photographed vehicle visible with no horizontal overflow. The centered two-line logo, login, Admin, Driver, Passenger, consent-based GPS and multilingual voice/text concierge are preserved. No hosted data, permissions, payments, messages, migrations or deployment were changed.

Build, ESLint and TypeScript pass; **57 unit tests and 48 desktop/mobile browser checks** pass, including local image-byte/provenance integrity, actual photo decoding/loading without Supabase credentials, photographed-car click/keyboard/mute, category consistency, unavailable real booking, and existing security/role-protected routes. Existing earlier missing-photo findings are historical and superseded by these static marketing assets. Real Owner login and full hosted schema verification remain external blockers; this visual change does not claim they are operational.

## Cinematic composition and authenticated routing — current delivery

**Production/client operational handover: NO.** The requested approved reference image was absent from the upload. The written specification was used for the layout; pixel-level/exact-reference matching cannot be verified. The original generated Dubai sunset visualization includes palms, Burj Khalifa, a winding highway and a rear three-quarter black sedan, rather than a separately pasted stock car. It is labelled marketing visualization, not an actual company vehicle or verified route. Header, centered gold brand, six requested navigation links, language selector, outlined Login, gold Book Now, exact English hero headline/supporting text, glowing decorative road/pins/label and bottom-left translucent preview card are implemented. The mobile composition keeps the sedan and card separate. There is no hardcoded 45-minute/32-km journey. Four category photographs retain their original licences and remain independent of bookable Supabase inventory.

No video was available: the play-style alternative clearly says “Discover our service” and links to the actual services section. `/track` is a functional entry to protected booking tracking; it never exposes a trip from an ID alone. Header language selection translates the hero and navigation into English/Arabic/Urdu/Hindi, including RTL hero text. Existing business sections and dashboards retain their current language; this is not a claim of full-site localization. Concierge language/voice controls remain separate and preserve their existing provider gates.

The existing consent/assignment/tenant/Realtime/GPS architecture is preserved. Optional authenticated openrouteservice road routing and ETA now derive coordinates from protected real snapshots, revalidate access, bound/validate provider responses, debounce/cache for one minute, stop/clear on inactive access and expose no server key. Missing provider or actual trip/GPS shows ETA unavailable. A separate consent checkbox and driver disclosure cover provider coordinate processing. Estimates state their calculation time and exclude live traffic. See [Road routing](ROAD-ROUTING.md) for exact guards, credential names, quota/egress setup and unverified live acceptance.

Staff routes now require a confirmed Auth email, and the login page avoids an unconfirmed-session redirect loop. Staff UI/server actions now block extra Owner grants and changes to the Owner account. The database RPC requires separately approved matching hardening: `supabase/proposals/client-owner-lock.sql` is review-only, unapplied and not a migration. The confirmed Auth UUID has not been assumed to be Hamid Shah or granted any permission. Hosted SQL inspection remains transport-blocked, API still exposes 17 recognized tables, and the confirmed account still has no organization/membership. Migrations 008–009, the proposed owner lock, retention, broker and actual login require verified catalog/identity and explicit approval before changes.

**Actually tested:** clean ESLint, TypeScript, production build; **61 unit tests**, **195 disposable PostgreSQL assertions**, and **52 desktop/mobile browser checks**. Includes cinematic/RTL navigation, track-ID validation, image loading, photo/scene-click V8 audio and mute/no-autoplay, responsive overflow, protected routes, consent/device-controller privacy, routing failure/no-store/cross-origin rejection, route geometry/target/freshness/accuracy/metric validation, budgets and immutable Owner staff policy. Fixture GPS/provider responses stay local and explicitly emulated. No actual device, routing credential, Owner session or provider acceptance was available, so those live integrations are not certified.

The production-style preview PNGs reflect the actual running UI and were inspected. The real development server was checked via homepage, tracking landing and protected Admin requests. No external forwarder/approved deployment is available in this Codex context. In the existing Codespace on `feat/hamdi-tourism-application`, update safely with `git pull --ff-only origin feat/hamdi-tourism-application`, run `npm run dev`, then choose **Ports → 3000 → Open in Browser**, keeping it private. If local changes prevent updating, retain them rather than reset/overwrite. Configure the exact HTTPS preview origin in secure application/Supabase Auth settings before real-account acceptance. No production deployment, merge, migration, operational seed, GPS upload, role mutation, message or charge occurred.
