# Apex Professional Platform — Persistence & Permissions

## Purpose

The Professional Platform now has a real persistence foundation in the existing `apex-curtains-cms` Supabase project. The UI remains a prototype until authentication, project creation and live project views are wired to this model.

The database is deliberately structured around project evidence and provenance rather than a single free-text specification. This keeps confirmed project information, design-team preferences, Apex preliminary recommendations and unresolved items visibly distinct.

## Core tables

- `professional_projects`
- `professional_project_members`
- `professional_project_apertures`
- `professional_project_documents`
- `professional_project_spec_items`
- `professional_project_risks`
- `professional_project_actions`

## Project record

A project carries a stable reference, name, client/project-team context, project stage and workflow status. It is the parent record for every aperture, document, specification item, risk and action.

## Aperture register

Each opening gets its own record so difficult glazing can be coordinated opening-by-opening. The register can hold:

- room / opening reference
- window type
- width, left/right heights and peak height
- preliminary track route
- ceiling / wall / recess fixing position
- fixing substrate
- operation
- stack-back requirement
- clear-opening requirement
- evidence status and provenance

Dimensions are not treated as manufacture-ready merely because they exist in the database.

## Provenance

Every aperture/specification decision can be labelled as one of:

1. `confirmed_project_information`
2. `design_team_preference`
3. `apex_preliminary_recommendation`
4. `unresolved`

This is a core product rule. Future AI-assisted review must never silently promote an inference or preliminary recommendation into confirmed project information.

## Documents

Documents are registered by type and revision, including GA plans, RCPs, elevations, sections, window schedules, photos, surveys and manufacturer data. Each document can be marked `for_review`, `usable`, `superseded` or `insufficient`.

The platform does not yet claim automatic drawing interpretation. A future document-analysis layer must retain document revision, source and confidence/provenance.

## Risks / RFIs / actions

Risks and actions are first-class records rather than notes embedded in a project description. Typical risks include:

- fixing substrate not confirmed
- track route clashes with services
- aperture geometry incomplete
- curtain stack conflicts with required clear opening
- textile weight not confirmed against selected track system
- access method unresolved
- construction dimensions still subject to change

Actions support `action`, `rfi`, `approval`, `survey`, `installation` and `handover` types.

## Permission model

Row Level Security is enabled on every Professional Platform table.

Access is project-scoped. A signed-in user can see a project only when they created it or have an entry in `professional_project_members`.

Project creator permissions currently control membership management and project deletion. Project members can operate on aperture, document, specification, risk and action records through project-scoped RLS.

The membership helper is implemented in a non-exposed `private` schema so it can support RLS without becoming a public RPC endpoint.

## Current migration state

Supabase migrations applied to `apex-curtains-cms`:

- `professional_platform_v1`
- `professional_platform_security_hardening`

The security hardening moved the RLS membership helper from `public` to `private` after Supabase security linting flagged the original SECURITY DEFINER function as externally callable.

## Application data layer

`lib/professional-platform/server.ts` provides server-only authenticated reads for:

- project lists
- project detail
- aperture register
- specification items
- risks
- actions
- documents

RLS remains the final database boundary; application checks are not a substitute for it.

## Next implementation step

1. Add professional authentication / invitation flow.
2. Wire new-project creation to `professional_projects` and owner membership.
3. Replace demo workspace cards with live project data for authenticated users.
4. Add aperture create/edit workflow.
5. Add document registration/upload storage with revision handling.
6. Add controlled preliminary specification export that prints provenance and unresolved items.
7. Only then introduce AI-assisted document/project review.
