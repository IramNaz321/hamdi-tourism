# V2 frontend API contract

This is a proposed adapter contract, not a backend implementation. Default mock mode does not call these endpoints.

## Transport

Set `VITE_DATA_SOURCE=api` and `VITE_API_BASE_URL=/api/v2` after implementing the contract. Responses are JSON DTOs validated by the Zod schemas in `src/domain.ts`. All money is integer AED minor units (fils). Dates/times in journey inputs are UAE local time; timestamps and expiry values are ISO timestamps. Persisted historical journeys do not re-run future-date checks.

Use server-established sessions with credentialed requests. Enforce authentication, three-role authorization, record/business ownership, CSRF/origin checks, input validation, and rate limiting on the server. `X-Requested-With` is an additional signal, not an authorization or CSRF policy by itself. Never trust demo role controls, customer IDs, client totals, or client scheduling feedback.

For errors, return an appropriate non-2xx status and `{ "code": "SCHEDULING_CONFLICT", "message": "A clear, safe message." }`. Known codes include UNAUTHENTICATED, FORBIDDEN, NOT_FOUND, QUOTE_EXPIRED, CUSTOM_QUOTE, NO_CAPACITY, NOT_PAYABLE, ASSIGNMENT_REQUIRED, SCHEDULING_CONFLICT, ALREADY_RESOLVED, INVALID_REFUND, and NOT_READY. Preserve idempotent results on retries; state mutations and assignment constraints must be atomic.

## Customer/public endpoints

| Method | Path | Request / response |
| --- | --- | --- |
| GET | `/catalog` | `Catalog` |
| POST | `/quotes` | `Journey` → `Quote`; server-authoritative priced offers and expiry |
| GET | `/session` | `Session` or null |
| POST | `/auth/challenges` | `{email}` → `Challenge`; never return `demoCode` in production |
| POST | `/auth/verify` | `{challengeId,code}` → `Session`; establish the actual session cookie |
| DELETE | `/auth/session` | Revoke session, 204 or JSON null |
| POST | `/bookings` | `BookingInput` → `Booking`; `Idempotency-Key` header |
| GET | `/bookings` | Customer-owned `Booking[]` |
| GET | `/bookings/:id` | Customer-owned `Booking` with permitted assignment details |
| POST | `/bookings/:id/checkout` | `{}` → `{kind:'redirect',url:'https://provider/...'}`; derive amount and eligibility server-side |
| POST | `/bookings/:id/cancellation` | `{reason}` → updated `Booking`; request only, not an immediate refund |
| POST | `/custom-requests` | `CustomRequest` → `RequestReceipt`; public submission with production abuse controls and idempotency |
| GET | `/custom-requests` | Requests whose contact identity is verified for the session |
| GET | `/custom-requests/:id` | Authorized `CustomRequestRecord`; do not expose an unshared draft quote to the customer |
| POST | `/custom-requests/:id/accept` | `{}` and idempotency header → one created/existing `Booking`; verify ownership, expiry, capacity, and accepted quote snapshot |

## Owner endpoints

All require an authorized Owner session. No separate Admin, Manager, Dispatcher, or Viewer role exists in V2.

| Method | Path | Request / response |
| --- | --- | --- |
| GET | `/owner/bookings` | Business-scoped `Booking[]` |
| GET | `/owner/bookings/:id` | `Booking` with permitted management details |
| POST | `/owner/bookings` | `OwnerBookingInput` → pending `Booking`, priced server-side; idempotency header |
| GET | `/owner/resources` | `Resources` with driver availability, licence, vehicle category/capacity/registration |
| PUT | `/owner/bookings/:id/assignment` | `AssignmentInput` → updated `Booking`; re-check all reservation windows atomically |
| POST | `/owner/bookings/:id/confirm` | `{}` → updated `Booking`; enforce configured confirmation eligibility |
| GET | `/owner/custom-requests` | Business-scoped `CustomRequestRecord[]` |
| GET | `/owner/custom-requests/:id` | `CustomRequestRecord` |
| PUT | `/owner/custom-requests/:id/quote` | `OwnerQuoteInput` → updated request; draft versus shared quote is explicit |
| POST | `/owner/bookings/:id/cancellation` | `{decision:'approved'|'declined',note}` → updated `Booking`; note is customer-visible |
| POST | `/owner/bookings/:id/refund` | `{amount}` plus idempotency header → updated `Booking`; real provider evidence is required before marking a refund complete |

