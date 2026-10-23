# V2 local backend implementation track

Requested 23 October 2026. Backend implementation explicitly confirmed by the user. This expands the approved V2 frontend into a local Supabase-backed application; retain the approved brand and flows.

## Completion gates

- [x] Isolated local Supabase Docker stack, persistent volumes, reproducible schema and seed.
- [x] Real Supabase authentication and server-enforced Customer/Owner/Driver access.
- [x] Server-persisted quote → booking → payment test outcome → Owner assignment/confirmation → Driver start/completion → Customer completion, including return legs.
- [x] Custom quote request, Owner response, Customer acceptance, cancellation and separate refund persist in database.
- [x] Owner Driver invitation/onboarding, activation/deactivation; no public role escalation.
- [x] Owner vehicle creation and activation/deactivation with assignment/active-trip safeguards.
- [x] Database-backed UAE place search/selection across all seven emirates; reject unrecognized locations on the server. Google Maps deferred by the user.
- [x] Customer and Driver mobile layouts; Owner laptop-oriented workspace.
- [x] Database access/transition/concurrency tests, real API integration tests, and rendered multi-role browser end-to-end verification.
- [x] Selected epics and stories tracked with completion evidence in [SCRUM.md](SCRUM.md).

## External prerequisites

Google Maps setup is deferred by explicit user instruction. No Maps key or billing account is required for this release. Use the persisted UAE catalogue instead.

## Data and session design

Separate `backend-v2` project and Supabase stack; do not migrate or alter the legacy hosted project or other Docker stacks. Real sessions remain tab-local so different roles can be tested concurrently, with server-verified Supabase access tokens and refresh rotation. Roles come from protected database profiles, never editable user metadata. Server-mediated transactions persist all changes; existing frontend mock mode remains an explicit fallback, not the backend implementation.

## Acceptance result — 23 October 2026

Selected local scope completed and verified. [SCRUM.md](SCRUM.md) contains the six completed epics, 23 selected stories, actual browser booking reference, screenshots and automated/database evidence. Google Maps is deferred; UAE catalogue places are stored in PostgreSQL. Simulated money outcomes and sample tariffs remain explicit local-release limits. No hosted project was changed or provider integration claimed.
