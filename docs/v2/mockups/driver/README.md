# V2 Driver assigned bookings and trip management

Created: 22 October 2026. Status: approved by the user; implemented in the connected frontend prototype.

## Selected backlog features

| Screen | Backlog | Purpose |
| --- | --- | --- |
| [Assigned trips](drv-003-assigned-trips.png) | DRV-003 | Show only the signed-in driver's assigned work in pickup order, distinguishing confirmed trips from assignments awaiting Owner confirmation. |
| [Trip details](drv-004-trip-details.png) | DRV-004 | Provide route, pickup instructions, flight, permitted customer contact, passenger/luggage counts, and assigned vehicle. Start a confirmed trip after passenger boarding. |
| [Trip progress](drv-005-trip-progress.png) | DRV-005 | Show saved activity and the next valid action; confirm drop-off before completing a trip. |

These are three screens of one flow, not alternative design directions. They use the approved Owner assignment mockup as a visual reference, with mobile-first 390 × 844 target proportions. Actual generated raster resolution may differ. Typography and palette follow the current V2 interface. The initial assigned-trips draft has an incorrect first pickup date; drv-003-assigned-trips.png is the corrected reference.

## Connection to Customer and Owner

1. Customer submits a standard booking, or accepts an Owner-issued custom quote into a booking. Both produce the same booking entity and reference.
2. Owner saves an eligible driver and vehicle assignment. That assignment appears for that Driver. Pending bookings may be inspected but cannot be started.
3. Owner confirms the booking. Driver sees Confirmed and can review pickup details. The same assigned driver and vehicle appear for the Customer.
4. Driver confirms Start trip after passenger boarding. Booking becomes in_progress; Customer booking details and Owner booking list/detail show In progress with the recorded timestamp.
5. Driver confirms drop-off with Complete trip. Booking becomes completed; Customer and Owner see Completed and the recorded completion time. The trip moves into Driver history.

The connected illustrative record is HT-2026-DEMO001, Alex Morgan, Dubai Airport (DXB) → Dubai Marina, Executive sedan / Dubai P 12345, assigned to Faisal Khan. This shows a later state of the same example used by the Owner design. Driver mockups use 22 October 2026 to illustrate today's operational flow; the older Owner reference uses a future pickup date. Production/prototype records must use their actual stored dates.

## Behavior to preserve when implemented

- Only the current assigned Driver can inspect actionable trip details or change progress. Recheck assignment on each action; direct links must not expose another driver's trip.
- Reassignment and cancellation update the list and invalidate stale actions. Owner-approved cancellation removes start/complete actions. A cancellation request is distinct from approval; unresolved requests must be visibly flagged and coordinated with Owner before starting.
- Lifecycle for this selection: confirmed → in_progress → completed. Driver cannot confirm Owner bookings, reopen terminal trips, reassign vehicles, cancel bookings, or change payment/refund state.
- Start and completion require confirmation. Show pending/error states; claim success only after persistence succeeds. Make transitions idempotent and prevent concurrent active trips for one Driver or vehicle.
- Starting/completing trips must update the existing shared booking, not create Driver-only copies. Preserve activity actor and actual timestamps in all role views.
- Return journeys need separately actionable outward and return legs under the same booking. One completed leg must not complete the entire return booking. These mockups intentionally show one-way trips; the implementation records outbound and return timestamps separately, retaining Confirmed between legs and setting Completed only after both finish.
- Directions open an external maps app with configured location data, without fabricated coordinates or live ETA. Phone actions use permitted trip contact data. Contact Owner must use a configured business contact.
- History navigation now includes a basic completed/cancelled list and read-only trip records supporting DRV-007; a separate history mockup is not included. Availability, profile, and invitation setup are supporting dependencies, not newly designed full modules here.
- Location sharing and live maps remain DRV-006 / CUST-013 / OWN-018 follow-up scope. CUST-012 status visibility and Owner booking status/activity are the integration required for this slice; it does not claim live GPS.
- Payment status remains independent throughout trip execution. Completing a trip never marks it paid.

## Generation

Generated with the built-in image generation tool. The Owner assignment reference grounded the first screen; generated Driver screens grounded subsequent screens. Prompts specified shared fictional booking data, brand tokens, mobile dimensions, assignment/confirmation boundaries, independent payment state, and no simulated GPS. One image edit corrected a copied date inconsistency in the assigned-trips screen. The mockup stage changed no application code. The subsequent frontend implementation uses the existing shared localStorage dataset and service boundary; no backend was added.
