# CurtainsUK Phase 4A — Shopify Dawn Integration

Date: 2026-09-06
Status: staging only; not production-ready
Branch: `feature/curtainsuk-shopify-dawn-integration`

## Shopify safety record

| Role | Theme | Version | Theme ID | State |
| --- | --- | --- | --- | --- |
| Production | Minimal | 11.7.0 | `79650455661` | Live and untouched |
| Original draft | Dawn | 15.4.1 at audit | `181548810619` | Unpublished and untouched |
| Dawn 16 rollback baseline | Updated copy of Dawn | 16.0.0 | `182264136059` | Unpublished and retained |
| Phase 4A implementation | CurtainsUK Phase 4A Dawn 16 | 16.0.0 | `182264234363` | Unpublished |

Shopify created the Dawn 16 rollback baseline by copying the existing Dawn customisations into a new theme. The exact exported theme was then used as the local baseline. Its `config/settings_data.json` SHA-256 is `E7DB5531C6713D8A93AC0C2243B39F1A5CFAC286DE4BB345660E5AA88DA9010F`.

No live theme, checkout, catalogue, Merchant Center setting or customer-facing page record was changed.

## Architecture

The Phase 3 Next.js implementation remains the decision-engine reference implementation and test harness. Dawn is a presentation client only.

```text
Dawn 16 sections
  -> Shopify app proxy: /apps/curtainsuk-decision/*
    -> signed, controlled application endpoints
      -> Window Type Master + FabricSpec
      -> compatibility / complexity engine
      -> versioned server-authoritative pricing
      -> technical-review workflow
```

Dawn never receives supplier cost, direct cost, labour rates, margin policy or pricing formulas. It receives only customer-safe catalogue data, the final VAT-inclusive price, fabric widths required, route/review state and safe summary fields. The Phase 4A theme has no add-to-cart or checkout action.

The local staging API contract is implemented at:

- `GET /api/staging/shopify/catalog`
- `POST /api/staging/shopify/price`
- `POST /api/staging/shopify/specialist-review`

All three routes use `no-store` and `noindex`. The Shopify app proxy base expected by Dawn is `/apps/curtainsuk-decision`; proxy signing and deployment are deliberately not simulated in Liquid or browser JavaScript.

## Dawn implementation

The theme adds:

- window-first home hero and 14-family visual grid;
- mobile-scrollable task navigation: Shop Curtains, Shop by Window, Shop by Fabric, Apex & Gable, Measure, Samples, Inspiration and Help;
- Window Type detail section with terminology, measurements, compatible headings/linings, track notes and FAQs;
- standard and Bay configurator shell;
- specialist Apex, triangular and gable measurement/photo branch;
- FabricSpec-backed synthetic-fabric browser;
- local staging sample basket/resume UX;
- measurement guide;
- staging analytics events for window selection, starts, step completion, validation failure, fabric/sample intent, price display and review submission.

Theme templates:

- `index.json`
- `page.shop-by-window.json`
- `page.window-type.json`
- `page.configure-curtains.json`
- `page.shop-by-fabric.json`
- `page.samples.json`
- `page.measure.json`

The customer routes represented in the manifest are:

1. `/pages/curtains-for-standard-window`
2. `/pages/curtains-for-bay-window`
3. `/pages/curtains-for-apex-window`
4. `/pages/curtains-for-triangular-window`
5. `/pages/curtains-for-gable-end-window`
6. `/pages/curtains-for-extra-wide-window`
7. `/pages/curtains-for-tall-floor-to-ceiling-window`
8. `/pages/curtains-for-french-doors`
9. `/pages/curtains-for-patio-sliding-doors`
10. `/pages/curtains-for-bifold-doors`
11. `/pages/curtains-for-dormer-window`
12. `/pages/curtains-for-curved-bow-window`
13. `/pages/curtains-for-corner-window`
14. `/pages/curtains-for-awkward-unusual-window`

The route definitions are present in the theme, but the corresponding hidden Shopify Page records must be created and assigned to the supplied template only after an approved staging content migration is available. Creating production-store page records was intentionally outside this safe theme-only push.

## Bay pricing verification gate

Fixture: synthetic Harlow Sage; 340 cm total Bay width; 220 cm drop; Wave; blackout; pair.

| Component | Verified value |
| --- | ---: |
| Entered width | 340 cm |
| Centre overlap | 5 cm |
| Effective width | 345 cm |
| Wave fullness | 2.0 |
| Face fabric usable width | 138 cm |
| Balanced pair fabric widths | 6 |
| Base cut length | 255 cm |
| Straight-repeat adjusted cut | 256 cm |
| Face fabric | 15.4 m |
| Face fabric direct cost | £369.60 |
| Blackout lining | 15.3 m / £91.80 |
| Make-up | £150.00 |
| Wave heading adjustment | £15.00 |
| Total direct cost | £626.40 |
| Net selling price at 35% margin | £963.69 |
| VAT | £192.74 |
| Gross before final rounding | £1,156.43 |
| Final customer price | **£1,156** |

There is no Bay complexity surcharge in the staging calculation. Automatic complexity surcharges remain disabled. The earlier £1,253 is reproduced exactly by applying the superseded 40% target margin to the same £626.40 direct cost (`£626.40 / 0.60 × 1.20 = £1,252.80`, rounded to £1,253). The discrepancy was therefore an older margin assumption, not extra Bay logic or a higher fabric rate.

Pricing version: `2.2.0-draft.1`. It remains non-production and cannot be activated by this theme.

## Validation

- Automated tests: 31 passed (19 decision-engine, 8 storefront/API, 4 Shopify-theme contract tests).
- Next.js production build: passed, including all three Shopify staging API routes.
- Shopify Theme Check: 0 errors; 10 warnings inherited from the exported Dawn theme.
- Shopify remote schema validation: passed after the final push.
- Desktop preview: window-first hero, task navigation and all 14 cards rendered in the actual unpublished theme.
- Mobile preview at 390 × 844: responsive hero, stacked CTAs, horizontal task navigation and draft preview marker verified.

Preview: `https://carpetup.myshopify.com?preview_theme_id=182264234363`

## Remaining dependencies and launch blockers

1. Deploy an authenticated CurtainsUK application endpoint and configure a signed Shopify app proxy for `/apps/curtainsuk-decision`.
2. Add authentication, rate limiting, input-size limits, CSRF/origin controls, request IDs and operational logging to the integration boundary.
3. Provision private object storage plus signed upload/scan workflow for specialist photographs and drawings. Phase 4A intentionally sends no files.
4. Persist CurtainConfiguration, sample intent/resume state and technical-review records; the current sample basket is local staging state only.
5. Create hidden Shopify Page records and assign the supplied templates/routes without exposing them through the live Minimal navigation.
6. Decide the staging deployment URL and configure CORS/app-proxy routing before end-to-end price calls can work inside the Shopify preview.
7. Add approved product/cart/checkout handoff only after the commercial ruleset is validated and activated. Checkout remains deliberately absent.
8. Replace synthetic fabrics in Phase 4B; all current fixtures remain feed-ineligible and cannot reach Merchant Center.
9. Confirm UK market/currency presentation in staging. The preview currently inherits the store's existing market selector and can display a United States market label while retaining GBP.
10. Run real-device accessibility and browser coverage after the proxy-backed flow is connected.

## Production activation gate

Do not publish this theme until the app proxy, persistence, secure specialist uploads, Page records, current Prestigious catalogue, checkout handoff, UK shipping policy, analytics destinations and an authorised ACTIVE pricing ruleset have all passed staging acceptance tests.
