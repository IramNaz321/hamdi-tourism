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
- Unit tests: **53 passed**.
- Disposable PostgreSQL/RLS: **195 assertions passed**. Includes tenant isolation, financial evidence/idempotency/refunds, assigned-driver lifecycle, passenger access, GPS consent/revocation/retention and outbox controls.
- Production build: passed with the current environment.
- Isolated production-style browser build: passed.
- Desktop/mobile Chromium: **34 passed**, including new theme/CTA contrast tests, forms, public/protected routes, car audio lifecycle, reduced motion, RTL concierge fallback, genuine GPS-controller permission tests and isolated booking-component interactions.
- PNG decode/open checks: desktop 1280×3877 and mobile 1082×16582 physical pixels (mobile device scale); valid PNGs. No fake fleet/location was introduced to make screenshots attractive.

Browser GPS is explicitly emulated test-device data; local booking/provider fixtures stay local. These passes do not certify real hosted bookings, physical sensors, broker authorization or provider payments/messages/model output. No real charge, booking, driver, GPS fix, customer email or OpenAI request was created.

## Required client approvals and exact rollout

The safest next action is **publish the saved pooler network update**, then the agent retries `npm run check:hosted` autonomously. No SQL copying is necessary.

After actual catalog verification:

1. If 001–007 fully match and the ledger is absent, present the ledger-only baseline plan for explicit approval; never replay 001–007. If 008/009 already fully match, baseline only matching history and skip their SQL. Partial/unknown schema requires a reviewed additive repair.
2. Present the concrete Owner plan for the existing confirmed Auth UUID. Obtain the real display name, client authority and explicit permission-change approval. Current API evidence suggests one new genuine organization/membership is needed; the guarded tool rechecks inside a transaction and refuses duplicates. No account is recreated.
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
