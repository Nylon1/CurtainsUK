# Room Visualiser v1 release

Selective runtime integration from `01226c5cd248dd4a35fe5036acede214f8289cb0`
and the approved view/texture study `987bc41207764dc2d6bd0d6f46ed56ba91166add`.
Production base: `0d7b2d9c310d2d157ecb9a3ed5c5ddb4644ff653`, tree
`122b50b8386eabaf950d69db4b4e6fd6f76db5a0`. No experimental history is merged.

## Customer route and catalogue

`/pages/room-visualiser?fabric=<Fabric Master ID>` uses a small Shopify page
template and the authenticated `/apps/curtainsuk-decision/room-visualiser` HTML
endpoint. The same-origin frame isolates the approved renderer/styles from Dawn.
Its bounded viewport keeps the mobile fabric modal within reach. Room/Curtain
are the only customer cameras. The microscope study is absent.

The existing FabricBrowser gains an explicit Visualiser mode, mounted lazily
inside the native dialog. It uses the existing `catalog` app proxy, prepared
Browse RPC, canonical retail hydration and commerce readiness rules. The
`visualiser=1` projection excludes FI reads and strips Naila/guide-price flags.
Normal Browse keeps its existing projection and purchase behaviour. Only an
additive `roomPreview` capability is attached. No new fabric database, sample
pricing, merchandising, inference or purchasing implementation is introduced.

Changing fabrics retains room, palette, camera, mesh identity and motion position.
Sample/profile/make actions delegate to the existing governed customer routes.
When a published profile is absent, the existing catalogue detail fallback is
used. Unavailable stock does not become orderable just because a preview exists.

Initial assets: Bergamot Blush/Linen, Amalfi Herb, Shambala Lagoon and Sabu Stripe
Stone/Oak. Lotus Flower Emperor was a successful texture study control but the
current retail reader does not return it; it is deliberately excluded. Dali's
old provisional crop is not promoted. LYRA, PARK WEST, Paper Straw Stripe,
declared half-drop and every non-allowlisted fabric remain unavailable in this
visualiser. They remain governed by the ordinary catalogue rules.

## Frozen engineering and assets

The closed/open generators, material coordinates, length-preserving travel,
motion controller, cameras, lighting and four GLBs match the frozen source
hashes in `lib/room-visualiser/frozen-source-hashes.json`.

Curtain: 230 cm finished pair, 250 cm drop, 460 cm flat material, 2x fullness,
two equal panels, five waves per closed panel, 32 cm parked stacks. It has
22,050 vertices and 43,008 triangles. Closed binary SHA-256:
`851ff54103f396d076cdf1179bf480e5533e1e140d965b637cc598880eca4f24`.

Bergamot represents 460/45 = 10.222222 H repeats, 230/45 = 5.111111 per panel,
and 250/46.5 = 5.376344 V repeats. Textures cover the complete 460 x 250 cm
material domain. Intermediate tests retain 230 cm row length within 0.0001 cm,
individual material edges within 0.00001 cm and vertical strain below 0.0002.

All four runtime textures are 2048 x 1113 WebP. Patterned files are the unchanged
approved source-provenance master derivatives. Amalfi is a q92 derivative of the
approved plain image, retaining the existing decorative plain material transform;
it claims colour/character, not physical weave or motif scale. Provenance hashes
are in `lib/room-visualiser/provenance.json`. Supplier originals and high-resolution
masters remain in the internal experiment archive and are never served here.

`node scripts/build-room-visualiser.mjs` packages existing assets and frozen mesh
buffers offline. It does not contact any service or build a jigsaw. The committed
`public/room-visualiser/<content-hash>/` pack is served by the existing Vercel CDN
with one-year immutable caching and Shopify-origin CORS. The pack is 11.7 MB raw;
only current room, common maps and current fabric load initially. Other GLB bytes
preload lazily after readiness, subject to connection/data-saving policy.
No other fabric is prefetched. Replaced/stale textures are disposed. Current
curtain RGBA+mip allocation is 12,156,928 bytes (11.59 MiB); switch decoding may
temporarily overlap the outgoing texture. Exact OS/GPU memory is not browser-visible.

| Room | GLB bytes | Vertices | Triangles |
| --- | ---: | ---: | ---: |
| Living Room | 917,780 | 20,937 | 37,932 |
| Bedroom | 852,956 | 19,415 | 35,388 |
| Lounge | 916,452 | 21,005 | 37,556 |
| Office | 876,880 | 19,822 | 36,844 |

Total GLBs: 3,564,068 bytes. Existing project-authored room assets retain their
provenance. The exact Three.js 0.180.0 runtime is vendored with its MIT licence;
no root dependency or lockfile change is needed.

## Verification before release

- All 508 existing tests pass; latest shared-browser edit also passes all 306 storefront tests.
- TypeScript and production build pass.
- `node --test tests/room-visualiser/runtime.test.mjs`
- `npx tsx --test tests/room-visualiser/integration.test.ts`
- `node scripts/verify-room-visualiser.cjs` (read-only loopback harness requires existing server environment and prepared Browse flag).

Browser journey assertions cover shared search and pagination, all four fabrics,
palette/UV/geometry identity, all four rooms, both views, open/close/reversal,
unsupported Dali, commerce links, no horizontal overflow and no FI/jigsaw requests.
Both Chromium runs passed without page errors or context loss. Local first render:
5.87 s desktop / 6.43 s narrow viewport including cold shaders/catalogue reads.
Texture switches: 103–208 ms desktop / 118–332 ms narrow. Motion: approximately
1.82–1.88 s, 47–57 FPS under desktop automation. These are not iPhone claims.
The prior physical Safari study at the frozen reference passed near 60 FPS;
the deployed customer journey requires a separate live iPhone smoke check.

Screenshots: [desktop room](desktop-room.png), [normal curtain](desktop-curtain.png),
[mobile](mobile-room.png), [mobile shared browser](mobile-change-fabric.png).

## Protected release and rollback

Create a PR into current `release/production`; require the existing protected
gate and policy checks. Merge only the intended runtime/catalogue/theme diff.
Deploy a clean checkout of the exact resulting protected SHA/tree. Capture
source SHA/tree as explicit Vercel metadata. Then upload only the six scoped
theme files, with nodelete, and create the `room-visualiser` page using its matching
template. The existing live theme is 182339731835; its three modified files were
read back and matched protected Git before this release. Backups are local.

Previous production deployment for rollback:
`dpl_B95pkAWrS8UFEVnkrmSFTBmTGDV5`. Restore its alias and backed-up theme files if
customer smoke fails. Do not change catalogue, FI, Merchant or database state.
Post-release smoke must cover direct links, fabric/room/view switching, motion,
palettes, ordering links, unsupported behaviour and immutable WebP cache hits.

The complete and persistent visual-guide/physical-sample disclaimers remain.
No catalogue expansion, further renderer research or new room work is included.
