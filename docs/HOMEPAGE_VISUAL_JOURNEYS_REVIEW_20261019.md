# Homepage visual journeys: review candidate

This unpublished, theme-only candidate starts from protected `release/production` at `f0ca5ca71259f55922ccf2629646500206626a29`. It makes the existing customer journeys easier to discover with large photographic features. No pricing, checkout, adviser service, catalogue, feature flag, stored theme setting, Vercel deployment or Supabase object is changed.

## Homepage tidy-up in the same PR

At the owner's request, the candidate now has one section per purpose. The repeated three-step shopping journey, shortcut strip, separate shopping/reassurance block and earlier Design My Home promotion have been removed from the homepage. The old two-column inspiration/help block is now one visual Shop by Window feature; measuring and fitting are covered by the three Guide cards. Saved orders remain available through the final Design My Home link; the duplicated on-homepage item-count promotion is no longer rendered. No underlying product, saved-order, adviser or visualiser functionality is disabled.

The opening title is shorter, the desktop hero is more compact, and CTAs describe the next shopping action: Shop made-to-measure curtains; Choose fabric & get a price; Design & price my cushions; Choose my motorised track; Build & review my order. Guide cards have distinct actions. The benefit strip keeps the established UK-made, matching-tieback and lead-time statements and replaces its generic slogan with the supported one-order/one-checkout benefit. Product copy explains samples, individual configuration and included track hardware without claiming unverified superiority.

## Customer experience

- A burgundy **Sale now on / Up to 25% off / Made-to-measure curtains** banner appears above the homepage header. The smaller price-match message links to Contact Us. The owner explicitly confirmed that the sale is already included in current prices; this change applies no additional discount.
- **Browse Fabrics** is the first feature after the hero, with room photography and a fabric close-up. The existing Motorised Curtain Tracks feature follows it.
- **Cushion Studio** follows the existing interactive Room Visualiser, with a new cushion lifestyle photograph and a direct creation link.
- **Fabric Intelligence** pairs room photography with a fabric moodboard, retaining both room-photo and guided-style entry routes and the existing navigation anchors.
- **Ask an Adviser** appears near the bottom with Jane and the other four existing adviser portraits. The feature explicitly calls them AI advisers and explains the sign-in step.
- **Guide** follows the adviser feature, with three image-led cards: How to use CurtainsUK, How to measure, How to fit.
- **Design My Home** is the final main-content section, immediately above the existing footer. Living-room and bedroom images accompany the ordering link. The CTA reads **Build & review my order** and opens the existing Design My Home page for new or saved orders.

The hero, motorised-track feature, room and heading previews and navigation remain. The original small discovery cards and repeated shopping/help promotions have been consolidated into the visual features; their customer destinations remain accessible. Newly written customer copy contains no em dashes.

## Preview and evidence

Local preview: <http://127.0.0.1:4387/>. Final feature: <http://127.0.0.1:4387/#homepage-design-my-home>. The local server must remain running. This preview renders candidate Liquid with LiquidJS inside a freshly captured public Shopify shell. It is not a Shopify-hosted unpublished-theme rendering.

| Feature | Desktop | Phone |
| --- | --- | --- |
| Opening message | [Screenshot](../artifacts/homepage-visual-journeys-20261019/hero-desktop.png) | [Screenshot](../artifacts/homepage-visual-journeys-20261019/hero-mobile.png) |
| Shop by Window | [Screenshot](../artifacts/homepage-visual-journeys-20261019/windows-desktop.png) | [Screenshot](../artifacts/homepage-visual-journeys-20261019/windows-mobile.png) |
| Sale | [Screenshot](../artifacts/homepage-visual-journeys-20261019/sale-desktop.png) | [Screenshot](../artifacts/homepage-visual-journeys-20261019/sale-mobile.png) |
| Browse Fabrics | [Screenshot](../artifacts/homepage-visual-journeys-20261019/fabrics-desktop.png) | [Screenshot](../artifacts/homepage-visual-journeys-20261019/fabrics-mobile.png) |
| Cushion Studio | [Screenshot](../artifacts/homepage-visual-journeys-20261019/cushions-desktop.png) | [Screenshot](../artifacts/homepage-visual-journeys-20261019/cushions-mobile.png) |
| Fabric Intelligence | [Screenshot](../artifacts/homepage-visual-journeys-20261019/intelligence-desktop.png) | [Screenshot](../artifacts/homepage-visual-journeys-20261019/intelligence-mobile.png) |
| AI advisers | [Screenshot](../artifacts/homepage-visual-journeys-20261019/advisers-desktop.png) | [Screenshot](../artifacts/homepage-visual-journeys-20261019/advisers-mobile.png) |
| Guide | [Screenshot](../artifacts/homepage-visual-journeys-20261019/guides-desktop.png) | [Screenshot](../artifacts/homepage-visual-journeys-20261019/guides-mobile.png) |
| Design My Home | [Screenshot](../artifacts/homepage-visual-journeys-20261019/design-home-desktop.png) | [Screenshot](../artifacts/homepage-visual-journeys-20261019/design-home-mobile.png) |

