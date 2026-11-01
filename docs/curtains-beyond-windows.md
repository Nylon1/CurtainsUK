# Curtains Beyond Windows — review and live release

Three scenes, organised around purpose: conceal a workspace/storage wall, divide an open room, wrap a workspace in a private enclosure, and add a decorative screen. The owner confirmed three scenes for this milestone on 1 November 2026; separate venue/treatment/dressing scenes remain later work.

## Routes and ownership

- Review deployment: `/curtains-beyond-windows-preview/`, allowed only on Vercel Preview or local development. Not exposed on Production.
- Shopify destination for the live release: `/pages/curtains-beyond-windows`, using a dedicated page template and the authenticated app proxy at `/apps/curtainsuk-decision/beyond-windows/`. The page forwards scene/configuration query parameters to the frame, and the frame sends updated state to the parent page so refresh and shared links retain the current design.
- The existing Room Visualiser server HTML gains a link to that destination. Its immutable packs, entry modules and five room assets are unchanged.
- The live theme's direct desktop/mobile/fallback navigation snippet adds a menu link beside Room Visualiser. The Shopify main menu resource also receives the Page link for any standard navigation using it. The established Room Visualiser page, template and five room assets remain unchanged.
- `node scripts/beyond-windows-preview.mjs` serves the actual runtime on loopback port 4410, with a public, read-only live catalogue relay and a five-room regression page at `/pages/room-visualiser`.
- No live theme, production deployment, database record, feature flag, price or supplier record is changed in this milestone.

## Implementation

`lib/beyond-windows/runtime/model.mjs` owns allowlisted serialisable state, purpose/scene definitions, routes, panel parking, cloth profiles, scale evidence and commerce policy. Routes are sampled by distance, including rounded L and curved U layouts. Furniture is stable across layout and curtain-position changes. A separate screen-system module moves cloth along those routes, retaining material-coordinate UVs. Equal material-distance sampling preserves cloth cross-section length during gathering. This is a visual approximation of drape on a track, not a structural or manufacturing simulation.

The existing Three.js library, motion timing, lighting-mode definitions, fabric browser, fabric-action validation, approved media and floor/garden assets are reused from the current immutable Room Visualiser pack. The new furnishings are original batched geometry. Fabric selection rebuilds neither the room nor its controls. State is kept in the URL; scene, layout, fabric, draw, heading, view, density, lighting and both opening positions survive refresh and Retry.

Opaque cloth defaults to separate front and neutral-lining materials. Following the owner's construction clarification, an explicit **Decorative fabric on both sides** option uses a second decorative face instead of lining. Its pattern keeps the same physical scale and orientation from the reverse, and its saved construction is carried into the quote brief. This option never changes a lined preview implicitly. Generic voile is translucent and unlined. Chain uses actual instanced beads/connectors or alternating torus links, with empty space between them and an environment reflection; no fabric texture is assigned to chain. Chain remains fixed pending a specified movable assembly. Fabric + voile has independent controls; voile + ball chain moves only the voile.

Beyond Windows accepts only the published STANDARD approval manifest: 85 complete straight-repeat patterns and 3,153 approved colour-led plains. The server intersects those IDs with live preview availability, exact approved image identity and renderer profile. Patterned inputs also require matching calibrated image dimensions and supplier repeats. Fixed140/Fixed100 images and unapproved patterns cannot enter through search or direct links. Plain previews explicitly make no physical weave-scale claim. Live availability can reduce the eligible set; these counts are not a stock or purchasing guarantee. Source-image size is never used to calculate a quantity or price. Physical samples remain the colour reference.

## Buying boundaries

The current automated MTM contract supports specified window-opening categories; it does not establish support for these new freestanding partitions. All Beyond Windows configurations therefore lead to a project specification/quote brief. The brief carries the chosen fabric, purpose, layout, draw, heading concept and exact design link, and lists measurements/fixings still required. The customer can download it or open an email draft to enquiries@curtainsuk.com; the app sends nothing automatically.

Fabric detail/sample destinations use the existing catalogue's availability flags and canonical-link validator. The existing MTM flow is offered only when `orderReady` is true and the material is opaque fabric, explicitly as a **fabric-only handoff for a supported window**. It does not silently transfer unsupported room dimensions or claim the partition is purchasable. Final heading/track compatibility, lining, installation, pricing and supply need confirmation. No certification, acoustic performance, stock or price is invented.

