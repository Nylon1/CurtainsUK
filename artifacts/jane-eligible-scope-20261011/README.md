# Eligible-only scope evidence, 11 October 2026

[Implementation report and remaining prerequisites](../../docs/specialist-advisory/JANE_ELIGIBLE_POPULATION.md).

- `candidates.json` and `candidate-query.sql`: exact bounded candidate snapshot, 11,790 IDs; `candidate-query-plan.json` records existing index use.
- `shopify-sitemap.xml`, `published-profile-sitemap.xml`, `reference-identities.json`: read-only publication references. The app sitemap/reference alone is not current publication proof.
- `publication-reconciliation.json`: native Shopify sitemap read receipts, response hashes, exact identity mapping, 11,517 published candidates, 273 excluded IDs and five original eligible IDs.
- `eligible-manifest.json`, `eligible-review.json`: separate eligible snapshot, policy/source hashes, proposed first 120 IDs and execution blockers. These are not executed SQL or blanket proof of order readiness.
- `visualiser-overlap.json`: 10,757-ID overlap with the 11,003 released calibration references. Renderer/catalogue behavior unchanged.
- `hosted-preflight.json`, `hosted-policy-metadata.json`, `commercial-policy.json`, `final-hosted-readback.json`: read-only hosted metadata and preserved old job.
- `live-retail-sample.json`: discontinued identity rejected; current sample price/order checks, no purchase card for unavailable examples.
- `tests.json` and `*-checks.log`: **122 local tests pass**. Migration bundle/object files and performance/multi-instance files are synthetic local fixtures, not a new hosted migration or index population.

Dashboard observed 11 October: Pro; latest scheduled physical backup 01:03:26 UTC; PITR not enabled; overview's available metrics windows start at 60 minutes. These observations do not clear the required post-advisory backup/current <=60-second telemetry gate. No new hosted write, role change, migration, schedule, paid call, deployment or publication occurred.

Original six-row job and all historical evidence are retained. Old 120-ID all-Master continuation is invalid. Current conditional approval applies only after source, backup, telemetry, permission, secure credential and eligible connector checks pass.
