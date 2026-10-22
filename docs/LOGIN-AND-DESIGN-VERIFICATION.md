# Login and design verification — 14 October 2026

Production readiness: **NO**. No hosted records, privileges, Auth settings, emails,
payments or migrations were changed in this task.

## Evidence and root causes

`npm run check:hosted` made read-only requests to project
`hzcupgjphowrzvrdffrf`. Public URL/key and server key were structurally valid;
the public Auth endpoint was reachable. Email confirmation is required.
The previously supplied Auth UUID exists and is confirmed, but its identity as
Hamid Shah remains unverified. Its staff membership is absent. The organizations
API returned no organizations. `HAMDI_ORGANIZATION_ID` is missing/invalid.
These are verified blockers to business authorization and Passenger business
configuration. They do not explain or prove an invalid-password 401.

No authorized account password was available for an actual sign-in. The reported
401 was not reproduced with a real account; invalid credentials versus the
specific Auth rejection cannot be established without that interactive test.
Do not reset passwords or change roles based on a guess.

PostgreSQL catalog access failed at the network stage. The exposed REST schema
contains 17 recognized original tables, including `verified_payments`. Fifteen
008–009 tables are not installed **or not exposed**. This cannot certify absence,
RLS, function definitions, indexes or migration history. Do not replay 001–007 or
apply 008–009 until direct catalog inspection and separate approval.
Supabase redirect allowlist, SMTP and CAPTCHA configuration remain unverified.

## Code fixes

- Main login previously sent every non-staff user to access-pending. Confirmed
  non-staff users now go to `/passenger`; this does not grant staff privileges.
- Passenger login previously ignored staff membership and redirected everybody
  into Passenger. It now checks actual role/active status and uses the matching
  dashboard. Provider errors and network failures receive safe actionable feedback.
- Passenger server authorization now checks inactive memberships explicitly,
  avoiding an inactive driver bouncing between Passenger and Driver portals.
- Driver server authorization now explicitly requires confirmed email.
- Admin server authorization now requires active **Owner** membership, matching
  organization and explicitly configured `HAMDI_OWNER_USER_ID`. Missing values
  deny access. No known UUID is hardcoded as the client. Setting this server-only
  identifier is permitted only after identity verification and explicit approval;
  it does not create membership or change database privileges.
- Existing database policies still support delegated staff access. The new
  application restriction does not change that database model. Strict single
  client Admin access at the database layer requires catalog review and an
  explicitly approved policy/function hardening plan before launch. The existing
  owner-role-change proposal remains unapplied.
- New heading: “Luxury in Every Journey”, preserving serif, ivory/gold split
  and cinematic scene. Four optimized original photorealistic studio visuals
  replace inconsistent cutouts. Provenance and hashes are recorded locally.
  They are clearly marketing visualizations, never actual bookable inventory.

## Dashboard routes and honest verification status

| Portal       | Login                          | Dashboard         | Actual authorized login                                                                                |
| ------------ | ------------------------------ | ----------------- | ------------------------------------------------------------------------------------------------------ |
| Client Owner | `/login`                       | `/admin`          | Not tested; identity, organization, active membership and approved owner binding missing               |
| Driver       | `/login` or `/passenger/login` | `/driver-account` | Not tested; no authorized driver credentials and hosted 008 dependencies not verified                  |
| Passenger    | `/passenger/login` or `/login` | `/passenger`      | Not tested; no authorized passenger credentials, organization and hosted 009 dependencies not verified |

All three routes exist. Anonymous access is checked in browser tests. Code uses
real Supabase requests/RPCs: dashboard summary and bookings, driver assigned trips,
profile/history/status actions, Passenger profile/bookings/notifications and
protected booking tracking. No mock dashboard access was added. Device GPS,
assigned real trips, session persistence and real-account logout still require
live acceptance testing. Existing maps, sound, concierge and booking logic remain.

## Safe next action

Confirm, outside credential sharing, which existing Auth UUID belongs to Hamid
Shah and explicitly authorize the concrete owner bootstrap plan. No duplicate
user or organization should be created. Once PostgreSQL access works, rerun the
read-only catalog audit, inspect existing organization/membership state, and
present exact required changes for approval before execution. Separately approve
only missing migrations after schema comparison. Configure organization and
verified-owner identifiers securely only after the actual approved setup.

For eventual login acceptance: use the private Codespaces port-3000 browser URL,
open a private browser window and enter the account password only into the real
website. Check the matching dashboard, refresh, sign out and verify the dashboard
is protected again. Never send passwords in chat. Use Forgot password only when
an actual recovery email is authorized; verify the exact HTTPS Codespaces callback
is allowed in Supabase first. Do not create test operational records in production.

## Local validation

Recorded below after the final checks. Local mocks and disposable SQL fixtures
verify code boundaries; they are not proof of hosted successful login.

Final checks: ESLint, TypeScript, production build and 63 unit tests passed.
The full desktop/mobile browser suite passed 52 tests; additional anonymous
three-dashboard checks passed in an 8-test desktop/mobile image/preview rerun.
The disposable PostgreSQL suite passed 195 SQL assertions and rolled back its
fixtures. These tests never used live passwords or wrote hosted records.
Desktop and mobile hero/fleet screenshots were opened and visually inspected:
the four consistent grounded studio visuals load, and the requested serif
ivory/gold heading preserves the existing cinematic background and controls.

`npm run dev` was started with the existing secure configuration. Runtime GET
`/` and `/login` returned HTTP 200; anonymous `/admin` returned HTTP 303.
The homepage response contained the new heading, studio assets and engine control.
This is HTTP/render verification, not a password sign-in or authorized dashboard session.
