# V2 Implementation Backlog

Created: **22 October 2026**

Requirements baseline: [Locked V2 root requirements](ROOT-REQUIREMENTS.md).

## Purpose and scope

This is the single implementation backlog for **Customer, Driver, and Owner**, including public discovery and the shared capabilities needed to connect their journeys. It replaces the earlier customer-only backlog. Existing CUST identifiers remain stable.

The role model and module ownership are locked in the root requirements. The sequence, feature details, and supporting shared work below are proposed implementation scope, not additional locked product decisions. Resolve open behavior choices when an item is selected without reopening already approved requirements.

## Working rules

- The user picks the next item; implement one selected item at a time. Keep only one item **In progress**.
- Follow the global order unless the user selects another item whose dependencies are satisfied. IDs identify features; the Order column determines sequence.
- V2 starts from scratch. Use the locked V2 requirements and approved V2 designs as the baseline; do not treat the legacy application as the implementation or design target.
- Build each selected V2 feature through UI, server, database permissions, and relevant integrations as needed. Legacy code reuse is not assumed.
- Resolve only product choices that materially affect the selected feature; record decisions here or in a linked feature specification.
- Customer accounts access their own records; Drivers access their assignments and permitted history; Owners have business-wide management access. Never automatically elevate legacy staff accounts.
- Verify acceptance criteria and record evidence before marking an item Done. Record hosted rollout and provider acceptance separately from local checks.
- Update status, decisions, blockers, completion evidence, and the next eligible item after each implementation cycle.

Statuses: **Queued → In progress → In review → Done**. Use **Blocked** with a concrete reason and the decision or dependency needed to proceed.

Dependencies identify required V2 capability contracts. Verify them against the V2 acceptance criteria. A feature whose criteria cannot yet be verified stays In review or Blocked rather than being marked Done.

## Approved customer journey

**Standard transfer:** Browse → Journey details → Vehicle & fare → Customer details / sign in → Review & book → Payment when eligible.

- Browsing, journey entry, and fare/vehicle selection are public. Preserve selections through sign-in or registration; authentication is required before submitting a booking.
- The quote action continues to customer details and booking review, never to an enquiry. Create a booking directly through CUST-006 without requiring a CUST-003 or OWN-011 record.
- Enquiries are a separate, optional branch for custom routes, unavailable automatic pricing, or special requests requiring a tailored quote. Ordinary optional notes and configured extras stay in the standard booking flow.
- A custom request requires contact details and abuse protection but no login. Its receipt is a quote-request reference, not a booking confirmation.
- Booking submission, operational confirmation, and payment success remain distinct states. Payment follows booking creation when eligible; exact eligibility and confirmation policy remain to be specified.
- First customer booking milestone: CUST-001, CUST-002, CUST-004, CUST-005, CUST-006, CUST-008, and CUST-009 with their supporting capabilities. Custom quote work is not a prerequisite.

## Frontend prototype milestone — 22 October 2026

The approved customer and Owner request-handling flows are implemented in [frontend-v2](../../frontend-v2/README.md), using shared localStorage records and tab-local demo identities. Verified paths include direct booking, payment simulation, Owner assignment/confirmation, cancellation with separate refund, and custom quote acceptance into a booking. Drivers and fleet are seeded operational resources; full management and a Driver workspace remain future work.

This milestone covers frontend behavior only. The full-delivery statuses below remain queued for backend, authentication, provider integration, and production acceptance. See the prototype README for testing steps and API-CONTRACT.md for the integration boundary.

## Ordered backlog

