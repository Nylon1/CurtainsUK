# Phase 9 — National authority growth

Date: 17 August 2026

## Goal

Move Apex Curtains from remediation into evidence-led national growth. The objective is not to create the most pages. It is to become the clearest UK specialist resource for curtains and track systems on difficult architectural glazing.

## Growth principles

- Build around real homeowner questions and real project evidence.
- Prefer strong topic hubs and comparison pages over thin synonym pages.
- Keep every technical and performance claim proportional to the evidence available.
- Connect informational pages to window types, specification choices, installation method, projects, service areas and the enquiry journey.
- Use real gallery projects as the strongest proof layer and expand them as new completed installations are added.
- Avoid invented awards, years of experience, installation counts, guarantees or exact performance figures.
- Preserve owner-confirmed facts: selected real reviews, genuine local representation and confirmed paid television advertising.

## Search landscape observations

The current search landscape contains specialist competitors focused on shaped blinds and regional bespoke soft furnishings. This gives Apex Curtains a clearer position to own: architectural curtains plus specialist tracking, specification guidance and nationwide project support rather than trying to imitate blind-manufacturer claims.

Search results also continue to expose stale legacy Apex Curtains URLs and old dynamic advice content. Phase 9 therefore strengthens canonical authority by redirecting risky or superseded legacy advice URLs to maintained topic hubs.

## Phase 9 implementation

### 1. Curtains-vs-blinds decision authority

The existing `/apex-blinds` route is retained rather than creating a competing new URL. It is rebuilt as the definitive curtains-vs-shaped-blinds comparison page covering:

- architectural shape
- design flexibility
- light control
- operation
- servicing
- visual effect
- current Apex Curtains service position
- direct FAQs with matching FAQ structured data
- links into tracks, linings, headings, fabrics, flagship window types, gallery proof and the design journey

### 2. Legacy authority consolidation

Permanent redirects added:

- `/meetarlo` → `/arlo-curtain-advisor`
- `/advice/what-curtain-track-is-best-for-apex-windows` → `/curtain-tracks`
- `/advice/can-you-put-curtains-on-angled-windows` → `/apex-curtains`

The redirected dynamic advice slugs are excluded from the advice sitemap so Google is not simultaneously invited to crawl URLs that now consolidate elsewhere.

## Next growth work after this PR

1. Use Search Console queries to identify pages already ranking in positions roughly 5–30 and improve those before creating more content.
2. Expand real gallery case studies with only stored/confirmed project facts: window type, location, room, heading, lining, challenge, solution and result.
3. Build answer-first improvements around the highest-value homeowner questions where the site already has authority: cost, blackout, measuring, track routing, tall-window installation, curtains vs blinds, thermal comfort and stack-back.
4. Add stronger project-to-city and project-to-window-type relationships only when the underlying project data supports them.
5. Review dynamic advice posts periodically so older editorial content cannot outrank or contradict maintained authority hubs.

## Success standard

Phase 9 is successful when the site has fewer competing internal answers, stronger maintained authority pages, cleaner sitemap/canonical signals and a growth backlog driven by real query and project evidence rather than page volume.
