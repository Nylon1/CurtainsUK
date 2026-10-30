# Hotel Design Studio — first release candidate

30 October 2026. Feature branch `feature/hotel-design-studio-20261030`, based on protected `release/production` at `f6bee2f8`. This is a review candidate, not a production release. No theme, catalogue database, order service or production environment was changed.

## What is implemented

### Room finishes, lighting and architectural details

Each scheme now saves walls, ceiling and floor colours independently of the eight fabric targets. There are 12 wall, eight ceiling and eight floor colour concepts, plus custom colour pickers. Warm neutrals, sage, muted blue and clay sit alongside light/dark timber tones. These are original palette names, not paint manufacturer references. Floor colour tints the existing timber texture; it does not replace the floor with a different construction or material.

Bedside and ceiling lights have separate accessible on/off switches. Warm practical lights and emissive shades respond in both scenes; natural daylight remains on. Lighting is illustrative, with no lux calculation, electrical specification or blackout claim. Original abstract, botanical and coastal framed pictures can be selected or removed. Fine linear inlay, shallow arch relief and delicate fluting add tonal detail above the bed, independently of the pictures.

Statement ceilings include an illuminated floating tray and architectural coffers, alongside a plain option. Their trim follows the ceiling colour; decorative light strips follow the ceiling-light switch. A ceiling camera view makes them easier to inspect. Geometry, dimensions and lighting are concept illustrations, not construction details. Briefs and comparisons capture the full room view even when the user is inspecting the ceiling.

The preview is sticky on desktop and compact/sticky on mobile and tablet, with a visible unpin button. At narrow widths the duplicate material-story strip is omitted; furnishing controls remain available. The FR note applies to the Panaz fabric catalogue and directs users to supplier ratings and finished-item review. It does not certify colour concepts, walls, ceilings, flooring or the whole room.

Existing version-one projects migrate missing finish fields to original colours, bedside lights on, plain ceiling and no relief. New schemes start with a tray ceiling and fine linear inlay. Invalid imports are rejected. New selections are included in PDF briefs, embedded JSON, room CSVs, enquiry drafts and scheme comparisons. Browser-only saving remains unchanged.

Follow-up verification: 18 hotel tests and TypeScript pass. Desktop, 390 × 844 mobile and 768 × 1024 tablet checks cover pinned previews, palettes, separate light switches, pictures, ceiling styles, relief, saving/reopening and the two scenes. The refreshed 18-page brief's embedded project matches the downloaded JSON except the export timestamp; its CSV retains 30/12/8 quantities and its brief retains room 214. The rendered finish page was visually checked. Evidence: `room-finishes-mobile.png`, `room-finishes-standard.png`, `room-finishes-superior.png`, `statement-ceiling.png`, `finishes-export-validation.json` and `output/pdf/hotel-project-brief-finishes.pdf`.

### Workspace capabilities

- A dedicated CurtainsUK workspace with Room Visualiser, Furnishing Coordination, Room Layout Planner, Project Planner and Saved Projects.
- Original Standard Double and Superior 3D concept rooms. Twin/Suite are future scene slots; twin furniture is already available in the 2D plan.
- Wave curtains and a separate rear voile track, independent 0–100% travel, curtains/voile/both modes and illustrative sheer density. The background contains a real window opening, not baked-in curtains.
- Eight independently saved material choices: curtains, voile, runner, cushions, headboard, bed base, armchair and bench. Same fabric and matching colour copy the reference choice; later changes remain independent. Complementary choices are manual.
- Panaz plain FR fabrics only. Fifty-five selectable supplier-published colourways from Allure Velvet (36), Spectrum (6), Alba (5), Plain Voile (2), Batiste (4) and Charm (2), with range filtering, source links, supplier references, observed date, published FR ratings and end uses. Wine, Batiste Dove and Batiste Silver have unverified SKUs explicitly marked for confirmation. Other brands and unrecognized imported fabric IDs are rejected. Supplier claims in an imported project are replaced with the checked snapshot.
- Centimetre-based 2D plans with room dimensions, windows/doors, editable positions/sizes, rotation, pointer dragging, keyboard movement and numeric alternatives. Beds, twin beds, bedside tables, desks, chairs, armchairs and benches; rotated overlap, boundary and basic door-clearance warnings. Example dimensions require explicit confirmation; edits invalidate confirmation.
- Multiple room types, quantities, schemes, sample and approval records, phases, budget categories, typed window schedules and individual-room exceptions. Grouping does not verify measurements. Reducing the window count retains entered rows and flags discrepancies.
- Local autosave, reopen, project/scheme duplication, side-by-side alternative comparison, JSON import/export, room images, SVG plans, room/window CSVs, PDF briefs with an embedded exact JSON backup, sample and quotation drafts. No automatic sending or ordering.
- Explicit storage-full, corrupt-store, concurrent-tab, missing catalogue/image, WebGL and PDF-loading recovery states.

