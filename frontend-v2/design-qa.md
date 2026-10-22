# V2 frontend design and interaction QA

Date: 22 October 2026. Scope: frontend prototype with persisted simulated records.

## References and captures

Approved customer references: `../docs/v2/mockups/cust-001-discover-v2.png`, `cust-002-quote-v2.png`, `cust-006-review-book-v2.png`.
Approved Owner references: `../docs/v2/mockups/owner/own-013-bookings.png`, `own-015-booking-assignment.png`, `own-011-custom-quote.png`, `own-016-cancellation-payment.png`.

Owner desktop captures use 1512 × 1040 CSS pixels at DPR 1. References are approximately the same size; comparison sheets normalize the small reference-size difference. Evidence: `qa/owner-bookings-desktop.png`, `qa/owner-assignment-desktop.png`, `qa/owner-custom-quote-desktop.png`, `qa/owner-cancellation-desktop.png`. Comparison images are saved alongside these captures. Mobile was inspected at 390 × 844; tables scroll within their containers without widening the document.

## Findings and fixes

- P2: Owner table/form text was too small. Increased text sizes and improved status contrast.
- P2: Assignment and custom quote action rails started below the heading and extended too far down. Aligned the rails alongside compact headings, bounded the driver list, and made expected-end editing progressive.
- P2: Closed mobile navigation remained keyboard reachable. Added hidden visibility while closed and a table scroll hint.
- P2: Cancellation summary consumed excessive vertical space. Compacted the heading and arranged the summary in two columns. The saved cancellation capture precedes this final compacting change.
- User-requested footer change: fixed the scenery to the viewport bottom, clipped to the footer. Content retains normal document scrolling. `qa/footer-fixed-bottom.png` and `qa/footer-fixed-scrolled.png` show an 80-pixel content scroll. A scenery-only pixel region remained identical; computed positioning is fixed with bottom zero. Captures are 1280 × 720 at DPR 1.

Actual records, dates, counts, eligibility warnings, and status labels differ from static mockups because they reflect persisted interactions. These are expected data differences. Customer-visible cancellation notes intentionally describe the outcome rather than promising private internal notes.

## Interaction verification

Browser-tested a customer booking in one tab and Owner assignment/confirmation in a second tab. Changes propagated without reloading. Reload preserved records. Simulated payment, cancellation approval, and a separate full refund propagated back to the customer. Also tested guest custom request → Owner shared quote → signed-in customer acceptance → one booking → assignment and confirmation. Inspected mobile navigation and internal table scrolling. Customer and Owner browser error logs were empty during these flows.

Automated verification: TypeScript check, 35 service/API contract tests, production build, and four static-host packaging tests passed after the final code edits.

## Result

Footer behavior: passed. Shared frontend workflows: passed. No known actionable P0/P1/P2 issues remain from the inspected flows. Final compact cancellation layout has not received a new screenshot comparison; broader visual parity is not claimed as pixel-perfect. Remaining production work includes real authentication, server authorization, scheduling concurrency, payment/refund providers, and backend persistence; see API-CONTRACT.md.

# Driver slice QA — 22 October 2026

Source truth: `../docs/v2/mockups/driver/drv-003-assigned-trips.png`, `drv-004-trip-details.png`, `drv-005-trip-progress.png` (853 × 1844 raster pixels, approximately 2.19× the target CSS size). These three connected screens were approved before implementation. The existing V2 app was extended; no new mobile runtime or device frame was introduced.

Implementation viewport: 390 × 844 CSS pixels, DPR 1. Screenshots: `qa/driver-assigned-mobile.png`, `qa/driver-details-final-mobile.png`, `qa/driver-active-final-mobile.png`. Sources were normalized to 390 × 844 for side-by-side `qa/driver-assigned-comparison.png`, `qa/driver-details-comparison.png`, and `qa/driver-active-comparison.png`. Focused control crops are `qa/driver-*-actions-comparison.png`. Full-size combined captures were opened and reviewed with readable controls; focused crops preserve action evidence.

