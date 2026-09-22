# Final integration acceptance — 22 September 2026

READY FOR OWNER VISUAL REVIEW: **YES**. Unpublished loopback preview:
http://127.0.0.1:4348/pages/build-my-rooms. Start with `npm run preview:rooms`.
Baseline: `47f35ac` visuals, `d59f532` multi-curtain contract, `af8feef` prior
operational proof. This integration creates no remote order or deployment.

## Current local acceptance

| Requested boundary | Result | Evidence / limit |
| --- | --- | --- |
| 1 room / 1 curtain | PASS | Actual existing Add hook + server retain, custom Reading Room |
| 1 room / 2 windows | PASS | Room intent retained, two independent immutable identities, same Fabric Master |
| 3 rooms / different fabrics | PASS | Escher, Dali, Diez exact approved photograph mappings |
| 10 curtains / repeated fabrics | PASS | 4/3/3 room grouping; 1/2/10-line exact financial contract tests |
| Autosave / refresh | PASS | 1, 2, 3 and 10 curtains, names and every saved field preserved |
| Actual browser close/reopen | PASS | Closed Chrome and reopened with the same persistent profile; ten-curtain House deep-equal |
| History / FI / Browse / Make round trips | PASS locally | Same-origin fixture navigation/back/forward preserves House; FI/Browse are labelled placeholders |
| End-Make Add and room choice | PASS locally | Existing `CurtainsUKRoomsFlow.prepare/add`, signed fixture pricing and retain API; no live configurator claim |
| Exact-fabric reuse | PASS | URL carries exact Fabric Master plus new-room marker, no copied options; independently priced new curtain |
| Custom rooms / add window / add room | PASS | Room name autosaves; adding window preserves stable room ID |
| Keep / middle remove / room remove / final remove | PASS | Other immutable configurations preserved; final removal returns discovery empty state |
| Review whole House | PASS | Existing production pricing logic with labelled local costs/stock; one governed delivery and included VAT |
| Price change at review | PASS | Previous/current amounts and individual acknowledgements |
| Price / stock change after review | PASS | Fresh checkout revalidation returns line issues/new review; confirmations reset; House untouched |
| Expired / tampered / changed House review | PASS | Membership, receipt, revision, room name and postcode changes fail closed |
| Combined fabric requirement | PASS | Two curtains individually valid, combined stock rejected at Continue |
| Final bridge / private line metadata | PASS locally | Existing immutable builders and multi-line contract; original retained identity private |
| Retry / new accepted commercial revision | PASS locally | Same request yields identical contract; changed membership, destination or accepted price gets new execution IDs |
| Default server execution safety | PASS | Actual binding makes zero network calls, returns no checkout URL, rejects production transport |
| Desktop / 390 / 412 | PASS | No overflow, ten cards, 44px removal targets; no browser errors |
| New hosted bridge / full live navigation | BLOCKED | Unpublished; no remote deployment authorised or performed |
| Public House payment | BLOCKED intentionally | Hard-disabled; no invoice URL returned, no order/payment/manufacture |
| Video walkthrough | BLOCKED | Browser recording needs absent ffmpeg; screenshot walkthrough delivered instead |

Validation: `npm run test:rooms` **35/35**; `npm run test:storefront`
**242/242**; `npm run verify:rooms` **26/26**, browser errors **0**.
TypeScript `npx tsc --noEmit --incremental false` passes. `git diff --check` passes.

## Screen walkthrough

All images are local, clearly labelled fixture evidence:

1. `add-to-rooms.png` — one custom room after the real Add hook.
2. `two-windows.png` — another independently retained curtain in that room.
3. `prepared-disabled.png` — fresh combined preparation; no order or payment.
4. `acknowledged-price.png` — individual current-price acceptance.
5. `combined-stock.png` — fresh line-specific fabric requirement failure.
6. `desktop.png`, `mobile-390.png`, `mobile-412.png` — premium grouped Rooms layout.
7. `review.png`, `changed-price.png`, `empty-mobile.png` — review, changed price and empty state.

`parent-desktop.png` and `parent-mobile.png` record independent parent-agent
inspection. `browser-verification.json` contains the exact executed check list.
Preview media is derived only from the existing VERIFIED/APPROVED mappings for
`pt-4269-147`, `pt-4270-147` and `pt-4271-147` in
`artifacts/phase5h/media-summary.json`; it depicts fabric, never the customer’s
finished curtain. Neutral heading studies remain explicitly labelled.

## Earlier live proof — not repeated here

The separate private rehearsal recorded at `af8feef` used two rooms and three
curtains: £2,149.00 goods + £12.95 delivery = £2,161.95 total, **including
£360.33 VAT**. Migration `20260921205826_multi_curtain_paid_order_contract`
was applied; the invisible Draft Order was deleted. The temporary route and
credential were removed. No payment, email or workroom release occurred.
This proves the earlier contract/runtime boundary, not deployment of the final
integration. Its source of record is README and `docs/BUILD_MY_ROOMS_V1.md`.

The final task did not change protected pricing, stock, Fabric Master,
compatibility, Guided Measure, webhook, lifecycle, workroom, Trust, cookies or
the canonical shared footer. Live theme **182339731835** remains unchanged;
no themes were created. Owner visual approval, scoped comparison with the then
current canonical theme and hosted verification remain required before any
separately authorised publication/payment release.
