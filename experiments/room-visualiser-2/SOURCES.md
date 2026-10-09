# Living Room 2 prototype provenance

## Curtain material clarity — 9 October 2026

`fabric-detail.mjs` changes sampler quality and cloth shading only. All curtain source pixels, transforms and repeat metadata remain untouched. The analytical yarn response is original generic shading in material centimetres, filtered below pixel resolution; it does not claim fabric-specific weave construction. No generated image, texture or external model is introduced. The local lighting bridge reduces the existing FXAA subpixel blend without changing its pass count or resolution. See [material results](FABRIC-DETAIL-RESULTS.md).

## Lounge television — 9 October 2026

The user requested a TV in the Lounge. The 55-inch screen, slim frame and floating oak cabinet are original procedural geometry in `lounge-inspiration.mjs`. They reuse the existing oak/bronze materials, with one additional unlit screen material. There is no third-party model, image, video, new light or reflection render target. See [TV results](LOUNGE-TV-RESULTS.md).

## Room-specific outdoor photographs — 9 October 2026

The user supplied three additional views: Office patio/garden (`1F567A56-78DF-49A2-A000-D40DF70FA252`), Bedroom city skyline (`20D5260D-9AE4-4DBA-8896-2EF63577242A`) and Lounge garden terrace (`67A17547-BFD3-4F76-8701-D2E17F00740A`). All three are copied byte-for-byte into `assets/window/`; dimensions, sizes, attachment identifiers and SHA-256 are recorded in `room-view-sources.json`. Living retains the preceding planted-garden photograph. Aspect ratios are preserved, with scene-plane placement adjusted to show the subjects and cover every existing camera view. No photo is retouched or generated. The source horizon/tilt and source resolution remain as provided. Bedroom's already-twilight city photo uses a brighter Evening material multiplier so its skyline remains visible; this adds no light and does not alter fabric lighting.

Only the selected room's photograph is loaded initially. Additional room photographs load on first visit and remain in a cache keyed by room view, including during rapid room changes. `roomViews=previous` retains the preceding shared garden for comparison. Window geometry, controls and all curtain/fabric sources remain intact. See [room-view results](ROOM-VIEWS-RESULTS.md).

## PVC window and user garden — 9 October 2026

The user's `E24327A8-226D-44D5-91F7-D49F4EF4024F/1-Photo-1.jpg` guided the deep plaster reveals, anthracite PVC profiles, projecting sill/threshold, hardware and partly open leaf. The window geometry is original procedural work in `window-garden.mjs`, with the two existing aperture sizes preserved. All new geometry stays behind the existing curtain envelope.

The garden is the user's subsequent `740D972E-7A75-4F02-BD33-ED15C0B8D08D/1-Photo-1.jpg`, copied byte-for-byte to `assets/window/user-garden.jpg`: 658,151 bytes, 1280 × 1279, SHA-256 `ee655eb7b5c7603e3c8b432d4708284c636fbef529ca01a69fe90f8258387f55`. The image is used with its original aspect ratio on a plane behind the glazing. It is not retouched, stretched, generated, animated or published externally. Daylight/evening brightness and glass highlights are scene-material effects. The glass uses an original small gradient and Fresnel-like opacity; it is an approximation, not live room reflections or physical refraction.

Before the user supplied this garden, a higher-resolution version of the existing CC0 Garden Nook source was downloaded and projected for investigation. Its original source metadata, offline bake script and preview are retained, but **none of the 4K HDR or its derivatives is requested by the new window**. The unchanged low-resolution lighting probe used by the wider room remains separate from the visible user garden. No new runtime dependency or lighting source was added.

## Living reference and L-shaped sectional — 9 October 2026

The user's supplied `5B25C5F0-FC18-4CD6-835E-16389A14CB8B/1-Photo-1.jpg` guided the curved ivory upholstery, marble-and-brass tables, architectural mouldings and sculptural chandelier. The user then requested removal of the left armchair and an L-shaped sofa. The sectional, remaining right-hand chair, tables, circular relief, chandelier, marble veining and abstract rug are original procedural work in `living-inspiration.mjs`. Existing room-only floor and textile maps are reused. No photograph pixels or new external model/texture package are embedded. The old scanned chair stays available in the previous-scene comparison but is not requested by the new design. The existing fireplace geometry, flame shader, embers and illumination are retained. Circular wall reliefs are opaque decorative panels, not real-time mirrors.

## Office reference and armchair — 9 October 2026

The user's supplied `9F0BDABA-A411-4B86-8A1C-681AD1A6CF6B/1-Photo-1.jpg`, visibly branded White Office, guided the walnut joinery, recessed illuminated shelves, executive desk, taupe chair and ceiling cove. The user subsequently requested a luxury armchair on the right. All new furniture, ivory lounge-chair upholstery geometry, walnut grain and rug weave in `office-inspiration.mjs` are original procedural work. No reference pixels, logo or third-party furniture model are embedded. Existing room-only floor and textile-normal textures are reused; no new external asset download or dependency was added. Shelf/cove gradient plates approximate local light wash; the three shared point lights do not provide baked GI or physical light occlusion.

## Bedroom reference and wardrobe — 9 October 2026

