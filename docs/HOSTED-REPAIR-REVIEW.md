# Hosted repair review — submitted SQL Editor inspection

Prepared 14 October 2026 from the user's successful inspection JSON and repository
001–009 references. **Review only: no production SQL was executed. No PostgreSQL
network retry was made. No Owner role/account or organization is created.**

## Exact findings and limits

- All 17 baseline public tables exist. All inspected columns/types/nullability/defaults
  and RLS-enabled flags match the 007 reference; none needs recreation.
- All reported check/FK/unique/exclusion/PK constraint definitions match a fresh
  disposable PostgreSQL 17 installation of 001–007. No relationship repair is proposed.
- All 27 baseline public/private function signatures, return types, security-definer
  flags and empty search-path configuration match. **Bodies are not supplied**;
  definition fingerprints must be compared before replacement/trigger execution.
- All 36 public policy names, roles, commands, USING and WITH CHECK expressions
  match the reference. Their permissive/restrictive modes were not supplied.
- Three baseline Storage policies were outside the query's scope. They are **unknown,
  not missing**: `business_media_read`, `business_media_insert`, `business_media_delete`.
  Likewise Realtime's `private_tracking_notifications` is uninspected. No blanket
  Storage/Realtime grant/policy repair is proposed.
- Indexes, triggers, effective/table/column grants, media bucket, publication and cron
  prerequisites were not inspected. `000-inspect-prerequisites.sql` checks these
  before repair approval. Object existence alone does not prove complete migration.
- `business_settings` **table exists**, with correct inspected columns/constraints/RLS.
  The submitted JSON has no business rows. Earlier authorized HTTPS verification found
  no row for organization `9f53250d-5e05-409d-9182-3d45448aa399`; query 000 rechecks it.
  Do not confuse absent configuration with an absent table.
- `supabase_migrations.schema_migrations` is absent. No baseline ledger is required to
  make the application's RPCs work. No history rows are guessed or created by this
  repair package, and 001–007 are never replayed.

## Ordered review candidates

### 000 — next action: read-only prerequisite query

Run only [000-inspect-prerequisites.sql](../supabase/proposals/hosted-repair/000-inspect-prerequisites.sql)
through an authorized operator/execution channel for project `hzcupgjphowrzvrdffrf`.
This is not a request for the client to repeatedly copy SQL or JSON; no additional
manual inspection was requested in the final delivery run.
No mutation, function creation or temporary objects occur. The query reads schema
metadata and organization/settings flags, not Auth users/customer records/secrets.
Function fingerprints are compared with the local reference. A mismatch requires
review, not an automatic replacement. This query has been executed successfully
against a disposable local 001–007 database, not the hosted database.

### 010 — missing configuration row only; separate approval

[010-settings-candidate.sql](../supabase/proposals/hosted-repair/010-settings-candidate.sql)
is the smallest configuration repair. It checks the real existing organization,
settings RLS and relevant function definitions, then inserts only the missing
HAMDI TOURISM row. `ON CONFLICT DO NOTHING` never overwrites existing settings.
Published/enquiries remain **false**; no fares, contact details, terms or operational
records are invented. Appearance values match current application fallback tokens.
The existing audit trigger may add **one audit event** on first insert. No account,
membership, policy, grant or organization is changed. Transaction/timeout guards apply.

This restores a stored configuration record, not published booking readiness. No
Passenger platform settings row/real policies/inventory can be fabricated to enable
reservations. Existing `website_content` intentionally hides unpublished settings.

### 020 — missing Driver/tracking module 008; separate approval

[020-driver-candidate.sql](../supabase/proposals/hosted-repair/020-driver-candidate.sql)
contains original reviewed 008 SQL with added preconditions inside its transaction.
It adds five missing tables, 21 missing functions and seven indexes. It creates
three booking/staff triggers. It replaces **two existing functions**:
`public.driver_is_available(uuid,timestamptz)` and `public.dashboard_summary()`.
Their baseline definitions must match before replacement.

The two missing public policies are `authorized_trip_progress` on
`driver_trip_progress` and `authorized_latest_location` on `trip_live_locations`.
The private broadcast policy on `realtime.messages` is also part of 008, but its
current presence/definition is unknown until 000 results arrive.

