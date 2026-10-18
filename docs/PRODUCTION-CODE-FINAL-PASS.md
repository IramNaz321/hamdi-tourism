# Production code review and handover

Based on branch `feat/hamdi-tourism-application`, saved commit `4593e49`.
This pass changes code and reviewed migration proposals only. No production SQL,
provider requests, real emails, account changes or deployment were performed.
The earlier workspace's uncommitted changes remain untouched in its checkout.

## Completed

- Corrected the Owner-notification validation test to reject `private_notes`, an
  actual unknown field, rather than the explicitly allowed `customer_email`.
  Strict object validation remains enabled.
- Groq uses the supported OpenAI-compatible Chat Completions integration shape
  (`/openai/v1/chat/completions`, system/user messages, bounded completion tokens).
  No paid-provider fallback or automatic model switch is configured. Provider 429
  produces a bounded Retry-After and unavailable/limit UI, never a fabricated reply.
  Incomplete/tool output is rejected. Supabase grounding, CAPTCHA/confirmed user,
  persistent quotas, request cancellation and booking-ID checks remain required.
- Owner booking notification recipient is fixed at `Hamid.shah@mail.ru`.
  Claimed records are strictly parsed; only verified outbox booking fields are
  emailed. Stable Resend idempotency keys and leases support retries. A response
  ID from a failed HTTP request is never treated as accepted. Signed webhook
  evidence, not send acceptance, marks delivery. Worker secret requires at least
  32 characters; no worker key is placed in the browser.
- Migration 010 fixed a real NOT NULL/contact-purge conflict that prevented result
  recording after successful sends. Active queue rows still require contact
  fields. Expired final leases become failed and purge contact data. Retries are
  stopped after 23 hours from first attempt to avoid replaying beyond Resend's
  documented 24-hour idempotency horizon; delayed uncertain sends require manual
  provider reconciliation, not blind re-sending. No historical booking backfill.
- Migration 011 explicitly revokes inherited/default table privileges before
  granting scoped staff reads/status updates and server submission access.
  RLS and cross-organization constraints are preserved. Its independent SQL test
  now declares its own rolled-back helpers; all fixtures stay disposable.
- Public enquiry creation verifies actual HE/HM receipt format before reporting
  success. Null/malformed results produce an uncertain-state message, not a fake
  confirmation. Manual addresses and genuine details remain stored by 011.
- Manual-review and fare-draft actions handle transport failures safely. Draft
  fares use only existing real routes/categories, never overwrite existing fares
  and always save unpublished. Existing competitor comparison figures are labelled
  unverified reference notes requiring rechecking and client approval; none are
  imported automatically or exposed as Hamdi Tourism prices.

## Migration review and release conditions

Order remains verified 001–009 baseline → reviewed 010 owner notifications →
reviewed 011 unpriced enquiries. Both migrations are single-transaction additive
proposals; they do not change Auth users, passwords, Owner memberships or roles.
010 adds an INSERT trigger/outbox and service-only delivery RPCs. 011 adds an
RLS-protected enquiries table and service-only submission RPC. Existing business
records are not seeded, overwritten or backfilled.

**Do not replay any installed migration.** If an older 010/011 definition is
already deployed, these revised files are not an upgrade script: inspect the
hosted fingerprint and prepare a separately approved forward repair. Updated
local schema references pin the revised definitions. Any production application
requires verified recovery readiness and separate approval.

## External configuration still required

Configure only through private runtime settings or ignored `.env.local`; never
paste secrets into chat or commit them. `.env.example` documents placeholders.

- Groq free-plan account/key and permitted `GROQ_MODEL`, independent random
  `AI_RATE_LIMIT_SECRET` (32+ characters), matching Turnstile keys/site hostname,
  valid server Supabase configuration and approved grounding/limiter RPCs.
  Leave `GROQ_CONCIERGE_ENABLED=false` until authorized live acceptance.
- Resend free-plan account/key; a genuinely verified sender domain for
  `NOTIFICATION_FROM` (do not claim ownership of mail.ru); signed webhook secret;
  independent `NOTIFICATION_WORKER_SECRET` (32+ characters). Test-domain sender
  restrictions and account quotas must be checked with Resend before enabling.
  Keep `NOTIFICATION_EMAIL_ENABLED=false` until approved sending tests succeed.
- An authorized scheduler must invoke POST `/api/notifications/run` with the worker
  bearer secret. No unauthenticated cron endpoint or paid automation was added.
  Configure a runtime duration that supports the bounded worker batch (up to 300
  seconds); don't assume a hosting plan's limit. Monitor failed/expired notices
  and reconcile uncertain deliveries in Resend. Never count accepted as delivered.
- Configure and verify genuine public locations, fleet, route fares, business
  contact/policy information and the reviewed migrations before real enquiries.
  Client must approve actual fares and publish them separately in Route pricing.

No free-provider quota, actual email delivery, hosted RPC exposure, production
booking or deployment readiness is asserted by local tests. Official provider
pages were unavailable from this runtime during review; verify current plan/model
availability, quotas and idempotency terms before activation.

## Verification

Final results: 101 unit tests PASS; 221 disposable PostgreSQL RLS/workflow
assertions PASS through both `test:db` and `test:repair`; all 82 desktop/mobile
browser tests PASS; TypeScript, ESLint and production builds PASS. Schema
references for 010/011 were regenerated in disposable PostgreSQL and verified by
the unit/catalog checks. The local handover gate correctly reports
`productionReady:false` because live configuration and acceptance remain unverified.
No real credentials are required by these tests.
