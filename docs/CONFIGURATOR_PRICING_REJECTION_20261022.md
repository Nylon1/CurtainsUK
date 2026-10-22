# Make Curtains pricing rejection investigation

Status: published after owner approval through PR #290 on 22 October 2026. Serving source: `f15869952538e388c890b4560e3e238e7a6f4448`. See [production publication evidence](CONFIGURATOR_PRICING_PUBLICATION_20261022.json). The investigation below describes the pre-release findings.

Protected source inspected: `eb9310bda31a547302888bb65d7f50a1f6a842a0`.
Live Shopify MAIN theme: `182339731835` (`carpetup.myshopify.com`).
Production API deployment inspected: `dpl_J8b1CV2x5c1bwfPtYqiFD6qZLGeG`, serving through `curtainsuk-production-api.vercel.app`.

## Finding

The reproducible regression is incomplete wizard state reaching automatic pricing. It is not evidence that a valid Pair or Single has become forbidden, and it is not an adviser or general pricing outage.

`curtainsuk-premium.js` makes `required` apply only to the visible wizard step. The 650 ms pricing handler in `curtainsuk-storefront.js` relied on `form.checkValidity()`, which therefore passed while hidden pricing fields remained empty. Fresh House drafts explicitly clear construction, stack direction and measurements. Incomplete restored drafts can have the same condition. `Number("")` turns an empty measurement into zero.

Trace for a synthetic reproduction through the real Shopify proxy:

1. `/pages/curtain-visualiser` can have a selected fabric/window while construction is empty on a hidden wizard step.
2. Auto-pricing submits the form value as `construction: ""` to `/apps/curtainsuk-decision/price`.
3. The Shopify proxy delegates to `calculateStagingPrice`, which resolves the selected fabric and calls the governed pricing path.
4. `prepareStagingConfiguration` resolves the storefront window's first canonical master slug and passes the configuration to `assertValidConfiguration` / `validateConfiguration`.
5. The canonical master's `pairSingleAvailability` contains `PAIR` and `SINGLE`, but not an empty string. The expected validation issue is `CONSTRUCTION_NOT_ALLOWED`, returned as HTTP 400 `CONFIGURATION_CONSTRUCTION_NOT_ALLOWED`.
6. Subsequent input/change events can submit the same incomplete arrangement again. The old in-flight completion handler could also immediately resubmit a changed form using the same insufficient native validation.

Live synthetic probes on standard-window with valid track/pencil-pleat settings returned:

| Case | Response |
|---|---|
| Pair / split | 200, INSTANT_PRICE |
| Single / left | 200, INSTANT_PRICE |
| Empty construction | 400, CONFIGURATION_CONSTRUCTION_NOT_ALLOWED |
| Zero width | 400, CONFIGURATION_MEASUREMENT_INVALID |

These probes did not place orders or use customer measurements. No customer request body, measurements, name, address, token, supplier cost or stored session was logged.

## Affected combinations and historical limits

The incomplete-form defect is shared by all five automated windows. Their current canonical construction rules agree with the protected source:

| Storefront window | Canonical master | Hardware | Constructions |
|---|---|---|---|
| standard-window | standard-window | Track, pole | Pair, Single |
| patio-sliding-doors | patio-doors | Track, pole | Pair, Single |
| french-doors | french-doors | Track, pole | Pair, Single |
| bifold-doors | bifold-doors | Track, pole | Pair, Single |
| bay-window | bay-window | Track only | Pair, Single |

Track headings remain pencil pleat, double pinch and wave. Pole headings remain pencil pleat, double pinch and eyelet. Bay remains fitted track with pencil pleat or double pinch. No rule was widened.

The existing Error Centre records route and diagnostic code but not window, hardware, heading or construction. Therefore **the exact historic customer window/Pair/Single values cannot be recovered from that telemetry**. Do not present blank construction as a recovered historical payload. It is the confirmed live reproduction and source-level mechanism consistent with the observed failures.

The two visible measurement rejections at 07:24 on 22 October were inspected separately. Both appeared immediately after visit/page-view events. One journey then recorded repeated construction rejections and navigation to Fabric Library at 07:26; the other displayed only the initial measurement rejection. A further 10:00 measurement rejection was also visible. This is consistent with incomplete or restored state, but the old privacy-safe records cannot distinguish empty input, zero input, restore, or a customer edit. The fix covers each lifecycle path without relaxing width/drop validation.

## Production source provenance

The deployment is CLI-created and lacks a Git SHA in ordinary metadata. Source identity was checked using its uploaded file inventory, rather than assuming the branch was deployed.

All 12 relevant uploaded source-file SHA-1 identifiers match the protected source with its Windows CRLF representation: proxy route, configuration builder, canonical window seed, validation, MTM policy, rejection mapping, server pricing, staging pricing, storefront window mapping, production rules, production pricing and pricing-runtime selection. Deployed staging-pricing and window-types source contents were also retrieved and compared. The four relevant MAIN-theme files were freshly pulled and match protected source after line-ending normalization.

The attached [source comparison](CONFIGURATOR_PRICING_SOURCE_COMPARISON_20261022.json) records hashes. **No discrepancy was found in the inspected pricing path or rules.** This is not an attestation of every file or every environment variable in the deployment. The historic source record names `e1583ff05f5f45a0319bd58145ace75b3f9d25b2`; the verified path is unchanged in the protected commit above.

## Candidate behaviour

