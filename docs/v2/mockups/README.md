# V2 Booking Flow Mockups

Updated: **22 October 2026**.

Status: Approved by the user; implemented in the V2 frontend prototype. Generated with the built-in image generation tool, using the earlier V2 mockups as visual references. No legacy application code or screenshots were used.

## Approved journey

**Journey details → Vehicle & fare → Customer details / sign in → Review & book → Payment when eligible.**

Browse and quote without login. Preserve the selected journey and fare through authentication; require sign-in before booking submission. Standard bookings are created directly, without an enquiry record or manual-quote step. Enquiries are a separate optional branch for custom quotes and special requests requiring tailored pricing or arrangements.

## Current screens

| Screen | Backlog feature | Image |
| --- | --- | --- |
| Discover services, fleet, and destinations | CUST-001 | [Discovery](cust-001-discover-v2.png) |
| Journey details, vehicle selection, and fare | CUST-002 | [Quote and vehicle](cust-002-quote-v2.png) |
| Signed-in customer details and final booking review | CUST-004, CUST-005, CUST-006 | [Review & book](cust-006-review-book-v2.png) |

The third screen replaces the former standard enquiry screen and maps to **CUST-006**, not CUST-003. CUST-003 remains the separate custom-quote/special-request feature.

These are static desktop concepts. Sign-in/registration transitions, payment, booking-result states, the dedicated custom-request form, mobile layouts, loading, validation, empty, and error states require further design when their features are selected. The signed-in review state does not imply guest booking. Payment follows booking creation when eligible; detailed confirmation and payment eligibility rules remain open. All shown vehicles, fares, dates, contacts, and journey details are illustrative.

## Superseded concepts

The earlier enquiry-based standard flow is retained only in [archive](archive/README.md). It must not guide implementation. Current documents: [Root requirements](../ROOT-REQUIREMENTS.md), [Backlog](../BACKLOG.md).

## Generation prompts

### CUST-001 — Discovery

Use case: ui-mockup. Edit the supplied HAMDI TOURISM V2 discovery mockup. Preserve its excellent warm off-white/deep teal/terracotta editorial visual language, header, generous spacing, serif headings, photography, service strip, fleet categories and destinations. Flat desktop screenshot 1440x1100, readable typography. Update this to the approved DIRECT BOOKING journey. Hero heading remains 'Your journey, made simple.' Primary action 'Plan your transfer', secondary 'Explore our fleet'. Header primary 'Get a quote'. Small hero line 'Get a fare without signing in. Sign in when you book.' Below hero add a beautifully understated horizontal three-part journey strip '1 Journey details' then '2 Vehicle & fare' then '3 Review & book' with a small helper 'Customer details and sign-in before booking. Payment follows when eligible.' Keep the services fleet and destination sections readable, recompose vertically to avoid crowding or cropping. Replace 'availability confirmed after review' language with 'Illustrative fleet categories' so it doesn't imply every transfer needs a manual enquiry review. A discreet secondary text link near bottom 'Custom route or special request? Request a custom quote'. Enquiry is not a step anywhere in standard journey, no enquiry CTA after vehicle. No login wall, fake ratings, statistics, or operational success claims. Current date 22 October 2026. Bottom small caption 'V2 concept · Illustrative content'. This is from-scratch V2, not a legacy implementation reference.

### CUST-002 — Quote and vehicle

