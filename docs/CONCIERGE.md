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

### GPT-OSS multilingual diagnostic

Set `GROQ_MODEL=openai/gpt-oss-20b` only if that model is available to your account.
The application and diagnostic share completion settings: GPT-OSS uses low reasoning
effort, excludes reasoning from the response, and has a bounded 2,048-token budget
that includes reasoning. Visible answers remain limited by the concise system prompt
and response validator. There are no automatic provider retries or model fallbacks.
The former 80-token diagnostic budget could exhaust before producing a visible Urdu
answer; the former generic `groq_response_ur` error did not distinguish that from
HTTP errors, invalid responses or a different output script. The original live
response is unavailable here, so token exhaustion is a diagnosis to confirm, not a
claimed observation of that response.

With the public chatbot still disabled, run `npm run check:concierge -- --live` in
the configured Codespace. This makes at most four completion requests (English,
native-script Urdu, Arabic, Roman Urdu), checks public read-only grounding, and
never enables chat or writes database records. It reports only allowlisted HTTP,
finish-reason and token metadata on failure, retaining earlier script-check passes.
A `completion_budget_exhausted` reason identifies a truncated provider response;
`requested_script_not_verified` identifies a script mismatch. Script checks do not
prove semantic translation quality: human review and real CAPTCHA, quota and
passenger-privacy acceptance remain required before enabling public chat.

This Codex environment has no Groq key and its GitHub integration cannot access
Codespaces (HTTP 403). English/Urdu/Arabic/Roman Urdu live provider tests therefore
remain BLOCKED here; local provider fixtures are not live acceptance results.
API parameter reference: the official Groq TypeScript SDK,
https://github.com/groq/groq-typescript/blob/main/src/resources/chat/completions.ts
(`reasoning_effort`, `include_reasoning`, `max_completion_tokens`).