| Order | ID | Role | Feature | Depends on | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | CORE-001 | Shared | Three-role authorization foundation | — | Queued |
| 2 | CORE-002 | Shared | Authentication and portal entry | CORE-001 | Queued |
| 3 | OWN-001 | Owner | Owner onboarding and access management | CORE-002 | Queued |
| 4 | OWN-002 | Owner | Business details and operational policies | OWN-001 | Queued |
| 5 | OWN-003 | Owner | Website content, branding, and media | OWN-002 | Queued |
| 6 | OWN-004 | Owner | Locations and served destinations | OWN-002 | Queued |
| 7 | OWN-005 | Owner | Transfer routes and journey durations | OWN-004 | Queued |
| 8 | OWN-006 | Owner | Fleet and vehicle capacity | OWN-002 | Queued |
| 9 | OWN-007 | Owner | Route fares and return pricing | OWN-005, OWN-006 | Queued |
| 10 | OWN-008 | Owner | Optional extras and charges | OWN-007 | Queued |
| 11 | OWN-009 | Owner | Fare review and publication | OWN-007, OWN-008 | Queued |
| 12 | OWN-010 | Owner | Customer booking platform configuration | OWN-002, OWN-009 | Queued |
| 13 | CUST-001 | Customer / Public | Browse services, fleet, and destinations | OWN-003, OWN-004, OWN-006 | Queued |
| 14 | CUST-002 | Customer / Public | Get a transfer quote | CUST-001, OWN-009, OWN-010 | Queued |
| 15 | CUST-004 | Customer | Customer registration, sign-in, and recovery | CORE-002, OWN-010 | Queued |
| 16 | CUST-005 | Customer | Manage customer profile | CUST-004 | Queued |
| 17 | OWN-012 | Owner | Customer records and booking relationships | OWN-001 | Queued |
| 18 | OWN-013 | Owner | Booking records and lifecycle management | OWN-012, OWN-005, OWN-009 | Queued |
| 19 | CUST-006 | Customer | Review and book a one-way transfer | CUST-002, CUST-004, CUST-005, OWN-013 | Queued |
| 20 | CUST-007 | Customer | Book return transfers and optional extras | CUST-006, OWN-008 | Queued |
| 21 | CUST-008 | Customer | View upcoming bookings and booking details | CUST-006 | Queued |
| 22 | CUST-009 | Customer | Pay for a booking and view payment status | CUST-008, OWN-010, OWN-013 | Queued |
| 23 | OWN-017 | Owner | Payments, refunds, and verified revenue | CUST-009 | Queued |
| 24 | CUST-010 | Customer | View booking and payment history | CUST-008, CUST-009 | Queued |
| 25 | CUST-003 | Customer / Public | Request a custom quote or special arrangement | CUST-002 | Queued |
| 26 | OWN-011 | Owner | Enquiry review and manual quotes | CUST-003, OWN-009, OWN-013 | Queued |
| 27 | OWN-014 | Owner | Driver records and account invitations | OWN-001 | Queued |
| 28 | DRV-001 | Driver | Driver account and profile | CORE-002, OWN-014 | Queued |
| 29 | DRV-002 | Driver | Manage availability | DRV-001 | Queued |
| 30 | OWN-015 | Owner | Driver and vehicle assignment and scheduling | OWN-013, OWN-006, OWN-014, DRV-002 | Queued |
| 31 | DRV-003 | Driver | View assigned trips | DRV-001, OWN-015 | Queued |
| 32 | DRV-004 | Driver | View trip details | DRV-003 | Queued |
| 33 | DRV-005 | Driver | Update trip progress | DRV-004 | Queued |
| 34 | CUST-012 | Customer | View assigned driver, vehicle, and trip progress | CUST-008, OWN-015, DRV-005 | Queued |
| 35 | DRV-006 | Driver | Consent-based trip location sharing | DRV-005 | Queued |
| 36 | CUST-013 | Customer | Track the driver live | CUST-012, DRV-006 | Queued |
| 37 | OWN-018 | Owner | Live operations and tracking oversight | OWN-015, DRV-005, DRV-006 | Queued |
| 38 | CUST-011 | Customer | Request a booking cancellation | CUST-008, CUST-009, OWN-002 | Queued |
| 39 | OWN-016 | Owner | Cancellation review and resolution | CUST-011, OWN-013, OWN-017 | Queued |
| 40 | DRV-007 | Driver | View trip history | DRV-005, OWN-016 | Queued |
| 41 | OWN-019 | Owner | Business dashboard | OWN-013, OWN-015, OWN-017, OWN-018 | Queued |
| 42 | OWN-020 | Owner | Operational and financial reports | OWN-019, OWN-016 | Queued |
| 43 | CORE-003 | Shared | Booking and operational notifications | OWN-013, OWN-015, OWN-016, OWN-017, DRV-005 | Queued |
| 44 | CUST-014 | Customer / Public | Get travel concierge assistance | CUST-001, CUST-002, CUST-008 | Queued |
| 45 | CORE-004 | Shared | Cross-role acceptance and rollout readiness | All preceding items | Queued |

