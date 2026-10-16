# Cushion Studio and My Home release readiness

16 October 2026. Candidate remains unpublished on `feat/cushion-studio-20261014` for draft PR #201. This report supersedes earlier local acceptance counts in the implementation record. The handover supplies the full commit SHA containing this report and the reviewed candidate.

**Verdict: local customer journey and production-style build passed. Not yet approved for production purchase activation.** Remaining manufacturing and supplier restrictions are configuration-specific; deployment and real Shopify integration still need authorised acceptance. No production changes, merge, deployment, Draft Order, payment or paid AI call occurred.

## What passed

| Area | Result and evidence scope |
|---|---|
| Regression suite | `npm test`: 713 successful test executions, zero failures, including 177 Cushion Studio tests. The command repeats 18 theme tests, so this is not a unique-test count. |
| Production-style build | `npm run build -- --webpack` passed compilation, TypeScript and 170 static pages. Command-local public Supabase placeholders were used for prerendering; no production configuration changed. |
| Build assets | Both Cushion Studio routes trace all 14 required raw runtime/vendor files. A new postbuild guard fails if one is missing. Existing visualiser packaging retained 3,150 files across two packs. This proves local generated contents, not deployed completeness. |
| Product entry | Create room opens Add curtains / Add cushions. Add curtains goes through Browse Fabrics, View Fabric and Make Curtains, retaining the intended room. Room assignment remains optional. |
| Curtain journey | Standard Window, width/drop, Wave heading and Blackout lining reached a server-calculated fixture price. Add retained the item; editing width updated the same order ID without duplication. |
| Cushion and set | Individual review displayed product price, one delivery and the 3-4 calendar-week dispatch estimate. Explicit Add set added both selected covers. Saving alone added nothing to My Home. |
| Save and reopen | A two-cushion design saved and reopened with both pieces and filling choices intact. My Home reload retained the edited curtain and cushion dimensions. My Home retention is on-device; this is not cross-device account storage verification. |
| Edit and remove | Cushion edit retained the existing order ID. Removing a product recalculated the remaining order. Removing a room removed all its products from checkout; the confirmation explained the count and effect. Empty order showed GBP 0 with checkout disabled. |
| Pricing and delivery | Ordered cushions shared fabric consumption/minimums. Removing one recalculated the remaining fabric requirement. Mixed orders used one curtain delivery; removing the curtain returned delivery to GBP 4.95. |
| Dispatch and checkout safety | Automated tests prove missing dispatch blocks checkout without side effects, valid estimates reach review, latest comparable estimate governs the whole order, changed quantities/dispatch invalidate review, and retries retain immutable specifications. Browser review displayed the expected estimate and kept checkout disabled. |
| Compatibility | Automated tests retain legacy size meanings, original saved designs, distinct curtain/cushion fulfilment contracts, stable edits, quantities and stale-revision protection. |
| Presentation | Chrome desktop 1440 x 900 and mobile emulation 390 x 844 had no horizontal overflow in the tested My Home views. Shape-specific neutral cushion studies and selected-fabric cards retain the accepted geometry. No warnings/errors were captured in the bounded acceptance tab. |

### Pricing examples from the browser rehearsal

All amounts below use synthetic fabric/curtain authorities on `http://127.0.0.1:4375`. They are verification fixtures, not live customer offers. The curtain dispatch of 5-6 weeks and curtain delivery of GBP 12.95 are also fixtures, not newly approved policy.

| Ordered products | Products | One delivery | Total |
|---|---:|---:|---:|
| One 45 cm unpiped cover | GBP 66.40 | GBP 4.95 | GBP 71.35 |
| Curtain only | GBP 504.00 | GBP 12.95 | GBP 516.95 |
| Curtain and two 45 cm covers sharing fabric | GBP 596.79 | GBP 12.95 | GBP 609.74 |
| Curtain and edited 50 cm / 45 cm covers | GBP 597.20 | GBP 12.95 | GBP 610.15 |
| 50 cm and 45 cm covers after curtain removal | GBP 93.20 | GBP 4.95 | GBP 98.15 |
| Remaining 45 cm cover after removing the 50 cm cover | GBP 66.40 | GBP 4.95 | GBP 71.35 |
| Last room and its final product removed | GBP 0.00 | GBP 0.00 | GBP 0.00 |

The two 45 cm covers allocated GBP 46.39 and GBP 46.40 within the mixed order. The penny difference is reconciled allocation rounding, not an extra charge. Server and displayed totals agreed in these checks.

## Customer defects and corrections

No unresolved customer-facing defect was observed in the bounded final local journeys. This does not establish live production health.

- The standard curtain form previously re-enabled hidden required corner inputs. That blocked the ordinary Standard Window journey. Corrected and regression-tested.
- Final generated route manifests omitted the raw cushion geometry module, despite compilation succeeding. Explicit file tracing now includes it, and postbuild verifies both runtime routes. This was a candidate packaging defect, not a newly verified live incident.
- The empty order showed waiting-for-price/dispatch wording. It now shows zero amounts, an invitation to add a product and disabled checkout.
- Older retained curtain entries without a photograph now receive exact-identity public fabric metadata during review. A missing image has a named linked fallback. The local fixture uses the registered artwork because its historical supplier image URL returned 403; no production catalogue record was changed.

