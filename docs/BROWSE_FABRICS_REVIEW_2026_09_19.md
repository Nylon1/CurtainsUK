# Browse Fabrics candidate

Branch: feature/browse-fabrics-shopping. Base: 8735391604032ea49e1905cbdd573140ce697045.
Unpublished theme: 182336356731.
Preview: https://www.curtainsuk.com/pages/fabric-library?view=browse-fabrics&preview_theme_id=182336356731

## Implemented

Short browsing intro, governed colour chips and existing filters, filter-state display/reset, image-led cards, exact fabric links, compact Fabric Intelligence assistance and shared desktop/mobile Browse Fabrics navigation. Existing 24-record pagination, supplier stock safeguards and sample shortlist retained. Product-detail mode removes shopping styling. No catalogue backend or data changes.

## Approved Browse-only price guide

Owner approved: customer guide = 3 × the existing approved supplier base price per metre. This is not an order quote or a selling rate for Curtain Builder. Cards show “Curtains from £X” and “Price guide. Final price depends on measurements and options.” Missing approved evidence shows “Price guide unavailable”; it does not remove the fabric from unfiltered browsing.

The private query follows the existing verified-supplier-price policy: PT Standard Price ex VAT / SDG Cut Price; validated GBP evidence; latest explicit approval; no future-dated observations. Approved prices remain valid until superseded/revoked under existing policy; historical price_expires_at metadata is not a new expiry gate. Amounts are rounded to minor units before multiplication. No cost, source-price field, margin, snapshot or raw supplier evidence is sent to the browser.

19 September distribution: 9,248 browse identities, 9,239 approved guide prices, 9 missing. Quartiles £48.99 / £84 / £129.51; 90th £185.49, 95th £220.50. Bands deliberately cover the dense lower/middle distribution and a sparse upper tail:

| Guide band | Fabrics |
|---|---:|
| Under £50 | 2,403 |
| £50 – under £100 | 3,215 |
| £100 – under £150 | 2,127 |
| £150 – under £250 | 1,230 |
| £250+ | 264 |

Filtering uses exclusive upper bounds and occurs in the existing retail search query before 24-item pagination. The added five-argument search overload is opt-in, service-role-only, SECURITY INVOKER. The existing three-argument function remains unchanged. This additive read-only routine is installed; no Fabric Master/supplier price/stock rows were changed. SQL regression confirms identical IDs, totals, brands and collections without a guide filter, including search and combined governed filters.

## Candidate transport

Vercel Preview: dpl_8GdRTnhRCmEiHWWVhu9AefRmDtyf.

The unpublished theme's library section points only catalogue searches to `/api/browse-preview/catalog` on `curtainsuk-staging-5elv9jgbp-hamzas-projects-4ef62f35.vercel.app`. This read-only review endpoint requires VERCEL_ENV=preview plus CURTAINSUK_BROWSE_PREVIEW=true, restricts browser CORS to www.curtainsuk.com and uses the existing persistent rate limiter. It exposes only the customer-safe search projection, no detail/order/payment operations. CORS is not treated as authentication; the returned data is public catalogue information. Live signed proxy protections remain unchanged.

The endpoint setting is stored only on unpublished theme 182336356731 and is ignored when theme.role is main. Product details, samples and Fabric Intelligence continue through their existing same-origin routes. The installed app proxy and Production gateway were not changed. Before a later live release, deploy the approved server change through the normal gateway release; never publish the candidate relying on the Preview endpoint.

No guide enters HCI, Interior Fabric Brief, product-detail projection, supplier cost storage, Shopify prices or made-to-measure/checkout calculations. No new taxonomy was added.

Existing retail taxonomy supports colour, pattern, character and style. Texture terms are surfaced through the existing character filter. Separate pattern-strength evidence is not currently exposed, so no new classification was invented.

## Validation

Previous candidate checks: desktop 1440px, 390px and 412px had no overflow. Mobile filters collapse; desktop/mobile navigation works. Green colour filter, reset, and textured-plain plus textured filters work (62 matching fabrics). Cord search and exact pt-7248-590 detail work. Cord Breeze enters the existing sample shortlist; no cart/order/payment submitted. Assistance opens same-origin Let us read your room with entry=match.

Price implementation: 12/12 focused tests pass (guide boundaries, invalid/missing guide evidence, supplier approval/basis and existing retail/media guards). Focused ESLint and TypeScript pass. Local Next production build and Vercel Preview build pass. Shopify validates changed JS, CSS, Liquid and candidate template. All five SQL filter counts and page guide bounds pass. Customer API returns 24 filtered records with no private cost fields. Requests from absent/unapproved origins return 404. No merge or live theme publication.

Candidate browser verification: 1440px desktop, 390px and 412px have no horizontal overflow; mobile secondary filters start collapsed; price selector has 48px touch height. £50–under £100 shows 3,215 records, search combines with price and reset restores all 9,248. Gino Ivory remains browsable with “Price guide unavailable” and disappears under a numeric band. £250+ shows 264 records; Next retains the band on page 2 and every visible guide remains ≥£250. Exact product links retain Fabric Master ID and same-origin destinations. Guide disclosure is visible beside the filter and on priced cards. No calculator, checkout or HCI calls were added or invoked for guide pricing.


