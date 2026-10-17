# GPS and Passenger production unblock — 17 October 2026

**READY for SQL review; BLOCKED for production execution and live acceptance.**
No hosted migrations, business records, Owner credentials, staff permissions or
application environment values were changed.

## Fresh read-only production findings

Target project `hzcupgjphowrzvrdffrf`; organization
`9f53250d-5e05-409d-9182-3d45448aa399` matches HAMDI TOURISM.
The HTTPS Management read-only endpoint queried PostgreSQL catalogs directly.

- 17 public tables, all RLS enabled; 001–007 catalog and all 14 security metadata
  categories match the reference (zero differences).
- `supabase_migrations.schema_migrations` does not exist. This is not an empty DB
  and does not justify replaying 001–007 or fabricating history entries.
- 008 is missing five tables: `driver_trip_progress`, `driver_trip_events`,
  `trip_live_locations`, `trip_location_consent`, `passenger_tracking_access`.
  Its Driver/GPS RPCs, supporting private functions and new policies are absent.
- 009 is missing ten tables: `passenger_profiles`, `passenger_booking_accounts`,
  `passenger_route_configuration`, `passenger_platform_settings`,
  `passenger_quotes`, `passenger_cancellation_requests`, `payment_attempts`,
  `payment_webhook_events`, `passenger_notification_outbox`, `concierge_usage`.
  Its Passenger/operations RPCs and supporting functions/policies are absent.
- `business_settings` exists but the target organization's row is absent.
  `verified_payments` already exists and must not be recreated.
- `realtime.messages` exists with RLS enabled, but
  `private_tracking_notifications` is absent. The application uses private
  `broadcast` channels plus authorized RPC snapshots, not raw GPS table streaming.
- `pg_cron` is available/preloaded for database `postgres`, but the extension and
  application retention job are not installed.
- API exposed-schema configuration is not observable through this read-only SQL
  session (`pgrst.db_schemas` is null). No API-exposure conclusion was inferred
  from that null or from API error responses. Catalog absence is independently
  established. Realtime WebSocket delivery remains untested against production.
- Access is read-only. Recovery readiness and a maintenance window remain
  unverified; no TLS/native PostgreSQL/backup troubleshooting was repeated.

## Exact files and dependency order

Original migrations (reference only):

1. `supabase/migrations/202610120008_driver_tracking.sql`
2. `supabase/migrations/202610120009_passenger_platform.sql`

Use the guarded production artifact, **not** those raw migrations:
`supabase/proposals/hosted-repair/040-production-infrastructure.sql`.
It atomically combines:

1. `010-settings-candidate.sql`: only the missing unpublished settings row,
   plus its existing audit-trigger event; no published fares/inventory/policies.
2. `020-driver-candidate.sql`: 008 Driver assignment/progress, consent-based GPS,
   private tracking policies/broadcast and retention job.
3. `030-passenger-candidate.sql`: 009 Passenger ownership/quotes/bookings,
   operations configuration and automatic authorized passenger tracking.

SHA-256:
`d2a7dec797245e2b5348055142ae89a4c562ed4b7105eea0fcff7675565dd453`.
`production-manifest.json` pins all sources. `npm run db:prepare-production`
confirmed exact reproducibility; no regeneration or SQL edits were required.

Do not execute the bundle and standalone candidates together. It guards against
schema drift, replay, partial installation and unexpected record changes. It
preserves all existing staff/Owner membership records and does not change Auth.
It intentionally replaces reviewed Driver availability/dashboard functions and
private tracking authorization to support the new modules. These changes are
fingerprint-guarded, not broad permission grants or RLS bypasses.

## SQL Editor route — only after separate approval and prerequisites

1. An authorized project operator confirms the existing recovery requirement and
   approved maintenance window; this document does not waive them. Do not create
   an additional account or grant Owner permissions to execute the repair.
2. Open Supabase dashboard → project `hzcupgjphowrzvrdffrf` → SQL Editor → New
   query. Select the authorized migration-capable database role. Confirm the
   project reference in the dashboard; the file's organization guards alone are
   not proof that the correct dashboard project is selected.
3. Open the complete `040-production-infrastructure.sql`, copy all of it without
   truncation, and verify the pinned hash. Obtain approval for this exact artifact
   before selecting Run. Run the complete single transaction once; do not select
   partial statements, prepend Owner SQL or replay baseline migrations.
4. On any error, stop and return only the error text with credentials removed.
   The transaction rolls back. If commit status is uncertain, inspect read-only;
   do not rerun blindly. After a successful commit, a read-only operator runs
   `npm run db:production-preflight -- --post-deploy` and verifies the exact final
   catalog, ACLs/RLS, 32 public tables and one active successful retention job.
5. If the catalog is correct but PostgREST still reports missing RPCs, check that
   `public` is exposed in the project's Data API settings without exposing
   `private`, `auth` or raw GPS tables. With authorization, refresh the schema
   cache using `NOTIFY pgrst, 'reload schema';` and retest the existing grants.
   API cache refresh is not a replacement for the missing schema.
6. Verify private authenticated Realtime subscription for the assigned trip and
   authorized Admin organization channel. Do not enable raw GPS Postgres Changes
   as a workaround. A successful broadcast must trigger an ownership-checked
   snapshot read. No public GPS payload or invented ETA is permitted.

Full RPC inventory, recovery/lock requirements and post-commit recovery handling
are in `PRODUCTION-DATABASE-DEPLOYMENT.md`. Hosted SQL execution is still not
approved by this preparation task.

## Validation actually completed

`npm run test:production-repair` passed on disposable PostgreSQL 17 with genuine
pg_cron. The exact bundle installs once; baseline drift/replay are refused;
exceptions after 008 and after 009 roll back schema, settings/audit and cron
extension/job. Existing fixture Auth, Owner/staff memberships and operational
records retain identical fingerprints. The real retention worker executes.
All **212 SQL assertions** pass, covering RLS/ownership, cross-passenger isolation,
booking pricing/idempotency, assigned-driver handoff, cancellation, GPS consent,
private tracking and terminal-trip revocation. No production acceptance or
Owner credential test is claimed.

## Remaining requirements for real operations

After approved deployment: genuine published fleet/capacities, routes/fares,
route duration/policies and Passenger platform configuration; authorized real
Passenger/Driver/Admin sessions; HTTPS geolocation consent on actual devices;
verified private Realtime delivery and stale/terminal GPS cleanup. Migration
installation alone does not create availability, trips, driver assignments or
GPS records. See `BOOKING-ACCEPTANCE-CHECKLIST.md` for real-client acceptance.

**One next action:** arrange the authorized Supabase project operator's review of
this exact SQL Editor package and obtain explicit execution approval conditional
on the existing recovery/maintenance prerequisites. Do not run it yet.
