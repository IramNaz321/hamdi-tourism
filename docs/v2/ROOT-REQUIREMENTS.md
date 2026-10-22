# V2 Root Requirements

Status: **LOCKED — approved by the product owner**

Locked on: **22 October 2026**

## Purpose and authority

This document records the approved root requirements for the V2 role model and high-level module distribution. It is the source of truth for V2 role and access decisions. Where older project documentation describes a different role model, this document takes precedence for V2.

The scope of this lock is the three roles, their modules, and their access boundaries. Detailed workflows and implementation decisions remain to be specified. Changes to this baseline require explicit product-owner approval and an update to this document.

## Business goal

Enable Hamdi Tourism to sell and manage UAE airport transfers and chauffeur services, from customer discovery and enquiries through booking, payment, trip execution, and completion.

## Approved roles

The platform must have exactly three authenticated business roles:

1. **Customer** — discovers services and manages personal bookings.
2. **Driver** — manages availability and executes assigned trips.
3. **Owner** — controls business operations and platform settings.

Public visitors are unauthenticated users, not a fourth role. They can browse services, enter journey details, select a vehicle/fare, and request custom quotes before signing in.

## Customer modules

| Module | Responsibility |
| --- | --- |
| Account & Profile | Manage the customer's account and personal contact details. |
| Browse Services & Fleet | Explore available services, published vehicles, and served destinations. |
| Quotes & Enquiries | Get standard transfer fares; request custom quotes or special arrangements through a separate optional enquiry path. |
| Book a Trip | Review and book supported priced transfers directly, without an enquiry step. |
| My Bookings | View personal booking details, status, and history. |
| Payments | Pay for personal bookings and view payment information. |
| Live Tracking | Track the assigned driver for an authorized trip. |
| Cancellation Requests | Request cancellation of personal bookings. |
| Travel Concierge | Receive assistance with services, quotes, and bookings. |

## Approved booking flow — 22 October 2026

V2 starts from scratch and is not based on the legacy application design or code.

**Standard flow:** Journey details → Vehicle & fare → Customer details / sign in → Review & book → Payment when eligible.

- Browsing and quoting are public. Require customer authentication before booking submission and preserve selections through sign-in.
- Standard priced bookings must not require an enquiry record or manual quote review.
- Enquiries are reserved for custom quotes and special requests requiring tailored pricing or arrangements. They are a separate optional path, not a booking step. Ordinary trip notes and configured extras remain in the standard flow.
- Custom requests can be submitted without login; a request receipt is not a booking confirmation.
- Booking creation, operational confirmation, and payment success are distinct. Payment follows booking creation when eligible; detailed confirmation/payment eligibility rules remain to be specified.

## Driver modules

| Module | Responsibility |
| --- | --- |
| Account & Profile | Manage the driver's account and profile. |
| Availability | Maintain availability for trip assignments. |
| Assigned Trips | View trips assigned to the driver. |
| Trip Details | Access the journey and customer information permitted for an assignment. |
| Trip Progress | Update the status and progress of assigned journeys. |
| Location Sharing | Share location during trips with consent. |
| Trip History | Review the driver's past assigned journeys. |

## Owner modules

| Module | Responsibility |
| --- | --- |
| Dashboard | Review business activity and operational summaries. |
| Enquiries & Manual Quotes | Review enquiries, handle manual quotes, and convert requests into bookings. |
| Bookings & Scheduling | Manage bookings, assign drivers and vehicles, and resolve scheduling conflicts. |
| Customers | Manage customer records and review their bookings. |
| Drivers | Manage driver records, availability, and account access. |
| Fleet | Manage vehicles, capacity, status, and published fleet information. |
| Locations & Routes | Manage served locations and transfer routes. |
| Pricing & Extras | Manage route fares, return fares, and optional extras. |
| Live Operations | Monitor active trips, assignments, progress, and authorized driver locations. |
| Payments & Revenue | Monitor booking payments, refunds, and verified revenue. |
| Reports | Review booking outcomes and business performance. |
| Website & Branding | Manage published website content, images, and branding. |
| Business Settings | Configure business details, service policies, and operational preferences. |
| Access Management | Manage authorized platform access under the three-role model. |

The Owner also owns passenger-platform configuration and fare review, previously listed as owner-only capabilities.

## Consolidation of existing roles

| Existing role | V2 role |
| --- | --- |
| Passenger | Customer |
| Driver | Driver |
| Owner | Owner |
| Manager | Owner |
| Dispatcher | Owner |
| Viewer | Owner |

Manager, Dispatcher, and Viewer must not remain separate V2 business roles. Their operational responsibilities are consolidated under Owner, which has full management permissions.

This mapping defines the target product model. It does not authorize automatically elevating existing accounts to Owner; account transitions require a separate implementation and access-migration decision.

## Access boundaries

- **Customer:** Access only their own account, bookings, payments, and authorized trip-tracking information.
- **Driver:** Access only their own account, availability, assignments, history, and the information permitted for those trips.
- **Owner:** Have business-wide management access across the modules defined above.
- **Public visitor:** Access published information and public enquiry flows without management or private trip access.

## Implementation status

This document locks requirements only. V2 will be implemented from scratch against this baseline. The legacy repository remains separate reference history, not the V2 implementation target. Any future account/data import requires a separate decision.

Document approval does not establish that external providers are configured or that the platform is production-ready.
