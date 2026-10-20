# Room asset provenance

The motion/realism revision retains this original source inventory. Its two additional maps, `grain.png` and `weave-roughness.png`, are generated in-project by `build.mjs`. Softened upholstery, bevels, lamp rims and reveal profiles are original revisions in `author.mjs`. SSAO/FXAA/OutputPass use the already installed Three.js MIT software; no external asset or new package/licence was introduced.

No external furniture, prop, room-scene, HDRI, artwork or texture downloads were used. All new visible room assets were authored for this isolated CurtainsUK POC in [author.mjs](author.mjs) and [build.mjs](build.mjs). They are editable, reproducible project assets; no third-party model licence or attribution requirement has been introduced. This is a provenance statement, not a change to the repository's licence.

| Room | Original assets and source |
| --- | --- |
| All four | Custom wall/floor/ceiling shell, actual window opening, frame, sill, glazing reference, skirting and cornice; `author.mjs` shell section. Room camera, lighting contract and editable palettes: `catalog.mjs`, `viewer.mjs`. |
| Living Room | Tailored two-seat sofa, accent chair, oak coffee table, side table, table/floor lamps, bound wool rug, books, ceramic vessel, foliage and framed neutral relief; `authorRoom('living')` and its named helpers. |
| Bedroom | Upholstered bed base, segmented headboard, mattress, pillows, draped cover, two bedside tables/lamps, bench, rug and foliage; `authorRoom('bedroom')`. |
| Lounge | Rolled-arm loveseat, accent chair, round dark-timber table, side table/lamps, rug, books, ceramics, foliage and restrained wall mouldings; `authorRoom('lounge')`. Seating arrangement differs from Living Room. |
| Office | Timber writing desk/drawer, upholstered swivel chair/base, monitor, keyboard, table lamp, bookcase, books, storage box, ceramics, rug and foliage; `authorRoom('office')`. |
| Shared room textures | Oak grain/plank tile, woven textile, plaster, rug and soft contact-shadow alpha. Deterministic original pixel generation in `build.mjs`; five PNGs in `packs/`. No photographic or AI-generated source. |

Every pack has an asset inventory and material list in `packs/<room>.json`. Geometry is merged by material for delivery; the authoring source retains the named construction functions. Fixed decor is not made customer-editable.

## Software licences

Three.js **0.180.0**, already present in the isolated POC, supplies geometry primitives, RoundedBoxGeometry, merge utilities, GLTFExporter/GLTFLoader and the renderer. It uses the **MIT licence**. The complete installed notice is retained in [THREE-LICENSE.txt](THREE-LICENSE.txt). No new runtime package was installed. `sharp`, already present, is an offline PNG writer only; its installed Apache-2.0 distribution and bundled notices remain in the existing dependency installation. No sharp code is sent to the browser.

Relevant primary documentation: [GLTFExporter](https://threejs.org/docs/pages/GLTFExporter.html), [GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html). GLBs contain frozen mesh geometry and PBR material names; the preview binds shared texture PNGs to those material names. For another renderer, use the same manifest bindings rather than assuming the GLB embeds the shared maps.

## Existing curtain images

Bergamot, Amalfi and Dali use the already-approved POC files and records unchanged. They are not newly sourced room assets. The existing supplier-image rights and calibration status is inherited; this work does not confer a new public redistribution licence on supplied fabric artwork. No supplier or catalogue records were written or mass-calibrated.