Use case: ui-mockup. Edit supplied HAMDI TOURISM V2 quote mockup. Retain the exact refined design language: deep teal buttons/text, ivory surface, terracotta accents, serif headings, sans-serif readable body, ample whitespace. Desktop flat screenshot 1440x1100. Main title 'Plan your transfer.' subheading 'Choose your journey and vehicle. No sign-in needed yet.' HEADER navigation services fleet destinations contact with optional Sign in. Replace standard flow stepper with '1 Journey' completed, '2 Vehicle & fare' active, '3 Review & book' upcoming. Keep journey form pickup 'Dubai International Airport (DXB)', destination 'Dubai Marina', One-way selected / Return, date '28 Oct 2026', time '10:30', timezone UTC+4, 2 passengers, 2 bags and 'Update quote' action. Keep selected Sedan AED 180 and Luxury sedan AED 260 unselected. RIGHT summary DXB to Dubai Marina, date/time, passenger/luggage, fare breakdown Transfer AED180 / Extras AED0 / Total AED180. Main CTA exact 'Continue to booking'. Immediately under button helpful text 'Next: your details and sign-in, then review.' Small line 'Your booking is created after you review and submit.' Completely remove 'Continue to enquiry', standard enquiry references and the blanket statement that all availability is manually confirmed after review. A small secondary link below a divider reads 'Custom route or special request?' then 'Request a custom quote'. This optional path is visually subordinate. Show example prices using a small 'Illustrative fare' label, no awkward operational guarantee. No payment button here, no fabricated booking confirmation. Avoid adding decorative footer contact numbers or email addresses. Bottom caption 'V2 concept · Illustrative content'. Current date 22 October 2026. Preserve spacious legible forms and clean alignment.

### CUST-006 — Review & book

Use case: ui-mockup. Transform supplied HAMDI TOURISM V2 enquiry mockup into a STANDARD BOOKING REVIEW screen while preserving its teal/sand/terracotta design language, beautiful editorial heading type, sans serif UI, consistent header spacing and two-column layout. Desktop 1440x1100 screenshot. This is a new screen CUST-006 — Review & book, NOT an enquiry. Replace top Sign in with subtle signed-in account 'Alex M.'; this screen shows an authenticated sample customer AFTER the sign-in/customer details step. Title 'Review your transfer.' subtitle 'Check your details before placing your booking.' Stepper '1 Journey' completed, '2 Vehicle & fare' completed, '3 Review & book' active. A discreet account line 'Signed in as alex@example.com'. LEFT primary surface: heading 'Your details' with labeled fields Full name 'Alex Morgan', Email 'alex@example.com', Phone '+971 50 000 0000', secondary Edit link. Divider then 'Pickup details' flight number optional input placeholder 'e.g. EK 202', optional Trip notes textarea placeholder 'Add pickup instructions'. Below concise policy section 'Before you book' with text 'Review the transfer and cancellation terms.' and checkbox 'I agree to the transfer terms and privacy policy.' Main prominent full width deep teal button exact 'Place booking'. Supporting sentence exact 'Your booking status and payment options appear next.' No form called enquiry, no Send enquiry button, no CAPTCHA emphasis, no enquiry receipt, no pending quote-review message, no request reference, no payment success, no paid or confirmed badge. RIGHT summary 'Your transfer' with tasteful modest destination image, pickup Dubai International Airport (DXB), destination Dubai Marina, 28 Oct 2026 · 10:30 UAE time, One-way, Sedan, 2 passengers · 2 bags, Edit journey link, fare breakdown Transfer AED 180, Extras AED 0, Total AED 180. Small label 'Illustrative fare'. At lower right separated small support text 'Need a custom arrangement?' link 'Request a custom quote', not a standard step. Small clear informational note 'A booking is created when you submit. Confirmation and payment status are shown separately.' Overall whitespace and clear hierarchy, no fake metrics. Bottom caption 'V2 concept · Illustrative content'. Current date 22 October 2026. Do not show a simultaneous submitted receipt preview. No browser chrome.

### Quote copy correction

Edit only the terracotta notice copy in this HAMDI quote UI image. Preserve all other content, layout, typography, dimensions, photos, fields, CTAs and stepper exactly. Current notice says 'Illustrative fare' and incorrectly 'Final price shown after you review and submit.' Replace the second line verbatim with 'Review the total before placing your booking.' Keep heading 'Illustrative fare'. The price must be shown BEFORE submission. Do not change anything else.
