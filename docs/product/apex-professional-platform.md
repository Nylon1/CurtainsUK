# Apex Professional Platform

## Purpose

Move Apex Curtains beyond a specialist curtain website into a project-intelligence and specification platform for complex architectural glazing.

The platform serves interior designers, architects, developers, housebuilders, contractors, fit-out teams and Apex project staff through one shared project record.

## Core proposition

Apex Curtains helps project teams resolve the interface between:

- aperture geometry
- curtain track system
- fixing substrate and build-up
- textile specification
- heading and fullness
- stack-back and clear opening
- installation access and sequencing
- survey, manufacture, installation, snagging and handover

The platform should support professional decision-making without pretending to replace detailed design, structural advice, manufacturer-specific engineering data or final site survey.

## V1 modules

### 1. Professional Project Workspace

Each project has a persistent record with:

- project name/reference
- client/professional role
- project stage
- site location
- project contacts
- number of apertures / plots / repeated window types
- target survey / approval / manufacture / install dates
- notes and status

The workspace becomes the parent record for drawings, aperture data, design decisions, risks, actions and specification outputs.

### 2. Drawing & Photo Project Review

The project team can upload or reference:

- GA plans
- reflected ceiling plans
- elevations
- sections
- window schedules
- photographs
- sketches
- marked-up details

The review workflow should extract or request the key information needed for curtain specification:

- aperture geometry
- peak/apex height
- side heights
- width
- ceiling line
- recess depth
- wall returns
- adjacent joinery
- proposed track route
- available fixing zone
- substrate / build-up
- services or obstructions
- installation height
- access constraints

V1 can be manual/simulated in the UI. Do not claim automatic drawing interpretation until a real extraction layer exists.

### 3. Preliminary Specification Brief

Generate a structured, clearly labelled preliminary brief containing only confirmed project inputs and qualified recommendations.

Sections:

- project summary
- glazing / aperture type
- geometry summary
- proposed curtain treatment
- track route and fixing interface
- heading and fullness
- face fabric / lining / interlining status
- finished drop / floor relationship
- stack-back and clear-opening requirement
- operation requirement
- access methodology considerations
- unresolved information / RFIs
- next actions

Every output must distinguish:

- confirmed information
- client/design-team preference
- Apex preliminary recommendation
- unresolved item requiring survey, manufacturer data or project-team confirmation

## Data model direction

### projects
- id
- name
- reference
- client_name
- professional_role
- project_stage
- location
- status
- survey_target
- install_target
- created_at
- updated_at

### project_contacts
- id
- project_id
- name
- role
- organisation
- email
- phone

### apertures
- id
- project_id
- reference
- room
- type
- width_mm
- peak_height_mm
- left_height_mm
- right_height_mm
- recess_depth_mm
- installation_height_mm
- notes

### project_documents
- id
- project_id
- type
- title
- file_url
- revision
- status

### specification_items
- id
- project_id
- aperture_id
- category
- field
- value
- provenance
- confidence
- status

`provenance` should support values such as `drawing`, `site_photo`, `client_input`, `designer_input`, `apex_review`, `survey`, `manufacturer_data`.

### project_risks
- id
- project_id
- aperture_id
- category
- description
- status
- owner
- resolution

### project_actions
- id
- project_id
- title
- owner
- due_date
- status

## Workflow

1. Create project
2. Identify professional role and project stage
3. Add drawings/photos/project information
4. Create aperture records
5. Capture geometry and interface data
6. Record design intent
7. Flag missing information and risks
8. Produce preliminary specification brief
9. Review with project team
10. Update after survey / confirmed manufacturer data
11. Approve final project specification
12. Coordinate installation
13. Record snagging / handover
14. Convert completed project into evidence/case-study data where consent allows

## Product moat

The long-term moat is not the UI. It is the structured knowledge accumulated across real complex-window projects:

`geometry -> fixing context -> track strategy -> textile specification -> installation method -> outcome`

Over time that can improve project triage, specification consistency, risk detection, project search, professional guidance and AEO authority.

## Guardrails

- Never infer structural suitability from a photo alone.
- Never invent track load capacities or fixing requirements.
- Never present preliminary recommendations as final specification.
- Manufacturer-specific limits must come from current manufacturer technical data.
- Site dimensions used for manufacture must come from an agreed survey/approval process.
- Keep professional/client project data private and separated from public case-study content.
- Public project evidence must use only information approved for publication.

## V1 UX

Start with a premium professional workspace under `/professionals/workspace`.

Initial screens:

- Workspace dashboard
- New project intake
- Project overview
- Aperture register
- Drawings & photos
- Specification brief
- Risks / RFIs / actions

Use simulated project data first, but structure components around the future persistent data model so Supabase can be connected without redesigning the product.

## Success criteria

V1 should make an architect or interior designer immediately understand that Apex can engage before installation and help coordinate the curtain package through the project lifecycle.

It should also make Apex staff faster and more consistent by giving every complex project one structured record rather than scattered emails, drawings, WhatsApp messages and notes.
