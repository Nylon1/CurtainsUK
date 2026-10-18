# Smart Track Studio room visuals

Owner direction: use the supplied interiors as luxury room references, plain colours rather than catalogue fabrics, concealed motors, two ceiling-mounted examples, and light controls. This supersedes the original demo catalogue requirement. Photographic backdrops and recoloured upright curtain layers are illustrations, not installation or load evidence.

## Sources and generation

The six interior reference photographs were supplied in attachment folder `51173549-31AD-4D8E-B5F9-ADAF5EC176BB`. They guided cream/oak living spaces, a warm bedroom with beams, a classic moulded dining room, a panelled office and an expansive patio setting. The curtain layer was derived using the image-generation editing tool from the existing Curtain Style asset `shopify-theme/curtainsuk-dawn-16/assets/cuk-anatomy-wave.png`. No second catalogue or product-fabric identity is introduced.

Generation brief: create distinct, photorealistic luxury interiors with a clear straight track and an unobstructed curtain corridor, no curtains or visible motor in the backdrop, no lettering, natural daytime lighting, lamps suitable for the light toggle, and reference-inspired furnishings. Generate an upright transparent ivory wave curtain panel from the existing style image, preserving folds and neutral illumination for tinting.

Final image-generation output identifiers (17 October 2026):

| Runtime asset | Final output | Finishing direction |
| --- | --- | --- |
| curtain-wave.webp | exec-90221dd4-b4d2-4adb-801e-53a7ea9a1e94.png | Single front-elevation ivory wave panel with transparent background; neutral light, no hardware or text |
| room-living.webp | exec-a623d102-0a3b-4355-b6a3-2c7c2a4b4c2e.png | Preserve cream/oak interior; remove vase and branches from coffee table; trim tree clear of left curtain endpoint |
| room-bedroom.webp | exec-b28bf1a3-7790-4fe4-81d1-c46fe87d8235.png | Add shallow cream ceiling soffit; rail flush to horizontal underside; retain beams; trim plants clear of curtain corridor |
| room-dining.webp | exec-bb66d74a-cf6b-48f4-97d6-cbb67c28c683.png | Classic plaster detailing, fireplace, warm metal accents and unobstructed central window |
| room-office.webp | exec-c9c5c4d5-3ff8-4f38-aa75-190ef89a384f.png | Preserve panelled office; move/narrow olive tree left so foliage clears rail endpoint |
| room-patio.webp | exec-13140c38-1860-4da4-88ba-d0495534d21d.png | Flush ceiling-soffit track; move right side table clear of curtain corridor |

All visual editing used the image-generation tool. Sharp converted final PNGs to WebP without compositional edits. The curtain alpha is preserved. The six runtime images total approximately 1.16 MB. The initial living room and curtain layer load in parallel (approximately 362 KB); other rooms load only when selected. Failed loads can be retried without changing the configuration.

## Rendering and boundaries

`room-design.mjs` owns room rail anchors, floor endpoints, lamp positions and seven plain colours. `scene.mjs` tints inside the curtain alpha and draws paired or one-way panels over the selected backdrop. The shared motion state still owns room position, movement, stop/reverse, channels and remote/app continuity. Lights affect room illumination independently of daytime/evening.

Normal room views contain no visible motor. The separate hardware cutaway is explanatory and not a dimensioned drawing of the final supplier kit. Labels and controls sit outside the photograph. The existing curtain visualiser's catalogue, physical texture calibration and Three.js files remain unchanged. The plain-photo demo does not establish exact stack-back, clearances, mounting suitability or load approval.
