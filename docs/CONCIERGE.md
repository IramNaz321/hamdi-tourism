# Travel concierge — implementation and live acceptance

The existing concierge uses the current homepage, fleet, branding, login and booking
routes. UI styles are scoped to the widget. Production migrations
001–009, including the Passenger RPCs and rate-limit storage used here, have been
applied and verified. This concierge work made no production database, account,
provider or deployment changes.

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

## Current live acceptance gates

The production Passenger schema and concierge RPC dependencies are installed. Never
replay historical migrations or apply another production migration as part of
concierge testing. Published business settings, genuine fleet, routes/fares and
policies still need Owner verification before the model can provide useful
business-specific answers.

### Read-only production check (2026-10-18)

The configured HAMDI TOURISM organization and an active owner membership exist. The
organization has no active locations, published fleet, active routes, published route
prices or published business settings. The `website_content` and `concierge_context`
RPCs are present, but return no public business context or fares. Once server-side
provider gates are satisfied, the missing published business context itself causes
the concierge's 503 response; there is no real catalog data to ground answers.

Required local environment variable names were checked for presence only. Secret
values were not inspected, and no OpenAI request was made. Vercel's server environment,
provider connectivity, model access and billing remain unverified. Turnstile variables
are absent locally, so public enquiry submission also needs owner setup. No production
migration or data write was performed.

The Codespaces Next.js runtime loads the server-only OpenAI key, model, rate-limit
secret and enable flag from ignored `.env.local`; Next.js environment loading was
verified without printing values. No live OpenAI request was made, so model access,
spend limits, answer quality and multilingual grounding remain unverified. This local
configuration does not propagate to Vercel or another host. Configure the same
server-only variables in the approved deployment environment, then perform an
authorized live acceptance test. Never expose provider or Supabase service-role
secrets to browser code or source control.

Voice tests use browser mocks. Real microphone permissions, transcription and audible
voice quality on Chrome/Edge, Safari/iOS and Android remain unverified. Supported
browsers can process audio or text through their speech services; typing remains the
fallback.

## What was actually tested

97 unit tests, 82 desktop/mobile Chromium browser tests and 210 local SQL
RLS/workflow assertions passed; TypeScript checking, ESLint and a production build
passed. AI and speech
fixtures are explicitly offline; no production account, booking, usage row or provider
request was created by them. Tests cover validation, untrusted history roles/limits,
booking authorization denial, origin/CAPTCHA gates, missing data/configuration,
provider failure, rate limits, conversation/loading/error display, English/Arabic/Urdu
rendering, RTL, keyboard behavior, microphone denial and unsupported APIs, transcript
review, explicit speech playback/mute/stop, late callbacks and request cancellation.
The desktop/mobile unavailable-state screenshots are from the running application,
not invented AI conversations. Build, ESLint and TypeScript are required before release.

SpeechRecognition is not universally available (including many Firefox installations);
typing remains the fallback.
Real OpenAI answer quality/declines in each language and actual authenticated booking
RLS acceptance remain unverified until provider acceptance and genuine passenger
sessions are tested. Do not describe the concierge as fully operational yet.