- The existing catalogue returns a per-window configuration capability contract. Pricing and the catalogue use one canonical master resolver; construction choices come directly from that master's `pairSingleAvailability`.
- Hardware and heading routes are intersected with the existing governed MTM policy and canonical capabilities. Missing capability data fails closed with refresh guidance.
- The browser rebuilds available hardware/heading/construction/opening choices from the contract, removing stale values. A sole valid construction is selected. Pair permits centre split; Single permits left or right.
- Whole-configuration validation is independent of the wizard's temporary HTML `required` flags. Empty, zero, non-finite, out-of-range and suspicious-unit measurements cannot trigger pricing.
- A bounded in-memory rejection cache prevents known-invalid arrangements from recurring through the debounce loop, including when only dimensions change. It is not persisted or logged. Valid edits, including returning to a previous valid state, can price again.
- In-flight stale results cannot expose checkout or automatically resubmit newly incomplete state. Duplicate input/change events do not erase a current successful result.
- Backend validation remains authoritative. An additional shared stack-direction check rejects incoherent Pair/Single openings. Construction validation and legitimate measurement limits remain intact.
- A residual construction rejection says: “This curtain arrangement isn't available for the selected window. Please choose one of the available Pair / Single options.”

## Diagnostics and privacy

Only price HTTP 400 responses gain an allowlisted diagnostic header: storefront window, canonical master, hardware, heading, construction, storefront release and server deployment ID. Empty construction is explicitly `UNSELECTED`; unknown values become `UNRECOGNISED` or `UNKNOWN`. Existing bounded `reasonCode` is preserved.

The consent-governed journey collector accepts the exact bounded shape only for a price POST rejection. Server ingestion revalidates it and rejects extra keys. Error Centre displays the additional fields. No request bodies, measurements, customer identifiers, free text, fabric prices/costs or tokens are added. No schema migration is required. If the hosting system does not provide a deployment ID, it is recorded as `UNKNOWN`, never guessed.

## Files changed

- `lib/storefront/mtm-configuration-contract.ts`: canonical resolver and public compatibility projection.
- `lib/storefront/shopify-contract.ts`: add configuration capabilities to existing window catalogue.
- `lib/storefront/staging-pricing.ts`: reuse resolver and enforce coherent stack direction.
- `lib/storefront/price-rejection.ts`: specific bounded customer messages.
- `lib/storefront/price-diagnostics.ts`, `app/api/staging/shopify-proxy/[operation]/route.ts`: bounded price-rejection diagnostics.
- `lib/storefront/customer-journey.ts`, `app/admin/error-centre/view.tsx`: strict ingestion and display.
- Theme `assets/curtainsuk-mtm-configurator.js`: new small capability/reconciliation/request-gate helper.
- Theme `assets/curtainsuk-storefront.js`: whole-form readiness, debounce, stale-response and known-rejection handling.
- Theme `assets/curtainsuk-premium.js`: focus the correct wizard step after a local validation failure. This is a wizard change, not a premium-consultation change.
- Theme `assets/customer-journey.js`: collect only the bounded price diagnostic header.
- Theme `sections/curtainsuk-configurator.liquid`: load helper and remove hardcoded Pair/Single/stack choices.
- Three `__tests__` files and `customer-journey-error-detail.test.ts`: contract, lifecycle, theme and privacy coverage.
- This investigation, hash comparison and `release/policy-change.json`: review evidence and pending protected-test approval.

## Validation

The contract suite exercises all five windows, nine hardware paths and 26 hardware/heading routes, with 78 valid construction/stack combinations. Every displayed combination validates and reaches a production-rules rehearsal price. Empty/invalid constructions are rejected on both sides. A temporary test-only canonical restriction proves that the catalogue, UI and backend change together; the canonical data is restored after the test.

Lifecycle tests execute the actual storefront script with wizard-equivalent hidden-field validity. They cover initial/restored incomplete state, completing steps, hardware/window changes, Pair/Single opening reconciliation, resets, in-flight edits, a repeated 400, duplicate events and returning to an earlier valid configuration. Privacy tests execute the actual journey collector and strict server parser.

Local Chrome review used the actual theme scripts and catalogue contract with synthetic pricing: no requests through unfinished wizard steps, one successful request after Pair selection, no request when Single clears centre opening, and another successful request after choosing Left. No checkout was submitted. The local fixture is not production and its sample prices are not commercial quotes.

Local regression: **500 tests passed, zero failed or skipped**, covering storefront, decision engine, Fabric Master, collector privacy and hourly Error Centre digest. The command uses the repository's server-script loader for Next's server-only marker, then `tsx --test` across those directories. TypeScript `--noEmit`, syntax checks on all four changed JavaScript assets, all five files in Shopify theme validation, and `git diff --check` pass. Required CI gate status is recorded in the PR; its protected baseline assertions are not modified by this change.

## Release and residual risks

The candidate was held until owner approval and both required checks passed, then merged through protected `release/production`. An API release and five Shopify MAIN-theme file uploads are required together. No settings, environment flags, database records, advisers, Browse, Samples, Room Visualiser, Cushion Studio or Smart Track Studio were switched off or changed during this investigation.

Deploy the API contract first and verify it through the real Shopify proxy, then upload the new helper and four modified theme files as one scoped theme release. New theme code deliberately cannot price against an old catalogue without capabilities. A cached old page can still submit incomplete state until refreshed; the backend continues rejecting it safely. Roll back theme files before reverting the API if necessary, so new theme code is not left without its required contract.

The stricter stack check may reject old incoherent saved states until the refreshed UI reconciles them. Existing valid Pair/Single configurations and pricing are covered. Post-approval live checks must confirm the custom diagnostic header survives the Shopify proxy and that `VERCEL_DEPLOYMENT_ID` is available; otherwise diagnostics remain bounded but may report `UNKNOWN`. Historic events cannot be backfilled with missing construction details.

The repository requires an exact-head `OWNER_APPROVED_POLICY_CHANGE` comment for protected test changes. That owner comment was verified on approved head `b99c2bb63e4094c0f8085c72b05fac83b80d9af0` before PR #290 merged. The owner also approved publication.
