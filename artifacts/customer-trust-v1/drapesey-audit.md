# Drapesey legacy-reference audit

**Read-only audit — 21 September 2026. No Shopify records changed.**

## Shopify Admin / customer-facing content

Store: `carpetup.myshopify.com`; pages fetched: **547** over two GraphQL pages. Search covered each page title, handle and body plus all five current Shopify native policy bodies.

- **41 published Shopify Pages** contain `Drapesey` or a `drapesey.com` URL.
- **187 page-body/title/handle occurrences** were counted.
- **0 native Shopify policy-body occurrences** were counted in the five current policy records.
- The current cookie-banner configuration separately stores `https://www.drapesey.com/policies/privacy-policy`.
- Shopify Admin order-confirmation preview and sender settings separately show `enquiries@drapesey.com`.

The exact published-page hit list is below. Counts are case-insensitive occurrences in the page record; examples are representative, not a replacement for the source audit.

| Published page title | Handle | Occurrences | Customer-facing action |
|---|---|---:|---|
| Get in Touch | `book-your-home-visit` | 1 | Rewrite/replace legacy contact journey |
| Pro Curtain Installation Service | `curtain-tracks-and-poles-fitting-service` | 3 | Rewrite with verified CurtainsUK fitting/help route |
| Our Terms and Conditions | `terms-and-conditions` | 9 | Replace/merge into canonical Terms |
| Curtain Heading Styles | `curtain-heading-styles` | 4 | Replace links/content with approved Curtain Style |
| Curtain Track systems | `drapery-track-systems` | 4 | Audit/replace legacy hardware page |
| Curtain poles | `curtain-poles` | 4 | Audit/replace legacy hardware page |
| Browse Pelmet Box Collection | `browse-pelmet-box-collection` | 1 | Review/remove or rewrite |
| Areas we cover | `areas-we-cover-local-advisors` | 22 | Rewrite with verified coverage; remove external links |
| BROWSE FABRICS | `browse-fabrics-order-samples` | 14 | Replace with governed Browse Fabrics route |
| Apex Window Curtains | `apex-window-curtains` | 2 | Keep only if V1 scope/content approved; remove legacy contact |
| Acoustic Wood Wall Panels | `acoustic-wood-wall-panels` | 5 | Separate/retire unrelated catalogue content |
| Check out our new Acoustic Wall Panels ! | `acoustic-wall-panels` | 4 | Separate/retire unrelated catalogue content |
| Contact us | `contact-us` | 3 | Rewrite with support/complaints/media routes |
| About CurtainsUK | `about-us-1` | 4 | Rewrite; remove legacy image/links |
| Bay Window Curtains \| Bespoke Styles & Perfect Fit | `curtains-for-a-bay-window` | 2 | Rewrite/verify Bay content |
| Curtains for a Patio door | `curtains-for-a-patio-door` | 2 | Rewrite/verify opening journey |
| Tab Top Curtains | `tab-top-curtains` | 2 | Review against approved heading scope |
| Wave Pleat Curtains | `wave-pleat-curtains` | 2 | Replace with approved Wave/Anatomy content |
| Eyelet Curtains | `eyelet-curtains` | 2 | Replace with approved Eyelet content |
| Pinch Pleat curtains | `pinch-pleat-curtains` | 2 | Replace with approved Double Pinch content |
| Childrens Bedroom Curtains | `childrens-bedroom-curtains` | 2 | Review/replace legacy links |
| Living Room Curtains | `living-room-curtains` | 2 | Review/replace legacy links |
| FAQ | `faq-1` | 3 | Rewrite with current Guided Measure/MTM rules |
| How to Measure for Curtains | `how-to-measure-for-curtains` | 2 | Merge into Guided Measure |
| Curtain Services in Bristol \| Expert Measuring & Installation | `curtain-services-in-bristol-expert-measuring-installation` | 5 | Review/replace city page |
| Curtain Services in London \| Bespoke & Local Experts | `curtain-services-in-london-bespoke-local-experts` | 5 | Review/replace city page |
| Curtain Services in Birmingham \| Local Experts & Bespoke Design | `curtain-services-in-birmingham-local-experts-bespoke-design` | 5 | Review/replace city page |
| Curtain Services in Manchester \| Local Experts & Bespoke Design | `curtain-services-in-manchester-local-experts-bespoke-design` | 5 | Review/replace city page |
| Curtain Services in Leeds \| Local Experts &amp; Bespoke Design | `curtain-services-in-leeds-local-experts-amp-bespoke-design` | 5 | Review/replace city page |
| Curtain Services in Cambridge \| Bespoke & Local Experts | `curtain-services-in-cambridge-bespoke-amp-local-experts` | 5 | Review/replace city page |
| Curtain Services in Surrey \| Local Experts & Bespoke Design | `curtain-services-in-surrey-local-experts-bespoke-design` | 5 | Review/replace city page |
| Curtain Services in Milton Keynes \| Local Experts & Bespoke Design | `curtain-services-in-milton-keynes-local-experts-amp-bespoke-design` | 5 | Review/replace city page |
| Curtain Services in Southampton \| Local Experts Bespoke Design | `curtain-services-in-southampton-local-experts-amp-bespoke-design` | 5 | Review/replace city page |
| Curtain Services in Kent \| Local Experts & Bespoke Design | `curtain-services-in-kent-local-experts-bespoke-design` | 5 | Review/replace city page |
| Curtain Services in Northampton \| Local Experts & Bespoke Design | `curtain-services-in-northampton-local-experts-bespoke-design` | 5 | Review/replace city page |
| Curtain Services in Nottingham \| Local Experts & Bespoke Design | `curtain-services-in-nottingham-local-experts-amp-bespoke-design` | 5 | Review/replace city page |
| Curtain Services in Leicester \| Local Experts & Bespoke Design | `curtain-services-in-leicester-local-experts-amp-bespoke-design` | 5 | Review/replace city page |
| Curtain Services in Lancashire \| Bespoke Local Experts | `curtain-services-in-lancashire-bespoke-local-experts` | 6 | Review/replace city page |
| Curtain Services in Sheffield \| Local Experts &amp; Bespoke Design | `curtain-services-in-sheffield-local-experts-amp-bespoke-design` | 5 | Review/replace city page |
| Curtain Services in Cardiff \| Local Experts Bespoke Design | `curtain-services-in-cardiff-local-experts-amp-bespoke-design` | 5 | Review/replace city page |
| Curtain Services in Newport \| Local Experts - Bespoke Design | `curtain-services-in-newport-local-experts-bespoke-design` | 5 | Review/replace city page |