## Repository inspection and reuse

The production ledger, frontend register, production surfaces, release policy and visualiser packaging contract were read first. `main` is not the storefront release authority. Work was isolated from the owner's existing checkout.

The hotel scene imports the released domestic `rooms/curtain-component.mjs` travel solver, mesh and lighting pipeline from `lib/room-visualiser/build.json`'s immutable asset base. The domestic renderer and all released packs remain unchanged. Its material selectors and domestic catalogue were inspected, but the hotel library is intentionally isolated after the owner's Panaz-only direction.

Existing retail catalogue/Fabric Master projection did not provide a connected Panaz range or product-level FR evidence. This candidate therefore uses a small, explicit supplier snapshot, not invented Fabric Master records. The existing My Home store concerns purchasing and is not reused as a hotel project database. Existing lead routes include unrelated Apex workflows; no unverified submission service was attached. The enquiry destination matches the existing CurtainsUK configurator's `enquiries@curtainsuk.com` default, and is used only in a user-opened email draft.

The Shopify wrapper is additive: `page.hotel-design-studio.json`, `curtainsuk-hotel-studio.liquid` and its CSS. No Page or navigation item has been published. The signed proxy uses the existing authentication/rate-limit helpers and requires `CURTAINSUK_HOTEL_STUDIO_ENABLED=true`. The unsigned review route is only available on Vercel Preview or a non-production loopback server. It returns 404 in production.

## Panaz evidence and visual limits

`lib/hotel-studio/panaz-source-2026-10-30.json` records the exact product and collection pages, supplier image URLs, codes and relevant attributes read on 30 October 2026. `runtime/panaz-catalogue.mjs` is the explicit hotel selection; JPGs are local copies of those supplier images. This is **55 selectable colourways plus one retired saved-project reference, not the complete or live Panaz catalogue**. There is no price, stock or delivery feed.

Allure Velvet adds 36 colourways from the UK collection's 38 listings; 608 Fuchsia and 437 Tuscan Red are excluded because Panaz marks them discontinued. The collection description supplies plain-pattern evidence where product tables omit that field. Thirty colourways have UK product-page metadata; the remaining six use published UK collection metadata, with five SKU references checked against official US product pages after UK product access stopped responding. White retains the published SKU `190AAA1/000`; Wine is labelled `Allure Velvet / 414 Wine (SKU to confirm)` instead of inferring a SKU. The snapshot records each evidence source separately. End uses remain colour-specific: singular "Curtain" is normalized for filtering, while Burgundy is not assumed to list cushions or bed throws.

Spectrum pages list curtains, bed throws and cushions; Alba pages list upholstery; Plain Voile pages list curtains and classify the product as sheer. The UI orders choices by listed end use and flags mismatches. Published FR ratings do not approve a finished upholstered assembly, lining, installation or project specification. Final intended use, construction, certificates and samples require review. No abrasion or commercial suitability claim is inferred.

The Spectrum and voile imagery includes photographed folds. Tiling it onto the wave mesh was rejected during visual review. All Panaz choices currently use a mean-colour approximation from the supplier image and the existing geometric folds; picker swatches retain the actual supplier image. There is no calibrated flat textile map or claim of exact colour, weave, pattern scale, transparency or blackout performance. The stored 30 cm extent is an unused illustration placeholder with `scaleKind: colour-only`, never a physical calibration.

