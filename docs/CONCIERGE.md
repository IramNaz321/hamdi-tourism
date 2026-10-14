# Travel concierge — implementation and live acceptance

The existing concierge was extended without changing the homepage, fleet, branding,
login or booking routes. UI styles are scoped to the widget. No database migration,
account change, fake operational data, provider activation or deployment was performed.

## Implemented

- Floating gold/navy launcher, responsive non-modal chat, keyboard focus/Escape,
  screen-reader conversation log, loading and safe error states, booking/contact links.
- Browser-language detection; explicit English, Arabic, Urdu and existing Hindi options.
  Arabic/Urdu question layout is right-to-left. Each transcript message carries its
  own language and automatic text direction. Adding languages is centralized in
  `src/lib/concierge-languages.ts` and must also update server validation/prompt support.
- At most 12 page-memory messages; at most six 1,000-character prior messages sent
  with a 1,500-character question. Nothing is written to browser persistent storage.
  History is serialized as untrusted JSON context, never privileged model instructions
  or evidence of current business facts. Request bodies are bounded to 32 KiB.
- Click-only speech recognition, bounded transcript for review before submission,
  explicit microphone denial/unsupported fallback, stop/close/hidden-page cleanup,
  and rejection of late recognition callbacks. No automatic recording loop or auto-send.
- Muted-by-default spoken replies; separate unmute and read controls. Matching local
  device voices are preferred, with browser-provided voices available only on explicit
  playback. Stop/mute/close/language changes cancel playback. Missing language voices
  leave the text answer available. The app never records or stores microphone audio;
  browser speech vendors may process audio or response text as disclosed before use.
- Server-only OpenAI Responses integration with `store:false`, bounded output, fresh
  published Supabase context, existing persistent per-subject/global rate ceilings,
  same-origin checks, and CAPTCHA or confirmed authentication. Booking access uses
  the caller's real session and the authorized Passenger RPC. The projection excludes
  contacts, precise GPS and notes; assigned driver/vehicle names come only from that
  authorized booking. No tool can create/charge/cancel bookings through chat.
- Failed rate-limit storage is a service-unavailable error, not a fabricated usage-limit
  result. Provider/configuration failures never create synthetic assistant answers.

## Current live blockers

Read-only hosted inspection found none of `concierge_context`, `concierge_consume`
or `passenger_booking_detail`. They belong to the existing reviewed Passenger repair
and dependencies; install only after separate production approval and authorized
write access. Do not replay 001–007. Published business settings, genuine fleet,
routes/fares and policies must exist before operational answers can be accepted.

This environment has no OpenAI key/model, AI rate-limit secret or Turnstile key pair,
and `OPENAI_CONCIERGE_ENABLED` remains disabled. Configure values securely in the
actual application host using the existing `.env.example` names:

- `OPENAI_API_KEY`, `OPENAI_MODEL`, `AI_RATE_LIMIT_SECRET` — server-only.
- `TURNSTILE_SECRET_KEY` — server-only; `NEXT_PUBLIC_TURNSTILE_SITE_KEY` — public site key.
- Existing Supabase public/session and server bindings, organization, and exact HTTPS
  origin. Allow the intended HTTPS domain in CAPTCHA/Auth configuration and provider
  egress (`api.openai.com`, `challenges.cloudflare.com`) where restricted.
- Enable `OPENAI_CONCIERGE_ENABLED=true` only as part of an authorized live provider
  acceptance. Do not put privileged values in public variables or chat.

This does not unblock or delay independent Owner login, booking repair and Vercel
work. Their existing access/approval requirements remain separate.

## What was actually tested

87 unit tests and 72 desktop/mobile Chromium browser tests passed. AI and speech
fixtures are explicitly offline; no production account, booking, usage row or provider
request was created by them. Tests cover validation, untrusted history roles/limits,
booking authorization denial, origin/CAPTCHA gates, missing data/configuration,
provider failure, rate limits, conversation/loading/error display, English/Arabic/Urdu
rendering, RTL, keyboard behavior, microphone denial and unsupported APIs, transcript
review, explicit speech playback/mute/stop, late callbacks and request cancellation.
The desktop/mobile unavailable-state screenshots are from the running application,
not invented AI conversations. Build, ESLint and TypeScript are required before release.

Real microphone permissions/transcription and audible voice quality on Chrome/Edge,
Safari/iOS and Android devices remain unverified. SpeechRecognition is not universally
available (including many Firefox installations); typing remains the fallback.
Real OpenAI answer quality/declines in each language and actual authenticated booking
RLS acceptance remain unverified until credentials, approved schema and genuine
sessions are available. Do not describe the concierge as fully operational yet.
