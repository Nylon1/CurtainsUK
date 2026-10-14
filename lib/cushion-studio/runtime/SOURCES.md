# Cushion Studio asset provenance

The Cushion Studio sofa, corner sofa, armchair, bed, room shell and cushion meshes are original procedural geometry in `scene.mjs` and `geometry.mjs`. They were authored for this feature. No curtain room GLB, external furniture model, unidentified configurator source, downloaded HDRI or third-party sofa asset is included.

The runtime imports the repository's existing Three.js distribution through an explicit static asset allowlist. Its MIT notice remains in `lib/room-visualiser/runtime/vendor/LICENSE.txt`. Reusing that renderer does not license supplier fabric artwork; artwork remains governed by the existing catalogue image rights and mappings.

Fabric images come from the shared catalogue's approved original MAIN image references. Four first-demonstration sources are pinned with original hashes and public source records in `config/cushion-studio-fabric-evidence.json` and `artifacts/cushion-studio-evidence/`. Their physical extents use the owner's 14 October 2026 confirmation: one recorded full fabric width horizontally and 1000 mm vertically. This is owner-supplied calibration, not an independent physical measurement. Pixel aspect does not override these two independent physical dimensions.

Original images are finite. The runtime neither asserts seamlessness nor extends artwork outside the photographed rectangle. Front and back share one visible placement with separate outward-facing geometry. Bolsters use a continuous body wrap and separate end caps. Piping appearance is explicitly indicative until strip widths, join locations and cut direction are confirmed; it must not claim exact physical artwork mapping without the matching cut plan.

Procedural room furniture is illustrative context, not a product for sale. Scene palettes do not alter the selected real cushion fabric or its supplier colourway.

Double/king scenes use illustrative upholstered reference widths of 1450/1700 mm for the arrangement surface. These are procedural scene proportions, not declared UK mattress sizes or a measured fit guarantee. The customer's own furniture should be measured before selecting a set.

When the server supplies confirmed piping construction and bounded strip segments, the renderer maps physical seam arclength to each actual strip and its join boundaries. Only the visible band around the cord is wrapped; sewn-in strip tails are excluded. Unconfirmed plans retain the explicitly indicative colour sample. Pure geometry tests cover outward front/back equality, finite source bounds and joined piping calibration. Arrangement tests cover all six scenes, capacity, rotation-aware armchair fit and persistence. State tests cover undo/comparison persistence revisions.
