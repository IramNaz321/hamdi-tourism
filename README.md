# Hamdi Tourism

A Next.js App Router application for Hamdi Tourism’s UAE airport transfer and chauffeur business. React, TypeScript, Tailwind CSS v4, Lucide, Supabase Auth and PostgreSQL. There are no seeded business records or default passwords.

## Run locally

Requires Node.js 24 and npm. From the repository root:

```bash
npm ci
cp .env.example .env.local
# Configure real Supabase project values as described below.
npm run dev
```

Without Supabase configuration the public homepage works; login is visibly unavailable and admin routes redirect to login. This is intentional, not working authentication. The app has not been connected to or verified against a hosted client Supabase project yet.

## Configure Supabase

1. Create/select the client's Supabase project. Copy its project URL and **publishable** key to the two `NEXT_PUBLIC_SUPABASE_*` variables in `.env.local`. Never use a service-role key as the publishable key.
2. Apply every SQL file in `supabase/migrations/` in filename order in the SQL editor, or link the Supabase CLI to the real project and run `supabase db push`. Do not run the test fixture files against the hosted project. Migrations have no sample records.
3. In Supabase Authentication, create the **real business owner's** Auth user. Use the dashboard’s invitation/recovery process to verify their email and choose a private password. Then edit the two placeholders in `supabase/bootstrap-owner.sql` and execute it once in the SQL editor. The owner must be a verified Auth user; there is no open application signup or automatic owner creation.
4. Set the Auth Site URL to the exact public application origin. Set `NEXT_PUBLIC_SITE_URL` to that same origin; locally use `http://localhost:3000`. Allow that origin’s `/auth/confirm` and `/auth/callback` redirect URLs. Use HTTPS in production; avoid wildcard production redirects.
5. Configure custom SMTP for real email delivery. In Auth email templates use the following links. This application supports token-hash verification, not implicit access tokens in URL fragments:
   - **Invite user**: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite`
   - **Reset password**: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`
     The `/auth/callback` route also supports PKCE recovery codes. Disable email click tracking/link rewriting. Test delivery and expiry on the real project.
6. For staff invitation delivery only, set `SUPABASE_SERVICE_ROLE_KEY` in server-side environment settings. The key is imported exclusively through a `server-only` module after owner authorization. It is never sent to the browser and never used for operational CRUD.
7. Disable public Auth signups, configure a minimum 12-character password policy and appropriate Supabase Auth rate limits/CAPTCHA controls. Staff join only through owner invitations. MFA enforcement is not implemented in this version; assess the client’s authentication requirements before launch.
8. Set the real `NEXT_PUBLIC_BUSINESS_EMAIL` and/or `NEXT_PUBLIC_BUSINESS_PHONE` to enable the homepage’s email/telephone contact links. There are deliberately no fabricated contact details or public booking submission endpoints.
9. Restart the development server after environment edits. Public environment variables are baked into Next.js production bundles: rebuild after changing them.

## Management workflow

Sign in at `/login`, then use `/admin` for dashboard totals and upcoming journeys. Add locations, drivers, vehicles and customers before creating bookings. All six management areas support create, list, detail, edit, archive and restore. Lists paginate 25 rows per page; relation inputs search active records by name (30 matches at a time). Refine the search if needed. Prices and recorded payments use AED; pickup times are always interpreted and displayed in UAE time (UTC+4).

Enter the agreed booking fare explicitly, consulting route pricing as needed. This application does not charge cards, automatically track flights, or infer payment receipt. Manually update the booking/payment status when the real event occurs. Paid-fare totals are recorded sums, not accounting earnings; archived paid bookings remain included. Dashboard booking counts include all nonarchived bookings, including completed/cancelled ones.

Open bookings must be completed or cancelled before archiving. Records linked to an open booking cannot be archived. Archive active route prices before archiving their locations. Historical references remain intact; there is no hard-delete permission for business records. Restoring a booking validates its assigned records. Edits use `updated_at` to reject stale writes.

| Role       | Access                                                         |
| ---------- | -------------------------------------------------------------- |
| Owner      | All operations, invitations and staff role/access management   |
| Manager    | All operational create/edit/archive/restore; no staff controls |
| Dispatcher | Manage customers and bookings; view other operations           |
| Viewer     | Read-only operational access                                   |

The owner can invite a manager, dispatcher or viewer, then explicitly promote an existing member to owner if required. The database serializes staff changes and prevents removing the last active owner. Invitation provisioning assigns membership when Supabase creates the Auth user, not when the email is opened. A delivered invitation appears in Team members; disable access there to revoke it. An existing Auth account cannot be reinvited or silently attached to another business. Failed invitations disable any provisioned access; review the staff list and use password reset/reactivation if an Auth account already exists. Direct SQL changes are restricted to trusted project administrators.

## Validation

```bash
npm run lint
npm run typecheck
npm test
npm run test:db        # Docker required; disposable PostgreSQL 17, no hosted project
npm run build
npx playwright install --with-deps chromium
npm run test:browser  # Unconfigured environment only, desktop + mobile
```

With a system Chromium already installed, use `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:browser`. Browser tests require Supabase variables to be unset and start the production server automatically. Do not run them against a configured hosted business account. SQL tests use a minimal Auth schema/JWT shim to exercise real PostgreSQL RLS, constraints, triggers and RPCs; they **do not** validate hosted Supabase Auth, SMTP or PostgREST integration. CI runs these same checks without secrets. See [launch and security checklist](docs/LAUNCH.md) for mandatory hosted-project acceptance tests and current limitations.

## Theme and deployment

Brand tokens are centralized in `src/app/globals.css` (`--brand`, `--brand-hover`, `--ink`, `--muted`, `--canvas`, `--line`). Tailwind v4 configuration is CSS-first, with `postcss.config.mjs` supplying its plugin. The skyline/vehicle graphic is an original inline SVG illustration, not a claim about the client's actual fleet.

Deploy to a Next.js-compatible Node host or Vercel. Configure environment values, run `npm ci && npm run build`, and run `npm start` for a Node deployment. Apply migrations before accepting admin traffic. Protect project/dashboard access, enable backups and verify restore procedures. No Supabase credentials belong in Git, screenshots or pull requests.
