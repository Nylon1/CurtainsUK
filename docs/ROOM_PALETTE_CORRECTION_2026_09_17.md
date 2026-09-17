# Room Palette correction — protected preview

## Source and deployment

- CurtainsUK implementation: `e5bb3d7466cb187115d7fafc1a80cbce21e40e3f` on `integrate/consolidated-hci-candidate-v2`.
- HCI implementation: `20606b85891d732fadcd4ff310016eb203b29d08` on the corresponding HCI integration branch.
- CurtainsUK preview: https://curtainsuk-staging-cfda20fvl-hamzas-projects-4ef62f35.vercel.app/curtain-consultation-premium
- CurtainsUK deployment: `dpl_FTU62Ju3rFuagGDbJgdmcMJ6t53m` (Preview).
- HCI deployment: `dpl_4eif79KwXr1dVpfpAYz3EtJ3vSn4` (Preview), https://hci-strategy-performance-staging-8elw8qivb.vercel.app.
- Only the existing CurtainsUK Preview service-URL variable was updated. No production promotion, Shopify change, recommendation/ranking change, catalogue change or migration.

## Defects and correction

Before the fix, a hosted real-image test changed Beige to Blue, confirmed it, then reloaded. The page returned to Upload: initialization always created a new consultation instead of resuming the saved session.

The gateway also dropped the persisted CAS revision during customer projection. The client inferred an increment after every response, which is incorrect for a read-only resume. Parent and child retained separate palette copies, while the global retry updated only the parent. Palette save failures were shown both locally and as a misleading whole-consultation unavailable banner.

The projection now retains the actual server revision; resume does not invent an increment. An opaque session ID is retained in tab-scoped sessionStorage. The existing HttpOnly authenticated owner cookie remains required, and owner/CAS/origin/rate-limit checks are unchanged. The hosted palette renders the single authoritative session response. Its own save/retry/resume interaction owns palette errors; genuine failures remain visible and recoverable. A synchronous request lock prevents overlapping mutations.

Completed palettes can be reopened from the existing consultation without creating a new record. Pending colour correction saves a `describe` event then continues Where → Influence → Confirm, instead of prematurely confirming the card.

## Shades and evidence

The existing supplier colour normalization, HCI family vocabulary and Fabric Master retail taxonomy were inspected. Existing navy/sage/olive/blush family meanings are reused. No new canonical families or supplier colour facts were introduced.

Each existing family has a curated visual-guide grid. `customerSelectedShade` is a versioned, server-validated ID; arbitrary RGB and mismatched-family IDs are rejected. These are screen approximations, not Pantone/RAL/paint matches. The selection is preserved through later same-family confirmations, role moves, event history, completion and reload. Changing family cannot silently carry an incompatible old shade.

Machine observation is unchanged. Customer-confirmed and customer-added provenance stays separate. Downstream matching still uses canonical families, not the shade RGB; Ignore is retained historically and excluded by the existing `paletteContext` projection. Existing palette capacity/uniqueness constraints are unchanged.

## Real hosted browser proof

Used the existing authorised `public/reference-experience/living-room.jpg` through the real protected upload, not demo state. The unchanged “Reading your room / Light. Depth. Colour.” sequence returned actual Beige, Grey, White, Orange and Green observations.

| Original | Saved correction | Feature | Role | Influence |
|---|---|---|---|---|
| Beige | Cream / Warm cream (`#E5D6B7`) | Walls | Primary | Important |
| Grey | Blue / Navy (`#23364F`) | Sofa | Primary | Consider |
| White | Pink / Blush (`#DFB5AD`) | Accessories | Accent | Ignore |
| Orange | Orange | Rug | Accent | Consider |
| Green | Green | Flooring | Accent | Important |

- Corrected three families/shades, then used normal Where/Influence/Confirm.
- Navigated back to Cream from later colours; selection and context remained intact. Exercised back/forward influence steps.
- Completed all five, accepted the Room Palette and reached the existing questions.
- Reloaded the entire page, resumed the saved consultation and reopened Room Palette: all five statuses and contexts survived.
- Opened Cream, Blue and Pink after resume: each exact shade remained selected. Blue retained Sofa/Consider; Pink retained Ignore.
- Progress swatches and summary cards matched the saved RGB representations after reload.
- Original-colour disclosure still showed Primary Beige/Grey and Accent White/Orange/Green. No correction rewrote the observation.
- No unavailable banner or console errors occurred in the corrected hosted run.

## Validation

- HCI: full lint, typecheck, build; 1,023 tests passed, one pre-existing private-bundle test skipped. The real-JPEG private-store test passed with three corrected families/shades and fresh-store reload. New tests cover exact shade IDs, mismatch rejection, replay/idempotency, customer provenance, original immutability and canonical downstream context excluding Ignore.
- CurtainsUK: 185 storefront tests passed, typecheck and scoped lint passed. Hosted production build passed. Projection regression retains persisted revisions and full corrected shade evidence; read versus mutation acknowledgement tests pass.
- Desktop 1440×1000, 390×844 and 412×915: no horizontal overflow; shade chooser fits the viewport and scrolls internally; sticky action remains accessible. 390px used for initial corrections; 412px for completion/resume; both widths inspected again on saved state.
- Keyboard: visible focus, native dialog focus containment, Escape close, focus returned to the invoking colour, body scrolling restored. No motion was added; existing reduced-motion rules remain untouched.
- Existing unrelated HCI build warning remains: dynamic filesystem tracing in `visual-review.ts`.

## Files

Authoritative HCI: `RoomPaletteBoard.tsx`, its stylesheet, `GuidedRoomColour.tsx`, `room-palette-presentation.ts`, `palette.ts`, new `customer-shades.ts`, new shade regression test and extended real-upload persistence test.

CurtainsUK: those exact source modules mirrored under `vendor/hci-approved` with updated source manifest; transport-only `ReferencePalette.tsx` adaptation; `curtainsuk-premium-consultation.tsx`, `curtainsuk-premium-transport.ts`, gateway contract/projection/integration and two regression files. Customer projection was extracted into `hci-premium-view.ts` so the real whitelist/revision behavior is directly tested.

Upload, ReferenceAnalysis, first reveal styles, Shopify themes, commerce and production remain unchanged. The raw photograph remains ephemeral; reload restores derived palette evidence, not permanent image storage. This is a protected preview for owner review, not production approval.
