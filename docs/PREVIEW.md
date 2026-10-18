# HAMDI TOURISM — client-review preview

This is a review of the existing website, **not a live booking launch**. Production
has no published fleet/fares yet. Do not demonstrate invented reservations, prices,
accounts or tracking, and do not enable providers for a presentation.

## Open the existing Codespace

In `/workspaces/hamdi-tourism`:

```bash
git status --short
git pull --ff-only origin feat/hamdi-tourism-application
```

Do not reset/stash/overwrite local changes, certificates or `.local-backups`.
If Git reports a conflict, preserve the existing workspace and stop the update;
the previously running preview can still be shown. No dependency changes are
required by this sprint. If dependencies are missing, use `npm ci`.

If port 3000 is already running, open **Ports → 3000 → Open in Browser**. Otherwise:

```bash
GROQ_CONCIERGE_ENABLED=false NOTIFICATION_EMAIL_ENABLED=false STRIPE_LIVE_PAYMENTS_APPROVED=false npm run dev
```

These flags affect only this preview process; they do not edit private configuration.
Confirm the terminal reports port **3000**. If it offers 3001 because 3000 is in use,
open the existing 3000 service rather than starting duplicate servers. Codespaces
provides the exact HTTPS browser URL; do not substitute localhost or invent a URL.
Keep forwarding **Private**. Use an authorized GitHub session or screen-share for
client review; changing port visibility/public deployment needs separate approval.
This Codex integration cannot access that Codespace (previous HTTP 403); it cannot
verify or start the remote server on the client's behalf.

## Five-minute review

1. `/`: approved Dubai homepage, branding, four marketing categories and contact.
2. `/book`: clear unavailable-booking state until genuine configuration is published.
3. `/fleet`: genuine published vehicles only; an empty list is expected without them.
4. `/login`, `/passenger/login`, `/passenger/register`: real account forms. Use only
   an authorized existing account privately; do not share passwords. Registration
   and recovery require configured Auth/CAPTCHA/email services.
5. `/admin`, `/driver-account`, `/passenger`: unauthenticated visitors must redirect
   to login. Genuine dashboards need the appropriate verified account/membership.
   A protected-route redirect is not a dashboard login success.
6. Tracking/AI/email remain unavailable or disabled until their live acceptance.
   Do not submit bookings, invitations, registration or recovery emails merely to
   demonstrate forms; those actions need genuine data and the required approval.

If a genuine Owner session works, follow [Owner operating guide](OWNER-OPERATING-GUIDE.md)
to enter actual business records. This task does not mutate Owner identity/config.

## Publishing later

No production deployment was approved or performed. Publishing needs authorized
hosting/domain access, HTTPS environment configuration, exact Supabase Auth redirect
URLs, genuine business configuration and real-role acceptance. Booking emails need
verified recovery plus separately approved **010 → 012** and a separate test-send
approval. Do not apply 011 as part of email setup.

## Email and recovery status for this review

The developer reports encrypted archive integrity passed and both archive/key were
retained on their Mac. Full compatible restore remains blocked by missing `pg_cron`
in plain PostgreSQL 17; this sprint did not retry or resolve that restore. Use a
compatible Supabase restore environment and preserve ownership/ACLs, not a skipped
extension or ignored restore errors. This does not block a safe public UI review.
010/012 remain prepared but unexecuted; 011 is not needed for booking emails.
The exact single standalone test draft is available through the offline
`npm run check:booking-email`; sending still requires separate approval.

## Sprint verification

112 unit tests, 223 disposable database assertions in both database suites,
82 desktop/mobile browser tests, TypeScript, ESLint and production build passed.
A fresh `npm run dev` smoke test returned 200 for the homepage, fleet, booking and
login pages; `/book` showed its honest unavailable message. All three protected
portals redirected anonymous visitors to login. The local smoke server was stopped;
no external preview URL, real account login or provider delivery was verified here.
