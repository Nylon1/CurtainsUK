# Cushion Studio and My Home release readiness

16 October 2026. Candidate remains unpublished on `feat/cushion-studio-20261014` for draft PR #201. This report supersedes earlier local acceptance counts in the implementation record. The handover supplies the full commit SHA containing this report and the reviewed candidate.

**Verdict: local customer journey and production-style build passed. Not yet approved for production purchase activation.** The owner supplied further dispatch, fabric ordering and workroom decisions later on 16 October. Those decisions and remaining implementation limits are recorded below; deployment and real Shopify integration still need authorised acceptance. No production changes, merge, deployment, Draft Order, payment or paid AI call occurred.

## What passed

| Area | Result and evidence scope |
|---|---|
| Regression suite | `npm test`: 715 successful test executions, zero failures, including 179 Cushion Studio tests. The command repeats 18 theme tests, so this is not a unique-test count. |
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

All amounts below use synthetic fabric/curtain authorities on `http://127.0.0.1:4375`. They are verification fixtures, not live customer offers. The earlier 5-6 week curtain dispatch and GBP 12.95 curtain delivery were fixture values at that time. The updated local preview uses the owner-confirmed 4-5 week curtain dispatch; GBP 12.95 remains a synthetic curtain-delivery fixture, not a newly approved policy.

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
| Supplier carriage | Record the actual applicable purchasing charge once at the correct shared group or order level. Do not assume zero carriage. | Binding cushion quotations while the relevant supplier charge is unconfigured. |
| Usable width, repeats, direction or placement calibration where missing | Read governed facts for the exact fabric and verify two reproducible matching cuts. Keep photographed dimensions separate from cutting width. | Only fabrics/configurations whose accurate placement or cutting calculation depends on the missing fact. |
| Current insert availability | Revalidate the exact variant before activation/payment. The 16 October sourcing observation reported Dunelm 57 cm square and 40 x 60 cm rectangle pads unavailable; it is a dated observation. | Affected filled 55 cm square and 38 x 58 cm rectangle while unavailable. Cover-only remains independent. Other insert stock also requires checkout revalidation. |
| Bias self-piping cutting implementation | The workroom confirms 4 mm cord, 40 mm strips and 30 cm total extra length for joins and finishing. Straight strips now use that confirmed gross total and are included in shared cloth costing. A verified bias cutting yield/layout is still absent. | Self-piped rounds and bolster ends. Contrast piping remains unavailable. |
| Actual parcel expense and insert procurement terms | Record carrier invoice cost separately from the customer charge and confirm ongoing business supply arrangements for retail-sourced inserts. | Commercial margin/procurement evidence for affected fulfilment. The agreed customer delivery price is not reopened. |

The 40% margin, agreed making charges, sundries, packaging, overhead/payment allowance, 1 m group minimum, GBP 4.95 cushion-only delivery, hold-together policy and cushion dispatch of 3-4 calendar weeks from order confirmation remain settled. Orders containing curtains use the approved curtain delivery rule once. There is no outstanding mixed-delivery policy decision.

### Later owner and workroom confirmations

- Curtain dispatch is now confirmed as 4-5 calendar weeks from the point of order. The server treats the successful checkout/order confirmation as that point and combines it with the confirmed 3-4 week cushion estimate. The updated local preview uses 4-5 weeks; the earlier 5-6 week fixture evidence above remains historical.
- Every fabric order uses a 1 m minimum and 1 m increments. The server rounds the shared required length up to a whole metre after packing compatible cushions together. Fabric-specific evidence cannot silently reduce the owner-wide rule. Supplier carriage remains separate.
- The owner reports the workroom has confirmed all active range details. New 15 mm panel constructions, selected insert/cover pairings and the proposed self-piping allowance now carry that provenance. No measured sample report was supplied, so none is claimed. Historical saved sizes retain their original interpretation.
- Current [Willows round variant evidence](../artifacts/my-home-20261016/willows-round-current.json) shows 45 cm and 55 cm pads at GBP 5.99 and GBP 6.99, both available at the check. The supplier publishes variant IDs but blank SKUs. The full advertised price is treated as purchase cost, without reclaiming input VAT; this may be updated if invoice evidence later changes the recoverable basis.
- These confirmations advance the candidate rule versions. They do not open the release switches or remove stock, supplier carriage, exact fabric and checkout revalidation gates.
- The workroom clarified that 30 cm is the total allowance, with no separate millimetres-per-join figure. Straight-cut flat cushions use that approved gross reserve without inventing a per-join loss. Their actual strips appear in the charged plan; curved bias strips remain technically gated.

### Updated local verification after the later decisions

- `npm test` passed 715 test executions with zero failures, including 179 Cushion Studio executions. The command repeats 18 theme tests; these are execution counts, not unique-test counts.
- A production-style `npm run build -- --webpack` passed compilation, TypeScript, 170 static pages, the existing Room Visualiser packaging step (two packs, 3,150 files), and both 14/14 Cushion Studio raw-asset traces. Build-only public Supabase placeholders were used. This verifies generated local contents, not a deployed alias.
- In the unpublished browser preview, a filled 45 x 45 cm cover displayed its separate 47 x 47 cm Dunelm pad and confirmed pairing. Its synthetic fabric price became GBP 76.40 after the shared whole-metre rule; My Home displayed GBP 4.95 once and GBP 81.35 total with 3-4 week dispatch. A mixed order with one synthetic curtain displayed GBP 580.40 products, one fixture curtain delivery of GBP 12.95, GBP 593.35 total, and a combined 4-5 week dispatch. Checkout remained disabled. See [updated browser evidence](../artifacts/my-home-20261016/owner-facts-browser.json).
- The local preview deliberately supplies synthetic fabric, stock, VAT and zero supplier carriage. It demonstrates calculation and presentation; it does not clear real-fabric, carriage, stock or checkout gates.

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
- [Later-decision regression log](../artifacts/my-home-20261016/owner-facts-regression-final.log)
- [Later-decision production-style build](../artifacts/my-home-20261016/owner-facts-build.log)
- [Later-decision browser evidence](../artifacts/my-home-20261016/owner-facts-browser.json)

## Release and rollback

Keep the candidate unpublished. Resolve the affected facts, run authorised preview integration checks, then obtain approval for the exact final commit through the existing protected `release/production` workflow. Review gateway, raw asset bundle and theme together. Confirm the deployed manifest and live dependency responses, not only build success. No release gate should override missing configuration evidence.

For rollback, restore the previous approved House theme section/assets and compatible gateway together. Do not leave the new page pointing at a disabled or incompatible API. Preserve additive local order records, separate saved designs and immutable purchased specifications. Do not clear customer state.
