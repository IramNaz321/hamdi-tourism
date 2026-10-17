# Connect the existing Hamdi Tourism application

Confirmed intended project: **hzcupgjphowrzvrdffrf**, URL **https://hzcupgjphowrzvrdffrf.supabase.co**. A URL alone does not configure authentication or authorize database changes. No hosted migrations, users or records have been created by this integration work.

## Secure value entry

Local development: copy `.env.example` to `.env.local` **in the repository root**, beside `package.json`. This file is ignored by Git. Do not overwrite an existing environment file. Restrict access to your machine and this file. Keep `.env.example` placeholders unchanged.

Hosting: enter the same variables in your hosting project's **Environment Variables / Secrets** settings for the correct environment. For Vercel: select the Hamdi Tourism project → Settings → Environment Variables. Never put server secrets in GitHub source, public build variables, chat, screenshots, URLs or client code. Cloud development: enter process environment values securely in this cloud environment's settings; saved draft requirements do not supply values or activate configuration until reviewed, saved and published.

| Variable                               | Where to obtain the value                                                                                   | Scope                                                                                                                   |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | `https://hzcupgjphowrzvrdffrf.supabase.co`                                                                  | Public project address                                                                                                  |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase project → Settings → API Keys → publishable key (`sb_publishable_…`); legacy `anon` also supported | Public, protected by database RLS                                                                                       |
| `SUPABASE_SERVICE_ROLE_KEY`            | Same project's secret API key (`sb_secret_…`) or legacy `service_role`                                      | Server only, bypasses RLS; required for staff invitations/media signing/public enquiry ingestion, not normal Admin CRUD |
| `HAMDI_ORGANIZATION_ID`                | Actual `organizations.id` after real-owner bootstrap                                                        | Server-side website business selector                                                                                   |
| `NEXT_PUBLIC_SITE_URL`                 | Exact website origin, e.g. local `http://localhost:3000` or your actual HTTPS deployment origin             | Auth redirect origin                                                                                                    |

The existing variable name `SUPABASE_SERVICE_ROLE_KEY` accepts the modern secret key as well as the legacy service-role key. Never use either as a publishable key. Validation rejects elevated keys for session clients, but do not enter any secret under a `NEXT_PUBLIC_` name: Next.js exposes those at build time.

Restart development after configuration changes. Redeploy/rebuild production when public variables change, because browser configuration is compiled into bundles. No new design or project is required.

## Database preparation and authorization

1. Open the Supabase dashboard and confirm the project reference **hzcupgjphowrzvrdffrf**. Check existing schema/migration history and backups before applying changes. Never reapply migrations already executed; dashboard SQL editor runs are not automatically recorded in the CLI migration ledger.
2. Obtain explicit authorization to apply pending migrations to this project. The application never auto-runs migrations on startup.
3. For a new empty project, run the seven files in `supabase/migrations/` in ascending filename order in its SQL Editor. They define tenant relationships, indexes, roles/RLS, audit/history, business settings, pricing/enquiries, private storage/Realtime and scheduling constraints. They do not seed business operations. For a CLI-managed project, link with `supabase link --project-ref hzcupgjphowrzvrdffrf`, review `supabase db push --dry-run`, then run `supabase db push` only after authorization. Enter database passwords in the CLI's secure prompt, never command arguments or tracked files.
4. Never execute `supabase/tests/*` against this project; these files are disposable local tests with synthetic fixtures.

## Provision the real owner

In Supabase Authentication → Users, invite/create the client's real owner using their actual email and a verified email/invitation flow. No default account or password is supplied. A confirmed Auth user does not automatically become an Admin.

After authorization, use `supabase/bootstrap-owner.sql` once: replace its UUID/name placeholders locally in the SQL editor with that **confirmed real user's** UUID and display name. It creates only the organization and owner membership. It creates no customers, vehicles, drivers, bookings, route fares, GPS positions or revenue. If membership already exists, skip bootstrap. Obtain the resulting organization UUID from Table Editor → organizations, and set `HAMDI_ORGANIZATION_ID`.