## Module coverage

| Role | Locked module | Backlog coverage |
| --- | --- | --- |
| Customer | Account & Profile | CUST-004, CUST-005 |
| Customer | Browse Services & Fleet | CUST-001 |
| Customer | Quotes & Enquiries | CUST-002, CUST-003 |
| Customer | Book a Trip | CUST-006, CUST-007 |
| Customer | My Bookings | CUST-008, CUST-010, CUST-012 |
| Customer | Payments | CUST-009, CUST-010 |
| Customer | Live Tracking | CUST-013 |
| Customer | Cancellation Requests | CUST-011 |
| Customer | Travel Concierge | CUST-014 |
| Driver | Account & Profile | DRV-001 |
| Driver | Availability | DRV-002 |
| Driver | Assigned Trips | DRV-003 |
| Driver | Trip Details | DRV-004 |
| Driver | Trip Progress | DRV-005 |
| Driver | Location Sharing | DRV-006 |
| Driver | Trip History | DRV-007 |
| Owner | Dashboard | OWN-019 |
| Owner | Enquiries & Manual Quotes | OWN-011 |
| Owner | Bookings & Scheduling | OWN-013, OWN-015, OWN-016 |
| Owner | Customers | OWN-012 |
| Owner | Drivers | OWN-014 |
| Owner | Fleet | OWN-006 |
| Owner | Locations & Routes | OWN-004, OWN-005 |
| Owner | Pricing & Extras | OWN-007, OWN-008, OWN-009 |
| Owner | Live Operations | OWN-018 |
| Owner | Payments & Revenue | OWN-017 |
| Owner | Reports | OWN-020 |
| Owner | Website & Branding | OWN-003 |
| Owner | Business Settings | OWN-002, OWN-010 |
| Owner | Access Management | OWN-001, CORE-001, CORE-002 |

Owner passenger-platform configuration is covered by OWN-010, and owner-only fare review by OWN-009. Shared notifications and final acceptance support all three roles rather than adding a fourth role.

## Shared feature scope and acceptance

### CORE-001 — Three-role authorization foundation

**Outcome:** Enforce the locked Customer, Driver, and Owner model throughout the application.

- Define fresh V2 role checks, routes, database permissions, and account onboarding; legacy accounts are not an automatic migration dependency.
- Align server authorization, database policies, and navigation with the three target roles; enforce business and record ownership on every access path.
- Exclude Manager, Dispatcher, and Viewer from the V2 role model; any later legacy-account import requires an explicit mapping decision without automatic Owner promotion.
- Verify direct requests and record access across roles, including revoked accounts and existing sessions.

### CORE-002 — Authentication and portal entry

**Outcome:** Provide secure access and correct portal routing for all three roles.

- Support sign-in, sign-out, password recovery, session expiry, verified-account checks, and disabled-account states.
- Route each authorized account to the appropriate portal; public registration must never grant Owner or Driver permissions.
- Handle invalid and expired authentication links and preserve permitted local return destinations.

### CORE-003 — Booking and operational notifications

**Outcome:** Deliver relevant booking updates to the intended people.

- Define recipient/event coverage for booking requests, confirmation, assignment changes, cancellation outcomes, and payment results using approved delivery channels.
- Use genuine persisted events, idempotent delivery, retry handling, and delivery-failure visibility; keep role-specific data out of unintended messages.
- Verify sender/provider configuration and distinguish queued, delivered, and failed notifications.

### CORE-004 — Cross-role acceptance and rollout readiness

**Outcome:** Verify the complete V2 experience across all three roles before rollout.

