# Hamdi Tourism

A production-oriented UAE airport transfer and chauffeur website and business management system. Next.js App Router, React/TypeScript, Tailwind v4, shadcn/ui source components (Radix, CVA and semantic tokens), Lucide, Supabase Auth/PostgreSQL/RLS/Storage/Realtime, and Leaflet/OpenStreetMap.

The application contains no seeded customers, drivers, bookings, vehicles, reviews, business achievements, flight alerts or GPS positions. Supabase must be connected and verified before operational use.

## Run

Use Node.js 24 and npm, from the repository root:

```bash
npm ci
cp .env.example .env.local
# Fill in the real project settings described below.
npm run dev
```

For production: `npm ci && npm run build && npm start`, or deploy to a Next.js-compatible host such as Vercel. Public environment variables are compiled into browser bundles: rebuild after changing those values. Owner-managed website content, contact information, branding, font style and policies come from PostgreSQL at request time and can change without rebuilding.

Without real Supabase configuration the website renders useful unavailable states. It invents no selectable locations, vehicles or fares. Sign-in and password reset are explicitly unavailable, and protected management routes redirect to login. No hosted authentication or email delivery is claimed as verified merely because the application builds.

See [project-specific secure connection instructions](docs/SUPABASE-CONNECTION.md) for the confirmed Supabase project and read-only preflight command.

## Supabase configuration — required before live use

1. Select the real client's Supabase project. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from its API settings. **Never** substitute a service-role key for the publishable key.
2. For a fresh database, original migrations 001–007 form the Admin baseline. For this client’s existing database, audit the hosted catalog first and never replay already applied SQL. Migration 008 is pending separately approved driver/GPS rollout; use the guarded workflow in [Phase 2 verification](docs/PHASE-2-VERIFICATION.md), not an unrestricted `supabase db push`. Never run `supabase/tests/*` against hosted databases.
3. Create and verify the **real owner's** Auth user through Supabase’s restricted dashboard invitation/recovery process. Replace the two placeholders in `supabase/bootstrap-owner.sql` with that user's UUID and real name, then execute it once. It creates the business membership for an actual verified user; there is no open Admin signup, default account or embedded password. Do not bootstrap again if that owner is already provisioned.
4. Set `HAMDI_ORGANIZATION_ID` to the actual organization UUID created by the bootstrap script (`public.organizations.id`). This selects the website's business. It is not accepted from public visitors. The UUID is an identifier, not an authentication credential.
5. Set Supabase Auth **Site URL** and `NEXT_PUBLIC_SITE_URL` to the exact application origin. Use HTTPS in production. For development use `http://localhost:3000`. Allow the corresponding `/auth/confirm` and `/auth/callback` redirect URLs, without wildcard production origins.
6. Configure real custom SMTP and these Auth templates:
   - **Invite user** link: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite`
   - **Reset password** link: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`
     The application supports token-hash verification and PKCE recovery, not implicit tokens in URL fragments. Disable email click tracking/link rewriting and test expiry and replay behavior.