**Permission/retention changes requiring approval:** enables RLS on the new tables;
revokes default access; grants authenticated SELECT on protected progress/latest-
location tables and EXECUTE on guarded trip/tracking RPCs. Private helper permissions
are explicitly controlled. These grants do not assign any user a Driver/Owner role.
It creates pg_cron if available and schedules a one-minute retention job; the candidate
refuses unsupported retention prerequisites and an existing job with the same name.
The job removes expired consent/tracking access and GPS older than five minutes.
Future assignment/end/deactivation triggers remove stale trip progress/GPS/consent.
These are intentional deletion behaviors, not an immediate purge of original bookings.
No DROP/TRUNCATE/RLS-disable statement exists. No original operational records are
backfilled, seeded, deleted or reassigned during installation. No GPS sharing starts.

The candidate refuses partial installation/new-name collisions and reference function
hash mismatches. It is not safe to run just because these absent table names match.
The pg_cron/Realtime/table grants and trigger prerequisites still require review.

### 030 — missing Passenger module 009; separate approval after 020 verification

[030-passenger-candidate.sql](../supabase/proposals/hosted-repair/030-passenger-candidate.sql)
contains original reviewed 009 SQL with guarded dependency checks, adding ten tables,
30 functions and three indexes. The only replaced existing function is
`private.can_track(uuid)` (installed by 008); it adds passenger-booking ownership to
tracking authorization. Four new triggers hook booking links/status, driver events
and payment booking locks. No original booking is silently linked to a passenger.

The new public policies are `operations_cancellation` and
`operations_payment_attempts`; other new private workflow tables deny direct client
access and expose data through scoped RPCs. RLS is enabled, never disabled. Grants
allow authenticated passengers to call ownership-checked profile/quote/booking/
cancellation/notification RPCs; anonymous users get only public booking configuration
and concierge context. Payment/notification/usage mutation RPCs are service-role-only.
Public/anonymous/authenticated defaults on the new functions are explicitly revoked
before intended grants. This is a permission change requiring explicit approval.

Payment, concierge and notification dependencies are retained as the reviewed complete
009 module because the existing application references its shared tables/RPCs. Do
not manually cherry-pick functions and leave referenced objects absent. SQL function
installation does **not** charge cards, send emails, enable providers or create a
booking. Runtime functions can update/cancel bookings, link real customer profiles,
record payments, remove old usage buckets and queue notices **only when invoked**;
therefore verify their body/ownership/RLS checks in acceptance before launch.

Both module candidates preserve the complete reviewed source bodies; source hashes
are in their headers. Originals remain unchanged in `supabase/migrations`. They add
strict fail-closed preflights rather than `IF NOT EXISTS` wrappers that mask partial
installations. Do not execute 010/020/030 before prerequisite review and separate
approval. No repair for an unobserved missing object is invented.

## Eventual execution boundary

Before an approved 020/030 execution, confirm a recoverable hosted backup and a
suitable write-maintenance window. The original transactional indexes are not
CONCURRENTLY builds and can block writes; short lock/statement timeouts make the
candidates refuse prolonged waits. Execute one approved stage at a time and inspect
its outcome before the next. On error, do not rerun blindly; roll back an aborted
transaction before further inspection. No destructive DROP-based rollback is
provided: once real bookings use new tables, dropping them would lose data.

## Single-client access boundary

No Owner grants/promotions, Auth-user insert or RLS bypass appears in these candidates.
Existing delegated operational roles in the repository remain unchanged. Installing
008/009 does not certify single-client database Admin exclusivity; that separate
hardening must be reviewed after identity/authorization confirmation. Frontend Owner
binding remains unset and locked. Email/password login cannot be certified by schema
inspection. Real accounts, callback/SMTP/CAPTCHA and published real business data
still need separate acceptance; no password should be supplied in chat.

## Local proposal validation

Only disposable PostgreSQL 17 was used. Query 000 parsed and returned JSON. Settings
candidate inserted one unpublished/disabled row, preserved it on a second execution,
and generated one settings audit event. Driver candidate refused missing pg_cron
before creating tables; rollback left no partial Driver table. The source 008/009
bodies are unchanged; complete candidate hosted execution/cron acceptance is **not**
claimed. Existing 001–009 disposable RLS tests remain separate evidence.

## Exact missing object inventory

### Driver tables (008)