- Exercise direct standard booking without an enquiry, the separate custom-quote-to-booking branch, assignment-to-completion, payment, cancellation/refund, and authorized tracking flows on mobile and desktop.
- Verify cross-role privacy, revoked access, conflict handling, provider failures, and empty/unavailable states.
- Reconcile the implemented role model with existing accounts and database permissions; record migration, provider, deployment, and operational acceptance evidence.
- Record unresolved rollout blockers and validate responsive navigation, keyboard access, labels, and feedback across portals before production acceptance.

## Customer feature scope and acceptance

### CUST-001 — Browse services, fleet, and destinations

**Outcome:** A visitor understands the transfer service and can start a quote.

- Show owner-published services, fleet information, vehicle capacity, served destinations, and contact/policy information.
- Provide a clear path from browsing to the quote journey on mobile and desktop.
- Handle empty or unavailable business data without invented vehicles, destinations, or availability.

### CUST-002 — Get a transfer quote

**Outcome:** A visitor can obtain a fare for a supported one-way transfer.

- Collect pickup, destination, pickup date/time, passenger count, and luggage; offer suitable published vehicle categories.
- Validate service coverage, minimum notice, and category capacity against configured business rules.
- Calculate the fare on the server from published pricing and show the currency, total, and applicable breakdown.
- Continue standard priced transfers to customer details/sign-in and Review & book, preserving journey, category, and fare context; no enquiry step is allowed in this path.
- Offer Request a custom quote only for unsupported/custom routes, unavailable automatic pricing, or special arrangements; selecting a category alone is not a confirmed booking.

### CUST-003 — Request a custom quote or special arrangement

**Outcome:** A visitor can ask for a tailored quote outside the standard priced booking flow.

- Provide a separate entry for custom routes, missing automatic fares, or special requests that require manual pricing; it is never a mandatory step after standard vehicle selection.
- Collect request details and contact information without requiring login, preserving any available journey context. Do not show a guaranteed fare where no automatic price exists.
- Validate submissions, apply abuse protection, and return a genuine custom-quote reference with a pending-review state, not a booking confirmation.
- Make the request available to the Owner for a tailored quote; customer acceptance and authentication are required before it becomes a customer booking.
- Keep ordinary optional notes and configured extras in the standard booking form rather than forcing an enquiry.

### CUST-004 — Customer registration, sign-in, and recovery

**Outcome:** A customer can securely access their own account.

- Support registration, email verification, sign-in, sign-out, and password recovery under the configured registration policy.
- Give useful feedback for invalid, expired, or unavailable authentication flows.
- Apply Customer terminology and authorization consistently, and prevent access to other customers' records or management functions.
- Ask for sign-in/registration after vehicle and fare selection, before booking submission; preserve the full journey, category, extras, and quote context when returning to customer details and review.

### CUST-005 — Manage customer profile

**Outcome:** A customer can maintain the contact details needed for travel.

- View and update permitted personal contact fields with validation.
- Reuse saved details in booking forms and identify any required missing information.
- Restrict profile access and updates to the account holder; profile edits must not rewrite historical booking snapshots.

### CUST-006 — Review and book a one-way transfer

**Outcome:** A signed-in customer can book a standard priced transfer directly, without submitting an enquiry.

- Collect customer details after vehicle selection, require sign-in/registration before submission, and provide a final review of journey, contact details, vehicle category, fare, and policies.
- Use a booking action such as Place booking, not Send enquiry; do not require an enquiry record or manual quote review for a standard priced transfer.
- Revalidate pricing and booking rules on the server; require review if the submitted fare has changed.
- Create a genuine booking reference and pending status, with protection against accidental duplicate submissions.
- Show the booking reference and actual booking state after creation, then provide payment options when eligible; distinguish pending operational confirmation from verified payment success.

### CUST-007 — Book return transfers and optional extras

**Outcome:** A customer can request a return journey and configured extras.

- Collect valid return details and show both journey legs clearly.
- Offer only published extras and calculate their configured per-leg or booking-level charges correctly.
- Show the complete fare breakdown and persist the agreed pricing snapshot for the booking and its legs.
- Reject invalid return dates or changed pricing without creating a partial or duplicate request.

