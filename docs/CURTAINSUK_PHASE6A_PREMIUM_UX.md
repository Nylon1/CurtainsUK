# CurtainsUK Phase 6A — internal UX rehearsal

## Result and limits

The unpublished Dawn theme now has an editorial homepage, two shopping entrances, an image-led fabric detail, mobile bottom-sheet filters and a seven-step configurator. The real HCI consultation runs separately on loopback; its exact recommendations hand off to the **actual remote unpublished Dawn** detail/sample/configuration journey.

**This is not a completed hosted HCI integration or a recommendation-quality approval.** The staff-only remote consultation landing page fails closed with an explicit service-unavailable message. PR #24 has no hosted authenticated service and rejects production execution. Its latest quality review also says it is not yet quality-ready for a CurtainsUK integration trial. Nothing bypasses that gate. No live customer recommendations are enabled.

HCI source: PR [#24](https://github.com/Nylon1/Hybrid-Curtain-Intelligence/pull/24), pinned `c7059b0bd2949957b17d887e238dbf3c683efa67`. This head added quality diagnostics while this rehearsal was running; selection/service/renderer behaviour did not change from the initial `0af6b9e` pin. PR #24 remains open and unmerged.

## Implemented surfaces

- Homepage: real approved Sanderson Painters Garden imagery, ivory/olive palette, editorial typography, consultation CTA and an explicit “I know what I want” entrance. Existing inspiration/help anchors are preserved. Mobile navigation is one scrollable row; the staging announcement remains visible.
- Consultation: HCI owns adaptive question order and accepted answers. One question per screen, phase progress, controlled first-party HCI SVG calibration and Love / Like / Not sure / Dislike. Reactions are disabled if the illustration has not loaded. The initial missing SVG namespace was corrected and the entire visual flow rerun.
- Results: at most five ranked exact Master IDs. CurtainsUK resolves current public catalogue presentation by exact ID; no substituted products on lookup failure. Reasons and unknowns come from HCI. No best-colour-match or purchase-readiness claim is invented.
- Fabric detail: genuine image, brand/design/colour, description and sample/Make Curtains actions first; specifications below. Mobile has a compact action bar, without shifting the description. Duplicate initialization from multi-section Dawn templates is guarded.
- Configurator: Window → Measurements → Fabric → Heading → Lining → Pair/single → Price. Existing native fields, validation and server handlers are retained. The fabric stage shows the selected real image. Bay still uses section widths without angles; Apex still exposes specialist geometry and technical review.
- Internal review: 24 suggested persona **labels**, six review dimensions and exact shortlist export. Selecting a label does not fabricate a different consultation. Reviews stay on the review device and never affect ranking. Human assessments remain uncompleted; automated clicks are not human ratings.

## System boundary and state

`lib/storefront/hci-contract.ts` is a presentation projection, not a matcher. It preserves the opaque consultation reference, revision, profile summary, ranked exact Fabric Master IDs/SKUs, reasons and unknowns. It strips the upstream aggregate, command history, private diagnostics and supplier image URLs. Current-question presentation is separately projected to the minimal id/prompt/answer labels. An accepted HCI Bay/Standard answer preserves the matching window context; it does not set a pricing outcome.

The local rehearsal uses HTTP to the unchanged HCI process. Only the existing calibration presentation renderer is loaded from the external checkout; no ranking code or catalogue bundle is copied into CurtainsUK. The launcher checks the exact HCI Git head. It binds only to `127.0.0.1`, rejects foreign mutation origins, bounds bodies, locks active sessions, checks revisions, and keeps accepted request results for retries. Private command history is retained under ignored `artifacts/phase6a/private/`, with a seven-day session expiry. These files and `.env*` are excluded from deployment and Git.

A small customer-safe context passes to Dawn in a URL fragment, which is immediately removed from browser history and saved separately from commerce state. It never enters signed pricing payloads. The exact fabric and Bay context survived sample → detail → configurator → return-to-shortlist. A refresh retains the configuration and consultation reference. No cross-device persistence is claimed; hosted session persistence remains part of the missing HCI service.

Remote `/admin/curtain-consultation` and its API/assets use the existing staging staff permission boundary. Anonymous page requests redirect to sign-in; API and review-script requests return 401, with private/no-store headers. The hosted API returns 503 even to staff while HCI is not connected. No database schema, catalogue, pricing, shipping, stock or ranking rules were changed. A bounded, preview-only error-code log was added when tracing the observed checkout rejection; it logs no bodies or commercial values.

## Browser and commerce evidence

- Real consultation completed with controlled images visibly loaded, seven discovery answers and 22 calibration reactions, then five actual recommended fabrics. This is a scripted engineering run, not aesthetic approval.
- 390 px and 412 px layouts checked, alongside 768 px and 1440 px. No measured horizontal overflow on the checked catalogue, detail, results and configuration views.
- Catalogue remains **6,328** fabrics with **24** records per page. Brand plus “Wilfred” search returned six results. Mobile filter sheet opens/closes; exact detail and sample actions work.
- Remote Bay: real Sanderson Painters Garden Violet/Crimson, sections 80/182/80 cm, drop 220 cm, pencil pleat, standard lining, pair. Curtain price **£1,657.00**, Mainland delivery **£12.95**, total **£1,669.95**, VAT **£278.33**.
- Created only one new development Draft Order, **#D10**, through the Dawn customer UI. Configuration `d0d6b9d7-0c83-49f0-80c6-18583e9c0adb`; handoff `d7eb97c5-d838-5d05-83c1-9a2c1345a30e`; pricing version `2.3.0-draft.1`.
- Development store freshly verified as `curtainsuk-dev.myshopify.com`, `partnerDevelopment=true`. Checkout displays “This store can’t accept payments right now”; Pay now is disabled. All eight previously existing Draft Orders have identical readback objects and amounts.
- The first remote checkout attempt returned a generic 400. A later retry of the retained configuration succeeded. No commerce-rule change was made, and the original transient cause was not established. Do not claim the failure/recovery path is comprehensively resolved from this one recovery. Shopify’s preview iframe also intercepted pointer automation; keyboard activation of the actual checkout link succeeded.
- Apex presentation remains technical review, with specialist measurements and no numeric initial customer price. No specialist quote or approval was fabricated for this UX phase.

Validation: all `npm test` suites passed; final HCI boundary tests 3/3, theme tests 18/18, TypeScript, changed-file lint, syntax checks and production build passed. Secret scan passed with zero findings. This does not claim a clean repository-wide lint baseline or human recommendation approval.

## Run the real internal preview

Use the existing PR #24 checkout and its already-authorised private bundle. In its own terminal:

```powershell
$env:HCI_INTERNAL_PILOT_ENABLED='true'
npm run dev -- --hostname 127.0.0.1 --port 3001
```

In the CurtainsUK prelaunch checkout:

```powershell
$env:HCI_SOURCE_DIR='C:/Users/hamza/hci-real-internal-pilot-v1'
npm run preview:curtainsuk-6a
```

Open `http://127.0.0.1:3260/admin/curtain-consultation`. Shortlist actions deliberately link to the remote unpublished Dawn, keeping its existing signed Shopify proxy and checkout safeguards. The optional local theme facsimile is for presentation inspection; it is not a substitute for remote commerce verification.

## Screenshots

All paths are under `artifacts/phase6a/`:

| Surface                   | Desktop                   | Mobile                     |
| ------------------------- | ------------------------- | -------------------------- |
| Remote Dawn homepage      | dawn-home-desktop.png     | dawn-home-mobile.png       |
| Real HCI questions        | consultation-desktop.png  | consultation-mobile.png    |
| Corrected calibration     | calibration-desktop.png   | calibration-mobile.png     |
| Real HCI shortlist        | results-desktop.png       | results-mobile.png         |
| Remote Dawn fabric detail | dawn-fabric-desktop.png   | dawn-hci-fabric-mobile.png |
| Stepped configurator      | configurator-desktop.png  | configurator-mobile.png    |
| Development checkout      | test-checkout-desktop.png | test-checkout-mobile.png   |

Additional mobile filters, price/handoff and staff service-gate screenshots are included. Shopify's own preview bar appears in remote screenshots; it is not part of the redesigned customer interface.

## Remaining gates

1. Provide a separately authenticated, versioned HCI staging service and its supported session/visual presentation interface. Do not turn on PR #24's local-only route in production or copy its engine into CurtainsUK.
2. Complete actual human review of recommendation quality, including colour relevance, sparse evidence and misleading neutral-need warnings identified by PR #24. There are currently no human-approved sessions.
3. Observe/investigate the intermittent generic checkout rejection before claiming launch reliability. One retry succeeded; the root cause is not established.

Dawn remains unpublished; Minimal remains live and untouched. No real payment, Merchant Center, supplier order or supplier automation was enabled.
