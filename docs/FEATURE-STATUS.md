# Client implementation and verification status

## Verified code and local checks

The existing Admin dashboard, operational management, role-controlled staff invitations, website settings, authentication/session routes and seven database migrations remain in place. Local tests use disposable fixtures only; no hosted customer, driver, booking, fare, revenue or GPS record has been generated. Passing local tests does not certify the client's hosted Supabase project.

The homepage's existing car illustration now has user-triggered synthesized engine-rev audio, body animation, keyboard activation, explicit mute with a persistent local preference, reduced-motion support, audio cleanup on mute/tab hiding/unmount, and mobile controls. No autoplay, microphone permission, external media asset or claim about the client's actual fleet is involved. This remains a detailed vector illustration, not a photographic vehicle or 3D model. The interaction currently accompanies the illustration fallback; published destination-photo heroes do not yet include it.

Automated browser checks validate actual AudioContext startup/closure, absence of autoplay, muted animation, preference persistence, keyboard access and reduced motion on desktop and mobile. These checks do not substitute for subjective audio/visual approval or physical-device Safari testing.

## Hosted verification and owner gate

Client-reported existing confirmed Auth UUID: `988e629b-6770-4b93-b9ba-7c1bce325680`. Its actual hosted state and membership have not been read from this environment because secure database access is missing. The client's real display name and authorization to assign Owner remain pending. Do not create another Auth user, duplicate an organization, promote an existing membership, or execute bootstrap without the reviewed plan and explicit approval.

The client reports manually applying migrations 001–007. The guarded catalog audit must verify that report before changing the schema. Codespaces secrets are separate from this environment. See SUPABASE-OPERATIONS.md for read-only catalog checks, baseline planning and transactional owner bootstrap. An empty migration ledger is not permission to replay SQL.

## Approved choices for planning, not mutation or deployment approval

The client selected **OpenAI** for multilingual concierge planning, **Stripe** for UAE payment planning, and location sharing only during an active assigned trip, visible to its passenger and authorized operations staff.

The planned dependency order remains:

1. Verify hosted schema and the exact Auth user, obtain confirmed owner identity/authority, approve and complete membership setup where necessary, and validate actual Admin Auth/email/CRUD/settings/staff permissions. Do not label Phase 1 complete before hosted acceptance.
2. Add a reviewed driver/passenger membership model and new additive migrations/RLS. Driver reads must expose only assigned trips and minimum passenger details; driver status changes must follow approved transitions and preserve history. A driver may submit only their own current geolocation for an active assigned trip, after explicit consent. GPS requires HTTPS and a narrowly scoped geolocation permissions header, replacing the current denial only on driver-sharing routes. Browser location sharing can pause when backgrounded or the device sleeps; do not promise continuous background tracking from a browser. Stale/low-accuracy/offline positions must be clearly labeled, and stop-sharing/trip end must revoke access and cease updates. Retention limits require client review. No invented routes or moving markers may fill absent GPS.
3. Add the actual passenger booking/account flow and passenger-to-booking authorization. Passenger tracking must be scoped to its authenticated booking; public Supabase subscription channels and guessable tracking IDs must not expose location or contact details. Realtime fallback must retain timestamps and accuracy, with no extrapolated movement presented as GPS evidence.
4. Add Stripe checkout and signature-verified, idempotent webhooks. Server-calculated genuine Supabase fares determine amount/currency. Success-page redirects do not prove payment. Verified charge/refund events must populate the existing immutable provider ledger through trusted server code, without manufacturing revenue. Obtain genuine Stripe account credentials and approve hosted payment mutations; real transactions need explicit client approval.
5. Add server-only OpenAI calls grounded in published business settings, served locations, fleet and actual route pricing. Private customer data/GPS must not be sent as public concierge context. Responses must identify unavailable data rather than invent fares, vehicle availability, bookings or flight status. Model tool access must use fixed read-only queries; tool arguments must not execute arbitrary SQL or reserve/charge anything. Enforce abuse/cost limits and privacy decisions before public enablement. Test requested languages and prompt-injection handling, including a source of truth for quotes.

No concierge endpoint, live GPS stream, Stripe payment flow or full driver/passenger portal is claimed as implemented by this status document. Those require the verified foundation, reviewed new database schema, secure provider configuration and the relevant explicit approvals.
