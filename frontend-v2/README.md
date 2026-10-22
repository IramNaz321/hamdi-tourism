# Hamdi Tourism V2 — connected frontend prototype

A standalone React/TypeScript/Vite frontend, built from the approved V2 Customer, Owner and Driver mockups. It has no application backend or database. The static hosting Worker included by the starter only serves the frontend assets and route fallback.

## Try the end-to-end flow

Open the running prototype at `http://localhost:4173/`.

1. **Customer:** choose a journey and vehicle, continue to booking, and sign in with an example email. The demo email verification code is **123456**. Enter contact details, accept the example terms, and place the booking. Keep the reference.
2. **Owner:** use the fixed **Owner workspace** button at the bottom of the screen, or open `/owner/bookings` in another tab and choose **Enter Owner demo**. Search for the same reference.
3. **Assignment:** open the booking, choose a driver and vehicle in the booked category, and save the assignment. Scheduling, capacity, licence, registration, and turnaround checks run in the mock service. Use **Edit expected end** if needed.
4. **Approval:** choose **Confirm booking** and confirm the dialog. This changes booking status, not payment status.
5. **Customer:** use **Customer view** or return to the original tab. The same booking now shows its assignment and confirmed status. Changes also survive reloads.
6. **Driver:** open `/driver` in a third tab, choose the assigned driver and enter the demo. Alternatively, Owner booking details → Trip progress → **Open assigned Driver demo** opens the correct driver in the same tab. Pending assigned bookings are visible but cannot start until Owner confirmation.
7. **Trip execution:** open the assigned booking, choose **Start trip**, confirm boarding, then **Complete trip** and confirm drop-off. Customer and Owner see In progress and then Completed with the same actual timestamps, without reloading. Reload all tabs to verify persistence. Driver → History retains completed/cancelled assignments. For return bookings, complete the outbound and return legs separately; after the outbound, the booking remains Confirmed and awaits return.
8. **Payment:** use the booking's demo checkout to simulate success, failure, or abandonment. No real payment/card information is collected. Owner payment records update from the same booking.
9. **Cancellation (alternative path before starting):** request cancellation from the customer booking, optionally entering a reason. Review it in Owner → Cancellations. Approve or decline with a customer-visible decision note. Approval cancels the booking and releases reservations; it does not issue a refund.
10. **Refund:** after approval, separately record a demo refund up to the remaining paid amount. The customer sees the updated refund state. No money moves.

For **custom arrangements**, submit a custom request from the public site. Owner → Custom quotes shows the complete request. Prepare a suitable quote, save a draft or send it for acceptance. The customer signs in using the request's email, opens **My requests**, reviews and accepts the shared quote, and creates one pending booking. Owner can then assign and confirm it normally. Standard bookings never require this custom-quote path.

## Storage and demo identities

- Shared business data: browser **localStorage**, key `hamdi:v2:data:2`.
- Tab-local role, customer identity and selected driver: **sessionStorage**, key `hamdi:v2:actor:2`. This lets Customer, Owner and Driver tabs coexist.
- The booking form draft remains tab-local. Unsaved Owner form edits are not persisted; use Save assignment or Save draft.
- Five sample bookings, one custom request, four drivers, and four vehicles initialize a fresh store. Sample dates are relative to today, not fixed historical dates.
- **Prototype tools** exports the business records as JSON and resets the dataset to fresh examples after confirmation.
- Same-origin browser tabs see changes through storage events. Different browsers/devices/origins do not share local storage.
- Mock identity and client checks are for demonstration, not a security boundary. Use fictional information. The default mode makes no backend or payment-provider requests.
- Browser storage failure is surfaced through Prototype tools; an unavailable storage environment uses memory. Do not treat browser mock data as a production database.

## Frontend architecture

- `src/domain.ts`: shared types and runtime response/input schemas.
- `src/services/mock.ts`: persistent mock implementation of `TravelService` and demo controls.
- `src/services/fixtures.ts`: example catalogue.
- `src/services/scheduling.ts`: shared, pure reservation checks for immediate UI feedback.
- `src/services/http.ts`: future HTTP implementation of the same contract.
- `src/state.tsx` / `src/useRemote.ts`: service injection, shared invalidation, focus refresh, and request cancellation.
- `src/pages/owner`: Owner booking, assignment, custom quote, cancellation, payment, and read-only resource views.
- `src/pages/driver`: assigned work, details, progress actions, completed/cancelled history.
- `src/components/TripProgress.tsx`: the shared leg timeline rendered for Customer, Owner and Driver.
- `src/pages/Requests.tsx`: customer quote review and acceptance.

Pages use the service contract rather than reading mock storage directly. Default `VITE_DATA_SOURCE=mock` needs no credentials. For later integration, implement the documented API contract and select `VITE_DATA_SOURCE=api`; page components can continue consuming the same DTOs and actions. The backend must enforce identity, authorization, pricing, atomic assignment, lifecycle, idempotency, and provider verification independently. See [API contract](API-CONTRACT.md).

## Development and checks

Use Node 24 and npm:

```bash
npm ci
npm run dev -- --host 0.0.0.0 --port 4173 --strictPort
npm run typecheck
npm test
npm run build
npm run test:sites
```

The build produces `dist/client`. Static hosting must serve `index.html` for frontend routes. No deployment has been performed. The bundled Worker/hosting metadata are only the starter's static asset packaging, not an application backend.

## Visual decisions

The approved teal, sand, terracotta, editorial typography, generated imagery, and Owner layouts are retained. Customer footer scenery is fixed to the viewport bottom and clipped to the footer so only its content scrolls over it. Owner tables scroll within their own region on small screens; navigation collapses into a menu.

See [design QA](design-qa.md) and [the V2 requirements](../docs/v2/ROOT-REQUIREMENTS.md). Backend work, live auth/payments, real notifications, GPS sharing, production policies, and full Driver/Fleet editing remain outside this frontend milestone.

## Driver prototype rules

Driver status updates act on the same persisted booking and preserve payment/refund amounts. Only the current assigned Driver can act. Assignment version checks, confirmation prerequisites, cancellation holds, idempotent retries and active driver/vehicle checks protect transitions. Once any leg has started, the same assignment is retained through a return booking; customer self-service cancellation is disabled. Owner coordination for mid-journey exceptions is future scope. Existing saved V2 records receive empty progress fields when read; no data reset is needed.

Mock trip actions deliberately allow future scheduled pickups to be exercised now, with a visible prototype note. Real pickup windows and backend transaction locks are required in production. This local prototype is not a multi-device or production concurrency service. Driver selection is demo impersonation, not real Driver authentication. No live GPS or notifications are simulated.

The repository root `npm run build` builds the legacy Next.js app and then runs `npm run check:v2`, which installs V2 dependencies and runs its type checks, tests, production build and hosting checks. Root Next.js lint/type checking is scoped to the legacy app; the independent V2 TypeScript project is validated separately.
