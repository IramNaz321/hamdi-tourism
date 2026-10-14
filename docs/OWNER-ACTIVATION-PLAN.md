# Hamid Shah — pending Owner activation

**Owner activation is now verified complete. Do not replay the activation transaction.**
Client identity, authority and execution of the exact transaction at commit `184de64`
were explicitly approved. The agent's earlier write attempt was denied; the client
subsequently reported executing it successfully in the correct Supabase SQL Editor.
Fresh read-only database verification now confirms exactly one matching active Owner
membership and one matching INSERT audit event, with no other Owner and RLS retained.
No database writes were performed by the agent during this verification run.

## Live read-only verification

Through the Supabase Management HTTPS API for `hzcupgjphowrzvrdffrf`:

- Auth UUID `3fac97a0-fbd2-4cca-a8ef-2272011c6106` matches
  `hamidshah3211@outlook.com` case-insensitively; confirmed, previously signed in,
  neither deleted nor banned.
- Organization `9f53250d-5e05-409d-9182-3d45448aa399` exists and is named HAMDI TOURISM.
- The account has exactly one active Owner membership in the specified organization,
  with display name Hamid Shah and matching email. Exactly one associated staff INSERT
  audit event exists; no other Owner exists. Staff RLS remains enabled.
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

The network-secret requirement is saved with a bound value and destination
`api.supabase.com`; the value is delivered in the current runtime. A fresh additive
draft save succeeded against the latest settings without changing unrelated fields.
The draft requires publication; available controls cannot publish or discard stale
unsaved browser-form edits. Saved/runtime delivery is verified, publication is not.

The approved write request was denied (HTTP 400, write-permission error). A subsequent
SELECT-only capability check, even with `read_only: false`, ran as
`supabase_read_only_user` with `transaction_read_only=on`, no staff INSERT/UPDATE and
no organization/Auth-identity lock privileges. This is an execution-access blocker,
not a missing network-secret binding. Do not retry writes or escalate privileges.
The minimum external prerequisite is a legitimate project-authorized database-write
query execution channel (`database:write` where scoped access is supported), supplied
securely. Merely re-entering the same read-only token does not establish that access.
Project-details GET denial is distinct from the successfully verified SQL reads.

Current readiness reads confirm the organization and active Owner membership exist,
business_settings has no organization row, Driver and Passenger modules and the
booking-configuration RPC are absent, and pg_cron is not installed. Existing ordered
010/020/030 candidates remain separately unapproved. Do not replay 001–007, enable
booking without real published configuration, or mix those repairs into Owner activation.

No Vercel token/project/organization binding or callable hosting integration is
available; GitHub reports no deployments for this repository. Hosting and genuine
Owner/browser-session acceptance remain external gates, not successful deployments.

## Server binding and login acceptance

After live membership verification, the approved HAMDI_OWNER_USER_ID was configured
only in ignored `.env.local`, preserving other values and restricting file mode to
0600. The existing organization binding matches. The application Owner-binding gate
accepts the approved identity; `check:handover` reports no missing core configuration.
A reusable environment-variable requirement/suggestion was also saved in the Codex
draft; publishing or activation on other machines is not verified. No client bundle
or tracked source contains the configured Owner identity as a runtime fallback.

The local Next.js server was restarted and `/login` returned 200; anonymous `/admin`
returned 303. Live HTTPS preflight now confirms active Owner membership and public
Auth-key acceptance. It still flags hosted signup enabled versus application
registration disabled; no Auth settings were changed. These checks do not prove a
real password login, authenticated dashboard render, session refresh or logout.
No genuine Owner session token is available and no client password was requested,
used or reset. No fabricated or service-key-impersonated login was attempted.

Codespaces and Vercel have separate server settings. This task cannot propagate the
ignored local environment file to those machines; their Owner binding and exact Auth
callback origin must be configured and verified before client acceptance there.
Use the client's own existing sign-in; do not repeat Owner activation.

## Next database and deployment gates

Owner activation no longer needs execution access. Missing settings and 008/009
booking/Driver/Passenger repairs still require their own approval and authorized
write execution. Existing ordered proposals remain unchanged; never replay 001–007
or fabricate published inventory/fares/policies. Missing business settings does not
itself block baseline Admin authentication; the Admin layout has an appearance
fallback when no row exists.

Vercel access/project configuration and an authorized genuine browser session are
unavailable. No production deployment or public URL is verified. Prioritize approved
booking repairs and real host configuration next, without adding features or redesign.