### CUST-008 — View upcoming bookings and booking details

**Outcome:** A customer has one place to check their upcoming travel.

- List the customer's upcoming bookings and open each booking's reference, route, pickup time, status, fare, and next available action.
- Display both legs of return bookings where applicable.
- Handle loading, empty, and error states clearly; direct links must enforce record ownership.

### CUST-009 — Pay for a booking and view payment status

**Outcome:** A customer can securely pay an eligible booking and see the verified result.

- Start provider checkout after booking creation using the server-authorized booking amount and currency; no standard enquiry conversion is required.
- Handle successful, cancelled, failed, and pending checkout outcomes with clear next steps.
- Mark payment successful only from verified provider evidence; retries or repeated webhooks must not duplicate payment records.
- Show payment state on the booking and prevent payment of another customer's booking or an ineligible booking.

**Dependency to resolve when selected:** Provider configuration, booking payment eligibility, and the confirmation/payment order must be agreed and verified.

### CUST-010 — View booking and payment history

**Outcome:** A customer can review past journeys and their payment records.

- List completed and cancelled bookings with links to their details.
- Show verified payment and refund information associated with each booking.
- Keep historical journeys accessible without exposing another customer's information.

### CUST-011 — Request a booking cancellation

**Outcome:** A customer can request cancellation and understand its current state.

- Explain applicable owner-configured cancellation policies before submission.
- Accept cancellation requests only for eligible customer-owned bookings and avoid duplicate requests.
- Show the request's pending or resolved state; distinguish cancellation approval from any refund outcome.
- Make the request available to the Owner for the permitted review workflow.

### CUST-012 — View assigned driver, vehicle, and trip progress

**Outcome:** A customer knows who is collecting them and how the trip is progressing.

- Show permitted assigned-driver and vehicle details when available.
- Display actual trip status and reflect assignment or progress changes.
- Clearly handle unassigned, reassigned, cancelled, and completed trips without invented driver details or arrival estimates.

**External dependency:** Owner assignments and Driver progress updates must supply genuine authorized data.

### CUST-013 — Track the driver live

**Outcome:** A customer can view genuine driver location during an authorized trip window.

- Display a map using received locations for the customer's assigned trip.
- Show location freshness and distinguish live, stale, unavailable, and stopped sharing states.
- Enforce the permitted tracking window and stop location access when authorization ends.
- Do not simulate movement or claim an ETA without an implemented, verified source.

**External dependency:** Driver consent/location sharing and the required tracking backend must be operational.

### CUST-014 — Get travel concierge assistance

**Outcome:** A visitor or customer can get help using the transfer service.

- Answer service, route, fare, policy, and booking questions using published business facts.
- Support the existing English, Arabic, Urdu, and Hindi assistance scope, subject to confirmation when selected.
- Link users to the relevant quote, booking, or human-contact flow.
- Use personal booking context only for the authorized customer; never invent availability or claim to book, charge, or cancel a trip.
- Provide a useful fallback when the AI provider is unavailable.

## Driver feature scope and acceptance

### DRV-001 — Driver account and profile

**Outcome:** Give an invited Driver access to their own account and profile.

- Accept valid invitations and support authentication/recovery through shared account flows.
- View and update permitted profile/contact fields; keep operational approval and access fields Owner-controlled.
- Explain pending or revoked access and block access to other drivers' records or Owner functions.

### DRV-002 — Manage availability

**Outcome:** Let a Driver record availability used for assignment decisions.

- View and update permitted availability states and show the current recorded state.
- Enforce active-trip restrictions and distinguish personal availability from assignment eligibility.
- Reflect availability changes in Owner scheduling without exposing other drivers' private data.

### DRV-003 — View assigned trips

**Outcome:** Give a Driver a clear list of assigned work.

- List only the signed-in driver's current/upcoming assigned trips in pickup order.
- Show reference, pickup time, route summary, and trip status.
- Reflect reassignment or cancellation and handle empty/error states.

### DRV-004 — View trip details

**Outcome:** Provide the information needed to carry out an assigned journey.

