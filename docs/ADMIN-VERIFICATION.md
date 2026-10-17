# Admin readiness and remaining setup

## Code changes

Protected unconfigured routes redirect to the fixed `/login` destination. Next.js 16 requires absolute proxy redirect locations: the proxy uses the validated configured public HTTPS origin, or the framework request origin for local development. It does not build a redirect from visitor forwarding headers. Auth callback route handlers continue to use fixed relative redirects. Valid authenticated accounts reaching login are routed by their existing active membership: portal staff to Admin, drivers to Driver, missing/inactive/unknown roles to access pending. Invitations never create Owner privileges automatically. Session validation still uses Supabase `getUser`, not a client-provided role. Per-render caching avoids duplicate identity/membership reads without caching access globally.

Website origins are validated as HTTPS (loopback HTTP permitted for local development). Malformed origins, credential-bearing URLs, query/fragment/path URLs and insecure remote origins return a controlled unavailable state. When running in actual GitHub Codespaces, a validated platform name plus `app.github.dev` can determine the port-3000 origin if the configured URL is missing or loopback. Request Host/X-Forwarded-Host headers are never used to choose invitation destinations. Set the exact public HTTPS origin explicitly for production and nonstandard preview ports. Next Server Actions allow only the configured origin host, preserving CSRF protections behind Codespaces proxies; no wildcard allowlist is used.

Logout revokes this browser session (`scope: local`) rather than unexpectedly signing out every device. Supabase session cookies are still cleared through SSR and protected routes still validate active membership/RLS. Hosted session refresh, revocation and email flows remain acceptance checks, not proven by local tests.

Owner Business Settings now explains online-enquiry setup failures without displaying credentials. It checks the public connection, genuine organization UUID, website origin, actual server-key type, CAPTCHA configuration, saved/published/enabled profile, served published locations and route pricing. Database errors are surfaced rather than converted into fabricated empty data. These checks report configuration readiness only; a successful hosted challenge and genuine submission are still required.

## Why enquiries are unavailable in this environment

The application public key is a placeholder; the organization UUID and Turnstile keys are absent; the server key is also a placeholder. No real published profile, locations or route pricing have been verified from here. The UI must remain unavailable under these conditions. A configured real owner must enable and publish the profile and add genuine locations/fares; code does not bypass these requirements. Quotes do not require CAPTCHA, but submitting contact details requires the actual security check and privileged server ingestion.

## Existing management and database boundaries

Drivers, vehicles, customers, bookings, enquiries, locations, routes, prices/extras, staff and settings already use real Supabase reads/writes with role checks, input validation, organization filters and database constraints/RLS. Updates use stale-version checks where appropriate. Destructive operational deletion is intentionally denied; archive/restore preserves booking history and relationships. Authorized privacy/erasure requests need a separate reviewed retention/deletion procedure, not a portal button bypassing foreign keys or audit controls.

The seven historical migrations and separate driver proposal were reviewed and exercised only in disposable local PostgreSQL. They were not replayed on hosted Supabase. Driver/Passenger code is preserved. No hosted users, memberships, settings or operational records were created or changed.

## Actual verification and production gate

Local checks include unit validation/security tests, Codespaces origin and role-destination tests, browser tests for protected routing/headers/forms, and disposable PostgreSQL tests for tenant isolation, invitation roles, last-owner protection, archive/assignment rules, booking transitions, pricing/enquiry conversion and driver RPC permissions. A production build checks compilation; it does not prove hosted Auth/SMTP/RLS or production readiness.

This run passed ESLint, TypeScript, production compilation, 21 unit tests, 87 disposable PostgreSQL assertions and 20 desktop/mobile browser checks. The browser regression reproduced and then verified the fix for Next.js 16 rejecting relative proxy redirects.

This execution environment still lacks an active database URI and actual application credentials. The client-reported confirmed user UUID `988e629b-6770-4b93-b9ba-7c1bce325680` and manually applied migrations remain unverified here. Configure credentials securely in the active Codex environment, then run guarded read-only catalog/API checks and the existing owner plan. Confirm the real display name and client authority, review actual existing membership/organization, and obtain explicit approval before any bootstrap or permission change. Never replay original migrations merely because the CLI ledger is empty.

Configure matching Supabase Site URL/redirect allowlist, real SMTP/templates and real Turnstile hostname/keys. Complete genuine owner login/logout/recovery, staff role tests and client-approved operational CRUD in staging, without seeded production fixtures. Configure secure hosting, backups/restore, monitoring and client-approved legal content. Obtain explicit deployment approval before enabling real business use. Phase 1 is not certified ready while those checks remain outstanding.
