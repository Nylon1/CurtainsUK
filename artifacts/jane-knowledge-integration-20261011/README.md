# Jane Fabric Knowledge integration evidence

Local preparation on 11 October 2026 from PR #169 `faadb8b8`. [Complete report, operating limits and exact approval scope](../../docs/specialist-advisory/JANE_FABRIC_KNOWLEDGE.md).

- Hosted verification: **6 / 16,883**, 16,877 remaining; no new writes. Source identity hash and 81-entry migration history unchanged. No active advisory schedule.
- Local implementation: journaled 20-batch continuation, interrupted-run reconciliation, changed-identity manifests using the original worker, hash-based no-op writes, and ranked attribute search.
- **117 scoped local tests passed**. See `tests.json` and individual logs. The copied `migration-bundle.json` is a historical local fixture; its `applied:false` describes the fixture, not current hosted migration status.
- New optional ranking function and exact rollback are local review SQL only, outside the migrations directory. No canonical migration changes, index rebuilds or grant changes.
- `continuation-proposal.json` lists the exact next 120 IDs and implementation dependency checksum. Both approval flags remain false. Prior proposals and trial receipts are preserved.
- `local-capacity.json`: 600 invented records in local PostgreSQL only; about 62.3 MiB projected for full search/initial receipts, with a proposed 128 MiB review allowance. Not hosted capacity evidence.
- `population-estimate.json`: 2,813 remaining batches / 141 invocations; 6–9 hours of modelled work with short tranche reviews, plus unbounded approval/resource pauses.
- Change discovery is still operator-fed. No durable complete change feed has been established; source deletes deliberately require review. The existing Browse queue remains untouched.
- Current telemetry window and recoverable backup are execution preconditions. Historical hourly dashboard averages cannot clear the new runner.
- Mock preview remains available at http://127.0.0.1:8789/ and returned HTTP 200. Its UI and production services were not changed.

Initial new-test failures were fixture issues: an equal-ranked spelling match used the existing alphabetical tie-break, and a local replay attempted to skip the enforced five-second gate. Fixtures were corrected without weakening ranking or pacing. The final serial suite passed. Scoped lint is clean. Physical iPhone and spoken assistive-technology checks are not part of this backend milestone and remain pending.

No new Supabase project/branch, automatic schedule, hosted data write, migration, deployment, publication, paid model request, real customer processing or backup alteration occurred. Previous OpenAI receipts remain intact. Exact changes are listed in `changed-files.txt`.
