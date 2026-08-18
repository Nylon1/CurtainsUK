# Apex Professional Platform — Persistence & Permissions

## Purpose

The Professional Platform now has a real persistence and collaboration foundation in the existing `apex-curtains-cms` Supabase project. The platform is deliberately evidence-led: confirmed project information, design-team preferences, Apex preliminary recommendations and unresolved items remain distinct throughout the project lifecycle.

## Core operational model

The platform records projects, project members and invitations, apertures and aperture revisions, documents, specification items and specification revisions, risks, actions and controlled exports.

The design loop remains:

`geometry -> fixing context -> track strategy -> textile specification -> installation method -> outcome`

## Provenance rule

Project information must retain one of four provenance states:

1. `confirmed_project_information`
2. `design_team_preference`
3. `apex_preliminary_recommendation`
4. `unresolved`

A preliminary recommendation must never be silently promoted to confirmed information.

## Aperture control

Each opening is recorded independently with geometry, room/opening reference, window type, fixing position/substrate, track route, operation, stack-back, clear-opening requirement, status and provenance. Aperture edits create immutable revision snapshots rather than erasing prior project history.

## Documents & private storage

Project files can now be uploaded into the private Supabase Storage bucket `professional-project-files`. Object paths are project-scoped and Storage RLS checks project membership before select, insert, update or delete.

The document register still supports external controlled sources. Each registered document retains type, revision, evidence status, provenance and issue date. Uploading a file does not make it manufacture-ready or technically approved.

## Specification register

Specification items are editable but controlled. Every insert/update is snapshotted into `professional_project_spec_revisions`, creating a revision history for track, heading, textile, lining, fixing and other specification decisions.

The item itself carries status, provenance and optional source-document linkage. This lets the team distinguish, for example, a design-team preference from an Apex preliminary recommendation or a confirmed project requirement.

## Collaboration

Project creators can manage project members and tokenised invitations. Invitation tokens are not stored in plaintext; only token hashes are persisted. Acceptance requires an authenticated account using the invited email address and grants access only to the relevant project.

## Risks, RFIs & actions

Risks and actions are first-class project records. Actions can be completed and risks can be resolved or explicitly accepted. These changes remain visible in the operational project record.

## Activity timeline

The live platform now exposes a chronological activity view built from project creation, aperture updates, document registrations, specification revisions, actions, risk closures and controlled exports. This is intended to become the human-readable audit trail for project coordination.

## Controlled exports

Controlled exports remain versioned project snapshots. Their purpose is to freeze a known coordination state while retaining unresolved evidence, provenance, open risks and RFIs rather than presenting an artificially clean specification.

## Security boundary

Row Level Security is enabled across the Professional Platform data model. Access is project-scoped via membership. RLS helper functions are kept in the non-exposed `private` schema. Private project file storage uses the same project-membership boundary.

## Supabase migrations applied

- `professional_platform_v1`
- `professional_platform_security_hardening`
- `professional_platform_collaboration_control`
- `professional_platform_invitation_acceptance`
- `professional_platform_collaboration_control_notes`
- `professional_platform_documents_specs_activity`
- `professional_platform_storage_constraints`

## AI position

The AI layer is intentionally deferred.

The priority is to make the underlying project record, evidence control, revision history, permissions and specification workflow reliable first. No automated drawing interpretation, AI engineering approval, AI manufacture release or hidden inference is part of the current build.

If an AI-assisted layer is considered later, it must operate on top of this provenance model and may propose or flag information, but it must not silently change confirmed project data.

## Next non-AI implementation priorities

1. Connect the new specification register and activity timeline more prominently throughout the project navigation.
2. Add richer file revision/supersede controls and secure file download links.
3. Add action ownership/assignment and due-date views.
4. Add formal issue/supersede workflow for controlled exports.
5. Add project templates for repeated window types, plots and design-team workflows.
6. Improve account provisioning/invitation delivery without opening public self-registration.