Examples include old `enquiries@drapesey.com`, `www.drapesey.com` links, Drapesey branding and legacy measuring/install/heading links. The list contains no native policy hits because the native policies currently use CurtainsUK wording/contact, but some are still generic or incomplete and remain in the owner decision sheet.

## Repository search

Case-insensitive `rg` excluding `.git`, `node_modules` and generated audit artifacts found seven source/document files. Only the following are customer-facing or release-adjacent:

| File | Classification | Action |
|---|---|---|
| `content/customer-trust/catalogue.mjs` | Canonical review source; no active Drapesey string after owner-decision update | Keep generated review content unpublished until Admin configuration is corrected. |
| `docs/curtainsuk-phase5e-owner-inputs.md` | Historical launch documentation with old contact | Keep historical record; do not serve. |
| `docs/curtainsuk-phase5e-launch-rehearsal.md` | Historical rehearsal evidence | Keep historical record; do not serve. |
| `docs/curtainsuk-phase5m-launch-gate-september8-history.md` | Historical scan/report saying no current references | Keep; superseded by this broader Shopify audit. |
| `docs/CURTAINSUK_LAUNCH_POLICY_APPROVAL.md` | Historical launch-policy blocker | Keep; superseded by this owner decision sheet. |
| `docs/CURTAINSUK_FINAL_PRELAUNCH_REPORT.md` | Historical prelaunch report | Keep; do not serve. |
| `docs/CUSTOMER_TRUST_V1_REVIEW.md` | Current review report describing live Drapesey findings | Keep as review evidence; not published. |

The runtime/theme source scan found no active `Drapesey` or `drapesey.com` string outside the review/evidence material. The old Next image-privacy route now redirects to the canonical CurtainsUK destination in the review branch. Generated review artifacts intentionally retain the old public text as evidence and must not be published.

## Required cleanup sequence after owner decisions

1. **Complete in this review build:** update the canonical customer-trust source with the confirmed address, returns, delivery, privacy and responsible-business facts; regenerate all 21 drafts.
2. Replace/retire the 41 Shopify page records in a scoped migration; do not mass-delete pages without deciding redirects and search/indexing impact.
3. Replace the cookie-banner privacy destination and configure/verify consent in Shopify Admin.
4. Replace the notification sender and generic Drapesey confirmation footer; preview MTM-only, mixed and samples-only messages.
5. Rerun the Shopify-wide search and public route audit. Require **zero customer-facing Drapesey references** before publication.