## Outstanding factual confirmations and affected configurations

| Outstanding fact | Proposed resolution | What remains blocked |
|---|---|---|
| Curtain dispatch authority | Record the existing approved estimate, units, start trigger and evidence in `CURTAINSUK_MY_HOME_CURTAIN_DISPATCH_JSON`. Do not adopt the local 5-6-week fixture. | Curtain-only and mixed My Home checkout. Cushion-only orders are independent. |
| Supplier increments above 1 m and carriage | Use verified existing supplier arrangements. Apply the 1 m minimum once per compatible shared fabric group and carriage at its proper shared level. Do not assume zero carriage. | Binding quotes using a supplier whose required commercial facts are missing. |
| Usable width, repeats, direction or placement calibration where missing | Read governed facts for the exact fabric and verify two reproducible matching cuts. Keep photographed dimensions separate from cutting width. | Only fabrics/configurations whose accurate placement or cutting calculation depends on the missing fact. |
| Revised cover construction | Confirm representative construction for 35/40 cm squares, 28 x 48/38 x 58 cm rectangles, 68 cm bed square and diameter 19 x 44 cm bolster. Keep 15 mm seams; record any actual correction. | These new cover dimensions, with or without inserts. Previously accepted cover-only dimensions remain independent. |
| Pad-to-cover fit | Check representative selected insert pairings, retaining exact supplier identity, dimensions and filling description. Do not change geometry or demand a crease-for-crease match. | Filled configurations whose fit remains unconfirmed. Cover-only is not blocked by insert fit. |
| Willows round insert identity and cost basis | Confirm fulfilment identifier for variants 39462557516011 and 39462564724971 and invoice/VAT basis. Current SKU fields remain unverified; do not invent a SKU or tax deduction. | Filled rounds only, together with their fit check. |
| Current insert availability | Revalidate the exact variant before activation/payment. The 16 October sourcing observation reported Dunelm 57 cm square and 40 x 60 cm rectangle pads unavailable; it is a dated observation. | Affected filled 55 cm square and 38 x 58 cm rectangle while unavailable. Cover-only remains independent. Other insert stock also requires checkout revalidation. |
| Self-piping consumption | Maker confirms straight/bias strips, joins, useful remnants and the proposed 30 cm finishing allowance. Use leftovers first and calculate extra full-width cloth only as required. | Self-piped configurations only. Contrast piping remains unavailable. |
| Actual parcel expense and insert procurement terms | Record carrier invoice cost separately from the customer charge and confirm ongoing business supply arrangements for retail-sourced inserts. | Commercial margin/procurement evidence for affected fulfilment. The agreed customer delivery price is not reopened. |

The 40% margin, agreed making charges, sundries, packaging, overhead/payment allowance, 1 m group minimum, GBP 4.95 cushion-only delivery, hold-together policy and cushion dispatch of 3-4 calendar weeks from order confirmation remain settled. Orders containing curtains use the approved curtain delivery rule once. There is no outstanding mixed-delivery policy decision.

## Verification limits before release

- Real Shopify app-proxy authentication, hosted save/recovery and checkout reconciliation were not replayed. The local harness uses one synthetic browse fabric, in-memory design saves and disabled purchase execution. Checkout retries were tested against isolated services, not Shopify.
- External Liquid Theme Check could not run because the installed toolkit lacked `@shopify/theme-check-common`. Repository theme assertions and JavaScript syntax checks passed. Resolve the validator dependency and run Theme Check before theme release.
- Physical insert fit, physical iPhone Safari and spoken VoiceOver remain unverified. Mobile emulation is not physical-device evidence.
- The final browser pass covered the order journey with standard covers and curtains. Earlier local evidence covers the five shape families. It was not a new full-catalogue or every-shape/every-fabric browser sweep.
- Purchase and release gates remain closed. Passing local tests does not authorise publication or make unresolved configurations purchasable.

## Evidence

- [Final regression log](../artifacts/my-home-20261016/acceptance-regression.log)
- [Final production-style build and asset guard](../artifacts/my-home-20261016/acceptance-build-final.log)
- [Browser sequence and console evidence](../artifacts/my-home-20261016/acceptance-browser.json)
- [Desktop order screenshot](../artifacts/my-home-20261016/acceptance-mixed-desktop.png)
- [Mobile cushion screenshot](../artifacts/my-home-20261016/acceptance-cushion-mobile.png)
- [Empty order screenshot](../artifacts/my-home-20261016/acceptance-empty-mobile.png)
- [All five shape studies](../artifacts/my-home-20261016/cushion-shape-studies.png)
- [Theme validation limitation](../artifacts/my-home-20261016/liquid-validation.log)
- [Manufacturing and insert source record](CUSHION_STUDIO_WORKROOM_STARTING_SPEC_20261015.md)

## Release and rollback

Keep the candidate unpublished. Resolve the affected facts, run authorised preview integration checks, then obtain approval for the exact final commit through the existing protected `release/production` workflow. Review gateway, raw asset bundle and theme together. Confirm the deployed manifest and live dependency responses, not only build success. No release gate should override missing configuration evidence.

For rollback, restore the previous approved House theme section/assets and compatible gateway together. Do not leave the new page pointing at a disabled or incompatible API. Preserve additive local order records, separate saved designs and immutable purchased specifications. Do not clear customer state.
