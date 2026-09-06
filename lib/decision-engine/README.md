# CurtainsUK decision engine

This directory contains the framework-independent Phase 1 domain layer. Nothing
in the current storefront imports it, and it has no Shopify, checkout, database
or network side effects.

## Contents

- `types.ts` — Window Type Master, FabricSpec, PricingRuleSet and
  CurtainConfiguration contracts.
- `seed/window-types.ts` — the 21 agreed initial window types.
- `seed/fabrics.ts` — synthetic schema fixtures only; not supplier catalogue data.
- `seed/pricing-rules.ts` — draft version records with commercial inputs left null.
- `validation.ts` — master-data and configuration validation.
- `complexity.ts` — INSTANT_PRICE, PRICE_WITH_REVIEW and MANUAL_QUOTE decisions.
- `pricing-rule-registry.ts` — immutable version lookup and effective-date selection.
- `pricing-engine.ts` — pure, server-side calculation skeleton and component breakdown.

## Design constraints

- Millimetres are the canonical internal length unit.
- Money is stored as integer minor units with an explicit currency.
- A rule version must be ACTIVE and all required commercial inputs must be present
  before a price can be produced.
- The draft fixture deliberately cannot calculate a price.
- The engine does not write to Shopify or create a checkout.
- Synthetic fabric fixtures are always Google-feed ineligible.

Run the isolated suite with:

```bash
npm run test:decision-engine
```
