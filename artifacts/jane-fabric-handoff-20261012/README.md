# Jane fabric-detail handoff evidence

Private local implementation, 12 October 2026. No deployment, merge, public activation or paid model call.

- [Browser verification](browser-verification.json)
- [Mobile screenshot, 390 CSS pixels](fabric-handoff-390.png)
- [Desktop screenshot, 1440 CSS pixels](fabric-handoff-1440.png)
- [Architecture, PR183 coordination and review links](../../docs/specialist-advisory/JANE_FABRIC_DETAIL_HANDOFF.md)

The browser read SHAMBALA / LAGOON from the existing bounded public retail endpoint, exact identity `pt-3697-770`. The screenshots show its approved real fabric image and the synthetic Jane portrait. The consultation remains a labelled scripted mock. Invented room details were used. Local test consultations were deleted after the browser check; no hosted customer record was created.

Unit/regression command:

```text
node --test --test-concurrency=1 lib/advisory/__tests__/fabric-detail-handoff.test.mjs lib/advisory/__tests__/consultation.test.mjs
```

Result: **29 passed, 0 failed**, duration 973.9637 ms. Eight handoff tests and 21 existing consultation tests. This is synthetic local security/behaviour evidence, not hosted or real-model readiness.

Browser command: `node scripts/verify-jane-fabric-handoff.mjs`, using the already-installed Playwright package and Edge. No packages/browser binaries were installed. Exact browser result, widths, touch/emulation distinction, reduced-motion readback and pending physical/spoken checks are in the JSON receipt.

The active indexer's 35 dependencies and binding were independently hash-checked unchanged. This feature does not import or modify the running indexing implementation. Its public catalogue reads use one exact identity, not scans. Historical source and indexing evidence are preserved.

Source changes:

- `shopify-theme/curtainsuk-dawn-16/assets/curtainsuk-fabric-experience.js`
- `lib/advisory/fabric-detail-handoff.mjs`
- `lib/advisory/fabric-detail-preview-provider.mjs`
- `lib/advisory/__tests__/fabric-detail-handoff.test.mjs`
- `experiments/jane-advisory-preview/fabric-detail-entry.js`
- `experiments/jane-advisory-preview/fabric-detail.html`
- `experiments/jane-advisory-preview/fabric-detail.mjs`
- `experiments/jane-advisory-preview/fabric-reference.mjs`
- `experiments/jane-advisory-preview/index.html`
- `experiments/jane-advisory-preview/preview.css`
- `experiments/jane-advisory-preview/preview.mjs`
- `scripts/jane-preview.mjs`
- `scripts/verify-jane-fabric-handoff.mjs`

Documentation/evidence: the handoff design record, programme source of truth, this README, browser-verification JSON and two screenshots. No other theme file changed.
