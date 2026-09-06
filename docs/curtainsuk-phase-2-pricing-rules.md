# CurtainsUK Phase 2 — governed pricing and manufacturing rules

> Phase 2C supersedes the draft commercial price policy in this document. See
> `curtainsuk-phase-2c-competitive-pricing-calibration.md` for Pricing Ruleset v1.

## Scope and safety boundary

This phase extends the framework-independent decision engine only. It does not
import supplier data, connect to checkout, change the storefront, write Shopify
data, publish a Merchant Center feed, or alter production behaviour.

The supplied ruleset is deliberately `DRAFT`. It can be used only in explicit
`CALIBRATION` mode. Production calculation requires an immutable `ACTIVE`
ruleset, a matching decision registry with no blockers, complete commercial
values, and activation by an actor with the `PRICING_ADMIN` role.

## Implemented architecture

### Customer measurement and configuration

- All customer length inputs use centimetres.
- Width is the full coverage width and records either `TRACK_WIDTH` or
  `POLE_USABLE_WIDTH`; finished curtain width is never requested.
- Top, hem, centre-overlap, left-return and right-return allowances remain
  separate governed values.
- Specialist geometry stores base width, peak, left/right verticals, slopes,
  optional angles, fixing/track choice, opening direction, photographs and an
  optional drawing.
- Plausibility validation supports min/max values, suspicious mm-as-cm detection,
  and mathematical checks for a symmetrical apex.

### Rule governance

`PricingRuleSet` follows `DRAFT -> VALIDATED -> ACTIVE -> RETIRED`. The
machine-readable decision registry records the decision ID, implementation
status, default, rationale, confirmation owner, version and change date.

Activation fails if any registry entry is `DRAFT` or
`WORKROOM_CONFIRMATION_REQUIRED`, any executable governed value is not locked,
commercial values are missing, shipping is incomplete, measurement limits are
unset, or the actor is not authorised. Active versions are effective-dated and
resolved as immutable snapshots.

### Price calculation sequence

```text
coverage width + selected overlap/returns
  -> heading fullness and specific override
  -> whole fabric widths and pair/single allocation
  -> drop + top allowance + bottom hem
  -> random/straight pattern rule
  -> supplier-cost face fabric + component labour
  -> lining/interlining materials + labour
  -> heading adjustment on make-up
  -> 40% target gross-margin selling price
  -> compatible accessories
  -> goods VAT-inclusive minimum (samples exempt)
  -> packaging classification/internal cost
  -> UK Mainland supply-only delivery
  -> VAT snapshot
  -> final customer total rounded to nearest £1
```

Intermediate calculations retain full precision. Shipping and packaging do not
help an order meet the goods minimum. There are no automatic complexity
surcharges in the draft. Supplier face-fabric cost is effective-dated and
snapshotted onto the calculation. Phase 2C applies the governed target margin to
the complete direct-cost bill rather than applying a universal fabric multiplier.

### Routing and approvals

- Rectangular jobs at or below 400 cm width and 300 cm drop normally return
  `INSTANT_PRICE`.
- Jobs from 400–600 cm width or 300–350 cm drop normally return
  `PRICE_WITH_REVIEW`.
- Width above 600 cm or drop above 350 cm returns `MANUAL_QUOTE`.
- Window type, track complexity, segment count, fabric widths/weight, pattern,
  heading and lining/interlining are represented as additional factors.
- Complete, mathematically plausible simple apex/triangle/gable geometry can
  return a provisional `PRICE_WITH_REVIEW`; incomplete, inconsistent,
  low-confidence or specialist-track jobs return `MANUAL_QUOTE`.
- A specialist shape cannot become payment-eligible or be released to manufacture
  until technical approval is recorded. Manufacture additionally requires
  customer approval and paid status.

These routing thresholds and window defaults remain `DRAFT` and cannot be
activated before calibration.

### Supplier, compatibility, samples and feeds

Supplier status supports `ACTIVE`, `LOW_STOCK`, `BACKORDER`, `DISCONTINUED` and
`UNKNOWN`. Discontinued fabric blocks a new configuration while the immutable
historical record remains valid. Unknown or backorder status routes availability
to review and prevents a firm lead-time promise.

