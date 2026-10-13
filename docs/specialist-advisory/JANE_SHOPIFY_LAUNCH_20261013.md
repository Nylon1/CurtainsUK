# Jane Shopify launch gate, 13 October 2026

This record supersedes earlier planned-state claims where noted. Draft PR #169 remains separate from the published Meet Our Team page. Jane's customer chat is **not live**.

## Source and hosted state

The starting draft head was `bae95d40b25c314ff1da4854f6e37574e746aa9f`; protected `release/production` was `ffe63dda7a85b83f400c122f14a64e476a441ad3`. PR #169's production gate passed, but its policy check failed because the owner has not posted the exact-head policy approval required by `release/policy-change.mjs`. The final candidate must be rechecked after this increment is committed.

The existing Supabase project `hqysjumypgeapgmqkcrx` was healthy and held 11,518 advisory knowledge rows, including the fixed 11,517 eligible identities and one historical trial row. The advisory consultation table held zero rows. A completed physical backup inserted at `2026-10-13T00:54:33.159Z` was read back at 17:21 UTC, within the owner's 24-hour recovery-point limit. A restore was not rehearsed. C: had about 34.86 GiB free. No new project, branch, catalogue rebuild or fabric-source change was made.

The existing Vercel project had no `ADVISORY_*` Production or Preview environment variables at readback. Its expired temporary trial role cannot be used for a launch. The production Shopify app proxy still routes to the production Vercel app, where Jane's draft route does not exist. A protected preview cannot substitute for a real signed Shopify request through that proxy.

## Permanent advisory roles and retention

Two permanent logins were added to the **existing** Supabase project through additive migrations. `advisory_app_runtime_v1` is a NOINHERIT, NOBYPASSRLS, connection-limited login that can only set the existing `advisory_runtime` role. `advisory_retention_runner_v1` is separate from runtime and indexing privileges. SCRAM verifiers, never plaintext passwords, were sent to the migration; private login secrets remain DPAPI-encrypted outside Git. Direct CA-verified TLS login and privilege checks passed. Runtime cannot use `auth` or the private catalogue schema. A retention purge rehearsal in a rolled-back transaction returned zero rows.

The first pg_cron probe under the retention login failed with `connection failed`. Both initial jobs were immediately unscheduled. Supabase's existing postgres-owned cron jobs can connect; a replacement probe used a transaction-local `SET ROLE advisory_retention`, asserted `current_user`, then called the existing bounded `advisory.purge_expired()` function. Job 7 succeeded at 17:36 UTC. It was unscheduled. The identical role-switch command is now daily job 9, `curtainsuk_jane_retention_v1`, at 03:20 UTC. Readback showed exactly one active Jane job. The postgres membership gained **SET only**, with INHERIT false, so the job drops to the limited role before deletion. The function deletes at most 20 expired records of each type per run. The scheduled daily execution remains unobserved until 03:20 UTC; monitoring must confirm its first run.

Rollback begins by unscheduling `curtainsuk_jane_retention_v1` with `JANE_RETENTION_STOP_SQL` in `lib/advisory/production-access.mjs`, then disabling both advisory logins. Do not drop a login until its app connections are closed. The failed probe and its repair are retained in `cron.job_run_details` for audit. No customer consultation was deleted.

## Code and tests

The draft Shopify gateway has a default-off, exact-production-commit restricted test mode for allowlisted synthetic customer IDs and a separate default-off public mode. Both require signed Shopify identity and the established CSRF, host, owner and rate checks. Public mode additionally requires the real OpenAI provider and cannot run on the mock adapter. The permanent runtime login is accepted only for Vercel Production on the existing project; Preview still uses its reviewed temporary-test rules. The Jane theme consent copy now describes encrypted 90-day consultation retention and links to the privacy policy. Other five advisers remain Coming Soon.

The permanent-role local PostgreSQL test, 24 broader hosted/security tests, seven signed Shopify-gateway tests and 18 theme regressions passed. A successful test on a simulated signed Shopify request is **not** evidence of real Shopify proxy headers, customer consent, a real OpenAI reply, retail card, cross-customer denial or deletion in production. Those checks are still pending.

## Required release sequence

1. Finish and push this draft increment, rerun both protected checks and obtain the exact-head owner policy approval comment. Do not fabricate that comment.
2. Review a permanent server-only Vercel secret configuration, including runtime database, encryption/owner/CSRF keys and OpenAI key. Keep `ADVISORY_SHOPIFY_CHAT_ENABLED` and public mode off. Establish an approved, durable spending cap; the previous US$5 approval covered a synthetic hosted trial, not unlimited public use.
3. Merge only the approved exact head, deploy the protected production merge, and enable the restricted gate for allowlisted synthetic Shopify customer IDs. Test real signed GET/POST, consent, one capped OpenAI reply, exact retail fabric link, other-customer denial, resume and deletion. Read back zero residual synthetic consultations; disable the restricted switch afterward.
4. Verify the customer-facing privacy notice, physical iPhone Safari and spoken VoiceOver/keyboard behavior. The owner and Jasmine's qualitative design passes are recorded; no numeric scorecards were supplied. Do not claim an unperformed test passed.
5. Compare only Jane's exact Shopify theme assets against MAIN, back up any live originals, then deploy only reviewed files and read them back byte-for-byte. Enable Jane's composer and the separate public API switch only after the restricted trial and release gates pass. Do not change PR #167, other advisers, Naila, Fabric Intelligence, Room Visualiser, Fabric Master source, stock, pricing or checkout.

To stop the service, turn off `ADVISORY_SHOPIFY_PUBLIC_ENABLED` and `ADVISORY_SHOPIFY_CHAT_ENABLED`, hide the Jane theme composer, then use the saved theme-file backups if rollback is needed. Retain encrypted consultations for authorised recovery/deletion; do not drop data as an emergency rollback.
