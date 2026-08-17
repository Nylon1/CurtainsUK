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

## Live/search observations

### Search/index lag exists

Search results still expose older homepage text including an `Award-Winning Specialist Curtains Company` statement, exact old price ranges, the `Takes less than a minute` CTA and older review-preview identities. Those strings are not present in the current corresponding repository components after Phase 8 hardening. This is therefore being treated as stale indexed/cached content rather than reintroduced repository content.

Action: allow recrawl after production deployment and verify again before assuming an implementation regression.

### Legacy URLs are still discoverable in search

Search results still surface older URLs and content from the previous site, including:

- `/curtains-in-birmingham/`
- `/wave-pleat-curtains-on-apex-windows-elegant-solutions-for-modern-homes/`
- `/our-price-promise/`

The current application no longer has equivalent standalone content for those legacy pages. Permanent redirects are therefore added to the closest current canonical destinations:

- Birmingham legacy page → `/areas/birmingham`
- old wave-pleat article → `/curtain-headings`
- old price-promise page → `/get-curtain-quote`

This gives search engines a clear consolidation path instead of leaving stale indexed URLs to decay into 404s or old cached results.

### Apex blinds conflict found

Search results still expose a much older electric-blinds page containing specific motor, smart-home, warranty, dimensions and installation claims. The current repository already had a newer `/apex-blinds` page, but it still described blinds and motorised control too positively compared with the current business position.

Action: rebuild `/apex-blinds` around the current service position: curtains are the preferred solution for difficult apex/triangular/gable-end glazing; electric shaped blinds are not promoted as a standard Apex Curtains service; visitors can still ask for guidance on the trade-offs.

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
- Start Designing permits photo upload to be skipped and emits conversion events for journey and successful lead completion.
- City pages retain the owner-confirmed local representative/locality model while local project evidence is only shown when stored gallery location data matches.
- The canonical host is `www.apexcurtains.com`, with a permanent non-www → www redirect in Next configuration.

## Original-audit close-out status

### Fixed / materially remediated

- Canonical host inconsistency and homepage-canonical inheritance.
- Sitemap broken route/image issues and omitted important public routes.
- Public admin indexability and anonymous admin access path.
- Advice-route duplication and known measurement/pricing duplicates.
- Gallery crawlability and detail-page metadata/schema.
- Local representative schema connection and local-area internal architecture.
- Curated review presentation and separation of customer feedback from project proof.
- Paid-TV wording so it does not imply editorial endorsement.
- Former heavy homepage autoplay video.
- Authority hubs for tracks, solutions, headings, fabrics, linings, accessories and specification journey.
- Duplicate flagship FAQ schema output.
- Arbitrary `nearby city` linking.
- Major homepage image delivery and deferred below-the-fold quiz work.
- Core conversion events around the quote/design journey.

### Partially fixed / requires production recrawl confirmation

- Stale search snippets and legacy cached pages: implementation is being consolidated, but search-engine refresh timing is external.
- Full live crawl comparison: current search/web tooling can verify representative pages but does not replace a complete production crawler run.
- Core Web Vitals: repository risk has been reduced, but field data should be monitored after deployment rather than inferred from code alone.
- Conversion analytics: browser events are emitted, but downstream analytics collection depends on the configured production analytics layer.

### Still operational / ongoing rather than a one-off fix

- Add more real gallery projects and local project evidence as genuine records become available.
- Expand advice only where search demand and unique evidence justify a new page.
- Monitor Search Console indexing, queries, CWV and stale legacy URLs after recrawl.

## Remaining Phase 8 checks

1. Recheck representative production routes after the final Phase 8 deployment.
2. Verify admin routes remain protected and noindex.
3. Compare sitemap URLs with canonical destinations and redirect-only routes.
4. Spot-check schema graphs for duplicate FAQ/entity output.
5. Confirm production conversion events can be observed by the configured analytics layer when present.
6. Monitor whether stale non-www and legacy URLs fall out of the index after permanent redirects and recrawl.

## Phase 8 status

In progress. Repository hardening and legacy-URL consolidation are now implemented on `seo/phase-8-live-verification`; final CI and production recrawl verification follow before close-out.