Compatibility checks cover FabricSpec, WindowType, heading, lining/interlining,
track, size/weight signals and complexity. Impossible combinations are blocked;
uncertain operational combinations route to review.

Samples have their own colourway SKU, price, postage and future-credit fields.
They are exempt from curtain minimums. Values remain draft.

Google feed eligibility requires an exact non-zero price, a matching landing-page
price, purchase availability, valid shipping, complete data, a non-quote outcome
and an `ACTIVE` ruleset. Draft fixtures and quote-only shapes remain ineligible.

## Phase 1 contradictions corrected

1. Phase 1 treated width as an ambiguous finished/track width. Phase 2 records
   full coverage width and its customer basis explicitly.
2. Heading and hem allowances were partly collapsed. They are now separate from
   centre overlap and left/right returns.
3. Half-drop was calculated like straight match. It now throws an unresolved-rule
   error and cannot price until the workroom supplies an approved formula.
4. The old minimum-order subtotal included shipping and packaging. The new
   sequence applies the goods minimum first and adds delivery afterwards.
5. Apex/triangle/gable drawings were mandatory. Photographs remain mandatory;
   drawings are optional unless technical review requests one.
6. Pricing status had no validation/activation distinction or decision source of
   truth. The four-state lifecycle and decision registry now gate production.
7. Supplier state could not distinguish unknown, backorder or low stock, and did
   not encode the historical-order exception for discontinued fabrics.
8. Phase 1 could apply automatic complexity charges. Phase 2 holds all such
   charges disabled until separately approved.
9. Phase 1 rounded component minor units during construction. Phase 2 retains
   fractional minor units and rounds only the final gross customer total.
10. Phase 1 modelled named interlining products (`DOMETTE`/`BUMP`) without a
    confirmed catalogue. Phase 2 uses the confirmed generic `INTERLINING` type;
    future grades belong in an approved material catalogue.

## Commercial and operational decisions still required

The decision registry is authoritative; its blockers currently include:

1. Confirm all heading fullness factors, tab-top support, voile factors and the
   precedence of fabric/track/window/size overrides.
2. Confirm each construction allowance, when each return/overlap applies, and
   whether allowances enter the fullness calculation before or after fullness.
3. Confirm odd-width pair construction and whether split or unequal widths are
   permitted.
4. Supply the half-drop formula and exact pattern-centring/joining/waste rules.
5. Supply base, heading, lining and pattern-match labour rates.
6. Supply lining/interlining usable widths, material rates, allowances, labour
   and compatibility matrices.
7. Approve supplier-cost tiers, supplier-RRP VAT meaning, selling-rate policy,
   margin floors, cash margins and override authority.
8. Set gross minimums for standard, premium/interlined and specialist work.
9. Confirm the VAT rate and any product-specific VAT exceptions.
10. Validate the 400/300 and 600/350 thresholds, plus review rules for fabric
    widths, fabric weight, headings, lining, tracks and segment counts.
11. Define which apex/triangle/gable cases can be provisionally priced and approve
    geometry tolerances/confidence scoring.
12. Confirm accessory launch catalogue, prices, VAT, quantities and compatibility.
13. Define packaging weight/size/width thresholds and internal costs.
14. Define UK Mainland boundaries, rates, parcel restrictions, surcharges and
    treatment of Northern Ireland, islands and remote postcodes.
15. Confirm sample price, postage, order limits and future credit policy.
16. Set measurement minimums, maximums and mm/cm suspicion threshold.
17. Approve the full fabric/window/heading/lining/track compatibility matrix.
18. Define operational promises for low stock and backorder, reservations and
    lead-time wording.
19. Name authorised pricing administrators and confirm activation timezone and
    audit-retention policy.
20. Approve the final purchasable product/variant and identifier strategy for
    Google Shopping/CSS.

## Required calibration before storefront work

Load 5–10 anonymised real jobs spanning plain, straight match, paired/single,
lined/interlined, large rectangular and at least one specialist-reviewed job.
For each, compare fabric metres, widths, labour components, materials, minimum,
VAT, delivery and final gross total against the actual quote. Record both amount
and reason for every variance. No draft commercial decision should be locked
until the variance is accepted by the commercial owner and workroom lead.
