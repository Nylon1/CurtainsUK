# Approved source merge — 9 October 2026

The owner requested merging all changes after reviewing the four rooms and curtain-detail follow-up. The merge contains the complete `experiments/room-visualiser-2` implementation, assets, provenance, review tooling and dated reports, including the initial Living Room prototype.

Included: Living Room with L-shaped seating and retained fireplace; Bedroom and fitted wardrobe; Lounge and TV; Office and right-hand armchair; profile-specific PVC windows and supplied outdoor views; ambience/lamp/fire controls; shared fabric-detail shading/filtering; startup/shader preparation improvements; desktop/narrow review tooling and performance evidence summaries.

## Source merge, without customer activation

This directory remains a local experiment. The production runtime, asset pack, customer routes, Shopify theme, catalogue assignments and package files are unchanged. Its in-memory `viewer-bridge.mjs` and lighting hook are used only by the loopback server. Merging these sources does **not** activate the new rooms on the customer website.

Production integration and deployment are separate work. They must retain the frozen curtain geometry, normals, UVs, physical dimensions, repeat/scaling logic, source artwork, motion, assignments and automatic renderer routing for all 11,003 supported fabrics.

Target: protected `Nylon1/CurtainsUK:release/production`, base `a83b38fd8f71b967e51ebe0173603df7c29b87d3`. Required checks are `curtainsuk-production-gate` and `protected-production-policy`; no branch-protection bypass or policy modification is included. The deployment workflow is manual and the production Vercel project is absent from the connected Git-project list at preflight.

## Review and verification

- [Fabric-detail implementation](FABRIC-DETAIL-RESULTS.md) and [repeated GPU follow-up](FABRIC-EFFICIENCY-RESULTS.md).
- Six prototype and ten frozen-runtime tests passed in the final refinement follow-up. Browser checks cover all four rooms, both profiles, desktop/narrow, palettes, motion, switching, neutral Inspection, before/after comparisons and representative plain/fine-pattern fabrics.
- The conditional shader candidate was rejected; the approved material implementation is retained.
- Last matched fresh-process desktop STANDARD Living Room full-navigation medians: 4.88 s refined versus 5.10 s preceding material. This is local-loopback evidence, not a customer-network guarantee. Physical iPhone testing remains outstanding.
- Local screenshot galleries and measurement files are retained outside Git under `C:/Users/hamza/curtainsuk-visualiser-2-*-evidence-*`. The review generators currently reference that workspace; these evidence directories are required to recreate the complete local gallery. No existing evidence or worktree is deleted by this merge.

The downloaded CC0 originals and unused investigation assets remain for provenance and reproducibility; only the active resources documented in [SOURCES.md](SOURCES.md) are requested by the local viewer. HDR/photo/model files retain their original bytes. Dated reports describe their historical unmerged state; this file records the later authorization to merge.
