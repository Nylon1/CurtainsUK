# Jane monitoring verification, 11 October 2026

Read-only evidence. No hosted indexing or new job was performed.

- `monitoring-evidence.json`: sanitized backup status, metric timestamps/cache findings, point-in-time capacities and the owner's recovery/24-hour decision. Raw responses remain encrypted outside Git.
- `hosted-preflight.json`: project state, bounded SQL counts, historical checkpoint and existing grants.
- `tests.json` and `*-checks.log`: 138 passing local checks, comprising 129 existing checks and nine telemetry checks. After the serial run the final mounted-disk guard was tested by rerunning the telemetry suite.
- `migration-bundle.json`: unchanged migration fixture for local tests, not a new migration or approval.
- `index-performance.json` and `multi-instance.json`: synthetic local test evidence, not hosted measurements.
- `changed-files.txt` and `quality-checks.json`: exact current scope and validation.

The newest listed backup predates advisory writes. Observed distinct metrics samples span 68.18 seconds, beyond the unchanged 60-second gate. Repeated/cached snapshots are rejected. See `docs/specialist-advisory/JANE_MONITORING_PREFLIGHT.md` for admission requirements.
