# Naila live theme source reconstruction

This source records the verified Naila implementation serving from Shopify MAIN theme `182339731835` on 29 September 2026. It establishes current live behaviour as canonical Git source. It does not assert that one historical Git commit contained the complete implementation.

- The JavaScript source was recovered from the local `naila-actions-20260928/candidate` release snapshot. Four imported source files differ from the prior protected branch: `components/naila-browse-entry.ts`, `lib/storefront/naila/persona.ts`, `lib/storefront/naila/colours.ts`, and `lib/storefront/naila/acknowledgement.ts`. With the committed `scripts/build-naila.mjs` and `package-lock.json` (esbuild 0.28.2), `node scripts/build-naila.mjs` produces `assets/curtainsuk-naila.js` with SHA-256 `0a8310d3273b48c505f8bfb91597bc6432492eb5f3e2473332b26121f82569a0`, matching the live asset byte for byte. The generated JS is an output, not the authoritative source.
- `shopify-theme/curtainsuk-dawn-16/assets/curtainsuk-naila.css` comes from the later local `naila-question-fit-20260928/candidate.css` desktop layout candidate. Its SHA-256 is `51902c8d225f5b3becc3565f5e38f2a95641fe5e8c3354a02f35739ec9c0a2a8`. It is a static theme source asset.
- `shopify-theme/curtainsuk-dawn-16/assets/curtainsuk-naila-portrait.webp` is the exact retained 720 × 900 generated portrait asset, SHA-256 `fa099190e38630ae2cbf317eb27071864bdca772178c10a1f3ccf8c8c73999fa`. The local provenance note `curtainsuk-naila-v1/artifacts/naila/portrait-concept.md` identifies the edited generated PNG at `C:/Users/hamza/.codex/generated_images/01a0e2d1-ef70-7d80-95bc-3a8b1033dafa/exec-b490e681-7286-448b-ae5d-6c62ceadba85.png` (SHA-256 `96124bea77b69ac28f78664ce1c3bc05d762c9b3b531bd72eafd2b51bf1cb5cd`). The exact WebP is committed as the theme asset; it was not regenerated for this reconciliation.

The four source differences have these roles:

| File | Live difference | Classification |
| --- | --- | --- |
| `components/naila-browse-entry.ts` | Calibration copy and launch consultation controls | Acknowledgement/copy; consultation control; live-required behaviour |
| `lib/storefront/naila/persona.ts` | Introductory timing sentence | Acknowledgement/copy |
| `lib/storefront/naila/colours.ts` | Individual governed colour labels and swatches | Presentation-only; live-required behaviour |
| `lib/storefront/naila/acknowledgement.ts` | Customer acknowledgement sentences | Acknowledgement/copy |

No unrelated local drift is included. The price-level source and four price bands are unchanged. The generated JS is committed as a reproducible theme output alongside its source; rebuilding it must retain the recorded hash.

The JS source, CSS, and portrait came from separate local snapshots. A search of the reachable branches and PR heads found no single historical Git commit containing them. This reconstruction changes Git source only and does not authorize a Shopify theme deployment.

The two Naila text assets have path-specific `-text` Git attributes so their committed blobs retain the verified live hashes across checkouts.
