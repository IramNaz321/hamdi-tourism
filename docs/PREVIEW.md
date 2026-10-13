# Actual website preview

October 13, 2026. Captured from the running production-style application with hosted credentials removed for safety. These are actual UI screens, not invented bookings, vehicle records, GPS positions or AI responses. All 12 PNGs were decoded and visually inspected. The real hosted asset audit found no published fleet vehicles or approved vehicle photographs. A photograph gallery cannot truthfully be populated yet.

## Homepage — includes the fleet gallery

![Desktop homepage](previews/desktop.png)

![Mobile homepage](previews/mobile.png)

The red BMW X6-inspired illustration and synthesized V8-style interaction are separate from the bookable fleet. No authentic BMW photograph, recording or bookable vehicle is claimed.

## Desktop and mobile screens

| Screen                    | Desktop                                | Mobile                                |
| ------------------------- | -------------------------------------- | ------------------------------------- |
| Homepage fleet section    | [Open](previews/desktop-fleet.png)     | [Open](previews/mobile-fleet.png)     |
| Published vehicle gallery | [Open](previews/desktop-gallery.png)   | [Open](previews/mobile-gallery.png)   |
| Booking                   | [Open](previews/desktop-booking.png)   | [Open](previews/mobile-booking.png)   |
| Tracking                  | [Open](previews/desktop-tracking.png)  | [Open](previews/mobile-tracking.png)  |
| Travel concierge          | [Open](previews/desktop-concierge.png) | [Open](previews/mobile-concierge.png) |

Booking, tracking and concierge screenshots honestly show unavailable configuration/access. There is no fictitious trip or moving map marker. Public vehicle details use genuine published records only; no such record currently exists to photograph.

## Open the actual website in your browser

There is no external port-forwarding or approved deployment capability in this Codex environment. The local production server was started successfully and its homepage returned HTTP 200, but its internal address is not a client-accessible URL.

In your existing Codespace, update this feature branch without overwriting local changes, run `npm ci` and `npm run dev`, then select **Ports → 3000 → Open in Browser**. Keep the port private. That produces the real Codespaces HTTPS preview URL. Add that exact preview origin to the approved Auth redirect configuration before real-account tests. Secrets remain in ignored environment settings. No production deployment or merge has been performed.

Missing approved assets and hosted launch blockers are documented in [Final launch report](FINAL-LAUNCH-REPORT.md). Screenshots are suitable for design review, not proof of hosted operational readiness.
