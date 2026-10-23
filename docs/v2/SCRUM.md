# V2 Scrum delivery track

Updated: 23 October 2026. Source: [backlog](BACKLOG.md) and the user's current implementation instructions. This file tracks the selected local-backend release; it does not mark the entire product backlog delivered.

## Active goal

Complete and test the existing V2 Customer → Owner → Driver → Customer journey using real, isolated local Supabase persistence and authentication. Deliver the relevant booking, custom quote, assignment, trip progress, cancellation, onboarding, and fleet stories below. Customer and Driver must work on mobile; Owner must work on a laptop. Use UAE places stored in PostgreSQL, searchable and selectable across all seven emirates. **Google Maps setup and integration are deferred at the user's request.**

**Selected release: complete locally.** All 23 selected user stories across six epics are verified. Production payment providers, external delivery and deferred backlog items are not included in that completion claim.

Payments/refunds remain clearly labelled local test operations with no real money movement. Production payment providers, live GPS tracking, public deployment, email delivery beyond the local inbox, and the remaining configuration/reporting backlog are outside this selected release.

## Definition of done

A story is Done only when its UI and real API/database behavior work together, access checks apply, relevant automated checks pass, and completion evidence is linked here. An epic is Done only when all selected stories are Done. Broad backlog features remain partial where only this release's selected subset is delivered. One epic is active at a time; verification can uncover fixes in earlier stories.

## Sprint 1 — Persist the connected V2 release

| Epic | Relevant backlog | State | Selected outcome |
| --- | --- | --- | --- |
| E1 — Local foundation and role access | CORE-001, CORE-002, CUST-004, OWN-001 subset | Done (local) | Isolated Supabase, repeatable setup, real email-code sessions, protected roles |
| E2 — UAE catalogue and Customer bookings | OWN-004/005/007/008 subsets, CUST-001/002/006/007/008/010 | Done (local) | UAE DB locations, server quotes, one-way/return bookings, extras, booking/history views |
| E3 — Driver onboarding and fleet | OWN-014, DRV-001, OWN-006 subsets | Done (local) | Invite, submit licence details, Owner activation, vehicle addition and operational toggles |
| E4 — Operations and connected trips | OWN-013/015, DRV-003/004/005/007, CUST-012 | Done (local) | Assignment and confirmation, conflict guards, Driver progress, Customer/Owner updates |
| E5 — Custom quotes and cancellation | CUST-003/011, OWN-011/016, CUST-009/OWN-017 test subsets | Done (local API + frontend checks) | Custom quote conversion, cancellation review, independent test payment/refund |
| E6 — End-to-end acceptance | CORE-004 subset | Done (local) | Real multi-role browser flow, mobile/laptop checks, security/concurrency tests, handover |

### E1 stories

- [x] E1-US1: As a developer, I can start this project's local database/Auth/inbox without altering other projects, and reproduce the schema and catalogue.
- [x] E1-US2: As a Customer, Owner or invited Driver, I can sign in with a real one-time email code, refresh my session, sign out, and recover with a new code.
- [x] E1-US3: As an account holder, my records and role are protected from other users, public role escalation and revoked sessions.

### E2 stories

- [x] E2-US1: As a visitor, I can search or browse persisted places across all seven UAE emirates; arbitrary or non-catalogue locations cannot be booked.
- [x] E2-US2: As a visitor, I can enter a valid future journey, select capacity-compatible vehicles and extras, and receive a server-calculated fare.
- [x] E2-US3: As a verified Customer, I can review and create one booking without duplicate submissions, retaining my journey through sign-in.
- [x] E2-US4: As a Customer, I can book a return trip and see both legs, fare details, upcoming bookings and history after reload.

### E3 stories

- [x] E3-US1: As an Owner, I can invite a Driver and see invitation/onboarding state without granting public Driver registration.
- [x] E3-US2: As an invited Driver, I can submit my name, contact and valid licence details, then see that Owner approval is pending.
- [x] E3-US3: As an Owner, I can approve/activate and deactivate a Driver, with open-assignment safeguards.
- [x] E3-US4: As an Owner, I can add a registered vehicle with category/capacity/expiry and activate/deactivate it safely.

### E4 stories

- [x] E4-US1: As an Owner, I can inspect and create bookings, assign eligible Drivers/vehicles and confirm bookings.
- [x] E4-US2: As an Owner, overlapping assignments, invalid capacities, expired documents and inactive resources are rejected on the server.
- [x] E4-US3: As a Driver, I see only my assigned trips and permitted history, with route, customer, schedule and vehicle details.
- [x] E4-US4: As a Driver, I can start and complete each permitted trip leg exactly once, with concurrent-active-trip and stale-assignment protection.
- [x] E4-US5: As a Customer or Owner, I see persisted Driver assignment, actual progress timestamps and final completion; return trips complete only after both legs.

### E5 stories

- [x] E5-US1: As a visitor, I can submit a separate custom request with UAE locations and a genuine reference.
- [x] E5-US2: As an Owner, I can draft/send a custom fare; as its verified Customer, I can accept it once into a linked booking.
- [x] E5-US3: As a Customer, I can request cancellation before travel starts; the Owner can approve/decline with a visible outcome and resource release.
- [x] E5-US4: As a local tester, I can simulate success/failure and separate refund outcomes in PostgreSQL, clearly without real charges.

### E6 stories