## Shared DTO behavior

`Booking` includes separate `status`, `paymentStatus`, `amountPaid`, `amountRefunded`, `assignment`, `cancellation`, `activity`, expected end, immutable journey/contact/fare snapshots, and optional custom location labels. An assignment snapshots the permitted driver and vehicle display fields for the customer UI. `cancellation.status` is none/requested/approved/declined. `cancellationRequested` is true only while a request is unresolved. Internal-only notes must not be placed in customer-visible fields.

`CustomRequestRecord` includes the full submitted contact/journey/group/request details, new/draft/quoted/converted state, optional tailored quote, expiry, and a linked booking after conversion. Accepting a shared quote creates a booking once. Standard bookings do not depend on this workflow.

Demo controls (`switchRole`, `completePayment`, export/reset) are optional and absent from the HTTP adapter. Production payment status changes only through trusted provider processing, never a customer success query parameter or manual “mark paid” action.

## Refresh and deliberate prototype policies

The adapter publishes invalidation after successful writes; open views also refresh on window focus and periodically in API mode. Production may replace polling with authenticated realtime events while retaining the service interface. The frontend must display safe loading/error states until a successful response arrives.

Prototype policy: assignment must be saved before confirmation; unpaid bookings can be operationally confirmed; demo checkout is available before or after confirmation; cancellation approval precedes a separate demo refund. These are explicit demonstration choices, not locked live payment/refund policies. Replace them in the service/backend policy without conflating booking and money states.

The current contract loads lists in full for a small prototype dataset. Pagination at production scale may require extending the list query contract and controls; do not claim this prototype has been production-load tested.

## Driver execution contract

| Method | Path | Response |
| --- | --- | --- |
| GET | `/driver/profile` | `driverSchema`; authenticated active Driver only |
| GET | `/driver/bookings` | `bookingRecordSchema[]`; only current assignments and permitted cancelled history |
| GET | `/driver/bookings/:id` | `bookingRecordSchema`; reauthorize assignment/history access |
| POST | `/driver/bookings/:id/progress` | Updated `bookingRecordSchema`; body `tripActionSchema` and Idempotency-Key header |

`TripAction` carries `bookingId`, `leg` (`outbound` / `return`), `action` (`start` / `complete`), `expectedAssignmentAt` and `idempotencyKey`. The server derives Driver identity from its authenticated session, rechecks current assignment and version, and atomically enforces status, cancellation hold, driver/vehicle eligibility and one active trip per driver/vehicle. Keys bind to the Driver, booking, leg and action; replay returns the current authorized booking without duplicate timestamps/events. The mock checks these rules locally; production must use database transactions/locks and validate actual pickup time windows.

Booking adds `tripProgress.outbound` and `.return`, each with ISO `startedAt` / `completedAt` (empty until recorded), plus historical `assignedDriverIds`. Booking activity accepts actor `driver`. Outbound completion on a return booking yields confirmed (awaiting return), not completed. Completing the final required leg yields completed. New fields default safely when reading older prototype records. An assignment cannot change and customer self-service cancellation is unavailable after the first leg starts, including between return legs. No Driver transition changes monetary fields. Production Driver DTOs should project only permitted trip/contact fields; existing prototype DTOs are shared.

Customer `GET /bookings/:id` and Owner booking endpoints return the same progress. Mutations invalidate local queries; the API adapter polls while visible every 15 seconds, with focus refresh. Real-time event transport may replace polling behind the same service interface. Driver demo identity selection never calls a production endpoint and must not grant production roles.
