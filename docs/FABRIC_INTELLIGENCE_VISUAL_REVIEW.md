# Fabric Intelligence visual review

Review candidate prepared on 23 October 2026 from protected `release/production` at
`154c10ce4180ff85d7285fb69ebe25786dd94756`. The owner-approved result was published through [PR #295](https://github.com/Nylon1/CurtainsUK/pull/295); the serving identities and post-publication checks are in [CurtainsUK production surfaces](PRODUCTION_SURFACES.md#fabric-intelligence-visual-release-23-october-2026).

## Customer experience

- The opening explains the fabric finder, its optional room photograph, style questions and real-fabric suggestions. It reuses the existing room image, labelled as inspiration.
- Each stage has a compact progress guide, clearer instructions, responsive visual cards and accessible controls. New screens open at the beginning; updating a choice or hydrating fabric information does not reset the customer's position.
- **Adjust my brief remains available and uses the same existing command.** It worked in a fresh live test before this change. The owner asked to retain it and make it easier to understand.
- The edit screen explains a brief as a summary of the desired look and feel. Customers can jump to a preference, use its named Edit button, select a governed option and see a saved confirmation. Keyboard focus returns to the edited preference. **Update my fabric suggestions** uses the existing brief-confirm command in the same session.
- Suggested fabrics have larger images and clear links for details and Room Visualiser, alongside the existing sample and curtain-order handoffs. An expandable panel offers Cushion Studio, Making Studio where a published profile exists, and Jane where the existing browse/launch readiness checks permit it.
- Published fabric-profile URLs come from the existing catalogue response. Missing or mismatched URLs use the existing exact-fabric library fallback; the client does not invent slugs or import the full sitemap. Extra studio links carry only the fabric identifier, not consultation contents or commerce tokens.
- A final destination panel connects Browse Fabrics, Motorised Curtain Tracks, Design My Home and the guides.

## Boundaries

No ranking, palette evidence, extraction, recommendation, pricing, stock, sample-order or checkout contract changes. No feature flags, environment variables, database records or Shopify settings changed. Shared reference UI gains opt-in host presentation/positioning props; its other callers retain their defaults. Original Start again behaviour remains.

The preview uses example responses and public fabric imagery, not a new recommendation algorithm. Its controls exercise the presentation, but do not place orders or call advisers. The existing signed commerce handoff remains unchanged. Direct studio links keep the target studio's own eligibility and consent checks.

## Verification

- 40 focused tests passed: session isolation, approved HCI presentation, journey/integration contracts, commerce handoffs and additional fabric destinations.
- Local browser checks cover eight screens at 1440, 390 and 320 px, plus photo/analysis/palette transitions, the complete guided example, saved brief adjustment, keyboard restart cancellation, catalogue-request deduplication and fabric-specific destinations. No horizontal overflow or initial scroll displacement was found in these cases.
- TypeScript passed. Scoped ESLint has no errors; two existing effect-dependency warnings remain in the transport/delivery effects.
- The production proxy build passes its guard for four released Room Visualiser packs: 3,448 files / 240,574,325 bytes. Its unrelated generated Naila theme output is excluded from this change.
- The local protected capability gate passed all 11 groups / 133 assertions. This is offline contract evidence; the PR workflow compares the candidate with the protected baseline separately.
- Read-only requests for a representative fabric's published detail page, Room Visualiser, Cushion Studio, Making Studio and Jane entry returned HTTP 200. This does not claim an order, adviser response or every fabric's rendered preview was exercised.
- With the same build toolchain, the combined compressed JavaScript/CSS increase is about 8.2 KB (baseline 100,425 bytes; candidate 108,581 bytes). No new runtime library, image library, font or image-generation request is added. Fabric images load lazily; in-flight catalogue requests are deduplicated.

## Review locally

```sh
node --import tsx scripts/fi-visual-preview.mjs
node scripts/fi-visual-browser-check.mjs
```

Open `http://127.0.0.1:4185`. The green preview navigation switches between example screens. Browser results and screenshots are generated under `.next/fi-visual-checks/`; they are not production telemetry. The preview server binds only to loopback and needs no service credentials.

Production publication occurred from the protected branch after both required checks passed. No Shopify MAIN-theme file upload was required for these proxy UI changes. The live release and its bounded verification are recorded in `docs/PRODUCTION_SURFACES.md`.
