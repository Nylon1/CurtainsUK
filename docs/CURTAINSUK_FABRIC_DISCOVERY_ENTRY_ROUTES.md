# Phase 6 — Fabric discovery entry routes

## Implemented in unpublished Dawn / private staging

One reusable Dawn snippet presents three choices on the homepage and Fabric Library:

1. **Browse fabrics myself** — direct anchor into the existing full library search and filters. No HCI dependency.
2. **Match fabrics to my room** — optional reference-image step first, then the existing consultation.
3. **Help me choose** — existing guided consultation first. Before requesting recommendations, offer **Have something you’d like us to match with?** and **Skip — show my recommendations**.

The same consultation endpoint, opaque session ID, revision, profile summary, recommendation contract and reaction commands serve both assisted routes. No ranking or question-selection logic was copied into CurtainsUK. Questions continue to come from HCI; CurtainsUK does not infer answers from a preview image or suppress questions on that basis.

The existing maximum-five shortlist retains genuine catalogue imagery, exact Fabric Master identity, brand/design/colour, explanations, sample/configuration actions and Love/Like/Not sure/Dislike feedback. We did not invent “best tonal” or similar labels without HCI evidence. Recommendation-derived fabric and consultation identities continue through the existing sample/configuration context. Window context now survives the assisted-route sign-in, including Bay; only allowlisted local consultation destinations and entry/window parameters are retained.

Discovery choices are hidden on an exact fabric detail page. The original catalogue, pricing, stock, shipping, bonded-lining and Draft Order logic is unchanged. Specialist review evidence remains email-based and is unrelated to this optional inspiration UI.

## Explicitly blocked: image evidence and HCI activation

**This is the discovery UX and reference-preview implementation, not completed image-assisted recommendations.** The inspected HCI repository has no customer reference-image ingestion/analysis API. Its current integration release manifest remains BLOCKED. No HCI service was deployed, no quality gate changed, and no customer recommendation access was enabled.

The internal reference UI supports room, paint, sofa/upholstery, wallpaper, rug, existing fabric, flooring and moodboard. It accepts JPG/PNG/WebP up to 8 MB, checks decoded dimensions against 25 megapixels, and shows a local object-URL preview. It rejects unsupported/unreadable images without blocking Skip. Object URLs are revoked when removed, skipped or the page is left. No file bytes, filenames, image classification or image metadata enter local storage, Git, an API request or a profile. Only the consultation ID and whether the optional step was completed may be retained for resuming. The UI explicitly states that the image has **not** been uploaded or analysed and will **not** influence recommendations.

Remaining HCI work before this can operate as requested:

- Provide an authenticated reference-image ingestion contract tied to the existing canonical session/profile, with appropriate private handling and deletion rules.
- Convert image analysis into provenance/confidence-bearing evidence through HCI's existing model, for either entry order. Do not create a second recommendation engine or let CurtainsUK manufacture inferred attributes.
- Have HCI use reliable evidence to choose useful unanswered questions. This cannot be claimed or tested against a local image preview.
- Pass the human recommendation-quality gate and hosted service-contract checks before enabling assisted customer recommendations.

Until then, the Fabric Library is operational, the image preview is optional, and attempting to continue into hosted HCI returns its existing honest unavailable state.

## Validation

- **138 storefront tests PASS**, including shared-session image-first/skip and guided/optional-image/skip tests, invalid-file non-blocking behaviour, request privacy and safe sign-in return context. The guided end-of-consultation test uses a bounded presentation fixture; it is not a claim of live HCI analysis or quality approval.
- TypeScript and staging build checked. Existing HCI boundary, quality gate, exact-identity projection and theme tests remain green.
- Remote unpublished theme confirmed as `182264234363`; Minimal `79650455661` remains live and was not modified.
- Desktop 1440 px and mobile 390/412 px: three choices, direct library search, exact `sdg-dapgpa203` detail, sample/Make Curtains actions, optional file selection, local preview, skip, and disabled HCI state inspected. A genuine already-approved Shopify-hosted fabric image was used as the non-personal preview fixture. No customer image was uploaded.
- Screenshots: `artifacts/phase6-discovery/choices-desktop.png`, `choices-mobile.png`, `reference-desktop.png`, `reference-mobile.png`, `reference-preview-mobile.png`.

Keep Dawn unpublished and real payments disabled. Do not describe this change as a completed image-matching engine.
