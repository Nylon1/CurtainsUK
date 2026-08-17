# Phase 8 — Live-site verification and SEO hardening

Date: 17 August 2026

## Purpose

Phase 8 is a close-out pass after the SEO/AEO remediation phases. It compares the current repository state with what search engines and the live site are exposing, then hardens any remaining claims or implementation details before the project moves into ongoing growth work.

## Verification principles

- Treat the current `main` branch as the implementation source of truth.
- Treat live/search-engine output as a deployment/indexing observation, not as proof that cached content matches the current repository.
- Do not invent awards, credentials, project counts, pricing, local project evidence or technical performance claims.
- Preserve owner-confirmed facts: local representatives/locality information, the selected real reviews, and confirmed paid TV advertising.
- Keep performance statements cautious where the result depends on fabric, lining, window geometry, installation or room conditions.

## Initial live/search observations

### Search/index lag exists

Search results still expose older homepage text including an `Award-Winning Specialist Curtains Company` statement and older review-preview identities. Those strings are not present in the current homepage entry component or current review-preview component. This is therefore being treated as stale indexed/cached content rather than reintroduced repository content.

Action: allow recrawl after production deployment and verify again before assuming an implementation regression.

### Homepage claim hardening

The current repository still contained exact homepage `Typical range` figures for five window categories. These figures did not have a sufficiently explicit evidence source attached to the homepage component and could be interpreted as stable price guidance across highly variable bespoke projects.

Action: remove the exact ranges from the homepage explorer and replace them with a project-specific pricing explanation.

The homepage also stated `Takes less than a minute` beside a multi-step design enquiry. Phase 7 intentionally preserved a detailed journey, so a fixed completion-time promise is unnecessary and may not be accurate for every visitor.

Action: replace with `Guided project enquiry • No obligation`.

### Specialist positioning language

The homepage stated that `Most curtain systems fail on angled and architectural glazing.` This is broader than the evidence needed to establish specialist positioning.

Action: replace it with the more defensible statement that standard off-the-shelf systems are often unsuitable, and explain the actual planning variables: track routing, curtain specification, fixing, weight, stack-back, access and room requirements.

## Already verified in the repository

- Current homepage review preview does not generate customer identities; it sends visitors to the curated review set and project evidence.
- Current entry screen uses a lightweight poster image rather than the former large autoplay video.
- Phase 7 has `next/image` delivery for key homepage hero/gallery imagery and defers the large below-the-fold fabric quiz.
- Start Designing now permits photo upload to be skipped and emits conversion events for journey and successful lead completion.
- City pages retain the owner-confirmed local representative/locality model while local project evidence is only shown when stored gallery location data matches.

## Remaining Phase 8 checks

1. Verify production robots and sitemap after the latest deployment is visible.
2. Recheck homepage, representative city pages, design guide, quote journey, gallery and advice routes after deployment/cache refresh.
3. Verify admin routes remain protected and noindex.
4. Compare sitemap URLs with canonical destinations and redirect-only routes.
5. Spot-check schema graphs for duplicate FAQ/entity output.
6. Review remaining homepage and flagship copy for unsupported absolutes, exact counts or inferred evidence.
7. Confirm production conversion events can be observed by the configured analytics layer when present.
8. Record each original audit issue as fixed, partially fixed or still open.

## Phase 8 status

In progress. The first hardening changes are committed on `seo/phase-8-live-verification`. Production/search-engine recrawl verification follows after deployment of the final Phase 8 changes.
