# Visual homepage review — 9 October 2026

## Current refinement — interactive visual homepage

The owner requested a more visual page with stronger interactions. The existing unpublished theme and draft PR [#166](https://github.com/Nylon1/CurtainsUK/pull/166) now contain the refined design. **Nothing has been merged or published.**

[Open the current Shopify preview](https://www.curtainsuk.com/?preview_theme_id=182466478459&homepage_review=09abc566) · [Screenshot gallery](../artifacts/homepage-studio-20261009/review.html)

- Warm ivory and deep green presentation, larger editorial typography, clean interior imagery and an image-first mobile opening. Find my curtains leads into the existing fabric catalogue.
- Four clickable room thumbnails switch genuine captures from the approved Room Visualiser. Daylight/Evening controls change the preview. The room CTA retains the selected room and captured Fabric Master identity `sdg-f1541-01`; the full visualiser opens in its existing Daylight mode.
- Eight room images total **249,128 bytes**. They were encoded from the approved runtime screenshots without changing their scene, colour, fabric or scale. Provenance is saved beside the evidence. The 102,006-byte hero remains clearly labelled interior inspiration.
- Larger interactive Wave, Double pinch pleat, Pencil pleat and Eyelet studies. Shorter fabric discovery cards, colour story and a choose/sample/make journey lead into the existing customer routes.
- Progressive enhancement retains ordinary room/style links with JavaScript disabled. Tabs support keyboard navigation, touch, visible focus and reduced motion. Failed room images retain the previous valid selection and support retry; rapid selections cannot overwrite the latest choice.
- No homepage WebGL renderer, GLB, catalogue fetch or 3D iframe was introduced. New controller: **5,338 bytes** uncompressed. Existing House of Curtains, guidance, sample/order routes, customer trust, header and footer remain intact. No curtain geometry, UV, repeat, scaling, motion, supported-fabric assignment, pricing or checkout logic changed.

### Current verification

- 18 existing Shopify-theme tests passed. Shopify Theme Check reported **zero errors**, zero findings in changed files and 13 pre-existing warnings across eight unrelated files. The skill's standalone Liquid validator lacked its local package dependency; the installed official Shopify CLI Theme Check was used successfully instead.
- Chromium at **320, 390, 412, 768 and 1440 px**: all eight room/lighting combinations, four headings, keyboard switching, loaded images, no horizontal overflow, one H1, no missing translations, reduced-motion behaviour and no visualiser-engine resource requests passed. Mobile interactive targets meet the 44px height check. See `interactive-review.json`.
- Mobile menu, failed-image retry, rapid switching, selected-room/fabric handoff to the native visualiser iframe and all six distinct shopping/help destination reads passed. No order or payment was made. See `journey-review.json`.
- All **18 scoped theme files** read back with matching source checksums. The preview remains `UNPUBLISHED`; live theme `182339731835` remains `MAIN`, and its homepage template and English locale checksums are unchanged. Source uploaded to the draft: `09abc566618e32fe52c71dff8c2f1da6e81bc3d9`. See `draft-readback.json`.
- The latest disk reading was **41.78 GiB free**, above the earlier 35 GiB headroom target. This refinement did not delete worktrees, evidence or uncommitted work, or restart OneDrive. No storage cleanup is claimed.
- Physical iPhone Safari acceptance remains outstanding. Chromium viewport/touch checks are not a physical-iPhone result. No new customer-network speed or conversion-uplift claim is made.

Keep PR #166 in draft for owner visual review. For any later authorized publication, merge through both protected checks and upload only the 18 files listed in `source-check.json` from the exact protected source, after a fresh scoped comparison against the canonical live theme. Do not publish the entire draft theme or its draft-only `index.home-review.liquid`, settings, announcement or checkout-disabled state. This work requires no Vercel deployment. Roll back only the scoped theme changes if required.

## Archived first-draft review

The notes below record the first draft before the interactive refinement and narrow-browser acceptance above. Their pending screenshot/mobile statements and nine-file release scope are superseded by the current record.

The homepage previously devoted its main editorial story to Fabric Intelligence and did not present the live Room Visualiser. The candidate adds a shorter hero, a prominent four-room visualiser feature, existing fabric-discovery cards, a concise colour-intelligence story and visual heading comparisons. House of Curtains, its saved-room behaviour, window guidance, measurement help, customer trust and footer content remain in the existing theme sections.

## Source and boundaries

- Base: protected `release/production`, `9dbad8098083a6800ea0b1d1a972dba9e616d9d2` (PR #165).
- Branch: `feat/homepage-visual-tools-20261009`.
- Source: `shopify-theme/curtainsuk-dawn-16/sections/curtainsuk-home-studio.liquid`, its scoped CSS, homepage template, English translations and five optimised WebP assets.
- The old editorial section is disabled and preserved. The new studio section is homepage-only.
- Shopify draft: `182466478459`, duplicated from live theme `182339731835`; no live-theme write or publication is part of this review.
- No Vercel release, visualiser runtime change, catalogue read/rebuild, pricing update or checkout change is needed for this theme-only candidate.

## Visual and loading behaviour

- Hero CTA opens the existing native Room Visualiser. All four room links use its existing `room` query parameter.
- No renderer, WebGL context, fabric catalogue or iframe is loaded by the new homepage section.
- Only the hero image is eager/high-priority; feature and heading images are lazy. New WebP assets total 250,950 bytes, derived without semantic changes from existing approved theme imagery.
- Existing interior artwork is visibly labelled **Interior inspiration**. The Theme Editor screenshot setting accepts a capture of the current approved visualiser and switches the label to **Room Visualiser preview**. No older visualiser or generated interior is claimed to be a current runtime screenshot.
- The feature retains the physical-sample advisory. It does not claim every catalogue fabric is supported or promise exact finished-curtain appearance.
- Existing translation keys and Shopify sections remain intact. New customer copy uses `homepage_studio` translation keys.

## Validation

- Existing theme suite: 18 passed, zero failed.
- Shopify Liquid validator 3.24.0: new section, CSS, English locale and homepage JSON all passed. The validator used its bundled documentation fallback when the latest documentation manifest could not be fetched.
- JSON structure, existing translations, image dimensions and compressed asset hashes checked; `git diff --check` passed.
- Scoped live source read-back confirmed the existing homepage sections/CSS and translations match protected source after line-ending normalisation.
- Cloud Chrome cannot create a WebGL context, so it cannot produce new runtime screenshots; the native visualiser correctly shows its recovery path in that environment. This observation is not a physical-device or ordinary customer-browser result.

## Review and release

- Desktop draft reviewed at a 1363px viewport: one H1, no horizontal overflow, all ten studio images loaded after scrolling, and visualiser/discovery/style shortcut anchors verified. The inherited hero heading colour was corrected and checked in the browser.
- All nine scoped draft files were read back; text content matches source after line-ending normalisation and all five binary MD5 checksums match. Shopify requires disabled sections to remain in the JSON order; the preserved editorial section is included but disabled.
- Live template and English-locale MD5 values remain `fc1b6bb796a603186fe929b4d3c77f7a` and `9fb06028f18169aad440643aa721f335` respectively.
- Desktop evidence: [hero](../artifacts/homepage-studio-20261009/desktop-hero.jpg), [room feature](../artifacts/homepage-studio-20261009/desktop-rooms.jpg), [heading comparison](../artifacts/homepage-studio-20261009/desktop-headings.jpg). These show the unpublished theme and surrounding navigation.
- Responsive CSS is implemented, but narrow-screen browser acceptance remains pending. A 390px embedded draft review was blocked by storefront frame policy; no policy was changed. The temporary draft-only `index.home-review.liquid` now contains a direct-homepage review link, and is excluded from source and publication. The connector blocked its deletion, so it was safely replaced instead.
- Physical iPhone Safari acceptance remains pending. The earlier room-visualiser release and disk-cleanup pending work are unchanged.

Open **CurtainsUK - Visual homepage review 9 Oct** in Shopify's theme library and choose Preview. The candidate remains unpublished and PR #166 remains a draft for visual review.

Before publication, merge the reviewed candidate through both required protected checks and upload only the nine scoped theme files from that exact protected source. Re-read the target homepage template/locale immediately before upload to preserve any intervening Theme Editor changes. Use an existing capture of the current approved runtime if replacing the labelled inspiration image.

Rollback is limited to these theme files: restore the prior homepage JSON and English locale from the pre-change live snapshot, then remove/disable the new studio section. Preserve the live Room Visualiser deployment and all unrelated files. Do not invoke a Vercel rollback for this theme-only change.