States: assigned list with confirmed and awaiting-confirmation records; confirmed pickup details; in-progress trip. Live prototype data includes the previously accepted custom quote HT-2026-CC9C1C and seeded pending HT-2026-DEMO004. References use fictional Alex/Omar examples; route, passenger counts, vehicle, contact, date and timestamps intentionally follow stored data instead. `qa/driver-details-mobile.png` and `qa/driver-active-mobile.png` additionally show standard-booking QA record HT-2026-A9FD03. Completion/history evidence: `qa/driver-completed-mobile.png`, `qa/driver-history-mobile.png`, `qa/customer-driver-completed.png`.

## Comparison history and fixes

- P2, initial mobile detail/active view: primary action partially covered by fixed navigation. Reduced header height and section spacing, retained document bottom padding, and sized action to 44 pixels. Post-fix standard action bounds were top 705.98 / bottom 753.98, with navigation starting at 789. Final custom-trip action bounds are top 705.98 / bottom 749.98. Screenshots and comparisons above show the full action.
- P2, initial trip detail: Assigned trips navigation did not remain highlighted on a detail route. Added explicit active state for trip routes. Final comparisons show the terracotta active nav.
- P2, assigned list density: header/list spacing pushed the second record action below the reference viewport. Tightened date/tab margins and card spacing while keeping action touch targets at least 44 pixels. Final assigned comparison shows both record actions above navigation; longer datasets remain scrollable.
- Post-fix captures were compared again. No actionable P0/P1/P2 finding remains in the reviewed Driver screens.

## Required fidelity surfaces

- Fonts/typography: existing self-hosted Cormorant Garamond headings and DM Sans UI retained. Heading hierarchy, readable body copy and wrapping inspected. Small action/status text differs slightly from the generated reference; further optical matching is P3 polish.
- Spacing/layout: compact wordmark/profile header, stacked route stops, dividers, passenger/instruction/vehicle groups, bottom navigation and prominent next action retained. Desktop uses a wider centered workspace; mobile has no document horizontal overflow (scrollWidth 390). Additional actual notes and history naturally scroll.
- Colors/tokens: existing ivory, deep teal, terracotta and semantic status palette retained. Colored status includes text, not color alone.
- Image/assets: reference has no new photos or raster illustrations to generate. Existing product wordmark/fonts and Phosphor icon library are reused; no fabricated map or GPS asset is shown.
- Copy/content: actions are Start trip and Complete trip, followed by confirmation. Real mock timestamps and contact/vehicle data replace static reference content. Timeline groups start/completion under a shared per-leg component so all roles render the same saved state. Prototype-only future-time note appears before starting; Contact Owner truthfully reports that no real dispatcher phone is configured.

## Browser and functional evidence

Tested new Customer booking → separate Owner search/assignment/confirmation → separately selected Faisal Driver → start confirmation → In progress simultaneously visible in Customer and Owner → completion confirmation → Completed in both. Reloaded all three tabs and verified persisted completion, timestamps and Driver history. Verified pending assigned work cannot start, switching to Imran yields no Faisal assignments, and a direct URL to Faisal's trip is denied. Also started/completed the existing accepted-custom-quote booking. Browser error logs for Customer, Owner and Driver were empty. Automated tests cover both return legs, cancellation holds, stale/reassigned access, duplicate actions, concurrent active-driver/vehicle restrictions, unchanged payment records, and older-data compatibility.

Final checklist: approved references used; linked roles verified; mobile primary controls visible; no horizontal overflow; confirmation/error/empty/history states exercised; existing records preserved; TypeScript, service/API tests and production/static-host build checked. Broader desktop/tablet use retains normal scrolling; no new exhaustive visual parity claim is made outside the inspected mobile screens. Backend/auth/GPS/payment providers remain future integration.

final result: passed