Set Authentication → URL Configuration → Site URL to the real website origin, matching `NEXT_PUBLIC_SITE_URL`; allow that origin's `/auth/confirm` and `/auth/callback`. Configure SMTP and Invite/Reset Password token-hash templates exactly as documented in README. Disable public signup and configure the password policy. Sign in through `/login`; protected Admin routes validate Auth identity and active database membership. Owner settings/staff controls check the owner role; operational writes use the user's session and RLS rather than a service client.

Drivers, vehicles, customers, bookings, locations, routes, fares and Business Settings are already connected to PostgreSQL through the existing management pages. Add only genuine authorized business records. New organization dashboard totals remain zero, with empty lists until real records exist. Revenue remains zero without trusted payment-provider events.

## Verify after secure configuration

Run from the repository root:

```bash
npm run check:supabase -- --project-ref hzcupgjphowrzvrdffrf
```

This read-only command loads ignored `.env.local` if present, checks the project matches, probes Auth, checks anonymous reads, and checks table availability/owner membership/private storage if the server key is present. It prints no key, token, customer details or email. It neither applies migrations nor creates records. Exit failure means configuration/access checks are incomplete. Passing is not proof that all RLS policies or login flows work.

After migrations, `supabase/verify-setup.sql` provides read-only SQL Editor checks for required tables, RLS flags/policy counts, key functions, private storage and Realtime publication. Inspect policy definitions as part of hosted role-isolation testing; policy counts alone do not prove access is secure.

Then perform hosted checks in `docs/LAUNCH.md`: real owner login, dashboard, logout, protected-route rejection, recovery email/link, session refresh and actual authorized CRUD/role isolation. A fresh owner must see empty records and zero totals. No simulated success is accepted. Public enquiries additionally require real Turnstile keys; this is separate from Admin login and CRUD. Configure `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and server-only `TURNSTILE_SECRET_KEY` when enabling the public form.

## Current development setup: GitHub Codespaces

The owner reports no production deployment, no recorded migrations and no verified owner account. Treat hosted setup as incomplete. A dashboard showing “No migrations” does not rule out manually executed SQL; inspect Table Editor before any migration.

1. In Codespaces, open port **3000** using **Ports → Open in Browser**. Copy only its HTTPS origin (typically `https://<codespace-name>-3000.app.github.dev`). Use this exact actual origin for `NEXT_PUBLIC_SITE_URL` and Supabase Authentication → URL Configuration → Site URL. Do not use the cloud machine's `localhost` for emailed links. Add this origin's `/auth/confirm` and `/auth/callback` to the redirect allowlist. Keep port visibility private for development; the real owner must be able to authenticate to the Codespace to open emailed links. A different Codespace has a different origin and requires updating these settings.
2. Open `.env.local` in the Codespaces editor. If absent, copy `.env.example` first. Enter the confirmed project URL and its real publishable key. Enter the server key only as `SUPABASE_SERVICE_ROLE_KEY`, never with a `NEXT_PUBLIC_` prefix. Leave the organization UUID unset until owner bootstrap. These local values are not committed. For GitHub-managed persistent credentials, use repository-scoped **Codespaces secrets**, then restart the Codespace so they are injected as process environment variables. Never place them in Actions workflow source or devcontainer JSON.
3. Confirm Table Editor has no application tables and review all seven migration files. Stop here for explicit authorization; neither the app nor the preflight runs migrations automatically.
4. After authorized migration application, configure invite/recovery templates and SMTP as above, disable public signup, and invite the real owner from Authentication → Users. Have that person follow the real email link and set their own password. Membership is still pending until bootstrap. Verify the Auth user's email is confirmed; do not invent a verified owner.
5. After authorized real-owner bootstrap, copy the actual organization UUID into `.env.local` / Codespaces environment. Restart `npm run dev`, run the read-only preflight, and sign in to `/login` as that owner. Confirm the dashboard has zeros and management lists are empty.
6. Test genuine owner logout/recovery and the hosted acceptance checklist. Enter only actual client-approved operational records. Configure a future production origin separately when the website is deployed.

No migration or bootstrap authorization is assumed from these instructions.