- [x] E6-US1: As a tester, I can exercise the real Customer → Owner → Driver → Customer completion flow in the browser.
- [x] E6-US2: As a mobile Customer/Driver or laptop Owner, I can use the relevant layouts without overflow or blocked actions.
- [x] E6-US3: As a maintainer, I have passing frontend/API/security/concurrency checks, reproducible migrations and concise run/test instructions.

## Verification and completion log

| Date | Epic / story | Evidence / finding | Result |
| --- | --- | --- | --- |
| 23 Oct 2026 | E1-US2/3, E2, E3, E4-US2, E5 | [Real Supabase integration suite](../../backend-v2/tests/end-to-end.test.ts): 11 passing tests against Auth, PostgreSQL and Mailpit, including return legs, concurrent assignment conflict, cancellation/refund and custom conversion | Passed, including follow-up Driver read/history, private draft-quote and Owner-created booking cases |
| 23 Oct 2026 | E1-US3 | Fixed API role membership. RLS isolates Customer rows, cannot elevate protected roles, and live auth.sessions checks reject sign-out/revocation | Passed |
| 23 Oct 2026 | E3 | Browser: invited driver@hamdi.local, submitted licence/contact details, Owner saw Submitted and activated; added Toyota Camry DUBAI H 12345 and selected it for assignment | Passed |
| 23 Oct 2026 | E2-US1/3 | Browser: searched Fujairah city from PostgreSQL; signed in customer@hamdi.local; created HT-2026-896A406B, visible in Owner workspace | Passed |
| 23 Oct 2026 | E6-US3 | Frontend: 53 tests; production bundle and 4 Sites packaging tests; root lint/typecheck and backend typecheck | Passed |
| 23 Oct 2026 | E1-US1 | Supabase advisors: no issues. Generated migration 20261023063806_hamdi_v2_initial and verified local history; added cross-schema/role grants omitted by schema-scoped pull | Passed: CLI replay applied the migration to a fresh shadow database and found no schema differences |
| 23 Oct 2026 | E4 / E6 | Fixed UUID/text casts in Driver history reads and slow-request polling cancellation. Added regression checks. Docker reported 74 running containers in an 8 GB VM, then began timing out | Resolved; the full real browser journey completed after infrastructure recovery |
| 23 Oct 2026 | Local infrastructure | User authorized stopping other Supabase stacks. Stop them without deleting volumes; leave n8n running. Record stopped containers in ignored backend-v2/.local/stopped-supabase.json | Done: other stacks stopped, all volumes retained; n8n restarted successfully after the authorized Docker restart |

## Deferred backlog scope

Google Maps is explicitly deferred. Also deferred: payment-provider/webhook acceptance, live GPS and consent (DRV-006/CUST-013), notification delivery (CORE-003), complete Owner CMS/pricing/location CRUD, full customer/profile management, business settings, availability calendars, and advanced reports. These stay in the [backlog](BACKLOG.md); this release must not claim them complete.

## Final acceptance evidence — 23 October 2026

- **Browser record:** HT-2026-896A406B (`896a406b-cc26-47c3-b3b2-6b636ed573b1`). Customer `customer@hamdi.local` booked DXB → Fujairah city. Owner `owner@hamdi.local` invited `driver@hamdi.local`, reviewed submitted licence information, activated Faisal UAE, added Toyota Camry / DUBAI H 12345, saved assignment and confirmed through the confirmation dialog. Customer completed local test payment; Driver confirmed start and drop-off. All three roles show the same completed booking and persisted timestamps after reload. Payment remains independently Paid.
- **Responsive evidence:** [Customer at 390 px](verification/customer-mobile-completed.png), [Driver at 390 px](verification/driver-mobile-completed.png), [Driver in progress](verification/driver-mobile-in-progress.png), [Owner at 1280 px](verification/owner-laptop-completed.png). Customer/Driver content widths match their 390 px viewports; Owner content matches 1280 px. No horizontal page overflow was found.
- **Automated evidence:** 53 frontend tests, 11 real local Supabase integration tests, 4 Sites packaging tests, frontend/backend/root typechecks, root lint, production frontend bundle. The integration suite covers role escalation attempts, cross-account privacy/RLS, revoked sessions, onboarding and activation, non-catalogue rejection, one-way/return completion, concurrent assignment, independent payment/refund, custom quote privacy/conversion and Owner-created booking compensation.
- **Database evidence:** Supabase advisors report no issues; migration history matches `20261023063806`; fresh shadow replay reports no schema changes. Repeatable setup preserves existing bookings/accounts and selects API mode for the local frontend.
- **Run/test guide:** [backend-v2/README.md](../../backend-v2/README.md). Current local services: frontend 4173, API 4180, Supabase 57521, local email inbox 57524. Six-digit codes are in the inbox; no password or real card is needed. Other Supabase containers remain stopped at the user's request, with an ignored local restoration manifest at `backend-v2/.local/stopped-supabase.json`. No project or data volume was deleted.

All epic completion above is scoped to this local release. The original backlog remains the source for future production/provider and broader management work.

### Separate legacy deployment follow-up

The repository-wide `npm run build` passed, including the new backend typecheck gate. Its first run emitted a Next.js security-update notice; the legacy root application is on Next.js 16.4.0. Upgrade that separate legacy application before public deployment: [upstream security advisory and patched 16.4.1 release](https://github.com/advisories/GHSA-673q-mjm6-r5xr). V2 runs on Vite/Fastify and does not use the legacy Next.js server. This follow-up is outside the selected local V2 release.