The user's supplied `69985975-E5C0-40EC-AA2E-27CDFB2A849A/1-Photo-1.jpg` guided the channelled ivory bed, layered linen, warm brass, architectural panelling and tiered chandelier. The subsequent user instruction added a full-height built-in wardrobe. All furniture, wardrobe, small foliage, faceted chandelier, draped bedding and atmospheric abstract artwork in `bedroom-inspiration.mjs` are original procedural work. Existing room-only fabric/floor textures and plant material are reused. No pixels from the reference are embedded in the room, and no new model, texture package or dependency was downloaded. The crystal uses opaque faceted material rather than physical transmission/refraction.

## Lounge reference update — 9 October 2026

The user's supplied `1-Photo-1.jpg` is a Dreamstime preview, ID 411867755, credited in the image to Heri Afrilianto Manalu. It guided the ivory/oak palette, tailored furniture, rounded ottoman, slender lamp and ceiling cove. No photograph pixels, watermark or depicted artwork are used in the room. The sofa, table, ottoman, static throw, rug pattern and abstract study in `lounge-inspiration.mjs` are original procedural work. Existing room-only floor/textile maps are reused. There is no new external asset download or dependency.

This directory is an offline/local experiment, not a production asset manifest. It is not imported by the production app or its pack builder.

## Existing CurtainsUK assets

The four original room GLBs, procedural room textures, furniture layouts, cameras and complete curtain runtime are read from the protected production source. The original Living Room authoring source was inspected at `experiments/wave-poc/rooms/author.mjs` in the existing Wave POC checkout. No source is copied from that historical checkout into the production runtime.

## New external assets — CC0

* **Modern Arm Chair 01**, Poly Haven: https://polyhaven.com/a/modern_arm_chair_01 . Downloaded the 1K glTF package through the official API on 2026-10-08. Geometry is uniformly fitted to the existing 82 cm chair footprint. The scanned cushion normal/roughness/AO remain; the source black diffuse is replaced by the existing ARMCHAIR_UPHOLSTERY colour control. The wooden frame retains its source material. No curtain pixels are involved.
* **Wooden Floor 02**, Poly Haven, Charlotte Baglioni (scanning), Rico Cilliers (processing): https://polyhaven.com/a/wooden_floor_02 . Downloaded 1K diffuse, OpenGL normal and packed AO/roughness/metal maps. Source coverage is approximately 1.94 m per tile. The local `tonal.webp` derivative is grayscale with a restrained tonal range (`sharp(input).greyscale().linear(.45,145).webp({quality:88})`); existing flooring palette colour multiplies this map. Original downloaded diffuse is retained as provenance.
* Licence confirmation: https://polyhaven.com/license — CC0, including commercial modification and redistribution. `assets/*/source.json` records the official download URLs and checksums. The local prototype includes a “Powered by Poly Haven” credit for API usage.

No sofa asset was downloaded: the available sofas inspected were period/vintage styles, unsuitable for this contemporary layout. The approved original sofa and fixed cushions remain, with improved material response.

## Original new work

Fireplace surround, charred log geometry, layered flame shader, instanced ember bed, radiator and valves, window trim, tray, glass vessel, landscape study and reflection field are deterministic original code in this directory. The flame uses layered noise fields with 3D embers/logs and a warm point light; it is not cloth/image synthesis. No AI image generation, video, audio, HDRI download or new runtime dependency is used.

The shader is an efficient approximation, not a volumetric combustion simulation. Dynamic lamp/fire illumination is unshadowed; the existing shadow map and AO provide geometric contact shading. Exact physical colour reproduction is not claimed.

## Integrity

Run `node experiments/room-visualiser-2/asset-proof.mjs` to check downloaded source checksums and print local SHA-256, byte sizes and geometry totals. No supplier image is resized or edited. Catalogue and fabric assignment registries are unchanged.

## Refinement 2 (local only)

Reuses the already present CC0 `garden_nook` HDR and `denmin_fabric_02` OpenGL normal map from `assets/composition/sources.json`. Existing uncommitted plant/diffuse/roughness source assets are preserved and are not loaded. The denim normal is a room-furniture map; no supplier artwork is changed.

`bake-environment.mjs` derives an exterior JPEG, nine HDR spherical-harmonic coefficients and a 64px-face CubeUV texture. The current runtime loads the SH metadata and exterior; the 688,128-byte CubeUV texture is retained but is not loaded. Runtime PMREM and global reflection assignment are removed. The probe is disabled in Inspection. This is a light probe, not a room lightmap or true GI.

Room Standard materials share diffuse/normal/roughness feature presence using three neutral 1px fallbacks. Authored furniture/floor normals remain. Packed ARM red AO is legitimate; AO use is disabled to reduce shader variety alongside screen AO, not because the file is malformed. Metallic maps are suppressed on these primarily dielectric room surfaces. Curtain materials are never traversed by this conversion.

Warm point lights participate only while enabled. Flame layers use independent phase uniforms and normal alpha compositing instead of three identical additive fields. Point-light illumination still lacks occlusion.

`HDRLoader.js` and `RGBELoader.js` are unmodified Three.js r180 MIT source from https://github.com/mrdoob/three.js/tree/r180/examples/jsm/loaders . They are used offline only; no production dependency was installed.

The private photographic benchmark is Ben Pipe's Springfield Road living room for Camilla Reid Interiors: https://www.camillareidinteriors.com/work/springfieldroad . Photography is review reference material, not a room texture or production asset.
