# CurtainsUK Phase 1 — core data architecture

> Phase 2 supersedes the pricing, measurement, routing and activation details in
> this document. See `curtainsuk-phase-2-pricing-rules.md`.

## Scope

Phase 1 creates the master data and calculation boundary only. It does not alter
the storefront, Shopify catalogue, checkout, Merchant Center, or any customer
journey.

## Domain model

### Window Type Master

`WindowTypeMaster` is the source of truth for geometry, measurement requirements,
available construction options, review requirements, search intent and related
window types. The initial seed contains exactly the 21 types in the brief. The
seed is data only and does not generate SEO pages.

### FabricSpec

`FabricSpec` represents one supplier design and colour. It holds supplier identity,
unique SKU, usable width, repeats, composition, care, commercial rates, samples,
lead time, allowed combinations, images and feed eligibility.

The included records are clearly marked synthetic fixtures. Supplier costs,
selling rates and sample prices are null, so they cannot be mistaken for imported
Prestigious Textiles data.

### PricingRuleSet

`PricingRuleSet` is versioned and effective-dated. It supports heading fullness,
allowances, fabric and lining widths, pattern adjustment, pair/single allocation,
material rates, labour, surcharges, accessories, packaging, shipping, minimum
order, VAT and price rounding.

The production path must load an ACTIVE immutable version on the server. A
configuration records the exact version and component breakdown used. Editing
an active version in place is prohibited: publish a new version and retire the
old one after its effective period.

### CurtainConfiguration

`CurtainConfiguration` links the selected window type, measurements, fabric,
colour, heading, lining/interlining, construction, track/pole, stack direction
and accessories. It also carries the calculation version, component breakdown,
final price, technical review, customer approval and production states.

The configuration remains independent of checkout in Phase 1.

## Calculation boundary

```text
Validated master data + customer configuration
                 |
                 v
       Complexity rules (versioned)
                 |
       +---------+----------------+
       |                          |
 INSTANT_PRICE / REVIEW      MANUAL_QUOTE
       |                          |
       v                          v
 Server pricing engine       No automatic price
       |
 Immutable version + itemised calculation result
```

The engine calculates widths from finished width, heading fullness and usable
fabric width; applies the selected pair/single allocation policy; calculates cut
length; rounds patterned fabric to a vertical repeat; then calculates materials,
labour, surcharges, accessories, packaging, shipping, minimum order, VAT and final
rounding.

It throws a `MissingCommercialRuleError` instead of inventing a value when a
required commercial input is absent.

## Initial complexity behaviour

- Standard Window: `INSTANT_PRICE` when the configuration is complete.
- Bay and other review types: `PRICE_WITH_REVIEW`.
- Apex, triangular, gable, angled, arched, curved and unusual geometry:
  `MANUAL_QUOTE`.
- Extra-wide and tall projects: `PRICE_WITH_REVIEW` by type; optional versioned
  size thresholds can escalate them to `MANUAL_QUOTE`.

The draft threshold values are null because the business has not approved them.

## Data integrity rules

- Window slugs and fabric SKUs must be unique.
- Related window slugs must resolve.
- Specialist types cannot default to instant pricing.
- Required measurements must be present, positive and of the correct scalar/list type.
- Window, fabric, colour, heading, lining and pair/single selections must agree.
- Required photographs and drawings block a valid submission when absent.
- Fabric composition must total 100 percent.
- Fixture fabric records cannot be feed eligible.
- Draft or incomplete pricing rules cannot generate a price.

## Business decisions still required

These values cannot be inferred safely and intentionally remain unresolved:

1. Fullness factor for every heading, including whether it varies by track system,
   fabric or finished width.
2. Heading and hem allowances, plus any extra top/bottom turns.
3. Pair construction for an odd number of widths: round up to equal whole widths,
   split a width, or allow unequal curtain widths.
4. Whether the finished width represents track width, curtain coverage, overlap,
   returns, or a combination of them.
5. Exact pattern-repeat treatment for straight match and half-drop designs,
   including pattern centring and waste at joins.
6. Supplier-cost and retail selling-rate policy by fabric, including markup,
   promotions and VAT treatment.
7. Lining and interlining usable widths, allowances, rates and compatibility rules.
8. Base make-up labour per width and heading-specific labour rates.
9. Additional pattern-matching labour.
10. Oversized width/drop thresholds and whether their surcharges are fixed,
    percentage-based or manually quoted.
11. Complexity surcharges and which bay/door/dormer projects can receive a
    provisional price.
12. Which apex, triangular or gable geometries can ever receive a provisional
    `PRICE_WITH_REVIEW` instead of `MANUAL_QUOTE`.
13. Accessories catalogue, unit prices and quantity rules.
14. Packaging classes and costs for standard and oversized orders.
15. Shipping zones, prices, maximum parcel dimensions and installation-only areas.
16. Minimum order value and whether it is evaluated before or after VAT/shipping.
17. VAT basis: whether stored commercial prices are inclusive or exclusive.
18. Final price rounding policy and whether component values or only the final total
    are rounded.
19. Sample price, postage, maximum sample quantity and refund/credit policy.
20. Measurement minimums, maximums, tolerances and manual-review safety limits.
21. Approved heading/lining/window combinations for each fabric construction.
22. Supplier lead-time rules, discontinued-fabric handling and reservation policy.
23. Google-feed inclusion rules for samples, fabrics and configured curtains.
24. Effective-time zone and approval roles for activating a pricing-rule version.

These decisions should be signed off in a commercial rules workshop before any
rule version is moved from DRAFT to ACTIVE.