7. Set `SUPABASE_SERVICE_ROLE_KEY` only in server hosting secrets. It is isolated in a `server-only` module and used for owner-authorized Auth invitations, short-lived signing of explicitly published media, and CAPTCHA-validated enquiry ingestion. Normal management CRUD always uses the signed-in user's session and RLS.
8. Disable public Auth signup, configure a minimum 12-character password policy and Auth abuse/rate-limit controls. Driver invitations reserve only the `driver` role and do not grant management-portal access. Staff MFA enforcement is not included; assess and configure the client's access requirements before launch.
9. Confirm `business-media` is a **private** Storage bucket. Migration 006 creates it with a WebP-only upload policy and a size limit. Do not make it public. Owner/manager uploads are validated, resized, stripped of arbitrary image metadata and re-encoded server-side. Existing media is retained when replaced; define an orphan-media retention process.
10. For public submissions configure a real Cloudflare Turnstile widget for the exact website hostname, set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`, and allow server HTTPS to `challenges.cloudflare.com`. Verification checks the hostname and `booking_enquiry` action. Missing CAPTCHA configuration prevents submission, while configured published routes can still return quotes. No fake CAPTCHA bypass exists.
11. Allow the actual Supabase project API/Storage/Realtime host in the hosting network policy, along with SMTP destinations as required by Supabase. Browsers need access to that project and Cloudflare; maps, when explicitly opened, fetch `*.tile.openstreetmap.org` tiles. Configure Supabase Realtime and confirm `bookings`, `drivers`, `vehicles` and `booking_enquiries` are in the `supabase_realtime` publication. Migration 006 adds them when the publication exists.
12. Sign in as the owner, save Business Settings, configure real contact details and policies, and explicitly publish the business information. Add real locations (including DXB/DWC, hotels, neighborhoods and other Emirates as actually served), actual fleet records and licensed images, routes, fares, return fares and optional extras. Only records marked for publication enter the public projection. Airport codes and map coordinates are owner input, not auto-invented data.
13. Complete the hosted acceptance checklist in [docs/LAUNCH.md](docs/LAUNCH.md) before handling real customer traffic.

## Public workflow

The homepage includes the requested navigation, transfer enquiry form, services, actual published fleet/destinations, About, contact information and owner-configured policies. The hero can use a real uploaded destination photograph; otherwise it uses an original skyline/vehicle illustration. Illustration is not a statement about the client's registered fleet. No third-party stock photographs or copied branding are bundled.

The enquiry form collects pickup/destination, UAE pickup date/time, passengers, luggage, one-way/return, category, optional flight number and configured extras. Server-side validation and PostgreSQL calculate the quote from the published pricing rule: outbound base fare + per-leg additional charges + selected extras; return quotes add the configured return-leg base fare and applicable per-leg extras. No price is invented if a rule is missing. A successful enquiry is stored with its exact pricing snapshot and a genuine generated reference; it **does not confirm a booking**.

CAPTCHA is verified server-side before the privileged ingestion RPC, which anonymous or ordinary authenticated clients cannot call. The RPC validates and recalculates the quote, rejects changed totals, validates minimum notice and return dates, and rate-limits enquiries per email and business. Owners/dispatchers/managers review requests, then convert a genuine enquiry transactionally into its customer and one or two pending booking legs. Conversion cannot repeat or duplicate customers, and the fare split retains the submitted quote exactly.

## Business management

- **Dashboard:** total/today's bookings, active trips, currently available drivers, registered vehicles and provider-verified net revenue for completed journeys. Successful empty queries return zeros; database errors display an error instead of fictional empty data.
- **Management:** create/read/edit/archive/restore for drivers, vehicles, customers, locations, routes, pricing rules and optional extras. Lists paginate, with booking reference/status/UAE date filters, customer name/email/phone search and vehicle registration search. Related selectors search actual active records.
- **Drivers:** profile, licence, recorded availability, active/inactive access, genuine Auth invitation, actual availability and paginated assigned-booking history. Driver roles cannot be promoted into portal roles. The driver portal and consent-based GPS integration are implemented; hosted migration and acceptance remain pending. See [Phase 2 verification](docs/PHASE-2-VERIFICATION.md).
- **Fleet:** make/model, category, registration/expiry, seats, luggage capacity, status, public listing and secured image uploads. No vehicle records are prepopulated. Legacy records without luggage information retain unknown values until the owner supplies them.
- **Bookings:** customer contact, route, pickup and required expected end, category, passenger/luggage capacity, driver/vehicle assignment, manually recorded flight status/timestamp, cancellation reason, status/assignment history and owner/manager audit information. New bookings start pending. Valid transitions are pending → confirmed/cancelled, confirmed → in progress/cancelled, in progress → completed/cancelled. Terminal states cannot be silently reopened.
- **Scheduling:** PostgreSQL GiST exclusion constraints prevent overlapping confirmed/in-progress driver and vehicle reservations, including the configured turnaround buffer. Capacity, category, licence, vehicle registration and availability are checked in the database. Related row locks and archive checks protect active assignments. Missing real legacy end times/categories must be supplied before confirmation; no historical durations are invented. A driver/vehicle cannot start two active trips even when planned intervals differ. Real overruns require the dispatcher to update expected end times and resolve any conflicting bookings. Driver account revocation remains possible during assigned trips; operations visibly flag inactive driver access for review.
- **Payments:** there is no manual “paid”/success control. Revenue uses only the `verified_payments` ledger, writable by a trusted server role after a future provider integration verifies an actual signed payment event. No provider is connected by default, so no revenue is asserted. Old `payment_status` labels are preserved only as unverified historical data, excluded from revenue, and cannot be changed into successful payments by portal users. Confirmed payments/refunds require actual provider evidence, not owner input.
- **Live Operations:** real open journeys and assignments, RLS-scoped Realtime updates, periodic refresh fallback and a Leaflet map of configured journey locations. Private driver tracking displays only genuine authorized received positions after the separately approved driver migration. Flight statuses remain manual; no flight provider is simulated.
- **Reports:** actual all-time booking outcomes, verified completed net revenue and outstanding agreed fares. Archived historical bookings remain available.
- **Business Settings:** contact information, WhatsApp, address, logo, AED currency, policies, about text, notice/turnaround preferences and runtime website color/font tokens. Settings and staff controls are owner-only.

| Role       | Permissions                                                                        |
| ---------- | ---------------------------------------------------------------------------------- |
| Owner      | All operational management, website settings, invitations and staff access         |
| Manager    | Operational management and vehicle/destination uploads; no staff/settings controls |
| Dispatcher | Manage bookings, customers and enquiry review/conversion; view other operations    |
| Viewer     | Read-only portal access                                                            |
| Driver     | Auth account foundation only; no operational portal data or private media access   |

Disabling driver access or staff membership blocks database access for existing sessions. Last-active-owner protection is enforced in a serialized owner-only RPC. Supabase provisions invited Auth users immediately; delivery does not prove the email was opened. Review Team members/Driver account access after any invitation delivery error. Existing Auth accounts are not silently moved into another business. Secure project administrators must investigate account conflicts without sharing tokens or passwords.

## Validation

```bash
npm run lint
npm run typecheck
npm test
npm run test:db       # Docker required; disposable PostgreSQL 17
npm run build
npx playwright install --with-deps chromium
npm run test:browser # Unconfigured environment only; desktop + mobile
```

With preinstalled Chromium, use `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:browser`. Browser checks intentionally require missing Supabase configuration and do not submit real customer requests. PostgreSQL checks use a minimal Auth/Storage schema shim with rolled-back synthetic fixtures to exercise actual RLS, RPCs, constraints, triggers, media policies and Realtime publication membership. They do **not** prove hosted Supabase Auth/SMTP/Storage/Realtime or CAPTCHA works. CI runs the checks without client secrets.

See [guarded database operations and acceptance](docs/SUPABASE-OPERATIONS.md) for catalog audits, manual-migration baselining, owner planning, secure access, and approval gates.

See [Admin readiness and configuration verification](docs/ADMIN-VERIFICATION.md) for Next.js 16 proxy/Codespaces routing fixes, owner-only enquiry diagnostics, and hosted acceptance gates.

## Review and deployment

Review the migrations and sensitive server actions, run CI and the staging acceptance checklist, then merge the pull request into `main`. Merging code does not apply migrations or configure secrets. Use HTTPS, protect project/hosting administrator accounts, configure monitoring, backups, retention and tested restores. Privacy and applicable UAE business requirements need client review before launch.

Default theme tokens live in `src/app/globals.css`; owner-configured tokens override the public website at runtime. `components.json` and the source in `src/components/ui` are adapted from the official shadcn/ui registry using Radix accessibility primitives, CVA and Tailwind tokens. Attribution and the pinned upstream revision are in THIRD_PARTY_NOTICES.md; components are editable locally. Tailwind v4 is CSS-first with its PostCSS plugin, not a legacy JavaScript Tailwind configuration.

View [captured website previews](docs/PREVIEW.md) for the current desktop/mobile layout with missing-configuration and empty-business states.