- Show authorized pickup/destination, schedule, passenger/luggage counts, vehicle, extras, and permitted customer contact details.
- Provide usable map/directions links for configured locations without inventing coordinates.
- Enforce current assignment and permitted history access on direct links as well as in the UI.

### DRV-005 — Update trip progress

**Outcome:** Let a Driver report the actual progress of an assigned trip.

- Offer only valid driver-permitted trip transitions under the shared booking lifecycle.
- Record actual status changes and timestamps; prevent duplicate transitions and concurrent active trips.
- Reflect updates in Customer and Owner views and handle network failure without claiming an unsaved change succeeded.

### DRV-006 — Consent-based trip location sharing

**Outcome:** Share genuine device location during permitted assigned trips.

- Explain and obtain location permission/consent and give a clear sharing indicator and stop control.
- Authorize and validate location submissions against the driver's assignment and trip state.
- Handle denied permission, device/network interruptions, and stale readings; end sharing/access when the permitted window closes.

### DRV-007 — View trip history

**Outcome:** Let a Driver review their completed or cancelled assignments.

- List actual historical assignments and outcomes with date and journey summaries.
- Preserve historical assignment attribution after reassignment or account changes.
- Restrict historical detail to permitted fields; history must not reopen access to live customer tracking or unrelated records.

## Owner feature scope and acceptance

### OWN-001 — Owner onboarding and access management

**Outcome:** Let the authorized Owner manage business access.

- Provide a controlled onboarding path for the verified business Owner and display account access states.
- Manage approved invitations and activation/revocation under the three-role model; no public Owner signup or silent role escalation.
- Protect the last active Owner and record access changes; existing-account promotion requires an explicit transition decision.

### OWN-002 — Business details and operational policies

**Outcome:** Let the Owner configure the business rules used by every portal.

- Manage business contact information, UAE operating timezone, AED currency, and customer-facing policies.
- Configure minimum booking notice, scheduling turnaround, and cancellation rules with validation.
- Expose published policy information to customer flows and keep historical booking terms intact.

### OWN-003 — Website content, branding, and media

**Outcome:** Let the Owner maintain the public website and brand.

- Manage service and about content, contact links, logo, colors, font settings, and policies.
- Upload and manage permitted vehicle/destination media with validation and authorized storage access.
- Control publication and show truthful empty states; verify branding across mobile and desktop views.

### OWN-004 — Locations and served destinations

**Outcome:** Maintain the real places served by the business.

- Create, edit, archive, restore, and search locations with accurate coordinates and optional airport identifiers.
- Control public destination visibility and prevent archived locations from entering new booking choices.
- Preserve location references used by historical journeys.

### OWN-005 — Transfer routes and journey durations

**Outcome:** Maintain the transfer routes available for quoting and scheduling.

- Configure route endpoints, supported directions, and genuine expected journey durations.
- Create, edit, archive, restore, and publish eligible routes with validation.
- Handle missing duration or coverage explicitly; do not invent travel times.

### OWN-006 — Fleet and vehicle capacity

**Outcome:** Maintain vehicle inventory and its customer-facing presentation.

- Manage vehicle make/model, registration and expiry, category, seats, luggage capacity, and operational status.
- Create, edit, archive, restore, and search vehicles; manage licensed photos and public listing.
- Validate eligibility and capacity and prevent archive/status changes from silently breaking active assignments.

### OWN-007 — Route fares and return pricing

**Outcome:** Maintain the authoritative fares used for customer quotes.

- Configure route/category fares, return-leg pricing, and applicable additional charges in AED.
- Validate monetary values and coverage; identify missing pricing instead of inventing a fallback fare.
- Keep quoted/booked fare snapshots stable when future pricing changes.

### OWN-008 — Optional extras and charges

**Outcome:** Offer configurable optional services with clear charges.

- Create, edit, archive, restore, and publish supported extras.
- Define valid quantities and per-leg or booking-level charges and show how they affect totals.
- Validate selected extras on the server and preserve historical selections.

### OWN-009 — Fare review and publication

**Outcome:** Let the Owner review and publish fares used by the booking flow.