The referenced hotel photographs were not present in the available conversation or located project assets. Rooms are original procedural concepts, not reconstructions of those photos or CurtainsUK installations. The garden is an original generated presentation asset. Its prompt: “Original quiet British boutique hotel garden exterior, seen from a first-floor bedroom; mature trees, stone terrace, low hedges, distant countryside; soft daylight; no interior, windows, curtains, people, signs or text; photorealistic 3:2 composition.” Source PNG is retained locally under `artifacts/hotel-studio/source`; optimized runtime WebP is shipped.

## Save, export and enquiry contract

Storage key: `curtainsuk.hotel-studio.v1`. This browser/device/origin only. Different preview URLs have separate stores; transfer via JSON. Local storage is not a cloud backup and can be cleared by the browser. Strict parsing, revision checks and recovery downloads prevent silent overwriting of corrupt or concurrent data.

Budgets are user-entered GBP allowances per room, extended by room quantity; furnishings, tracks, survey, installation and other are separate. Blank fields are omitted, not quoted at zero. VAT is explicitly unspecified/inclusive/exclusive; no tax is calculated. No quote or delivery promise is generated. Sample/approval states and installation phases are manual planning records only.

PDFs include all room types and alternatives, captured previews, source references, layouts, window and exception measurements, notes, budgets and unresolved decisions. Noto Sans covers Latin/Greek/Cyrillic text; unsupported glyphs are visibly flagged and the complete original Unicode data remains in the attached JSON. SVG is the standalone plan export. CSV formula-leading cells are escaped. Email links prepare a short draft; users attach the brief and schedules themselves. Successful submission is never claimed.

The 2D plan and 3D view share a project/scheme but **are not geometrically connected**. Moving a desk, entering dimensions or adding twin beds does not alter the concept scene. This is explained in both the workspace and exports.

## Review and validation

Run `npm run preview:hotel`, then open `http://127.0.0.1:4368/hotel-design-studio-preview/`. No credentials or database writes are needed. `npm run test:hotel` runs the new contract and asset tests.

Validated locally:

- 16 hotel tests: persistence/reopen/duplication, independent choices, matching-colour clearing, retained measurements/exceptions, CSV/plan/draft contents, rotated overlaps, corrupt/concurrent storage, Panaz-only imports, source evidence, all 56 image assets, combined range/colour filtering, Allure references and unsigned-production denial.
- 45 existing domestic room/visualiser regression tests passed.
- All 11 protected capability groups passed (133 checks); `node release/gate.mjs .` is offline contract validation, not production approval.
- TypeScript passed. Full `next build --webpack` passed with non-secret placeholder public Supabase URL/key for unrelated admin prerendering. Normal Turbopack local build cannot follow this worktree's external node_modules junction; no production build configuration was changed. Vercel performs its own normal install/build.
- Initial Next output tracing included the hotel runtime, PDF fonts and the original 14 Panaz images; the expanded catalogue's asset contract checks all 56 images.
- Browser checks: both scenes, all eight material targets, independent layer endpoints/modes, same-fabric copying, room quantities 30/12/8, alternative comparison, numeric layout edits/rotation/confirmation, saved reopen, exception 214, budget GBP 7,500, CSVs, draft enquiry and PDF export. Exported PDF JSON matched the saved backup except the later export timestamp.
- Chrome responsive checks at 390 × 844 and 768 × 1024: no page-wide horizontal overflow, complete room framing, usable controls and mobile numeric layout edits surviving reload. Project duplication and reopening were checked through Saved Projects. Layer controls have a 44 px minimum height.
- Allure follow-up: the range filter shows 36 swatches; combining it with Navy returns one matching reference. Selecting Allure Navy, saving and reloading retains `190ALL2/116`. The 390 × 844 picker wraps the range selector above search, keeps two swatch columns and has no horizontal overflow. Desktop/mobile evidence is saved as `allure-range.jpg` and `allure-mobile.jpg`.
- Fault injection: temporarily missing Panaz image retained the fabric reference and displayed a fallback; an unavailable local catalogue displayed Retry without clearing selections; retry succeeded after restoring the server. An empty search showed useful guidance.
- The refreshed 18-page PDF was inspected as rendered pages, including the room preview, material blocks and plan. Its attached JSON matched the separately downloaded backup except the export timestamp; 50 rooms, Panaz Navy/Alba references and room 214 were present.

