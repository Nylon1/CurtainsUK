# Curtain Style V2 — Anatomy of a curtain

## Curtain Anatomy preview

[Open the unpublished Shopify preview](https://www.curtainsuk.com/pages/fabric-library?view=curtain-style&preview_theme_id=182339731835).

Candidate **182339731835**, still named **CurtainsUK - Curtain Style V1 review**, now contains V2. Its role is UNPUBLISHED. Live theme **182336356731** remains MAIN and all 407 live files match the pre-build baseline. Nothing was published.

The existing alternate view on Fabric Library is retained; no shared page, menu, route or redirect was created. The candidate retains its inherited preview banner and checkout safeguards. The banner is expected; no Vercel/staging-host links were introduced.

## Four approved form states

One large image changes between Wave, Double Pinch, Pencil Pleat and Eyelet. Each state has Heading, Flow, Structure, Fabric, Room and Length / floor focus controls. Heading includes an optional **Look closer** crop of the same approved image, not a newly generated view.

- **Wave:** regular track-created S rhythm; no eyelets or sewn pinch groups. [Desktop capture](../artifacts/curtain-style-v2/preview-1440-wave.png).
- **Double Pinch:** approved paired pleats, not the earlier Triple Pinch master. [Desktop capture](../artifacts/curtain-style-v2/preview-1440-double-pinch.png); [390px heading close-up](../artifacts/curtain-style-v2/preview-390-double-pinch-closeup.png).
- **Pencil Pleat:** dense small gathers, softer variable fall. [Desktop capture](../artifacts/curtain-style-v2/preview-1440-pencil-pleat.png).
- **Eyelet:** visible grommets directly threaded over the pole. [Desktop capture](../artifacts/curtain-style-v2/preview-1440-eyelet.png).

Four approved 1448 × 1086 generated masters were reused unchanged locally. Decoded pixels of Shopify's uploaded assets match the originals; Shopify re-encodes PNG metadata. No reference photograph was uploaded. The neutral material is explicitly labelled a curtain form study, not an exact Fabric Master simulation or purchasable fabric.

## Shorter experience and supporting lessons

Fabric-first proposition → Anatomy → expandable Fabric Knowledge translations → three finishing decisions → return to fabric.

This replaces the old editorial section rather than preceding it. At 1440px the full default page is **3,705px**, versus **8,937px** for V1 (about **59% shorter**). Default visible Anatomy-section copy is 376 words. Optional explanations remain available without dominating the initial journey.

- **Fullness:** short material crop and an explicitly illustrative less-presence / more-presence continuum. No manufacturing ratio, orderable fullness labels or Builder configuration.
- **Length:** controlled floor crop, concise clean-floor lesson and optional representative real soft-break example. The pre-existing supplier image remains separately labelled; its reuse provenance and rights caveat are in the V1 asset review. It is not one of the controlled masters.
- **Position:** short top/window crop with window-led versus higher/ceiling-led reasoning, plus an optional opening/extension explanation. No installation calculator or fitting instructions. No new controlled length/position variants were generated.

[Supporting lessons — desktop](../artifacts/curtain-style-v2/preview-1440-support.png) · [412px](../artifacts/curtain-style-v2/preview-412-support.png).

## Fabric Knowledge links

All use the existing `/pages/fabric-library?view=browse-fabrics` contract. No new taxonomy or editorial collection. These nine actual linked filters were checked against the public governed catalogue; every first-page result matched its requested dimension.

| Lesson | Existing filter | Observed results |
| --- | --- | ---: |
| Quieter activity | `activity=low` | 1,856 |
| More expressive activity | `activity=statement` | 32 |
| Stripes | `pattern=stripe` | 996 |
| Geometric | `pattern=geometric` | 2,199 |
| Botanical | `pattern=botanical` | 2,229 |
| Visible weave | `texture=visible-weave` | 3,248 |
| Raised surface detail | `texture=relief` | 1,139 |
| Quieter presence | `presence=light` | 1,400 |
| Substantial presence | `presence=substantial` | 249 |

Counts are test observations, not hard-coded page copy. The filter script additionally checks abstract patterns, but V2 does not link that extra facet.

## Fabric Intelligence handoffs

Restrained prompts appear inside Pattern/Activity, Texture and Presence lessons, with the principal return-to-fabric action at the ending. All route to the existing same-origin `/apps/curtainsuk-decision/consultation?experience=premium&entry=match` experience. The final CTA was followed to **Let us read your room**. No HCI logic or consultation submission changed.

The ending also offers Browse Fabrics and secondary **Make my curtains**. It returns attention to the fabric, not a saved curtain-form configuration.

## Desktop / 390 / 412 results

| Viewport | Actual Shopify states tested | Visual width | Horizontal overflow |
| --- | ---: | ---: | --- |
| 1440px | 24 | 956px | None |
| 390px | 24 | 390px | None |
| 412px | 24 | 412px | None |

All 72 form/layer combinations passed. One selected master remains large; hotspots are at least 44 × 44px. Live-preview keyboard navigation and heading close-up carry/reset passed. Local checks also passed swipe, preserved vertical scrolling, reduced motion, image-failure fallback and no-JavaScript readable studies/native disclosures.

Final scoped axe 4.12.1 scan: **0 detected violations**, 26 passing checks, one incomplete image-overlay contrast category manually inspected. This is not a full accessibility certification. Panel semantics and detail-number contrast were corrected after the first scan.

Shopify Liquid, schema and translation validation passed, revision 2. Existing locale content is preserved; only new namespaces were added across the V1/V2 work.

## Sample / Make Curtains regression

- Existing sample variant **56120226873723** remains available at **250p (£2.50)**. Read-only product and basket checks passed; isolated test basket remained empty.
- Samples route and footer access remain. Only the prominent candidate navigation item is Curtain Style.
- Existing Browse, exact-fabric Detail, Fabric Knowledge, sample action and Make curtains handoff rendered. Example fabric: `sdg-f1325-03` (Abeja Linen).
- V2's Make my curtains link opens the existing **Make it yours** Builder and its configuration steps. No measurements, pricing calculation, configuration submission or order was performed.
- No cart-add or checkout transaction was tested: draft checkout remains disabled. No stock, sample commerce, HCI or Builder files changed.
- All Anatomy links remain same-origin; no staging/Vercel/localhost destination leakage was found.

## Files changed and deployment boundary

Exactly six candidate-theme files changed from the pre-V2 remote baseline:

1. `sections/curtainsuk-curtain-style.liquid`
2. `locales/en.default.json`
3. `assets/cuk-anatomy-wave.png`
4. `assets/cuk-anatomy-double-pinch.png`
5. `assets/cuk-anatomy-pencil-pleat.png`
6. `assets/cuk-anatomy-eyelet.png`

All other candidate files match their pre-V2 checksums; none were deleted. Four generated media files were also added to Shopify Files for the theme asset transfer, documented in `curtain-style-v2-assets.json`. No products were created.

The source commit also captures the previously uncommitted V1 scaffolding required by this candidate: navigation substitution, alternate template, image helper, old translation namespace, V1 review records and scripts. V2 adds three verification scripts and its reports. These source changes do not mean the live theme was modified.

Branch: `feature/curtain-style-v1`. Commit hash is supplied with the final handoff. No merge, push or publication is included.

## Review gate

Review the anatomy experience and concise supporting lessons in Shopify. The candidate still carries its original V1 theme name; this is not a second live destination. The dedicated public handle, any supplier rights confirmation and publication require a separate approval. The remote V1 text backup is retained locally in ignored review artifacts for rollback.
