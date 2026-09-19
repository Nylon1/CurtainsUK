# Browse Fabrics candidate

Branch: feature/browse-fabrics-shopping. Base: 8735391604032ea49e1905cbdd573140ce697045.
Unpublished theme: 182336356731.
Preview: https://www.curtainsuk.com/pages/fabric-library?view=browse-fabrics&preview_theme_id=182336356731

## Implemented

Short browsing intro, governed colour chips and existing filters, filter-state display/reset, image-led cards, exact fabric links, compact Fabric Intelligence assistance and shared desktop/mobile Browse Fabrics navigation. Existing 24-record pagination, supplier stock safeguards and sample shortlist retained. Product-detail mode removes shopping styling. No catalogue backend or data changes.

## Pricing blocker

The retail projection exposes priceReady, not approved customer selling price per metre. The Fabric Master decision-engine projection explicitly sets curtainsUkSellingRatePerMetre and supplierRrpPerMetre to null. Existing pricing applies the governed margin to total job direct costs; that does not authorise a standalone fabric retail price. Cards show Price to be confirmed. Numeric prices and price filtering remain blocked pending the authoritative selling-price source. Supplier cost has not been exposed or relabelled.

Existing retail taxonomy supports colour, pattern, character and style. Texture terms are surfaced through the existing character filter. Separate pattern-strength evidence is not currently exposed, so no new classification was invented.

## Validation

Shopify validation passed four files; JavaScript syntax passed. Desktop 1440px, 390px and 412px checked with no overflow after correcting inherited fixed image width. Real images visually checked at 390px. Mobile filters collapse; desktop/mobile navigation works. Green colour filter, reset, and textured-plain plus textured filters work (62 matching fabrics). Cord search and exact pt-7248-590 detail work. Cord Breeze enters the existing sample shortlist; no cart/order/payment submitted. Assistance opens same-origin Let us read your room with entry=match. No staging hostname added. Pricing is not complete or release-ready. Nothing merged or published live.
