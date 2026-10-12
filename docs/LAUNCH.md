# Hosted acceptance and launch

The local code and SQL checks are useful evidence, but hosted login, SMTP, Supabase RLS through PostgREST and real operational CRUD require the client's real Supabase project. Complete these checks before production use:

- Apply migrations to a staging Supabase project; configure Auth templates, redirects, SMTP, password policy and signup restrictions as in README.
- Bootstrap only a real, email-verified owner. Confirm successful and failed login, refresh/expiry, sign out, invitation, password reset and expired/reused email-link handling. Confirm disabled membership blocks an already logged-in session from reads and writes.
- With client-approved staging inputs, create/edit/archive/restore drivers, vehicles, customers, locations, pricing and bookings. Check duplicate plates/licences/routes, insufficient capacity, expired licence, unavailable vehicle/driver and cross-business foreign keys. Confirm empty dashboard values on an empty account, and recorded totals after actual test transactions. Remove staging inputs according to the client’s retention policy, not from the production database.
- Use a second business organization and all four roles to attempt direct Supabase reads/writes and RPC calls. No role may change organization IDs, directly modify staff, forge audits, hard-delete records or access another organization. Verify last-owner protection and invitation failure handling with real email delivery.
- Configure real business contact details and final design. Review mobile layout, keyboard navigation and error messages with the client.
- Review privacy, consent, data retention and applicable UAE requirements with the client. Operational contact details are restricted to active staff; audit records store identifiers/changed field names only. Archive is not data erasure. Trusted project administrators need a documented lawful erasure/retention process.
- Configure HTTPS, project administrator MFA, restricted hosting access, uptime/error monitoring, backup schedules and a tested restore process. The app adds frame/object/base restrictions and security headers; it does not implement a full nonce-based CSP or staff MFA.

## Current boundaries

- No public self-service booking, payment gateway, live flight tracking, automatic dispatch or external workflow automation. Homepage enquiries use the client's configured email/phone.
- Driver/vehicle availability and pickup times are stored, but trip duration and overlap scheduling are not modeled. Dispatchers must verify conflicting assignments and the real operational schedule before confirming a booking.
- Archiving checks active references; updates on different records are not a full transactionally locked dispatch scheduler. Review concurrent dispatch workflows before high-volume use.
- Staff invitations attach newly created Auth users only. Existing Auth users cannot be automatically moved between businesses. Project administrators must investigate any existing-account conflict without exposing credentials or silently granting permissions.
- Supabase’s server key is privileged. Keep it in server hosting secrets, rotate it on exposure and never share it with staff or client-side code. Database operational access always uses the signed-in user's key/session and RLS.
- No hosted Supabase end-to-end authentication or email delivery has been validated without real credentials. Local PostgreSQL tests use synthetic, rolled-back fixtures in a disposable container; application tables receive no test/demo seed data.