- Review fare drafts and identify incomplete route/category or return-pricing coverage.
- Validate a proposed fare before publication and show the effective customer price.
- Ensure unpublished or invalid drafts cannot affect public quotes and record publication changes.

### OWN-010 — Customer booking platform configuration

**Outcome:** Let the Owner control customer booking availability and policies.

- Configure the customer platform, registration availability, booking eligibility, and published policies.
- Define and document confirmation/payment order and when a booking becomes payable before payment work starts.
- Keep provider secrets server-side and show unavailable booking/payment states honestly. Offer custom quotes only for requests needing tailored pricing or arrangements; do not turn all standard bookings into enquiries because of a configuration failure.

### OWN-011 — Enquiry review and manual quotes

**Outcome:** Review custom quotes and special arrangements separately from standard bookings.

- List, filter, and inspect custom-route, missing-fare, and special-arrangement requests with their submitted details; standard priced bookings bypass this queue.
- Prepare and record a manual fare for a supported request, with an explicit customer review/acceptance step before binding changed pricing.
- Track review outcomes and convert an accepted custom quote transactionally into its customer and booking through OWN-013, with required customer authorization and duplicate-conversion protection.

### OWN-012 — Customer records and booking relationships

**Outcome:** Maintain operational customer records without weakening account privacy.

- Create, edit, search, archive, and restore permitted customer contact records.
- Link records to verified customer accounts through an explicit ownership flow; avoid duplicate records and unauthorized claims.
- Show associated booking history when booking management is available and retain historical booking contact snapshots.

### OWN-013 — Booking records and lifecycle management

**Outcome:** Manage the booking lifecycle for customer and owner-created requests.

- Create and review bookings with journey, customer, capacity, agreed fare, pickup time, and expected end details.
- Create standard customer bookings directly without an enquiry dependency. Expose a transactional booking contract for separately accepted custom quotes; the custom conversion workflow is delivered in OWN-011.
- Enforce valid pending, confirmed, in-progress, completed, and cancelled transitions with change history; do not allow terminal trips to reopen silently.
- Scheduling, driver-originated progress, cancellation review, and payment eligibility use these lifecycle rules as their shared contract.

### OWN-014 — Driver records and account invitations

**Outcome:** Maintain real drivers and grant only Driver access.

- Create, edit, search, archive, and restore driver records with licence validity and operational eligibility.
- Invite genuine driver accounts and distinguish invitation delivery from account activation.
- Activate or revoke access while preserving trip history and visibly flagging affected assignments.

### OWN-015 — Driver and vehicle assignment and scheduling

**Outcome:** Assign eligible resources without conflicting reservations.

- Assign and reassign drivers and vehicles to bookings using category, capacity, availability, licence, and registration checks.
- Enforce overlapping reservation prevention, expected end times, and turnaround rules on the server/database.
- Show conflicts and overruns with actionable resolution; record assignment history and do not silently remove active trips.

### OWN-016 — Cancellation review and resolution

**Outcome:** Resolve customer cancellation requests under published policy.

- Review requests with booking state, policy context, and any associated payments.
- Approve or reject permitted requests with a recorded outcome and update the customer-visible state.
- Keep cancellation and refund outcomes distinct; release assignments appropriately and reflect changes in driver/customer views.

### OWN-017 — Payments, refunds, and verified revenue

**Outcome:** Monitor provider-verified money movement for bookings.

- View verified payments, pending/failed states, refunds, and booking-level payment reconciliation.
- Define the permitted refund initiation workflow when selected and integrate actual provider evidence; no manual paid/success override.
- Process signed provider events idempotently and calculate revenue from verified ledger records rather than editable booking labels.

### OWN-018 — Live operations and tracking oversight

**Outcome:** Give the Owner an accurate view of journeys in progress.

- View open journeys, resource assignments, availability, trip progress, and operational exceptions.
- Show authorized received driver positions with freshness indicators and clear missing/stale/offline states.
- Reflect changes through scoped live updates with refresh fallback; do not imply automated flight monitoring or unverified ETAs.

### OWN-019 — Business dashboard

**Outcome:** Summarize current business activity from actual records.

