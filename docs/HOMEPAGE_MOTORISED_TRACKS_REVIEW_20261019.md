# Motorised Curtain Tracks homepage feature

## Review candidate

The owner requested a highly visual homepage entry for the released Motorised Curtain Tracks range. This theme-only candidate starts from protected `release/production` at `0f26ce6657ad6ff8e362ff6a059d45b815dd023f`. It is separate from the published guide correction and has not been uploaded to Shopify MAIN.

The new feature sits immediately after the main hero and its shortcuts, before the existing Room Visualiser. It pairs a large luxury room and ivory curtains with an EasyTouch remote illustration, a concise heading, plug-in and rechargeable-battery labels, and a **Try Smart Track Studio** action. The whole room visual also links to the released Studio. A secondary link opens the existing motor guide. The motor-concealment and included-hardware captions sit outside the photograph.

The room and curtain artwork are byte-identical copies of the released `room-living.webp` and `curtain-wave.webp`, assembled as positioned images. They total 362,176 bytes, load lazily and reserve their aspect ratio. This is illustrative artwork, not a new order, a quotation or a physical installation drawing. No new JavaScript, canvas, renderer, catalogue load or iframe is added to the homepage. The remote illustration links to the full interactive demonstration; it does not pretend to control devices on the homepage.

Existing homepage sections, shortcuts, navigation, theme settings and all customer journeys remain in place. The section uses the existing `curtainsuk_smart_track_enabled` setting, which is already enabled on MAIN. No additional flag or deployment-only override is introduced. Customer text uses additive `homepage_tracks` translation keys.

## Verification

- Shopify Liquid validation passed for the snippet, parent section, CSS and English locale.
- The existing Shopify theme suite passed all 18 tests. `git diff --check` passed.
- The complete candidate theme manifest verifies 544 files: the existing 541 plus two images and the new snippet. Only the six scoped theme files below need publication.
- Local Chrome review used the public homepage HTML with the candidate snippet and stylesheet, at 1440 × 900 and 390 × 844. Both had no horizontal overflow; all three image elements loaded. The phone layout retains the image, remote, power choices and CTA. The CTA opened the real published Smart Track Studio page.
- These are browser previews of the actual markup/styles, not a Shopify-hosted unpublished-theme render or physical-device acceptance. No payment, account or saved design was changed.
- Screenshots: [desktop](../artifacts/homepage-motorised-tracks-20261019/desktop.png), [phone](../artifacts/homepage-motorised-tracks-20261019/mobile.png).

Local preview: `http://127.0.0.1:4386/full.html#homepage-motorised-tracks`. Its local server must remain running for that link to work. The isolated feature preview is at the same origin's `/` route.

## Scoped publication

Follow the owner's requested exact-candidate approval and protected PR process. After approval and both required checks, merge into `release/production`, read back the current MAIN files/settings, and upload only these six files from that exact protected source to existing theme `182339731835`:

- `sections/curtainsuk-home-studio.liquid`
- `snippets/curtainsuk-home-tracks.liquid`
- `assets/curtainsuk-home-studio.css`
- `assets/cuk-home-track-room.webp`
- `assets/cuk-home-track-curtain.webp`
- `locales/en.default.json`

Re-read the complete MAIN theme against the 544-file candidate manifest, verify both homepage links and desktop/phone layout, then update the source-of-truth release record. Preserve all stored theme settings. No Vercel deployment, environment change or Supabase migration is necessary. Runtime remains the [published guide-link source](GUIDE_LINK_RELEASE_20261019.md).

Rollback is scoped to the backed-up homepage section, stylesheet and locale, together with the three added theme files. Preserve the runtime, product flags, existing navigation and all customer data.
