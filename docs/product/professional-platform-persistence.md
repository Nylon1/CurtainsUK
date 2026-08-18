# Apex Professional Platform — Persistence, Permissions & Control

## Purpose

The Professional Platform now has a real persistence foundation in the existing `apex-curtains-cms` Supabase project. Authenticated project creation, live project views, aperture intake, evidence registration and RFI/action workflows are wired to this model.

The database is deliberately structured around project evidence and provenance rather than a single free-text specification. This keeps confirmed project information, design-team preferences, Apex preliminary recommendations and unresolved items visibly distinct.

## Core tables

- `professional_projects`
- `professional_project_members`
- `professional_project_invitations`
- `professional_project_apertures`
- `professional_project_aperture_revisions`
- `professional_project_documents`
- `professional_project_spec_items`
- `professional_project_risks`
- `professional_project_actions`
- `professional_project_exports`

## Project record

A project carries a stable reference, name, client/project-team context, project stage and workflow status. It is the parent record for every aperture, document, specification item, risk, action, member, invitation and controlled export.

## Aperture register & revision history

Each opening gets its own record so difficult glazing can be coordinated opening-by-opening. The register can hold room/opening reference, window type, width, side heights, peak height, track route, fixing position, fixing substrate, operation, stack-back requirement, clear-opening requirement, evidence status and provenance.

Every aperture insert or update now creates an immutable snapshot in `professional_project_aperture_revisions`. The live UI exposes that history rather than silently replacing the previous geometry/interface state.

Dimensions are not treated as manufacture-ready merely because they exist in the database or revision history.

## Provenance

Every aperture/specification decision can be labelled as one of:

1. `confirmed_project_information`
2. `design_team_preference`
3. `apex_preliminary_recommendation`
4. `unresolved`

This is a core product rule. Future AI-assisted review must never silently promote an inference or preliminary recommendation into confirmed project information.

## Documents

Documents are registered by type and revision, including GA plans, RCPs, elevations, sections, window schedules, photos, surveys and manufacturer data. Each document can be marked `for_review`, `usable`, `superseded` or `insufficient`.

The current operational layer registers document metadata/revisions. Real object storage and controlled file upload remain a subsequent step. The platform does not claim automatic drawing interpretation.

## Risks / RFIs / actions

Risks and actions are first-class records rather than notes embedded in a project description. Actions support `action`, `rfi`, `approval`, `survey`, `installation` and `handover` types. Live project controls now support action completion and risk resolution/acceptance while retaining the project record.

## Collaboration & invitations

Project creators can create project-scoped invitations with an explicit role and organisation. Invitation links are tokenised; only a hash is persisted. Acceptance requires an authenticated account with the same email address as the invitation.

Roles currently include architect, interior designer, developer, housebuilder, contractor, fit-out, consultant, collaborator and viewer.

The current invitation flow assumes an authorised Supabase account already exists for the recipient. Automated account provisioning/email delivery is intentionally not claimed yet.

## Permission model

Row Level Security is enabled on every Professional Platform operational/control table.

Access is project-scoped. A signed-in user can see a project only when they created it or have an entry in `professional_project_members`.

Project creators control invitation creation and membership management. Invitees can add themselves only when their authenticated email matches a valid pending project invitation and the inserted role matches that invitation. A private trigger then marks the invitation accepted.

The membership helper and invitation-acceptance trigger live in the non-exposed `private` schema so they can support RLS without becoming public RPC endpoints.

## Controlled exports

`professional_project_exports` stores versioned snapshots of a project state. A preliminary export freezes the project, apertures, evidence register, specification items, risks and actions at that point in time.

The export UI is intentionally explicit that these records are coordination snapshots, not manufacture approval, structural confirmation or proof of surveyed dimensions. Unresolved items remain inside the exported record.

## Current migration state

Supabase migrations applied to `apex-curtains-cms`:

- `professional_platform_v1`
- `professional_platform_security_hardening`
- `professional_platform_collaboration_control`
- `professional_platform_invitation_acceptance`
- `professional_platform_collaboration_control_notes`

The security advisor currently reports no Professional Platform-specific RLS/SECURITY DEFINER issues. The remaining warning is the separate account-level leaked-password-protection setting.

## Application data layer

`lib/professional-platform/server.ts` provides server-only authenticated reads for project lists, project detail, aperture register, aperture revision history, specification items, risks, actions, documents, collaboration records, invitations and controlled exports.

RLS remains the final database boundary; application checks are not a substitute for it.

## Next implementation step

1. Add authorised account provisioning / invitation delivery rather than link-copy only.
2. Add real document upload/storage with project-scoped object policies and revision control.
3. Add specification-item create/edit workflows and version comparison.
4. Add action assignment/ownership and richer programme tracking.
5. Add controlled export issue/supersede workflow and formal issue notes.
6. Add project activity/audit timeline across members, documents, revisions, RFIs and exports.
7. Only then introduce AI-assisted document/project review with provenance retained end-to-end.
