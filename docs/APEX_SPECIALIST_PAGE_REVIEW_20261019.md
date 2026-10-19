# Apex and angled curtains: publication and review record

## Published, 19 October 2026

The owner authorised publication with "Publish and ensure no feature of the existing site is turned off". [PR #248](https://github.com/Nylon1/CurtainsUK/pull/248), approved head `14f743150439ed4fbcefbbc125d719dcb0e6c399`, passed `curtainsuk-production-gate` and `protected-production-policy` in run `39221536852`. It merged to protected `release/production` at `13b7a4eab6089c3a07639964473efc4091fef95a`, tree `4c6aac530b1e9d5ed410147a3b0bb02b65eaa758`.

The page is live at <https://www.curtainsuk.com/pages/apex-window-curtains-the-challenge>. A fresh pre-release theme pull matched all 554 files of previous protected source `6e34091a8f084c069b64b19a63584dbf7e6b007d`. Only the 26 changed theme files, assembled from the exact protected merge, were uploaded to existing Shopify MAIN theme `182339731835`, with deletion disabled. Complete post-publication readback matches all 575 files in the protected theme manifest. No configuration files were uploaded. Stored settings are byte-identical before and after, SHA-256 `3BB8BC0C780E34939031EE83BCA41584CF973018A8EAAAC112B1027D7F45E502`.

Existing Page `gid://shopify/Page/85261385837` received only `templateSuffix: apex-specialist`. Fresh readback confirmed the suffix and unchanged page identity, handle, title, body and published state. Browser inspection confirmed the original SEO title, description and self-canonical, one H1, and no robots noindex directive. No replacement page or redirect was created.

Live browser checks confirmed the shape controls, gallery enlargement, Escape closing with focus return, all three action destinations, Natalie consultation entry, loaded hero/gallery images, and Shop by Window discovery through to the historic page. The desktop viewport was 1229 CSS pixels without horizontal overflow. A live mobile viewport override did not take effect in this browser session and was reset; mobile evidence remains the earlier 390-pixel candidate check below, not a newly claimed production-device test.

| Existing feature | Bounded live result |
| --- | --- |
| Browse Fabrics | Catalogue loaded 11,815 fabrics with normal product actions. |
| Naila | Start my consultation returned the opening question and four response options. |
| Room Visualiser | Living-room scene rendered with the selected fabric and room controls. |
| Cushion Studio | Configurator, preview controls and catalogue loaded. |
| Motorised Curtain Tracks | Remote and app demonstration controls, five rooms, configuration and live product price loaded. |
| Fabric Intelligence | Room-reading experience and reference/photo entry controls loaded. |
| Advisers | All five profiles and consultation entry points remain available. Jane and Ben reached the settled customer sign-in boundary; Noah, James and Natalie opened their correct specialist shells with sign-in links. |
| Design My Home | Existing saved curtain item and order review loaded. The review required a postcode before checkout; the existing item was not changed. |

No feature switch, purchase setting, runtime environment, pricing, checkout code, catalogue or Supabase object changed. These checks do not claim a new payment, signed-in AI reply, room-image analysis or complete order acceptance test. Existing runtime remains recorded as `b8faa4e96a3b4cea2c4393041b6e9c5152b4b8f4` on `dpl_6wMYuRjo38cURYrwQUuzbuqM4mE8`; this theme-only publication did not redeploy or freshly attest Vercel metadata.

Live proof: [hero](../artifacts/apex-specialist-20261019/hero-desktop-live.png) and [photography with enquiry/adviser/Learn more actions](../artifacts/apex-specialist-20261019/actions-desktop-live.png). Private source archives, full before/after theme backups, scoped upload list and CLI logs are in `C:/Users/hamza/curtainsuk-apex-release-20261019`. Later documentation-only protected commits do not change the serving theme or runtime identity. The following sections retain the original candidate review and release plan as historical evidence.

## Original candidate status and source

Unpublished candidate on `feat/apex-specialist-page-20261019`, based on protected `release/production` at `6e34091a8f084c069b64b19a63584dbf7e6b007d`. The owner approved the proposal, specified Learn more to the Apex homepage, then supplied the historic URL and requested retention and enhancement of useful existing content. This is preview approval scope; no theme upload, page mutation, merge, deployment, database change or feature-flag change has occurred.

The existing page is `gid://shopify/Page/85261385837`, handle `apex-window-curtains-the-challenge`, published with an empty template suffix. Shopify readback reports last update `2023-07-01T18:31:50Z`. Its current page title is `APEX WINDOW CURTAINS : THE CHALLENGE`. A public browser check confirmed the self-canonical URL and title `APEX WINDOW CURTAINS : THE CHALLENGE – CurtainsUK`. Its description is generated from the existing body, beginning “Curtains for angled windows can be a bit challenging…”. The original public page record is retained in `artifacts/apex-specialist-20261019/existing-page-record.json`.

The earlier proposed `/pages/apex-window-curtains` address was superseded by the owner's exact URL. All candidate discovery links use `/pages/apex-window-curtains-the-challenge`. Do not create a duplicate page, change the handle, redirect this established address or canonicalise it to Apex Curtains.

## Experience

The premium page includes real installation photography, four interactive window-shape choices, a four-project gallery with an accessible enlargement dialog, Natalie’s adviser portrait and existing consultation entry, a four-step project journey, native FAQ disclosures and a final enquiry feature. Content remains available without page JavaScript: all shape panels are visible and gallery links open the full photograph. Images reserve layout space, use responsive local WebP variants and load lazily below the hero. No new framework or dependency is shipped.

The three actions are:

1. Discuss my project with Apex Curtains: `https://www.apexcurtains.com/start-designing`.
2. Ask Natalie: `/pages/meet-our-team?specialist_return=natalie`.
3. Learn more: `https://www.apexcurtains.com/`.

Enquiries go to the specialist site. Natalie uses the existing signed-in, consent-based AI consultation; the page does not imply that chatting submits an enquiry. The live Natalie link was followed through the welcome into the correctly named consultation shell; no message, sign-in, consent, enquiry or order was submitted.

Discovery is added to Shop by Window, Natalie’s existing profile and Apex measuring/fitting guidance. Legacy window-grid Apex, triangular and gable links also point to the specialist page. The header is unchanged. All existing commerce, adviser, catalogue and visualiser settings are retained.

## Existing content and search continuity

The visible H1 includes “Apex window curtains”. The existing “Apex window curtains: the challenge” heading is retained as a prominent editorial section. The original introduction and concluding measurement advice are preserved verbatim. The original custom-made curtain and individual-panel advice is retained and enhanced in concise cards, alongside a clearer shaped-track explanation. The historic Apex measurement article remains linked.

The original blanket claims about any heading, flexible tracks, swivel rods and tension rods are not repeated as universally suitable specialist solutions. The revised copy explains that slope, load, fixings and opening arrangement require an individual design. This preserves the useful subject matter without promising unsuitable hardware. No ranking improvement or preservation is guaranteed; Search Console ranking/click history was not available in this task.

At release, retain the existing page title, body and SEO metafields initially, assigning only `templateSuffix: apex-specialist`. The template supplies the enhanced visible content. Preserving the body retains its current description fallback and provides an immediate rollback to the original page. Review any SEO metadata changes separately against actual search-performance evidence. Confirm the final live page has one H1, the existing self-canonical, an indexable response and correct internal links after activation.

## Photography and source claims

Seven original photographs from the owner's Apex site were converted into fourteen responsive WebP files. They were resized and EXIF-oriented, without AI generation or retouching. `artifacts/apex-specialist-20261019/asset-provenance.json` records every source URL, output dimension and size. Source pages inspected:

- https://www.apexcurtains.com/apex-curtains
- https://www.apexcurtains.com/triangular-window-curtains
- https://www.apexcurtains.com/gable-end-curtains
- https://www.apexcurtains.com/angled-window-curtains
- https://www.apexcurtains.com/gallery

The gallery links directly to the corresponding Cambridge, Cheshire, Wales and Milton Keynes project pages. Existing Natalie artwork is reused and labelled as an illustrative AI-adviser portrait. Apex advertises surveying and fitting across England and Wales; copy asks customers to confirm location and access with that team. This does not change CurtainsUK's standard supply-only motorised-track offer.

## Verification and preview

Local review: `http://127.0.0.1:4388/`. The preview renders the actual candidate Liquid and locale files in a public-site shell, with local images and page JavaScript. It is not a Shopify deployment. Shared header scripts, account and cart integrations are intentionally absent in this isolated preview; page CTAs lead to their real destinations. Preview helpers and temporary dependencies stay outside the repository.

Chrome review covered desktop (1920 and 1440 CSS pixels), tablet (768) and mobile (390), without horizontal overflow. All four shapes, keyboard activation, gallery opening, Escape closing/focus return, fitting FAQ, Natalie destination and no-page-JavaScript fallback were checked. The three action hrefs were checked in the rendered DOM. Screenshots accompany this record. This is scoped page verification, not a full-site or payment audit or physical-device acceptance.

The existing Shopify theme suite passed all 18 tests. JavaScript syntax and whitespace checks passed. All 26 changed theme files passed full-theme Shopify validation; a routes-object warning was corrected and the edited files revalidated. Source assembly contains 575 files, matching the candidate manifest. This is a candidate manifest, not a live readback. The existing stored settings SHA-256 remains `3BB8BC0C780E34939031EE83BCA41584CF973018A8EAAAC112B1027D7F45E502`.

## Scoped release and rollback

After review and required exact-head approval/checks, merge through the protected-source process, back up the current live theme and existing page record, and upload only the 26 changed theme files from the protected candidate. Assign `apex-specialist` to existing Page `85261385837`, preserving handle, publication state, title, body and SEO values. Never create a replacement page. Read back all 575 theme files and the Page record; verify canonical, indexability, responsive images, shape/gallery controls, discovery and the three action destinations. No Vercel deployment or Supabase migration is needed.

Rollback restores the five changed theme files, removes the twenty-one additions and resets this page's template suffix to its original empty value, preserving customer data and all settings. Source and live manifest must be reconciled in the protected rollback record.
