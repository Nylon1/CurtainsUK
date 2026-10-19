# Motorised Curtain Tracks homepage feature

## Published, 19 October 2026

The owner approved PR #244 at exact head `24e79691b9e765c5fc9ed818b56c2138cd750846`. Both required checks passed in run `39204664426`. The PR merged into protected `release/production` at `51756d4294e7d08fe91a7fee9c3de35e3a758439`, tree `6b561132eb0d68e427176271e66e5f6925d1465f`, at 05:35:51 UTC.

The six files listed below were uploaded from that exact protected HEAD to existing Shopify MAIN `182339731835`. A full pre-upload pull matched the previous 541-file source. A full post-upload pull matched all 544 files in the new protected manifest. `config/settings_data.json` was unchanged, with SHA-256 `3BB8BC0C780E34939031EE83BCA41584CF973018A8EAAAC112B1027D7F45E502` before and after. No feature flags, navigation settings, Vercel environment entries or Supabase objects were changed.

Live entry: [Motorised Curtain Tracks on the homepage](https://www.curtainsuk.com/#homepage-motorised-tracks). Desktop and phone Chrome checks confirmed all three image elements loaded, with no horizontal overflow. Browser viewport overrides were 1440 × 900 and 390 × 844; the browser's existing scale reported CSS widths of 1152 and 312 respectively. Both homepage links opened their published pages. Smart Track Studio loaded its room, EasyTouch remote and £514.29 starting quotation. These are scoped browser checks, not physical-device acceptance, a new full-site audit or a payment test.

Live screenshots: [desktop](../artifacts/homepage-motorised-tracks-20261019/desktop-live.png), [phone](../artifacts/homepage-motorised-tracks-20261019/mobile-live.png). Local complete pre/post theme backups and the source receipt are in `C:\Users\hamza\curtainsuk-homepage-track-release-20261019`.

The existing motor-guide frame was blank on its first navigation, then rendered its full motor comparison and brochure diagram after a normal page reload. A separate command-line request encountered Shopify's connection-verification response. The cause of the browser's initial blank frame was not established; this release does not claim to fix it. No security setting was changed.

The shared-service runtime remains `b8faa4e96a3b4cea2c4393041b6e9c5152b4b8f4` on `dpl_6wMYuRjo38cURYrwQUuzbuqM4mE8`. This release changed only the Shopify homepage presentation. The dated candidate record below is retained as review evidence; its unpublished status has been superseded by this checkpoint. Later documentation-only protected commits do not change either serving identity.

## Review candidate

The owner requested a highly visual homepage entry for the released Motorised Curtain Tracks range. This theme-only candidate started from protected `release/production` at `0f26ce6657ad6ff8e362ff6a059d45b815dd023f`. At review it was separate from the published guide correction and had not been uploaded to Shopify MAIN.

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
