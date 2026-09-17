# Approved HCI presentation source

This is a recoverable source mirror of the approved HCI presentation at
`Nylon1/Hybrid-Curtain-Intelligence@6963feb3d3e85e80b759cd2e3cc5a505e8a80960`.

The authoritative source remains HCI. `source-manifest.json` records the original
SHA-256 (UTF-8/LF) for each file. The analysis, first-colour reveal, Room Palette, guided
colour controls, presentation vocabulary, styles and their transitive pure
dependencies are copied without code changes (line-ending normalization is allowed). Tests enforce that parity. The pure
dependencies supply the existing types/selectors; CurtainsUK does not run a new
extractor or recommendation engine here.

Only two source files have integration adjustments:

- `ReferencePalette.tsx`: an optional request transport and initial session
  palette, configurable existing upload limit (CurtainsUK: 2 MB), and disabling
  the local-tool localStorage/resume route when using the hosted session.
- `ReferenceExperience.tsx`: truthful protected-hosted privacy wording, retaining
  the approved markup and styles.

The parent CurtainsUK component translates those requests into the existing
same-origin gateway envelope. It tracks the successful CAS request revision
because the existing gateway public projection omits it; it preserves the exact
request on retry and does not advance on errors. No gateway, security, storage,
analysis or recommendation implementation is changed.

The approved living-room image and linked Design Library pages are retained in
`public/reference-experience/` and `app/learn/`. Guide return links point back to
the integrated consultation.

Do not independently redesign these mirrored components. Reconcile subsequent
presentation changes from authoritative HCI source and update the manifest.