Chrome review covered CSS viewport widths 1536, 768 and 390 pixels, without horizontal overflow. The tidy-up was rechecked at desktop and phone widths: no duplicate main-content IDs, missing in-page anchor targets or redundant shopping/home promotions remained. All 16 feature image elements loaded after visiting the lazy-loaded sections. New CTA destinations were inspected in the rendered DOM; the Guide and final Design My Home links were followed to their live pages. Existing Bedroom selection, Evening lighting and keyboard activation of Double pinch pleat worked. No saved configuration, order, payment or adviser conversation was submitted or edited. This is scoped homepage verification, not a new full-site or payment audit and not physical-device acceptance.

All 16 changed theme files passed Shopify Liquid full-theme validation. The existing theme suite passed all 18 tests. `git diff --check` passed. Complete source assembly verifies 554 theme files against the candidate manifest: ten additions and six existing-file changes. The stored settings SHA-256 remains `3BB8BC0C780E34939031EE83BCA41584CF973018A8EAAAC112B1027D7F45E502`.

Images below the hero load lazily and reserve layout space. Existing Shopify file images use responsive image widths. No JavaScript, canvas, catalogue fetch, iframe or new dependency is added to the homepage. Focus-visible styles and reduced-motion handling are included. Temporary preview dependencies and helpers are outside the delivered source.

## Theme controls

The announcement section adds `homepage_sale_enabled`, default `true`, under **Show homepage curtain sale**. This is a protected-source schema default, not a temporary live override. Disabling it restores the previous announcement. Non-homepage announcements retain their original markup. No existing setting is changed.

The home-studio section adds optional image pickers for the Browse Fabrics room/detail, Cushion Studio and Fabric Intelligence room. Defaults use the documented assets. The three final sections can be ordered in the homepage editor; the supplied index template places Design My Home last.

## Artwork provenance

Existing supplier room/fabric imagery, Room Visualiser captures, wave-heading artwork and AI adviser portraits are reused. The cushion photograph is new illustrative AI-generated artwork, not a promised catalogue fabric combination. Its nearby caption makes that distinction.

Mode: new image generation using the built-in image tool. Saved delivery asset: `shopify-theme/curtainsuk-dawn-16/assets/cuk-home-cushion-editorial.webp`, 1536 by 1024 pixels, 276,808 bytes. The original generated PNG was converted to WebP at quality 84 without a compositional edit.

Prompt: “Use case: photorealistic-natural. Asset type: luxury British interiors website Cushion Studio feature image, wide landscape 3:2. Create a refined editorial interiors photograph focused closely on a beautiful arrangement of five made-to-measure-style decorative cushions on an ivory linen sofa: two generous square cushions in muted olive velvet and warm oatmeal woven linen, a smaller dusty terracotta square, one soft cream square, and a long rectangular lumbar cushion in a subtle small-scale cream-and-olive woven stripe. Realistic tactile textile weave, neat tailored seams and restrained piping, softly plump forms, natural slight creases. Cushions are the dominant subject and occupy the middle and lower two-thirds, with clear readable silhouettes, comfortably arranged rather than piled. A softly sunlit neutral townhouse living room, softly blurred warm oak side table and pale curtains at edge, calm indirect daylight, gentle shadows, art-directed premium home magazine photography, nuanced warm cream, olive and clay palette matching an elegant dark-green and parchment website. Close enough to appreciate texture, generous framing so all cushion edges remain in a central safe crop on mobile. No people, no text, no logos, no labels, no collage, no UI, no watermarks. A finished usable photographic asset, not a mockup of a webpage.”

## Scoped release

Follow the owner's exact-head approval and protected PR process. This candidate has not been published. Once the exact PR head is approved and both required checks pass, merge to `release/production`, read back the complete existing MAIN theme and settings, and publish only the following 16 files from that protected source to existing theme `182339731835`:

```text
assets/cuk-home-cushion-editorial.webp
assets/curtainsuk-home-features.css
assets/curtainsuk-home-sale.css
locales/en.default.json
sections/announcement-bar.liquid
sections/curtainsuk-home-studio.liquid
sections/curtainsuk-home-advisers.liquid
sections/curtainsuk-home-design.liquid
sections/curtainsuk-home-guides.liquid
sections/curtainsuk-inspiration-help.liquid
snippets/curtainsuk-home-cushions.liquid
snippets/curtainsuk-home-fabrics.liquid
snippets/curtainsuk-home-intelligence.liquid
snippets/curtainsuk-home-sale.liquid
snippets/curtainsuk-home-trust-strip.liquid
templates/index.json
```

Re-read all 554 theme files against the protected manifest and repeat scoped browser checks. Preserve the complete stored settings and all released feature flags. No runtime deployment or database change is required. Update the production source-of-truth record only after successful publication/readback. Rollback restores the six changed files and removes the ten additions using the pre-release backup, preserving existing settings and customer data.

