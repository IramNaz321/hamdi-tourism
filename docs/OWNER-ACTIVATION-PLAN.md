# Hamid Shah — pending Owner activation

Client identity and authority were explicitly confirmed in this conversation. Execution
is separately **unapproved**. No hosted data, account or permissions have changed.

## Live read-only verification

Through the Supabase Management HTTPS API for `hzcupgjphowrzvrdffrf`:

- Auth UUID `3fac97a0-fbd2-4cca-a8ef-2272011c6106` matches
  `hamidshah3211@outlook.com` case-insensitively; confirmed, previously signed in,
  neither deleted nor banned.
- Organization `9f53250d-5e05-409d-9182-3d45448aa399` exists and is named HAMDI TOURISM.
- The account has no staff membership; no other Owner exists.
- The catalog matches the reviewed migrations 001–007. Staff RLS is enabled,
  authenticated has SELECT-only staff access, and the enabled audit trigger and
  audit function fingerprint match the reviewed reference.
- Full function/constraint/index/trigger/policy/effective-client-table-privilege
  fingerprints match stage 007. Explicit grant listings in information_schema are
  visibility-limited under `supabase_read_only_user`; empty listings are not proof
  of missing grants. Direct pg_class ACL inspection confirmed staff SELECT-only
  access. Reserved storage/realtime schema usage differs from the local shim;
  it has not been modified or automatically accepted by the strict repair runner.
- The organization's business_settings row is absent. Missing 008/009 components
  remain separate repairs, not part of Owner activation.

## Exact proposed change

[040-hamid-shah-owner.sql](../supabase/proposals/owner-activation/040-hamid-shah-owner.sql)

SHA-256: `760e62b65f606395479b580fba5b8c9650ac3cdf9b361fb93fadeb6ec5508dc6`.

The transaction locks and rechecks the exact organization, confirmed email/UUID,
account status, audit trigger, RLS and existing memberships before inserting one
active Owner membership with display name Hamid Shah. It never creates an Auth
user or organization, promotes/reactivates another membership, grants a database
role, changes an RLS policy or applies migrations. An already matching active
Owner is a no-op; conflicting membership or another Owner aborts. The existing
audit trigger creates the associated audit event.

The exact file was tested only in disposable PostgreSQL with migrations 001–007:
wrong identity refused; correct target inserted; replay produced no duplicate;
one staff audit event; RLS retained. Fixture accounts existed only in the disposable
container. No fixture was sent to Supabase.

## Execution access and acceptance

The configured access token successfully ran read-only SQL through both Management
API query endpoints. The general endpoint was explicitly invoked with
`read_only: true` and `BEGIN READ ONLY`. This does not establish permission to write;
no write probe was attempted. Project-details GET returned 403, which does not
prevent the independently verified SQL reads. The general query endpoint documents
`database:write` for mutations; if approved execution is denied, the minimum extra
access is project-authorized database write/query access, not Auth user creation
or broader account-management access. No secret needs to be sent in chat.

After separate approval: re-run read-only preflight, verify this exact file hash,
execute only this transaction on the verified project, then read back the target
membership and audit event. Set server-only HAMDI_OWNER_USER_ID to the verified
UUID in the actual serving environment; HAMDI_ORGANIZATION_ID must match. No public
client-side Owner binding is added. The current strict PostgreSQL helper must not
be bypassed or portrayed as having passed its full metadata check; an HTTPS
execution must explicitly retain the same identity, conflict and schema safeguards.

Real client browser sign-in/session/logout and Admin RLS acceptance remain unverified
until exercised with an authorized genuine session. No password was requested,
used or reset. Booking repairs/configuration and Vercel deployment remain separate
approval gates. No new features or design changes were made for this proposal.