## Reference material and supplier dependencies

The repository's `public/images/commercial/airport-lounge-*.jpeg` photographs inform the curved textile boundary, timber and upholstered lounge. The displayed photograph shows fabric; it is not evidence of a particular chain SKU.

The owner identified **Edge Interiors** as the chain supplier and confirmed supplier authorisation on 1 November 2026. Primary reference: [Edge Interiors Ball Chain / ShimmerScreen](https://www.edgeinteriors.co.uk/products/ballchain). Its linked [ShimmerScreen brochure](https://cdn.prod.website-files.com/5e18544255d74d234de591e7/619fdf5be4dcb5d81cce86ca_Edge%20Interiors%20ShimmerScreen%20Brochure%20.pdf) identifies round, faceted and ball-bar styles; the preview illustrates round 12.7 mm beads. The manufacturer's aluminium round-bead photograph is included as an attributed material reference, not a texture.

Authorisation does not establish a particular supplied SKU, density, finish/size combination, movement system, lead time, installation specification, price or test performance. These remain quote inputs. Linked aluminium chain is a distinct illustrative alternative; it is not represented as an Edge ShimmerScreen product. Edge also lists Coil Mesh and Linea Mesh separately; those are not simulated by the linked-chain geometry or offered in this milestone.

## Verification approach

Pure-model tests cover URL round trips and invalid inputs, track/parking clearance, conserved fold length, scale evidence and purchase gating. Server tests cover preview isolation, asset allowlists, safe catalogue forwarding and recoverable upstream failures. Existing immutable-asset guard remains intact.

For local failure-path QA only, start with `BEYOND_TEST_FAULTS=1` and a separate `BEYOND_PORT`. Fabric IDs `review-image-failure` and `review-catalog-failure` fail the first request and recover on Retry. This facility is loopback-only, disables fixture purchase flags, and is absent from deployed application routes.

Screenshots and browser readback accompany the PR. Browser viewport/CPU observations are not certification of physical-device GPU performance. The wider existing advisory-smoke gaps and paid checkout are outside this milestone.

## Review evidence — 1 November 2026

- 9 Beyond Windows model/server tests passed, plus 8 released-asset guard tests and 7 existing iframe/recovery/error-category tests.
- TypeScript `tsc --noEmit` passed. The immutable asset verifier passed for all six released packs (3,653 files); no released room geometry or integration module was modified.
- Browser QA: three scene selectors; straight, curved and L-shaped routes; centre pair and one-way draw; Wave folds (pencil removed in the follow-up below); open/partial/closed movement; detail and reverse cameras with both neutral lining and double-faced fabric; fabric browser selection (the initial Bergamot-to-Mellora check is superseded by the approval restriction below); independent fabric/voile positions; ball and linked chain; fixed-chain controls; quote brief; URL refresh; image-failure Retry and catalogue-failure Retry preserving layout and position.
- Existing five rooms loaded with Mellora retained. Open/close controls were exercised across the rooms, and Bay Window's room/detail controls were checked. This is targeted regression coverage, not a complete paid-checkout or adviser audit.
- Desktop viewport: 1,521 × 722; mobile-width viewport: 390 × 844, no horizontal overflow, native range keyboard Home/Arrow movement verified. Physical touch-device testing remains outstanding; browser emulation is not a hardware test.
- Warm fabric animation render submission p95 observed around 6–8 ms on this computer. Mobile-width mixed voile/ball-chain rendered about 815k triangles; dense chain about 1.58m. Render-on-demand avoids an idle animation loop. These CPU observations include neither GPU timing nor a guaranteed mobile frame rate; dense chain needs representative physical-device review before production sign-off.
- Local complete Next build passed compilation/type checking but could not prerender the unrelated admin login without the locally absent Supabase public environment. Hosted Preview uses the project's configured Preview environment; its result is recorded in the PR.

### Scene screenshots

| Scene | Open | Closed |
| --- | --- | --- |
| Hide & Reveal | [Office visible](beyond-windows-screenshots/hide-open.jpg) | [Office concealed](beyond-windows-screenshots/hide-closed.jpg) |
| Divide & Enclose | [Enclosure open](beyond-windows-screenshots/divide-open.jpg) | [Enclosure closed](beyond-windows-screenshots/divide-closed.jpg) |
| Screens & Layers | [Lounge open](beyond-windows-screenshots/screens-open.jpg) | [Fabric screen closed](beyond-windows-screenshots/screens-closed.jpg) |

[Double-faced reverse](beyond-windows-screenshots/double-faced-reverse.jpg) · [Ball-chain detail and supplier reference](beyond-windows-screenshots/ball-chain.jpg) · [Mobile layered preview](beyond-windows-screenshots/mobile-layers.jpg).

## Installation correction after visual review

The first preview left suspension rods below the ceiling and removed the room shell from the reverse view, making the curtains look unsupported. The revised model uses a shared ceiling/rail/heading/floor datum: short ceiling brackets meet the track, moving heading connections join the cloth to it, and the hem clears the floor by approximately 1.5 cm. Each layer has its own mounted route; metallic strands also join their carrier. Whole-room cameras are lower, and reverse views retain the ceiling and opposite room walls. Furniture feet, booth bases and pendant suspension were also brought into contact with their supporting surfaces.

These are illustrative installation details, not a supplier fixing or structural specification. Existing pattern coordinates, movement, double-faced selection, fabric/quote integrations and the original five rooms remain unchanged. The PR screenshots have been refreshed for this correction.

## Approved fabrics and clearer controls follow-up

- The shared `catalogue.mjs` policy runs in both deployed routes and the loopback preview. Search pagination scans past excluded inputs and retains a source-page offset when a page is partly consumed. Scans are bounded to eight upstream pages and retain a continuation when more results remain. The original five-room catalogue is untouched.
- Unsupported fabric links return a specific 422 response; the room remains interactive and retains scene/layout/position, with neutral cloth and no fabric purchase actions until an approved fabric is selected. The client no longer falls back to tiling an arbitrary image. Network and image failures retain Retry.
- Only Wave is offered. Old `heading=pencil` links normalise to Wave, including the quote brief. Pencil pleat is not represented by an unverified render.
- Each scene/layout now explains other uses: wardrobes, recess and utility storage, guest sleeping zones, living/dining divisions, dressing/fitting areas, reception/lounge screens and specialist treatment layouts. They are examples using the selected layout, not extra furnished scenes or claims of product suitability.
- Screen materials use six illustrated choice buttons with simple movement/transparency labels. The preview and movement controls stay sticky while customers scroll through settings on desktop and mobile; very short viewports use normal flow to keep controls accessible. The room remains bounded by the design workspace as the customer leaves it.
- Project email drafts go to **enquiries@curtainsuk.com**. Nothing is sent automatically.

Validation: 15 Beyond Windows tests, 8 immutable asset guard tests, 4 iframe/recovery tests and 3 error-category tests passed. TypeScript passed; six released packs (3,653 files) passed byte verification. Live relay checks returned one approved Bergamot colourway, no Mellora, and paginated Amalfi plains. Browser QA checked approved-plain selection, page 2/Previous, restricted direct links retaining curved layout and 37% opening, old pencil links, quote address, layout examples, material buttons, mobile sticky view, keyboard range movement, refresh and image Retry. Search responses observed around 1.1-1.6 seconds for these named searches, not a catalogue-wide performance guarantee. Physical mobile-device testing remains a production review dependency.

## Enclosed interior revision

The scene shell now has four continuous walls, a floor and ceiling with matching bounds, skirting and cornice around the perimeter, and one framed window opening. All whole-room, detail and reverse cameras stay inside that shell; walls are no longer swapped for a cutaway. The detached office backdrop was removed, and the reverse view includes an entrance and wall art.

The home-office scene has a furnished seating foreground with a sofa, cushions, coffee table, woven rug and floor lamp. Upholstered shapes use corrected rounded geometry; shelving has open cavities rather than solid blocks. Existing immutable oak, weave, plaster, rug and contact-shadow assets are reused. Daylight comes from the window direction, with less ambient fill and contact shading. These are interactive 3D interiors, not photographic renders or changes to the fabric calibration.

Track routes, installation height, panel gathering, approved fabric policy, reverse construction, sticky controls and quote destinations are retained. The overhead furniture plan was updated to match the revised seating. The camera containment regression covers all three scenes and views at four viewport aspect ratios; the Beyond Windows suite now contains 16 passing tests. Updated open/closed screenshots show the enclosed rooms.
