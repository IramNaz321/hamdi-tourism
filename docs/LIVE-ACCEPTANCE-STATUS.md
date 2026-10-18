# Current live acceptance status

Based on `a4c2b492b3d65f8d8b9a73f326c8ee2d59475d14`. No production
migration, email, booking, Auth/Owner change, provider activation or deployment
was performed. Original uncommitted work remains preserved in the earlier checkout.

## Read-only hosted evidence

The authorized Management API catalog audit now matches **001–009 exactly**:
32 public tables; migration ledger records `202610120001` through `202610120009`.
RLS/policy/function metadata matches the reviewed 009 catalog. Owner memberships
and Auth records were not changed. Revised 010/011 are absent. This supersedes
older reports describing a 17-table baseline and absent ledger.

The target organization has no business-settings row, so published business
information/enquiries are unavailable. Configure genuine contact, policies,
locations, fleet/routes/fares through the authorized Admin workflow; do not seed
invented settings, vehicles or prices. Client approval is still required to publish
fares. Current private fare drafts remain unpublished.

**Do not execute the old fresh-baseline 040 bundle against this 009 database.**
It intentionally refuses that baseline. Revised 010 (owner booking notification
outbox) and 011 (unpriced transfer enquiries) require separate approval and fresh
hosted verification before execution. Installed versions must never be replayed.
Backup/restore success was reported in Codespaces; this environment does not
contain those artifacts, so no independent restore verification is claimed here.

## Code fixes and checks in this pass

- Public quote responses now require valid AED numeric evidence, coherent totals,
  unique extra IDs and the correct return-fare shape. Malformed RPC responses can
  no longer be shown as verified fares.
- Booking-page dependency/transport failures render an unavailable state instead
  of an uncaught page error. Profile data is validated before rendering.
- GPS sends are scoped to the current consent generation. A pending request from
  stopped sharing cannot block a restarted watcher or unlock a newer in-flight
  send. Added regression covers both cases. This does not simulate real GPS.
- Added `npm run check:concierge`: secret-safe presence/shape/origin checks with no
  network requests by default. `--live` explicitly permits one model-list query,
  a read-only published Supabase context query and three bounded Groq completion
  probes (English, Urdu, Arabic). Responses/prompts, keys and customer data are
  not printed or stored. No bookings, usage-counter writes, emails, flag changes
  or deployment occur. Probe-only model success is not browser/CAPTCHA acceptance.
  Missing public grounding stays BLOCKED even if language/provider probes pass.

## Configuration and actual live status

Codespaces access from this Codex environment is denied by GitHub (403). The
Codespace's `.env.local` is therefore not inspected or copied. The user-reported
Groq/CAPTCHA settings there remain unverified. Groq key/model/rate secret,
Turnstile keys and Resend sender/worker/webhook variables are absent or unset in
this runtime. No actual Groq completion or real email was attempted here.

`GROQ_CONCIERGE_ENABLED` was not enabled; production remains disabled. For local
acceptance only, enable it privately after provider/model, public grounding and
actual browser CAPTCHA pass. Do not enable production until live acceptance is
approved. A script-language check only checks script characters, not linguistic
quality or human/native-speaker acceptance.

Turnstile must permit the exact configured Codespace preview hostname. Verify a
real `travel_concierge` challenge in the browser; key presence and an expected
hostname are not evidence that its provider allowlist is correct. Optional voice
permission/playback/fallback passes browser emulation; actual device/service
compatibility remains unverified.

Owner email remains fixed at `hamdi.tourism@mail.ru`. Local outbox/retry/privacy,
idempotency and webhook tests pass. Live delivery requires approved migration
010, Resend free-plan credentials, verified sender domain, worker scheduler and
signed webhook configuration; no real delivery is claimed. Do not use mail.ru as
an unverified sending domain or trigger an email just to test without approval.

## One next action

Run the following once inside the existing Codespace, where the configured
secrets reside. It safely fast-forwards the branch and performs the explicitly
authorized bounded provider probes without enabling the public chatbot:

```sh
git pull --ff-only origin feat/hamdi-tourism-application && npm run check:concierge -- --live
```

Return only the command's redacted status output, never `.env.local` or secrets.
If Git reports a conflict, stop; do not reset or overwrite local work. Database
migration execution, real booking/email tests, fare publication and deployment
remain separate approval decisions.


## Final verification

PASS: 104 unit tests; 221 disposable SQL/RLS assertions through both database
verification suites; all 82 desktop/mobile browser tests; TypeScript; ESLint;
production build. The independent handover gate remains NOT READY, as expected,
for missing live environment/acceptance evidence. Browser speech/provider tests
use labelled fixtures and do not certify actual microphone services or live AI.
No paid service or public hosting deployment was activated.
