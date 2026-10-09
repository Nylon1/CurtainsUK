# Room-specific views — 9 October 2026

[Four-room gallery](http://127.0.0.1:4382/rooms-review?review=room-views) · [Office](http://127.0.0.1:4382/?room=office&fabric=sdg-f1541-01&roomViews=selected) · [Bedroom](http://127.0.0.1:4382/?room=bedroom&fabric=sdg-f1541-01&roomViews=selected) · [Lounge](http://127.0.0.1:4382/?room=lounge&fabric=sdg-f1541-01&roomViews=selected)

The user's three new photographs are assigned independently: Office patio/garden, Bedroom city skyline and Lounge garden terrace. Living retains the earlier planted garden. All source image bytes are preserved. The window frame, sill, outward-opening leaf, furnishings, fireplace and curtain controls remain intact.

Portrait photos retain their aspect ratio and fill the aperture. The Bedroom framing brings the skyline into the main view; Lounge framing includes more of the raised garden. Bedroom's already-twilight photograph remains visible in Evening through a material-brightness adjustment, with no additional scene light or change to neutral Fabric Inspection. Source horizon/tilt and resolution remain as supplied.

Each initial room loads only its own photograph. The other three load on first visit and are cached by room, so revisiting or rapidly switching rooms retains the right image. `roomViews=previous` shows the preceding common garden for comparison.

| View | Source dimensions | Photo bytes | Approximate image graphics memory |
|---|---:|---:|---:|
| Previous shared garden | 1280 × 1279 | 658,151 | 8.33 MiB |
| Office | 700 × 933 | 193,657 | 3.32 MiB |
| Bedroom | 479 × 640 | 89,094 | 1.56 MiB |
| Lounge | 1254 × 1254 | 517,744 | 8.00 MiB |

Memory figures estimate RGBA texture storage plus mipmaps, excluding driver overhead. Visiting all rooms retains their photos in the cache; these per-image figures are not total scene VRAM.

## Focused loading check

One exploratory fresh Chrome process per room/version, desktop 1440 × 1000 DPR1, STANDARD, same AMD ANGLE D3D11 GPU, browser shader disk cache disabled. No competing test browser or artificial throttling. Actual catalogue/network variation is included; these single runs are not medians or proof of a speed-up.

| Room | Previous viewer → ready | New viewer → ready | Previous full navigation | New full navigation |
|---|---:|---:|---:|---:|
| Office | 5.34 s | 4.13 s | 6.61 s | 5.37 s |
| Bedroom | 4.41 s | 4.78 s | 5.60 s | 6.04 s |
| Lounge | 4.36 s | 4.31 s | 5.58 s | 5.78 s |

All three current viewer samples remain below 5.2 s; full navigation does not meet 5.2 s in this set. Bedroom's catalogue response increased from 1.04 to 1.35 s, accounting for most of its observed startup increase; shader/setup variation remains. Its new photo request was 12.2 ms versus 12.9 ms before. Every initial page requested exactly one exterior image. Program count stayed 21 in every compared case; the image assignments add no shader variant, light, render target or animation.

## Verification

- Sixteen room/profile/viewport interaction cases cover all four rooms, STANDARD/FIXED140, desktop/narrow: correct image assignment, preserved curtain position/UV/index/camera hashes, controls, palettes, neutral Inspection, motion, fabric routing and rapid room switching.
- Final framing passes 13,532 aperture rays across all 20 room/profile/camera combinations with no image-edge exposure. Curtain/fireplace clearance remains unchanged.
- Final captures verify each room's image again after revisits and confirm one request per image per page. Sixty-eight current room screenshots are refreshed; prior views are retained separately.
- Two final gallery browser checks passed at desktop and narrow sizes: all lighting/profile/viewport images loaded, before/after selectors and enlargement worked, no horizontal overflow or browser/HTTP errors occurred, and the live Lounge link loaded the correct garden. Physical iPhone testing is outstanding.

Protected production paths remain byte-identical to `a83b38fd8f71b967e51ebe0173603df7c29b87d3`; all 11,003 supported fabrics, source artwork, physical scale, curtain geometry/UVs/motion, assignments and routing remain unchanged. The local preview server was restarted as a hidden process bound only to `127.0.0.1:4382` after finding the prior process stopped. Work remains on `experiment/living-photo-composition-20261008`. Nothing merged, pushed, deployed or published.

Disk before work: 33.21 GiB; final reading: 33.00 GiB, below the 35 GiB headroom aim. The three small supplied JPEGs and review evidence were added; no asset package/dependency download or deletion of prior work/evidence was performed. Evidence, final validation summary and SHA-256 records are in `C:/Users/hamza/curtainsuk-visualiser-2-room-views-evidence-20261009/`.
