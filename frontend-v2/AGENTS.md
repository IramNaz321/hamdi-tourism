# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

## Approved V2 behavior

- Build from scratch against docs/v2 and its approved Customer and Owner mockups.
- Customer and Owner share one browser local-storage dataset; demo role selection is tab-local.
- Support end-to-end standard booking, Owner review, driver/vehicle assignment, confirmation, payment simulation, custom quote acceptance, cancellation review, and separate refund simulation.
- Keep data access behind TravelService; no backend or database calls in default mock mode.
- Clearly label demo role switching and simulated payments; never collect real credentials or card data.
- Keep the customer footer scenery fixed at the bottom of the viewport, clipped to the footer; the footer content scrolls over it.

## Approved Driver slice

- Driver mockups in docs/v2/mockups/driver are approved. Extend the existing frontend rather than initialize another app.
- Customer, Owner and Driver share one persisted booking and leg progress; identity remains tab-local.
- Start/completion require confirmation and preserve payment state. Return bookings complete only after both legs; assignments lock after the first leg starts.
- Default mock mode permits testing future scheduled pickups immediately and labels that behavior. No backend, GPS or real Driver authentication is introduced.

## Approved connected local release — 23 October 2026

- The user explicitly approved implementing the backend with isolated local Supabase Docker. `VITE_DATA_SOURCE=api` uses `backend-v2`; explicit mock mode keeps the earlier browser-only demo.
- Real Customer, Owner and invited Driver sessions remain tab-local; shared booking data persists in PostgreSQL. Never expose server credentials in the frontend.
- Include Driver invitation/onboarding and Owner activation/deactivation, vehicle addition and activation controls, and the existing connected booking/custom-quote/cancellation/trip flows.
- Google Maps is deferred by the user. Use searchable UAE database places across all seven emirates; do not require a Maps key or billing setup.
- Keep Customer and Driver mobile responsive, with Owner layouts optimized for laptops. Track the selected epics/stories and actual verification in docs/v2/SCRUM.md.
