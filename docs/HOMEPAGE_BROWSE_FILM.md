# Homepage Browse Fabrics film

The existing Browse Fabrics homepage section gains an interactive walkthrough. Its original gallery, Browse and samples links remain. The film is additive and does not change feature settings, pricing, checkout, advisers or API code.

## Media and delivery

- Shopify file: `gid://shopify/Video/73220824138107`, processed to READY.
- Source: `03-browse-fabrics-walkthrough-final-HD.mp4` from the owner's promotional video kit, 10,665,952 bytes.
- Served version: 1280 by 720, duration 107.712 seconds, hosted on Shopify's video CDN. Voice-over and music are retained.
- The theme contains compressed WebP poster/chapter thumbnails, not the MP4. Their combined size is about 29 KB.
- No iframe, external video library, account, cookie or tracking event is introduced.
- The video has no `src` on page load. The user must activate the cover, a chapter or Replay before JavaScript assigns the CDN URL. `preload="none"` is also set. Poster and chapter images use lazy loading and explicit dimensions.

## Controls

Native playback, pause, seeking, audio volume/mute and fullscreen are supplemented by Replay and playback speed. Six visual chapter links cover filters, Look closer, fabric details/curtain preview, samples, Jane and making curtains/live pricing. The current chapter is highlighted as playback advances. Chapter selection keeps the player in view when necessary without moving the page on initialisation. Native controls and chapter links remain keyboard accessible. Reduced-motion settings remove decorative transitions. Without JavaScript, the cover and chapter links open the CDN video directly.

The player presents a bounded, non-blocking message if media fails. Replay retries a failed media load. Browse Fabrics and samples remain usable independently of the player.

## Verification

`scripts/preview-homepage-film.py` renders a local preview of the theme snippet; it is a scoped development helper, not a production Liquid renderer. `scripts/check-homepage-film.cjs` exercises that preview in Chrome using Playwright. Supply `CUK_PLAYWRIGHT_PATH` if Playwright is not installed in the environment. Set `CUK_FILM_URL` to check the same player on the live homepage.

Local checks passed at 1440, 390 and 320 pixel widths: no video request before interaction, no horizontal overflow, all chapter seeks, active chapter, pause, Replay, speed, decoded audio, unmuted playback, CTA destinations and no page errors. Separate checks cover keyboard activation, no-JavaScript links and handled media network failure. These checks do not establish physical iOS behaviour or subjective audio quality.

The Shopify validator passed both Liquid snippets, CSS, JavaScript and locale additions. Before implementation a full MAIN pull matched all 586 protected theme files. After PR #301 publication a fresh readback matched all 596 protected theme files, with settings unchanged. Playback checks at all three widths also passed on the live homepage; the live harness dismissed the standard cookie banner using its Decline button before interacting with the film.

## Release scope

Publish only the two snippets, the locale addition, the film CSS/JavaScript and seven WebP images after both protected PR checks pass and the change reaches `release/production`. Use an explicit file allowlist and disable deletions. Do not upload settings, templates or unrelated assets. Verify all 596 composed source files against a fresh MAIN pull, compare `config/settings_data.json` bytes, then update `PRODUCTION_SURFACES.md` with the exact release and live checks. This theme-only release requires no Vercel or Supabase change.
