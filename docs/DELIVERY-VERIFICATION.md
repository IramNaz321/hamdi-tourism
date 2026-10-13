# Client delivery verification

## Completed code and local verification

The existing website and Admin implementation are preserved. The car fallback illustration has tap/keyboard rev animation, original synthesized audio, persistent mute, reduced-motion and mobile support. Public browser checks validate interaction/audio startup and stop using real browser APIs, not simulated business records.

Driver portal code now provides role-protected mobile trip lists, scoped passenger contact, pickup/destination navigation and acceptance/arrival/pickup/completion controls. The separately staged SQL proposal scopes all reads/writes to the logged-in active driver and their assignment. It grants no driver access to the management bookings/customers directory, rejects wrong-order and duplicate transitions, retains progress timestamps, and uses existing booking validation/audit triggers. Trip completion removes the trip from the active list. Data refresh uses 20-second visible-tab polling/manual refresh, not a claimed GPS stream. Reassigned progress requires dispatcher review rather than silently applying another driver's events.

Proposal SQL was exercised only in disposable PostgreSQL alongside the seven migrations. 87 database assertions pass, including ten driver access/transition checks. Unit validation/permissions tests, lint, TypeScript and production compilation pass. Existing browser tests cover unconfigured public/protected routes; hosted owner/driver browser sessions remain untested.

## Blockers and unimplemented requirements

This environment still has no `SUPABASE_DB_URL`; application keys are placeholders, and OpenAI/Stripe credentials are missing. Codespaces secrets are not present here. The hosted schema, data, RLS and confirmed Auth UUID are not verified by this environment. No owner display name or role-assignment authority has been confirmed. No account/permission changes, hosted migration/proposal application or production deployment ran.

Admin code exists, but actual owner login/logout/recovery, SMTP/invitations, settings, operational CRUD and role isolation remain hosted acceptance work. Additional requested airline/arrival metadata, driver availability UI, guest booking confirmation/access, English/Arabic website localization, full live driver/passenger GPS, Stripe and OpenAI are not complete. Do not label the phases or the site production-ready. Vehicle/fare availability and payment/GPS status must never be fabricated to satisfy missing configuration.

## Execution once access and approvals are supplied

1. Securely inject a appropriately scoped project database URI and real application environment variables into this execution environment, separately from Codespaces. Use verified TLS and the exact project reference. The agent runs `npm run db:audit` and `npm run check:supabase -- --project-ref hzcupgjphowrzvrdffrf`; no SQL copying by the client is required.
2. Run the read-only owner plan for UUID `988e629b-6770-4b93-b9ba-7c1bce325680`. Confirm its actual Auth status/membership and existing organizations. Present findings and the concrete plan. Obtain the real name, client authority and explicit execution approval before bootstrap. Never create a duplicate user or organization.
3. Test genuine owner sessions and real Admin workflows. Hosted writes require approved genuine client inputs; local fixtures never enter Supabase. Approve migration-ledger baselining separately where appropriate; original SQL is never replayed solely because the ledger is empty.
4. Review the driver proposal against the verified deployed schema and obtain explicit mutation approval. The agent can execute the approved file from a trusted runner, with migration-history recording handled by an approved migration workflow. Do not run proposal SQL at application startup or merge time. Validate genuine driver assignments/transitions and all hosted role denials before releasing it.
5. Implement/review the remaining guest authorization/GPS/provider schema and obtain approval for each database change. Add secure OpenAI/Stripe configuration only in server secrets. Configure exact HTTPS origins, Auth templates/SMTP and client-approved legal content. Test provider signatures, payment replay/refunds, verified guest access, GPS consent/staleness/revocation and language behavior before enablement.
6. Select the production hosting project and actual origin. Configure runtime secrets there, run `npm ci`, required checks and `npm run build`, complete docs/LAUNCH.md against staging, and present the exact release plus rollback plan. Obtain explicit production deployment approval. Deploy that verified commit, smoke-test the live public/owner/driver/passenger flows and monitor failures. Merging this PR alone neither migrates Supabase nor deploys hosting.

Targeting same-day delivery does not remove these verification/approval gates.
