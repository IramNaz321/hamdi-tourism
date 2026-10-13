# Hamdi Tourism client handover

The design can be reviewed now. Live business access is pending the hosted Owner/schema/configuration acceptance in [Final launch report](FINAL-LAUNCH-REPORT.md). No default password or Owner account is supplied.

## Business Owner

After the client's real account is explicitly authorized and configured, use `/login`. Password recovery uses the real verified email/SMTP configuration; never share a password or token with developers in chat. An invited driver/passenger is not an Owner.

Publish genuine business contact, brand appearance, booking/cancellation/terms/privacy policies in Business Settings. Use Passenger booking configuration to set actual route durations and allow genuine online requests. Keep requests disabled until hosted acceptance is complete. Theme colors remain owner-controlled; the new default palette is Midnight Luxury.

Add only your actual fleet, licensed photos, capacities/registration details and drivers/licences. Publish only the locations/routes/prices you actually serve. Real coordinates are optional; absent coordinates do not become invented map markers. Staff invitations and privileges are Owner-controlled; use the minimum role each person needs.

## Dispatcher and driver

Review pending bookings/enquiries, confirm genuine capacity/time/fare requirements and assign actual compatible drivers/vehicles before confirming. Record cancellation reasons and use the normal booking history. A passenger cancellation request is a review request, not an automatic refund.

Drivers sign in to their assigned portal and see only their trips. Follow accept → en route → arrived → pickup → completed. Start location sharing only after trip authorization and explicit device consent. Stop sharing whenever needed. Hidden/offline tabs stop sharing and require manual restart; browser sleep/background behavior is not guaranteed. Operations monitors actual received positions, not simulated movement or ETA.

## Passenger

After approved registration/email verification, use `/passenger` to save your real contact details and `/book` for published route/vehicle quotations. Review the ten-minute quote and policies before submitting a request. Booking remains pending until the team confirms availability and dispatch. Return journeys require actual configured return pricing/durations.

Your account shows only your bookings, genuine payment evidence, timeline and cancellation requests. Eligible active trips use private driver-consented tracking, with last update and accuracy. No location means no shared fix, not a hidden simulated car. Guest identity access is not enabled without separate approval.

## Payments, messages and concierge

Payment becomes available only for a confirmed eligible booking. A checkout return page never proves payment; the verified provider ledger does. Expired/failed sessions need reconciliation before another charge. Refunds need authorized merchant review; the app never issues them automatically.

Email notices distinguish queued, provider-accepted and provider-confirmed delivered states. Unconfigured providers remain unavailable. The four-language concierge is read-only and uses published business information plus a minimal authorized booking status. It cannot approve a reservation, refund or live ETA. Never enter card credentials or unnecessary private details into it.

## Preview, domain and release

For the existing Codespace, use its private port-3000 browser forwarding after updating the feature branch safely and running the documented development command. Production requires an approved host/domain, secure environment configuration, exact HTTPS Auth redirects, genuine hosted acceptance, monitoring/backup/rollback and explicit deployment approval. PR #1 remains unmerged. The agent will handle guarded technical rollout after the required client approvals; the client does not need to copy SQL.