## Browse + detail correction pass (supersedes the filter/detail notes above)

Status: unpublished candidate only. Do not merge/publish 5efa02e or this correction without review.

- Browse: https://www.curtainsuk.com/pages/fabric-library?view=browse-fabrics&preview_theme_id=182336356731
- Reviewed detail: https://www.curtainsuk.com/pages/fabric-library?view=browse-fabrics&fabric=pt-4271-147&preview_theme_id=182336356731
- Candidate theme: 182336356731 (unpublished). Live theme untouched.
- Preview service: dpl_6UBq89K4QXR5UYBXDzASXvVo99nL / curtainsuk-staging-55j0se6vy-hamzas-projects-4ef62f35.vercel.app.

### Discovery and evidence limits

Read-only coverage check found 263 existing retail profiles against 9,248 browsable fabrics; colour 246, pattern 251, character 214, style 257. The separate visual-enrichment ledger had zero current entries at inspection. This is insufficient to present those facets as whole-catalogue discovery. Advanced filters therefore remain inactive. `BROWSE_DISCOVERY` describes their existing canonical dimensions and swatch/image/continuum presentation; an active flag AND governed options are required before rendering. No classifications were added to fill gaps, and the separate enrichment process was not changed.

Price uses visual segmented choices for the existing five bands. Brand, collection and sample availability are secondary, collapsed controls. Search/pagination stay on the existing search routine. A minimal change to the Browse-only five-argument overload adds exact supplier-SKU matching; the old three-argument function, price policy, eligibility and catalogue data remain unchanged. Migration applied as `20260919063701_browse_exact_sku_search`.

### Detail and actions

The new detail projection is opt-in via browseGuide=1; HCI and other callers retain their existing projection. Supplier facts are copied from canonical Fabric Master records, including separate full/usable widths. Incomplete composition and absent physical weight are omitted. Intelligence requires an existing validated editorial profile, known editorial rule, source/rule hashes and a matching approved exact-SKU image hash. Governed colour families do not become invented primary/secondary/accent roles. Missing scale, density, strength, visual-weight and finish classifications stay absent. Contextual advice is deterministic and conditional, labelled as interpretation rather than supplier specification. No generated image or fabricated macro asset.

Cards and detail reuse `curtainsuk:sample-add` and the existing same-origin sample-order handler; no new commerce flow. Make Curtains links contain the exact fabric ID and window context, and are enabled only when current orderReady is true. Existing server revalidation remains authoritative. Sample buttons use sampleAvailable independently of the curtain floor. Guides use the same approved current supplier price authority, with no raw supplier cost in responses.

### Focused proof

- 19/19 tests: provenance/image mismatch and unknown omission; immutable supplier facts; existing guide approval/band boundaries; commercial eligibility; media identity; direct sample event identity/context and same-origin routing; curtain handoff gating.
- Focused ESLint and TypeScript passed. Local Next production build and Vercel Preview build passed. Shopify validation passed for the changed JS/CSS/Liquid files.
- API: all 9,248 fabrics remain browsable. Five band totals remain 2,403 / 3,215 / 2,127 / 1,230 / 264; all 24 returned guides in each band pass bounds checks. Exact search 4271/147 resolves only pt-4271-147, and under-50 correctly excludes it.
- Diez Mocha: guide GBP 65.52; reviewed brown / geometric / textured / contemporary; supplier SKU 4271/147, full width 140cm, usable width 132cm, repeats 23.3cm / 22cm. No physical-weight or unobserved palette roles invented.
- Gino Ivory: browseGuide null, no reviewed interpretation, sample available but orderReady false; no manufactured guide.
- Browser: desktop 1440px and mobile 390px/412px have no horizontal overflow. Main detail actions about 49px high. Sample click resolves the signed exact ID/SKU, GBP 1 sample price, and stops at the existing service's purchaseEnabled=false gate. No cart/order/payment was created. This existing purchasing restriction was not changed.
- Make Curtains opens www.curtainsuk.com/pages/curtain-visualiser with Diez Mocha already selected (pt-4271-147). All detail/card/Fabric Intelligence navigation remains same-origin. Search + price, no-results and reset verified. One transient catalogue request displayed the existing retry error and recovered on the next query; subsequent direct band/SKU checks passed.
- Local runtime API probe was blocked by an expired local Supabase credential (401). No credential/security workaround was introduced; real-data validation used the correctly configured Vercel Preview instead.

No supplier/stock/catalogue records, HCI logic/contracts, calculator or Shopify commercial prices changed. The only database change is the private Browse search overload described above. The preview endpoint now exposes read-only customer-safe detail as well as search, under its existing preview-only/CORS/rate-limit guards. The installed app proxy and Production gateway are unchanged. Future publication requires the normal approved gateway deployment first; the candidate-only Preview endpoint is deliberately ignored by a live theme.

Final mobile interaction check found and corrected native form reset retaining the hidden price value; Clear filters now explicitly clears visual-choice state before reloading. Browser reset restored 9,248 results. New primary buttons have keyboard focus-visible treatment; card actions are at least 44px and detail actions approximately 49px.