- `driver_trip_events`
- `driver_trip_progress`
- `passenger_tracking_access`
- `trip_live_locations`
- `trip_location_consent`

### Driver functions (008)

- `private.assigned_driver_id()`
- `private.can_track(trip uuid)`
- `private.clear_disabled_driver_tracking()`
- `private.clear_trip_tracking()`
- `private.live_trip_matches(trip uuid, assigned uuid, business uuid)`
- `private.notify_tracking(trip uuid)`
- `private.terminal_assignment_guard()`
- `private.tracking_topic_allowed(topic text)`
- `public.admin_live_tracking()`
- `public.begin_trip_location(trip_id uuid)`
- `public.driver_assigned_trips(page_number integer, trip_scope text)`
- `public.driver_profile()`
- `public.driver_trip_action(trip_id uuid, action_name text)`
- `public.driver_trip_audit(trip_id uuid)`
- `public.driver_trip_history(page_number integer)`
- `public.purge_expired_tracking()`
- `public.set_driver_availability(available boolean)`
- `public.set_passenger_tracking(trip_id uuid, passenger_id uuid, expiry timestamp with time zone, enabled boolean)`
- `public.share_trip_location(trip_id uuid, lat double precision, lng double precision, accuracy_m double precision, captured timestamp with time zone, bearing double precision, consent_id uuid)`
- `public.stop_trip_location(trip_id uuid, consent_id uuid)`
- `public.tracking_snapshot(trip_id uuid)`

### Additional Passenger tables (009)

- `concierge_usage`
- `passenger_booking_accounts`
- `passenger_cancellation_requests`
- `passenger_notification_outbox`
- `passenger_platform_settings`
- `passenger_profiles`
- `passenger_quotes`
- `passenger_route_configuration`
- `payment_attempts`
- `payment_webhook_events`

### Additional Passenger functions (009)

- `private.passenger_booking_changed()`
- `private.passenger_booking_linked()`
- `private.passenger_driver_notice()`
- `private.passenger_notice(trip uuid, event_kind text, event_key text)`
- `private.passenger_owns(trip uuid)`
- `private.passenger_user()`
- `private.payment_booking_lock()`
- `public.admin_passenger_booking(trip uuid)`
- `public.admin_passenger_configuration()`
- `public.admin_passenger_route(route uuid, minutes integer, return_duration integer, enabled boolean)`
- `public.admin_passenger_settings(enabled boolean, privacy text, terms_text text)`
- `public.admin_review_cancellation(trip uuid)`
- `public.concierge_consume(subject text, business_id uuid)`
- `public.concierge_context(business_id uuid)`
- `public.notification_claim()`
- `public.notification_delivered(provider_message text, event_type text)`
- `public.notification_result(notification uuid, provider_message text, was_accepted boolean, lease uuid)`
- `public.passenger_booking_configuration(business_id uuid)`
- `public.passenger_booking_detail(trip_id uuid)`
- `public.passenger_bookings(business_id uuid, page_number integer)`
- `public.passenger_create_booking(quote_id uuid, request_id uuid, customer_notes text, acknowledged boolean)`
- `public.passenger_notifications()`
- `public.passenger_profile(business_id uuid)`
- `public.passenger_quote(business_id uuid, vehicle uuid, journey_input jsonb)`
- `public.passenger_request_cancellation(trip_id uuid, reason_text text)`
- `public.passenger_save_profile(business_id uuid, full_name text, phone_number text)`
- `public.payment_attach(attempt uuid, session text)`
- `public.payment_failed(event_key text, attempt uuid, session text)`
- `public.payment_record(event_key text, event_kind text, attempt uuid, session text, intent text, charge text, total_minor bigint, currency_code text, refund_total bigint)`
- `public.payment_reserve(trip uuid, passenger uuid)`

## Delivery-run rehearsal update

`npm run test:repair` now provides a repeatable Docker-only validation path and runs
in CI. It confirms missing-organization refusal, unpublished settings idempotency,
production Driver refusal when pg_cron is unavailable, Passenger refusal before
Driver dependencies, successful guarded Passenger installation after original 008,
replay refusal and 32 RLS-enabled tables. The installed candidate passes all 195
local RLS/workflow assertions. The original Driver body is tested with the local
extension shim behavior; no live cron worker or successful hosted Driver installation
is claimed. No production connection is used by this command.
