# Apex Curtains

Apex Curtains is a specialist UK curtain and track business for complex architectural glazing, including apex, triangular, gable-end, double-height and other difficult window forms.

## Current product direction

Alongside the public SEO/AEO authority site, the repository now contains the **Apex Professional Platform**: a private project-intelligence and specification workspace for architects, interior designers, developers, housebuilders, contractors, fit-out teams and Apex project staff.

The platform follows the project chain:

`geometry -> fixing context -> track strategy -> textile specification -> installation method -> outcome`

### Professional Platform V1

V1 now covers:

- authenticated, project-scoped professional workspaces
- persistent project records and project-team access
- aperture registers with revision history and provenance
- private evidence storage and secure document retrieval
- document revision/evidence-status control and superseding
- RFIs, actions, responsibility, priority and due dates
- risk controls
- project programme targets
- specification items with source linkage and revision history
- versioned controlled exports with preliminary / issued / superseded states
- repeat-project templates for housebuilders, developers, architects and fit-out teams
- handover / close-out controls
- project activity history

The V1 release record is maintained in `docs/product/professional-platform-v1-release.md`.

The AI layer is intentionally deferred. Any future AI capability should act as a non-authoritative reviewer over the controlled project record and must never silently change confirmed project information, evidence status, specification or approval state.

## SEO foundation

The site uses a www canonical origin, split XML sitemap index, structured authority hubs, specialist window-type pages, project evidence, professional/specifier routes, local service architecture and evidence-led answer blocks.

## Validation

Run:

```bash
npm run seo:check
npm run build
npm run lint
```
