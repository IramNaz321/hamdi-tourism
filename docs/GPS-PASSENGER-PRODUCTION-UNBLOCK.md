# GPS, Passenger and notification production unblock — 17 October 2026

**Recovery evidence: PASS. Production migration approval: NOT GRANTED.**
No production schema, ledger, settings, booking, email or deployment change was
made.

## Verified production baseline

The prior TLS-verified, read-only Supabase audit for project
`hzcupgjphowrzvrdffrf` matched the 001–007 schema (83 reviewed catalog objects,
17 public tables with RLS); the CLI migration ledger was absent. The earlier
audit found the 008 Driver/GPS objects and 009 Passenger objects were not
installed. It also found `business_settings` has no row for the existing
organization; no row or operational data should be seeded without approval.
`verified_payments` already exists and must not be recreated.

The previous `schema_access` discrepancy was in the disposable test shim:
Supabase grants anon `USAGE` on `storage` and `realtime`, while the shim did not.
The shim now models those provider schema grants. It does not grant anon access
to `private` or change table, column, function or RLS permissions. The guarded
references were regenerated from local disposable PostgreSQL and the repair
rehearsal passed. A fresh production prerequisite comparison remains mandatory.

The latest attempted read-only production baseline invocation exited with status
1 and the repository's secret-safe wrapper returned only its generic failure
message. It made no changes. Therefore this local preparation does not claim a
fresh successful production preflight; do not apply any stage until its exact
read-only guards pass.

## Immutable, separately approved migration sequence

Do not edit or replay migrations 001–009. In particular,
`supabase/proposals/hosted-repair/040-production-infrastructure.sql` is
**superseded**: its pinned hashes are stale and its Passenger body diverges from
the current source. Never execute that combined file or merely update its hash.
Use the individual SHA-256-pinned transactional runners:

1. **Record the existing 001–007 baseline only.** `npm run db:baseline -- --apply
   --approve hzcupgjphowrzvrdffrf:baseline` records seven ledger entries only
   after the fresh schema audit reports an exact 001–007 match. It does not
   replay historical migration SQL.
2. **Install 008 Driver/GPS.** File:
   `supabase/migrations/202610120008_driver_tracking.sql`; SHA-256
   `b4224e941c97339f67da406dda898dcb7a3ea50f5b6b692e95c8c2eb339fe1e1`.
   Approval target: `hzcupgjphowrzvrdffrf:driver-tracking:b4224e941c97`.
3. **Install 009 Passenger.** File:
   `supabase/migrations/202610120009_passenger_platform.sql`; unchanged SHA-256
   `f19619e42e0ec5797afe782e21d45b0f1c6bbc59b1b1013cd76907aff5c2675c`.
   Approval target: `hzcupgjphowrzvrdffrf:passenger-platform:f19619e42e0e`.
4. **Install 010 Owner booking email outbox.** This is a new additive migration:
   `supabase/migrations/202610120010_owner_booking_notifications.sql`; SHA-256
   `1c06094e98ae593d3380f1bf1983b454fe6c530cd989c4c5589066f4ca4b52cf`.
   Approval target:
   `hzcupgjphowrzvrdffrf:owner-booking-notifications:1c06094e98ae`.

Obtain approval for each exact stage separately. The driver and passenger
migration runners require the exact prior ledger and catalog stage; the owner
runner requires the exact nine-migration stage. Each runner wraps only its own
DDL and ledger insertion in one transaction, rechecks schema/RLS/grants and the
retention worker, and rolls back the whole stage on failure. Stop and inspect
read-only if commit status is uncertain; never replay blindly. No automatic
down migration is safe after commit. Preserve production records and use an
approved forward repair if required.

Migration 010 adds a private RLS-enabled outbox, an insert-only trigger for new
genuine bookings, service-role claim/result/webhook RPCs and no public table
grants. It does not backfill existing bookings, send mail during migration,
change booking status or store passenger contact details. Each notification is
idempotently keyed by booking at the provider; status becomes `delivered` only
after the signed provider webhook confirms delivery.

After each approved stage, run the read-only audit against that exact reference.
After 008–010, verify the final 33-table catalog, RLS/ACL/RPC/index/policy
fingerprints, private Storage and Realtime, and the active once-per-minute
tracking-retention job. Real authenticated role workflows, private Realtime
delivery and device GPS remain live acceptance gates. Do not run business
acceptance tests against production without a separate written plan/approval.

## Existing backup and isolated restore evidence

The existing encrypted archive
`hamdi-tourism-20261017T100542Z-77865.dump.gpg` was decrypted directly into
`pg_restore` stdin using its existing mode-600 local passphrase file. No
plaintext archive or duplicate backup was created. On 17 October 2026,
`pg_restore --exit-on-error --single-transaction --no-owner --no-privileges`
completed against a throwaway `supabase/postgres:17.11.0.004` container using
its isolated `supabase_admin` role. The catalog check found 17 public tables,
including `bookings`, `staff_members` and `business_settings`. The container was
removed; production was untouched.

This verifies the encrypted logical archive and an isolated transactional
restore. It does not certify Supabase Auth/dashboard settings, Storage object
bytes, PITR, or a restore on a separate hosted project. Confirm the current
production recovery point and approved maintenance window before any write.

## Owner email readiness and disposable verification

The server-side worker has a fixed recipient (`Hamid.shah@mail.ru`), Resend
idempotency key, five-attempt lease/retry policy, minimal booking snapshot, and
signed delivery-event recording. Credentials/configuration remain disabled in
the current handover configuration; do not report the email as operational until
Resend's sender domain, worker secret, webhook and feature flag are configured
and tested. Migration 010 must be approved and installed first.

`npm run test:repair` passed against disposable PostgreSQL after the shim fix and
owner-notification addition, reporting 210 local RLS/workflow assertions. The
test covers new-booking queueing, passenger isolation, fixed minimum payload,
service-only claim, transient retry and provider-confirmed delivery. It sends no
real email and writes no production records.
