# Final technical closure — 14 September 2026

| Gate | Status |
|---|---|
| Failure boundary identified | PASS |
| Hosted instability resolved | BLOCKED |
| Fail-closed regression tests | PASS |
| Uninterrupted desktop / 390 / 412 browser matrix | BLOCKED |
| Complete accessibility acceptance | BLOCKED |
| Dawn unpublished / customer HCI disabled / payments unchanged | PASS |

Implementation: `141cb52cf43323f3a9ed084fe311c9f9491c2a7c`, continuing from `f1ebf83` on `feature/curtainsuk-phase-5a-prelaunch`.
Preview gateway: https://curtainsuk-staging-gateway.vercel.app
Preview deployment: https://curtainsuk-staging-bmarvmqlu-hamzas-projects-4ef62f35.vercel.app

## Confirmed boundary

Supabase's API Gateway logs show HTTP 504 responses from `/auth/v1/user`, `/rest/v1/rpc/hci_staging_read`, and an exact `/rest/v1/fabric_colourways` lookup during the earlier rehearsal. These are upstream service failures, not evidence of invalid Shopify signatures or incorrect HCI credentials. The underlying Supabase platform cause is not yet established.

The new server-only transport diagnostics preserve response status, duration and Supabase request ID without recording request URLs, bodies, credentials, cookies or headers. There are no new retries. Authentication outages produce private 503 responses; genuine denials and role checks remain enforced.

### Failure reproduced after mitigation

- UTC: 2026-09-14 11:40:09, request start.
- Vercel request: `sh6td-1789386009158-bc4ccb77d323`.
- Supabase request: `01a09fb7-af36-71db-8569-54d10ca4c316`.
- Authenticated GET `/api/admin/curtain-consultation?fabric=pt-4262-770`.
- Supabase database response: **504**, **5,048 ms**, JSON.
- CurtainsUK response: **503**, total **6,416 ms**.
- Code path: staff authentication/authorization followed by `retailFabricDetail` database hydration. The diagnostic does not identify which parallel hydration table request failed. It is not an authorization denial.

Evidence: `artifacts/phase6-discovery/closure-ready-errors.jsonl` and `closure-transport-probe.json`.

## Investigation and mitigation

The dedicated staging Supabase project is a Free/Nano instance in Frankfurt. Observed resource usage did not show saturation: dashboard CPU 4%, memory 57%, disk 19%, disk IO 1%; current database approximately 75 MB. These observations cannot exclude a transient historical platform problem. No schema, authorization, catalogue or recommendation changes were made to address speculative resource causes.

Supabase documented lingering unresponsive Nano projects and recommended a restart in its [September incident](https://status.supabase.com/incidents/4mkcsnlf6p5x). The staging project was restarted; PostgreSQL reports startup at `2026-09-14 11:33:49.098656+00`. This was a documented mitigation, not a proven root-cause diagnosis. The later 504 above demonstrates that restart did **not** establish resolution. The separate reported 401 JWT incident must not be conflated with these 504s.

## Validation, including failures

- Before restart: 60 authenticated read probes passed; 225 integrated benchmark requests across five consultations passed without retries. Successful runs did not establish reliability.
- During restart recovery: first 12 of 60 probes returned 503, correlated with upstream 502; remaining 48 passed. Preserved separately in `closure-restart-recovery-probe.json`.
- After recovery: 59 of 60 passed; one upstream 504 failed. No retry was used to turn the failed request into a pass.
- 158/158 storefront tests passed, including regression tests for outage versus denial classification and unchanged transport errors/responses without replay.
- Changed-file ESLint and TypeScript checks passed. Preview build passed. Audit: one moderate existing csv-parse advisory, no high/critical findings.
- Integrated benchmark: recommendation p50/p95 2,358/2,673 ms; refinement 2,662/2,717 ms. Five observations each, not a load test. This pass changed no HCI ranking code or baseline (`41a9f3f`).
- Post-restart desktop guided consultation progressed through questions into visual calibration. The full acceptance matrix was **not completed** after the reliability probe failed. Earlier D14/D15 proofs remain intact but are not substitutes for the requested uninterrupted matrix.
- Accessibility spot checks on the measurement hub found no horizontal overflow or unnamed controls/images, and keyboard focus moved into navigation. Complete keyboard, palette/reaction, touch-target and three-viewport acceptance remains unproven.

## Minimum closure actions

1. Resolve the recurring Supabase upstream 504 using the exact request ID above and Supabase's service-side trace. A support escalation has not been sent; no paid upgrade or access expansion was performed.
2. After an evidenced remedy, rerun the uninterrupted desktop, 390px and 412px matrix and complete accessibility checks. Include all four discovery paths, palette, directions, refinement, sample/return, Standard, Bay, Apex/Gable and Measure/Fit guides, and safe Draft Order handoff. Do not count retries as uninterrupted success.

No feature development, live theme publication, payment activation, HCI ranking change, Merchant Center activation or supplier ordering was performed. Publication remains blocked.