Local evidence is in `artifacts/hotel-studio/`: test/build logs, review project, PDF inspection and screenshots. `output/pdf/hotel-project-brief-example.pdf` is a generated example, not a customer quotation. Physical iPhone, Android, Safari and spoken screen-reader verification have not been claimed.

## Release procedure

Create a PR to `release/production`; required checks remain `curtainsuk-production-gate` and `protected-production-policy`. Review this feature on a Vercel Preview of the existing `curtainsuk-staging-api` project, not a new deployment project. Do not bypass preview protection.

The added tests, package scripts and isolated `hotel-studio-contracts` workflow are protected surfaces. The policy record describes these additions without changing existing assertions. Per `release/README.md`, the owner must add `OWNER_APPROVED_POLICY_CHANGE <CURRENT_HEAD_SHA>` to the reviewed PR before the policy check can pass. No approval is fabricated or posted on the owner's behalf.

After explicit owner authorization and the required checks, follow `release/README.md`: deploy only the exact protected branch HEAD, enable the hotel route deliberately, install only the three additive theme files, create the Hotel Design Studio page and navigation entry, and run signed-proxy/storefront/mobile/save/export smoke checks. Do not publish this feature from its branch. Rollback is disabling the feature flag/removing the new navigation entry and restoring the last approved API deployment if necessary; domestic assets are unchanged.

Before wider use: expand the approved Panaz range/feed and source maintenance, agree cloud project/enquiry services, obtain the intended hotel photo references, refine the concept geometry/material calibration, and verify physical touch devices and accessibility.

### Preview packaging finding

The first Git-source Vercel Preview failed the existing immutable-asset guard on the inherited `d5908d6eaf486ce33e2f72a5/core.mjs` pack. Its Git LF bytes hash to `a671ae21257feade086c0b2424eac9474e0fadd7ce29b497d3bd015fce7c89c4`; the validated Windows checkout uses CRLF and hashes to `8d1ceffc44fbb33b9e9a27a29dfdab76096cda2e27609bbfaffefd4f9ed5c202`. This feature does not change that pack or its manifest. The established source-upload path preserves the validated checkout bytes; its guard passes all 3,448 assets across four packs (240,574,325 bytes). The Git-source packaging inconsistency needs a separate reviewed repair before relying on Linux Git deployments. The preview keeps the guard enabled.

## Third-party presentation dependencies

The approved Three.js runtime is reused unchanged. PDF-Lib is locally vendored with its MIT licence; `@pdf-lib/fontkit` 1.1.1 is locally vendored from the public npm registry with its declared MIT attribution. Noto Sans Regular/Bold are from the official `notofonts/noto-fonts` repository under the bundled SIL Open Font License. Supplier swatch provenance is recorded per product; confirm ongoing supplier media permissions as part of the existing supplier relationship before public release.

### FR voile additions

Six plain FR sheers from Serenity Sheers were added: Batiste White, Champagne, Dove and Silver; Charm White and Cream. Published product attributes, FR text and actual swatch URLs were read from the official UK collection. Batiste Champagne and both Charm SKUs were verified on supplier product pages; Batiste White uses the official Panaz French specification PDF as SKU evidence. Batiste Dove and Silver retain published design/colourway references with SKU to confirm; filenames were not treated as proof of an SKU. These remain colour approximations in the preview, with the existing independent illustrative voile-density control; textile transparency is not calibrated from weight or FR data.

The collection now marks Plain Voile White discontinued. Its reference and asset remain resolvable for existing/imported projects, with a visible warning and an unresolved decision in enquiry/PDF briefs. It is omitted from new catalogue results. Savoy Silver (discontinued), Savoy White (leaving soon) and patterned Simplicity Beige were not added. Batiste and Charm provide white alternatives. This is a dated listing check, not a stock feed.

Opening the library for a different furnishing resets search and chooses FR voiles & sheers for the voile target. This filter returns eight choices; Batiste, Charm and Plain Voile are also separately filterable. Existing item selections remain independent.

Follow-up validation: 16 hotel tests and TypeScript pass. Desktop checks confirmed the retained discontinued warning, eight sheer results, selection of Charm Cream and save/reload while Allure Navy curtains stayed unchanged. At 390 × 844 the Charm filter shows two swatches with no page overflow. Screenshots: fr-voiles.jpg and fr-voiles-mobile.jpg.

