> **Release update — 9 October 2026:** the approved four-room design is now integrated and live through PR #164. The [current release/source-of-truth record](../../docs/room-visualiser-2-customer-release.md) is authoritative for production. This folder remains the archived local review; the no-publication statements below describe its earlier phases. Its server is pinned to the original runtime pack. The customer implementation lives under `lib/room-visualiser/runtime/rooms/environment/`.

> Historical source merge: [scope and release boundary](MERGE-SCOPE.md). PR #163 merged these prototype sources; the later PR #164 performed customer activation and deployment.

> Latest fabric review: [before/after across all four rooms](http://127.0.0.1:4382/rooms-review?review=fabric-detail), now including plain and fine-pattern comparisons. [Repeated GPU checks and retained rendering](FABRIC-EFFICIENCY-RESULTS.md). [First material pass](FABRIC-DETAIL-RESULTS.md). Original geometry, repeat scale and artwork preserved; no publication.

> Latest local review (9 October 2026): [all four rooms](http://127.0.0.1:4382/rooms-review), with recessed PVC windows and the user's separate Living garden, Office patio, Bedroom city skyline and Lounge garden photographs. Lounge now includes a wall-mounted TV and floating oak cabinet: [TV results](LOUNGE-TV-RESULTS.md). [Room-view results](ROOM-VIEWS-RESULTS.md), [window results](WINDOW-REALISM-RESULTS.md). Room design history: [Living](LIVING-INSPIRATION-RESULTS.md), [Office](OFFICE-INSPIRATION-RESULTS.md), [Bedroom](BEDROOM-INSPIRATION-RESULTS.md), [Lounge](LOUNGE-INSPIRATION-RESULTS.md), [four-room checkpoint](FOUR-ROOMS-RESULTS.md). Saved before/after views are included. No publication.

# Living Room 2.0 — isolated prototype

Experimental only. **No production route, build manifest, curtain module, fabric assignment or Shopify theme file is changed.** No catalogue processing takes place. The existing 11,003 supported and 812 held fabrics retain their status.

## Authority and storage

Protected remote `Nylon1/CurtainsUK:release/production` was independently read before branching:

* HEAD `a83b38fd8f71b967e51ebe0173603df7c29b87d3`
* Tree `543ef8484e74b3871cadc09ec10fac4e9fc10ccc`
* READY deployment `dpl_FqkeuFMtFwnJAELn9kXChF2eXRfE`
* Vercel project retains the historical name `curtainsuk-staging-api`; the public service alias is `curtainsuk-production-api.vercel.app`.
* Shopify serves the public page and mounts the signed app-proxy visualiser. This experiment does not change either service.

Initial C: reading was **23.44 GiB free**, below the requested gate. The owner subsequently instructed us to continue and defer storage recovery. No cleanup, dependency installation, worktree deletion or large image generation was performed. The experimental sources/assets are approximately 4.4 MiB plus separately saved review evidence. A later disk reading is recorded in the completion evidence; free-space changes from other processes are not attributed to this task.

The clean existing checkout was switched to `experiment/room-visualiser-2-living-20261008` directly from the verified protected commit. No additional full clone or dependency tree was created.

## Technical audit

| Area | Existing implementation | Reuse / improvement |
|---|---|---|
| Scene | `runtime/rooms/viewer.mjs`, native Three.js ES modules, one shared scene and WebGL context | Reused. No React/R3F migration needed. |
| Assets | Four original merged GLBs; source provenance in `rooms/SOURCES.md`. Living Room: 917,780 bytes, 20,937 vertices, 37,932 triangles, 17 draw meshes | Existing shell, furniture anchors and original sofa/cushions retained. New armchair and materials confined to Living Room. |
| Authoring | Original `experiments/wave-poc/rooms/author.mjs` / `build.mjs` in the existing POC checkout | Inspected, not blindly copied. Production GLBs remain unchanged. |
| Material zones | Named walls, ceiling, floor, sofa, armchair and cushions; palette colours multiply texture/material response | Retained. Scanned chair padding receives the same ARMCHAIR_UPHOLSTERY control. |
| Textures | Seven deterministic maps, 1,339,038 encoded bytes; nominal RGBA+mips 9,524,565 bytes before clones/driver overhead | Reused except experimental floor binding. Small CC0 scanned floor/armchair assets improve structure. |
| Lighting | Hemisphere, shadowed directional, two rectangular area lights; ACES, exposure 1.08; static lamp emissive | Reused lights with state-driven intensity/colour. Added warm lamp/fire point lights and a small generated reflection field. |
| Shadows | 2048² directional map, fixed contact planes, seeded 8-sample half-resolution SSAO, OutputPass and FXAA | Preserved. Added radiator uses existing AO rather than extra shadow draw submissions. No new shadow-casting point lights. |
| Graphics fallback | SSAO enabled only when `EXT_color_buffer_float` exists; direct render fallback otherwise. DPR capped at 1.5 | Preserved capability fallback. Experimental narrow-screen DPR capped at 1.25; desktop remains unchanged. |
| STANDARD | 230 × 250 cm finished, 460 × 250 cm cloth, locked mesh/UVs/motion; approved source derivatives | Imported unchanged. No rebuilding/rescaling/recolouring of supplier pixels. |
| FIXED140 | 140 × 120 cm pair; five Waves per 70 cm panel; approved physical source crop and solver | Imported unchanged. Radiator is independent scene geometry. |
| Window | STANDARD aperture 212 × 228 cm, bottom 10 cm, track y251.4. V1 aperture 136 × 108 cm, bottom102/top210, cloth mount y96, track y217.4 | Current profile-specific mount/overlay remains authoritative. Add V1-only reveal trim and radiator. |
| Cameras | Living Room position `[245,205,690]`, target `[-6,117,70]`, FOV43. STANDARD Curtain `[-60,229,118]` → `[-77,218,0]`, FOV36. V1 Curtain local `[-34,77,100]` → `[-34,63,0]` plus mount96, FOV38; Full camera from frozen V1 view module | All retained exactly. No free camera or alternative curtain image. STANDARD still has no Full view. |
| State | `palette-state.mjs` stores separate room palettes in memory. Shared travel controller and customer-entry preserve fabric selection and position across profile changes | Retained. New independent ambience map survives fabric/profile/room changes. Other rooms have no new controls. |
| Loading | Current room first; other GLBs lazily cached as raw bytes, max four/4 MiB. One active curtain texture | Retained. Experimental assets load concurrently with initial room/cloth work. No catalogue preload or runtime texture construction. |
| Frame loop | Event-driven when idle; curtain travel owns its RAF. Explicit `gl.finish()` on non-motion proof renders | Retained. Fire requests frames only when active; does not duplicate curtain RAF. Hidden tabs suspend and reduced motion makes fire static. `gl.finish()` remains a future profiling concern, not silently changed. |

## Prototype implementation

`serve.mjs` is a **GET-only, Host-checked loopback server**. It serves existing runtime sources and public read-only catalogue/assets. It does not load database credentials. There is no production/public query switch: `mode=baseline` exists only in this local server.

`viewer-bridge.mjs` adds narrowly checked in-memory scene lifecycle hooks to the served viewer. It refuses to run if expected production source anchors drift. The actual production viewer stays byte-identical. This keeps the experiment reversible; it is not the proposed production integration mechanism.

`living.mjs`, `ambience.mjs`, and `fire.mjs` add:

* Daylight, Evening and neutral Fabric inspection. Inspection suppresses the warm fire/lamp effects while remembering the chosen toggles.
* Fireplace ON/OFF, three depth-separated animated flame fields, instanced embers, charred logs, limestone surround and local warm light. No audio.
* Two lamp lights at the original lamp positions, matching shade emission.
* Recolourable CC0 armchair, scanned flooring with restrained tonal derivative, richer original upholstery response, reflection field and restrained original artwork/decor.
* V1 radiator: 112 × 53 cm, bottom25/top78, under the unchanged sill. Its top is **18 cm below the cloth hem**. The motion test samples all six reference widths and 21 travel positions plus lag/settle variants; no radiator/cloth overlap is possible across that vertical separation.
* Separate V1 reveal trim. STANDARD window and room configurations remain unchanged.

All imported assets and licence notes are recorded in [SOURCES.md](SOURCES.md). Download checksums, local SHA-256 and sizes are reproducible with `asset-proof.mjs`.

## Run and review

From the repository root:

```powershell
node experiments/room-visualiser-2/serve.mjs
```

Open locally:

* `http://127.0.0.1:4382/?fabric=sdg-f1541-01` — STANDARD Bergamot
* `http://127.0.0.1:4382/?fabric=pt-1204-212` — FIXED140
* Add `&mode=baseline` for the unchanged rendering baseline.

Fabric, palette, room and curtain controls are the existing customer controls. The new Room ambience section is only visible in Living Room. Links to samples/products retain their original destinations, but this task does not order anything.

`qa.mjs` captures original/prototype, desktop/narrow, both profiles, all supported views, closed/half/open, daylight/evening, fire/lamp states, neutral inspection and plain/profile switching. It checks hashes, state retention, reduced motion, request failures and WebGL/page errors. Configure `PLAYWRIGHT_MODULE`, `CHROME_PATH`, and `ROOM_V2_EVIDENCE` for the installed tools/output directory. Default GPU backend is D3D11 on Windows; `ROOM_V2_GPU=swiftshader` explicitly selects software for troubleshooting.

## Verification and limitations

The full Room Visualiser suites, additional prototype tests, read-only asset checks and browser evidence are recorded in the completion report. No physical iPhone Safari test has been performed for this prototype. Narrow Chrome emulation is not an iPhone or mobile-GPU performance certification.

This is a working realism/interaction prototype, **not yet a luxury-photography quality approval**. The new chair and floor improve detail, but the retained sofa, plants, original room shell, flat outdoor glazing and unbaked indirect illumination still read as computer graphics. Fire is layered rather than volumetric; lamp/fire lighting has no dynamic shadow map. No path tracing, real-time GI, simulated smoke, crackling audio or other room construction was added.

The initial shader compilation and extra texture memory must be considered before production. Supplied texture files are JPEG/WebP, but decoded GPU storage is uncompressed RGBA on this path. Mobile compressed GPU formats and baking could reduce memory later, following visual review. Do not change approved curtain framing/engineering to solve an environment-quality issue.

Recommended next stage: review this single Living Room's materials, fireplace and lighting direction; then improve authored sofa/plant/exterior assets and indirect-light/contact treatment to the agreed visual standard, with a real iPhone Safari pass. Do not build the other four planned environments or publish this prototype before that review.
