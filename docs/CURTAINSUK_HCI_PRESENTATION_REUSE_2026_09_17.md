# Approved presentation restoration

## Scope

Replace the approximate integrated upload/loading/palette UI with the approved
HCI source from `6963feb3d3e85e80b759cd2e3cc5a505e8a80960`.
No HCI backend, upload, extraction, session, storage, ranking, Shopify, Fabric
Master or commerce code changed. No production deployment or merge.

## Existing and reused

- `ReferencePalette`: editorial opening, reference choices, drop zone and preview.
- `ReferenceExperience`: original hero, imagery and supporting material.
- `ReferenceAnalysis`: Reading your room / Light. Depth. Colour., followed by
  real returned swatches / A beginning, not a verdict.
- `RoomPaletteBoard`, `GuidedRoomColour`, presentation vocabulary and all three
  original CSS modules: Where → Influence → Confirm, corrections, add, Ignore,
  colour navigation, original observation and completed board.
- Existing Design Library pages and original attributed room image.

`vendor/hci-approved/source-manifest.json` records source hashes. Tests enforce
unchanged source (apart from portable line endings), excluding the two explicitly
transport-adapted files. The authoritative implementation remains the HCI repo.

## Narrow integration changes

- Inject same-origin transport into the original ReferencePalette component;
  preserve existing server commands and ids/revisions on retries.
- Use the existing 2 MB gateway limit and truthful hosted privacy text. Do not
  expose the local-only resume endpoint.
- Track acknowledged CAS revision in the presentation connector. Existing gateway
  projection drops `revision`; the successful request's expected revision is
  retained locally. A response with a conflicting explicit revision is rejected.
- Offset focus/scroll targets for the inherited sticky CurtainsUK header.
- Remove recreated upload, analysis, ColourConfirmation and AddColour JSX.

## Verification

- 181 storefront tests passed, including source parity, UTF-8, acknowledged request
  revisions/replay, immutable original observation and Ignore projection.
- Scoped lint and TypeScript passed.
- Production build passed using build-only public Supabase placeholders locally;
  the normal environment was unavailable locally. The protected Vercel preview
  also built successfully using its existing environment.
- Real authorised room JPEG uploaded through the browser and unchanged gateway.
  Original analysis showed pending state, then actual Beige/Grey/White/Orange/Green
  extraction and original first-colour reveal. This was not a demo response.
- Original Room Palette loaded with 0/5. Beige → Walls → Important saved and
  advanced to 1/5, preserving the real uploaded image.
- Desktop 1440, mobile 390 and 412: no horizontal overflow or broken room imagery.
  Original guided confirmation, progress rail and review controls rendered.
- Reduced-motion rules remain unchanged in the original imported styles.

## Exact remaining boundary — awaiting owner decision

The original HCI feature vocabulary is `sofa`, `furniture`, `curtains`, `cushions`,
`accessories`. The pre-existing CurtainsUK palette validator instead permits
`sofa-upholstery`, `furniture-wood`, `existing-curtains`,
`cushions-soft-furnishings`, `accessories-metalwork`.

Hosted Sofa confirmation returns `HCI_CONTRACT_INVALID`; Walls succeeds. This is
a palette contract mismatch, not an image-analysis failure. It was discovered by
using the authoritative components. Do not claim complete palette save coverage.

Because the owner explicitly requested no backend changes, the allow-list remains
unchanged pending their answer. The proposed minimum correction is to replace
only those five obsolete names with the exact HCI canonical names and add
cross-contract regression coverage; do not loosen arbitrary-string validation.

The existing global Next.js navigation/footer remains outside this focused
presentation restoration. The Shopify candidate remains unpublished and untouched.
