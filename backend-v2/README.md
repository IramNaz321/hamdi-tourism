# Hamdi V2 local backend

Fastify + TypeScript, PostgreSQL and Supabase Auth, isolated from the legacy application. This is the selected local release, using actual database records and email-code authentication. Google Maps is deferred; the database contains a curated UAE catalogue covering all seven emirates.

## Run

Use Node 24+ and Docker Desktop. From this directory:

```sh
npm ci
npm run db:start
npm run setup
npm run dev
```

Setup generates an ignored, mode-600 `.env.local` from this stack's local credentials and seeds the Owner and UAE catalogue. It preserves existing bookings and accounts. Run it again after schema/catalogue changes. No hosted project is linked or modified. Ports: API 4180; Supabase 57521; PostgreSQL 57522; optional Studio 57523 (excluded from the lightweight start); local email inbox 57524. Supabase volumes survive normal stop/start; do not use volume-removal flags if you want to retain records.

In another terminal, from `frontend-v2`:

```sh
npm ci
# Create .env.local containing VITE_DATA_SOURCE=api
npm run dev -- --host 0.0.0.0 --port 4173 --strictPort
```

Vite proxies `/api/v2` to the backend. API mode requires both processes. Use the same proxy in a future production host; no database/service-role key belongs in the browser. Explicit `VITE_DATA_SOURCE=mock` retains the separate frontend demo.

## Test as each role

1. Open `http://localhost:4173/quote`. Choose UAE locations, future pickup, capacity/category/extras, and continue to review. Sign in with a Customer email. Read the real six-digit code in [local inbox](http://127.0.0.1:57524). Submit the booking.
2. In a separate tab, open `/owner/bookings` and sign in as `owner@hamdi.local`, using its local inbox code.
3. Owner → Drivers → Invite driver. Use a distinct Driver email. In a third tab, open `/driver`, request a sign-in code, and submit licence/contact onboarding. Owner → Drivers → Approve & activate.
4. Owner → Fleet → Add vehicle. Set a matching category, enough seats/bags and a registration expiry after the journey.
5. Open the Customer booking in Owner. Save Driver/vehicle assignment and expected end, then confirm. Conflicts, expired documents, unavailable resources and deactivation with open assignments are rejected.
6. Driver sees the assignment. Open it, confirm start, then confirm drop-off. Customer and Owner refresh automatically while visible (15 seconds) or on focus. The same booking becomes completed. Return bookings require completion of both legs.
7. Exercise Custom quotes separately: guest request → Owner draft/send → same verified Customer accepts → linked booking. Cancellation request → Owner approval releases resources; refund is a separate local test operation.

Sessions are tab-local, so sign in independently in each tab. Owner-created bookings attach to the matching Customer email, which must be verified by email-code sign-in before Customer access. Public registration grants only Customer access.

## Checks

```sh
npm run typecheck
npm test
```

Integration tests require the local stack and generated `.env.local`. They create uniquely named test identities and records without resetting user data; the Owner can see these records. Frontend checks run separately in `frontend-v2`: `npm run typecheck`, `npm test`, `npm run build`.

## Local release limits

`LOCAL_TEST_MODE=true` permits simulated payment/refund results and starting future trips for end-to-end testing. No money moves. Production startup rejects this flag. Real payment webhooks/provider credentials, live GPS, external email/SMS, deployment, complete Owner configuration CRUD and reporting remain backlog work. The curated place catalogue does not provide arbitrary street-address geocoding. Fare zones and scheduling durations are configured local-release examples, not live road/traffic estimates.

Authorization uses verified Supabase JWT claims plus live `auth.sessions` revocation checks and protected role profiles. Business tables live in a private, non-Data-API schema with RLS. Server writes validate the actor and use row/advisory transaction locks; quoted and booked amounts are server-owned. See [Scrum delivery scope](../docs/v2/SCRUM.md).

The root repository still contains the separate legacy Next.js application. Its build currently recommends a Next.js security update before public deployment; see the Scrum follow-up. The local V2 runtime uses Vite/Fastify.
