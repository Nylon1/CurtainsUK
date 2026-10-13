# First six-fabric index trial: prepared, permission approval pending

11 October 2026. Starting PR #169 source `898e0fd7de76804af29d6704fd59e76b5e15d648`; protected `release/production` remains `c7ca2d0eff1c128386863536d4ce46a877d874a8`. The owner approved the proposed one-batch trial. No hosted indexing write has occurred.

## Actual results

- Verified existing project ACTIVE_HEALTHY, canonical advisory SQL checksum unchanged and migration history still 81 entries. [Final read-only preflight](hosted-preflight.json) confirms zero index rows/jobs and unchanged indexer membership.
- Reattested **16,883** Fabric Master identities using the existing bounded primary-key inventory and three-second statement limit. [Count/hash receipt](source-attestation.json) matches the preserved manifest exactly. This is identity inventory, not descriptive coverage.
- Read the first **six** identities using the existing narrow descriptive, visual and profile fields. [Read-only source receipt](source.json) excludes costs, margins, prices and stock. Missing data remains unknown, and the customer-safe projection marks every record knowledge-only.
- Implemented an operator-only first-batch SQL generator, reusing `safeKnowledge`, `indexTerms`, field receipts, source validation and resource limits. It writes only advisory search vectors, receipts, one checkpoint and the shared pacing gate. It never creates a login, supplier job or browser/model indexing tool.
- **104 local tests pass**, including four new cases for source/approval/resource admission, exact checkpoint and existing-worker rollback compatibility, replay refusal, SQL-text injection, late-failure rollback and restoration of original role grants. [Full receipt](tests.json). Scoped lint passes. An initial full-suite run lacked the copied migration manifest fixture; that result is preserved in `tests-initial-missing-fixture.json`, and the corrected run includes the unchanged canonical migration checksum.

## Why the hosted write stopped

The existing connector operates as `postgres`. Its `advisory_indexer` membership permits administration but explicitly denies role switching and inheritance. The ordinary narrow-role plan therefore cannot execute. The generator does not fall back to a broader role or grant itself access automatically.

[Exact additional permission review](PERMISSION_REVIEW.md): allow a grantor-qualified, transaction-only SET grant to the existing indexer role, revoke it before commit, and assert the original membership is unchanged. This option requires separate recorded permission approval. Local tests reproduce the hosted non-superuser state and verify both success and interrupted execution. **Hosted verification of this permission sequence remains pending.**

Your earlier six-record approval is retained. The pending decision is only the temporary production permission use. After it is approved, collect fresh source/resource evidence, preserve the generated SQL/checksum, submit one transaction, inspect exact hashes/checkpoint and resource impact, and stop. Further batches are not approved. No automatic retry of an ambiguous commit is allowed.

## Boundaries and costs

Hosted descriptive coverage remains **0/16,883**. Four local tests do not change that number. No new migration, grant, catalogue write, login, deployment, OpenAI call or customer record was made in this increment. No extra infrastructure or subscription was purchased. PR #167, all existing storefront/runtime/commerce systems and the closed synthetic trial remain unchanged.

The latest visible database backup is still 11 October 01:03:26 UTC. Toshiba completion and restore rehearsal remain unverified. C: free space measured 39.15 GiB; no restic process was visible. New work needs a subsequent verified backup. Physical iPhone, spoken screen reader, human design review, exposed-key retirement and fresh paid-model approval remain separate pending work.

[Exact changed files](CHANGED_FILES.txt). The existing [local mock consultation](http://127.0.0.1:8789/) and [hosted-trial review](http://127.0.0.1:8789/hosted-trial) are unchanged and do not use this pending index.
