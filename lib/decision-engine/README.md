# CurtainsUK decision engine

This directory contains the framework-independent Phase 1/2 domain layer. Nothing
in the current storefront imports it, and it has no Shopify, checkout, database
or network side effects.

## Contents

- `types.ts` — Window Type Master, FabricSpec, PricingRuleSet and
  CurtainConfiguration contracts.
- `seed/window-types.ts` — the 21 agreed initial window types.
- `seed/fabrics.ts` — synthetic schema fixtures only; not supplier catalogue data.
- `seed/pricing-rules.ts` — non-production Pricing Ruleset v1 calibration values.
- `calibration/curtainsmadeforfree.ts` — reproducible competitor benchmark fixtures.
- `seed/decision-registry.ts` — machine-readable LOCKED/DRAFT/workroom decisions.
- `validation.ts` — master-data and configuration validation.
- `compatibility.ts` — blocked/review/allowed option combinations.
- `complexity.ts` — INSTANT_PRICE, PRICE_WITH_REVIEW and MANUAL_QUOTE decisions.
- `pricing-rule-registry.ts` — authorised activation, immutable lookup and effective dates.
- `pricing-engine.ts` — pure, server-authoritative calculation and component breakdown.
- `feed-governance.ts` — exact-price and purchase-readiness feed gates.
- `workflow.ts` — payment and manufacture approval gates for specialist work.

## Design constraints

- Customers enter centimetres; calculations normalise lengths to millimetres.
- Money uses explicit GBP minor units and retains fractional minor units until the
  final gross total is rounded to the nearest whole pound.
- Production pricing requires an ACTIVE version, complete inputs and a matching
  decision registry with no non-LOCKED decisions. Draft values can run only in
  explicit calibration mode.
- Half-drop and exact centring remain deliberately non-calculable until confirmed.
- The engine does not write to Shopify or create a checkout.
- Synthetic fabric fixtures are always Google-feed ineligible.
- Pricing Ruleset v1 treats supplier fabric, lining/interlining, make-up and the
  heading adjustment as direct costs, then divides by `1 - target margin`.
- The proposed £100 net gross-profit floor is stored but cannot execute while it
  remains `DRAFT` and `active: false`.

Run the isolated suite with:

```bash
npm run test:decision-engine
npm run calibrate:curtainsmadeforfree
```
