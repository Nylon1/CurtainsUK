# Living Room 2 prototype provenance

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