- Show booking totals, today's work, active trips, available drivers, fleet counts, and verified completed-trip net revenue.
- Use the business timezone consistently and link summary cards to relevant records.
- Distinguish successful empty results from query errors and identify provider/configuration limitations.

### OWN-020 — Operational and financial reports

**Outcome:** Let the Owner assess booking outcomes and financial performance.

- Report booking outcomes, completed-trip verified net revenue, and outstanding agreed fares with defined date filters.
- Include archived historical records and make cancellation/refund treatment explicit.
- Reconcile report totals against booking/payment records and enforce Owner-only access.

## Current implementation track

### Owner prototype design selection — 22 October 2026

Proposed connected screens for handling the customer frontend's requests: **OWN-013** (bookings), **OWN-015** (assignment), **OWN-011** (custom quotes), and **OWN-016 / OWN-017** (cancellation and payment review). See [Owner mockups and customer-to-owner mapping](mockups/owner/README.md). This is a design selection, not completion or approval of the Owner implementation; feature statuses remain Queued. Standard bookings bypass custom-quote review, and cancellation approval remains separate from refunds.

- **Selected item:** None — awaiting user selection.
- **Recommended first item:** CORE-001 — Three-role authorization foundation.
- **Completed in this track:** None assessed or accepted yet.
- **Current activity:** Backlog preparation only; no application implementation started.
- **Total:** 45 items: 14 Customer, 7 Driver, 20 Owner, and 4 shared items.

## Decisions and blockers

Record feature-specific decisions and blockers here as items are selected. No unresolved choice below authorizes an unreviewed production change.

| Related item | Decision or dependency to resolve | Current state |
| --- | --- | --- |
| CORE-001, OWN-001 | Fresh V2 onboarding; any future legacy import requires explicit account mapping | Import outside current baseline |
| OWN-010, CUST-009 | Payment follows booking creation; define eligibility and operational confirmation policy | Detailed policy pending selection |
| OWN-016, OWN-017 | Cancellation eligibility and refund initiation/approval workflow | Pending selection |
| DRV-006, CUST-013 | Tracking window, consent, location retention, and Driver location availability | Pending selection |
| CORE-003 | Notification event/recipient coverage and delivery channels | Pending selection |
| CORE-004 | Hosted database, provider, and deployment readiness | Not verified by this backlog |

## Completion record

Add one row when an item is accepted. Link implementation files, verification evidence, and feature decisions. State remaining hosted/provider rollout work explicitly.

| ID | Completed on | Implemented scope | Verification evidence | Remaining rollout work |
| --- | --- | --- | --- | --- |

## Driver design selection — 22 October 2026

Selected DRV-003 (assigned trips), DRV-004 (trip details), and DRV-005 (trip progress) for the next connected frontend slice, with Customer CUST-012 and existing Owner booking/assignment views reflecting the same records. Three mobile-first mockups are proposed in [Driver mockups](mockups/driver/README.md). Design approval and implementation are pending; full feature statuses remain Queued. Trip actions preserve independent payment state, Owner confirmation, assignment access, and cancellation handling. Return-leg progress needs an explicit leg model before implementation.

## Driver frontend milestone — 22 October 2026

The user approved the three Driver mockups and requested end-to-end implementation. DRV-003, DRV-004 and DRV-005 now have a working persisted frontend, with basic completed/cancelled Driver history (DRV-007 support) and linked CUST-012 / Owner status and activity. `/driver` allows selecting a seeded demo Driver; the Owner booking provides a direct assigned-Driver demo link. Driver access is tab-local. Existing stored bookings are preserved and gain default progress fields without a reset.

Return-leg behavior is resolved for the prototype: confirmed → outbound in_progress → confirmed awaiting return → return in_progress → completed. Driver/vehicle assignment and self-service cancellation lock after the first leg starts. Payment and refund records remain independent. Future scheduled trips can be exercised immediately in mock mode. See [prototype testing guide](../../frontend-v2/README.md) and [Driver design and behavior](mockups/driver/README.md). Full-delivery statuses remain queued for real authentication, backend enforcement and production integration.
