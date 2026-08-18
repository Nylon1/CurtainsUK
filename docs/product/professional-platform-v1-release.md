# Apex Professional Platform — V1 Release Record

## Release intent

V1 establishes a dependable professional project-control layer for complex architectural curtain and track work. It is designed to give architects, interior designers, developers, housebuilders, contractors, fit-out teams and Apex project staff one controlled record from early project information through handover.

## What is included

- authenticated professional workspace
- persistent project records
- project-scoped memberships and invitations
- Row Level Security across operational data
- aperture register with revision history and provenance
- private project evidence storage with secure signed retrieval links
- drawing/document revision registration and evidence-status control
- document superseding while retaining audit history
- live RFIs/actions with responsibility, priority, due dates and completion
- risk register with resolve/accept controls
- project programme targets for survey, design freeze, manufacture release and installation
- specification items with provenance, source-document linkage and revision history
- controlled export register with preliminary, issued and superseded states
- reusable project templates for repeat housebuilder/developer, architect and contractor/fit-out work
- handover/close-out checklist
- project activity timeline

## Core control rule

The platform must preserve the distinction between:

- confirmed project information
- design-team preference
- Apex preliminary recommendation
- unresolved information

No field becomes manufacture-ready, structurally approved or technically confirmed merely because it exists in the database.

## Release guardrails

- No automatic drawing interpretation is claimed.
- No structural suitability is inferred from images or project notes alone.
- Manufacturer limits remain dependent on current manufacturer technical data.
- Manufacture dimensions still require the agreed survey/approval process.
- Superseded evidence is retained by default for auditability.
- Permanent evidence deletion must be an explicit authorised retention action.
- Controlled exports retain unresolved RFIs, risks, evidence status and provenance.
- Public case-study use remains separate from private project records and requires appropriate publication approval.

## AI decision

AI is not part of V1. The platform has deliberately been completed as a controlled operational record first. Any future AI layer should be advisory only: it may surface missing information, compare revisions, summarise evidence or suggest RFIs, but it must not silently change confirmed geometry, specification, evidence status, approvals or release state.

## Operational release checklist

Before broader professional rollout:

1. Confirm authorised professional accounts and invitation process.
2. Confirm Supabase production environment variables and storage permissions in deployment.
3. Test owner and invited-member access against two separate user accounts.
4. Test project isolation between unrelated users.
5. Upload, open and supersede a real non-sensitive test drawing.
6. Create and edit an aperture and confirm revision history.
7. Create a specification item and confirm revision history/source linkage.
8. Raise, assign and complete an RFI/action.
9. Resolve/accept a risk and confirm activity history.
10. Create, issue and supersede a controlled export.
11. Complete a handover checklist and print the close-out record.
12. Confirm all workspace routes remain noindex and private data is absent from public sitemap/search surfaces.

## V1 product position

Apex Professional Platform is the project-control layer that connects:

`geometry -> fixing context -> track strategy -> textile specification -> installation method -> outcome`

The moat is the controlled structured record of real complex-window project decisions, evidence, revisions and outcomes — not a generic chatbot or a collection of static forms.
