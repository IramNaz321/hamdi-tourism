# Authorized live tracking and road routing

The cinematic homepage is an original marketing visualization. Its route glow, pins and mini-preview are decorative, not GPS, traffic, ETA or a passenger booking. Real tracking remains at `/track/[booking UUID]`, the Driver portal and authorized Admin monitoring. `/track` provides a working entry point and links to the passenger's bookings; knowing an ID does not grant access.

## Existing real GPS

The existing device controller requests browser GPS only after explicit driver consent. The Supabase RPC verifies active staff/driver assignment, trip phase, sharing eligibility, freshness and permitted passenger/Admin access. Private Realtime messages trigger an authorized snapshot refetch; periodic refetch is the fallback. Consent withdrawal, assignment/end-state changes, permission denial, sign-out and offline/background conditions clear or stop client tracking. Coordinates and accuracy come from the real device/backend; no simulated movement, flight status or ETA is shown. Existing privacy and retention SQL remains unchanged.

## New optional route estimates

`POST /api/tracking/route` uses a confirmed authenticated session and the existing RLS-protected `tracking_snapshot` RPC. Only `tripId` is accepted; caller coordinates, goal, role and organization are rejected. The returned snapshot must match that trip. It rejects missing/revoked sharing, ended trips, stale/future GPS, accuracy worse than 200 metres, or missing actual endpoint coordinates. It routes toward pickup before boarding and toward the destination after pickup/handover.

The server contacts openrouteservice's fixed HTTPS driving-car GeoJSON endpoint using a **server-only** key. It validates geometry, coordinate ranges, summary metrics, response-size limits and endpoint proximity. It rechecks the actual trip authorization/freshness after provider completion or cache lookup. Revocation blocks the response and clears that cached route. Failures return **ETA unavailable**, never a straight-line guess or invented minutes.

Road routes are cached privately for at most 60 seconds, with timed deletion, no-store HTTP responses, bounded memory and in-flight deduplication. Client requests run at most once per minute per enabled trip; moving driver markers continue to use fresh actual GPS snapshots independently. Same-origin validation, per-account limits and a provider request budget protect the endpoint. Per-process controls alone do not constitute a global quota on multiple hosting instances: enforce account quotas/spend limits at the provider as well. Abort/timeout stops work where supported; coordinates already received by a provider are governed by its privacy terms.

Opening the map remains an explicit action connecting to OpenStreetMap tiles. A separate route-estimate checkbox discloses coordinate sharing with the configured provider. Turning it off clears derived routes and stops further requests. Driver consent copy also discloses optional routing. Route lines are provider geometry; distance is road distance; ETA is the provider's duration estimate rounded to minutes. The UI states the calculation time, one-minute refresh interval and **no live traffic**. Stale GPS, missing configuration and disconnected states remain explicit.

## Secure configuration, not enabled during this run

- Configure `ORS_API_KEY` only in secure server environment secrets, never a `NEXT_PUBLIC_` binding, client bundle, chat or Git.
- `ROUTING_ENABLED=false` is the default. Enable only after the client approves the provider/account/privacy/usage and genuine staged acceptance.
- `ROUTING_PROVIDER_REQUESTS_PER_MINUTE=10` is the default per-process provider ceiling; accepted range 1–35. Choose a value within the real account's limits. Invalid configuration fails closed. Provider-enforced quotas remain required.
- Allow `api.openrouteservice.org` HTTPS egress on the authorized hosting/runner when enabling this service. Do not replace unknown network rules or bypass the environment's proxy policy.
- Keep the application's genuine Supabase bindings and exact HTTPS site origin. Codespaces values are separate from Codex bindings.
- Verify migrations 008–009 and their actual RLS/Realtime/retention/catalog state through the guarded read-only operations before approving any missing SQL. No migration was executed for this code change.

No routing key/enablement or real test device was available during this run. No provider request containing real GPS, hosted trip/record, charge or message was created. Unit tests use explicitly local fixture projections and provider-response shapes; browser checks use credential-free builds. Existing 195 disposable SQL assertions check tenant, driver, passenger, lifecycle and privacy rules. These checks do not certify hosted Realtime, provider routing, physical-device behavior, private Auth setup or an actual Owner login.

## Owner access hardening

Application staff controls cannot promote anyone to Owner or modify an Owner account. Driver roles cannot be converted through ordinary staff forms. Owner-controlled manager/dispatcher/viewer permissions remain intact. Existing hosted `set_staff_access` may still allow an authenticated Owner to create another Owner directly; application hiding or action validation is not a database guard. `supabase/proposals/client-owner-lock.sql` is a **review-only proposal**, not an applied migration. It protects the existing Owner and disallows extra Owner grants through that RPC. Verify its exact hosted baseline, convert it into an approved migration/reference update and test before executing with explicit client authorization. Do not apply it blindly or assume it is already enforced by hosted SQL.

The client account's identity and Owner authority remain unconfirmed. No default account/password, public Admin signup, role auto-grant or developer backdoor was added. No hosted permission was changed. This database hardening and genuine Owner onboarding are launch blockers.
