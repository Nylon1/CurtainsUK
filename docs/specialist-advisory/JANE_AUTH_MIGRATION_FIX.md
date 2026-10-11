# Jane Auth permission correction

11 October 2026. **Implemented and locally verified. Hosted migration and Auth verification remain pending.** This supersedes the proposed direct Auth grants in the Pro readiness and foundations records; their evidence is preserved.

## Decision and evidence

Starting PR #169 commit: `6d0890ab782d274ce5a0e82cac71494004f7eb18`, branch `feat/jane-consultation-phase2-20261009`. Protected HEAD is `3649c879a4a5ddf88c2093a4172d20fbc58cd265`; independent PR #167 remains `851078c674ac2e9231e51dffbd5949ed4ea7c6d1`.

Read-only hosted metadata confirms that `auth` belongs to `supabase_admin`. The migration operator `postgres` is not a superuser and has USAGE without grant option. It cannot delegate the proposed Auth access. The earlier local migration test ran with a superuser-owned Auth fixture and therefore missed this restriction.

The corrected migration removes the Auth-verifier role, all protected Auth grants and the intermediate browser policies that depended on Auth functions. It creates only Jane's private advisory objects. The retired `auth-session.review.sql` is now a comment-only historical marker, excluded from assembly. The unapplied CLI-generated migration is amended in place; adding a later repair would leave the earlier failing migration in the execution path. Remote history and schema/role inspection confirm this migration has not been applied.

## Supported server-side authentication

`createServerAuth` uses the existing Supabase SDK. Every request calls `getUser(jwt)` against the existing project's Auth API and `getClaims(jwt)` for signature verification. Jane additionally checks matching user/subject, authenticated audience and role, exact issuer, expiry, optional not-before, valid session UUID and non-anonymous user. Editable user metadata is never ownership authority.

The server adapter accepts the existing project's publishable key, not a service-role or secret Auth key. It creates an isolated SDK client per operation, passes the explicit token, disables session persistence and refresh, allows only GET user/JWKS endpoints, disables HTTP caching and redirects, and bounds transport to four seconds and 64 KiB per response. Transport errors become generic Auth failures before SDK logging. It never queries protected tables, stores Auth credentials in a consultation, or falls back to an unverified/cached JWT after an Auth failure.

Official references checked on 11 October:

- [Supabase server-side advanced guide](https://supabase.com/docs/guides/auth/server-side/advanced-guide): `getUser()` checks server-terminated sessions; `getClaims()` alone does not establish revocation.
- [getUser reference](https://supabase.com/docs/reference/javascript/auth-getuser): fresh Auth-server verification is suitable for authorization.
- [Auth architecture](https://supabase.com/docs/guides/auth/architecture): the Auth service owns and mediates its protected schema.
- [Auth sessions](https://supabase.com/docs/guides/auth/sessions): time-box, inactivity and single-session policies have refresh/access-token timing semantics.

**Verification boundary:** the local tests exercise the actual installed SDK, real ES256 signatures and synthetic Auth HTTP responses. They do not prove the hosted Auth version's revocation behavior. Hosted tests must demonstrate logout/revocation, deleted users and the project's configured session time limits. There is no longer an independent SQL check of an Auth session's internal `not_after` column. Do not claim that every server session policy becomes effective sooner than documented refresh/token expiry. Jane's JWT expiry and isolated consultation expiry checks remain enforced.

## Exact SQL and permissions

- [Corrected SQL](../../supabase/migrations/20261011142747_jane_isolated_advisory.sql).
- Canonical UTF-8/LF SHA-256: `eeaf8c9da085277783a263c8caf28ac3e1e46dac472ad508d3cb18f584948a50`.
- [Exact migration approval, resource and rollback manifest](../../artifacts/jane-auth-fix-20261011/MIGRATION_REVIEW.md).
- [Complete object, column, constraint, policy and ACL inventory](../../artifacts/jane-auth-fix-20261011/migration-objects.json).

One new schema, nine tables, 21 indexes, one identity sequence, three SECURITY INVOKER functions, 15 RLS policies and three NOLOGIN roles. No existing-object grant or Auth dependency remains. One index coordination row is seeded; no consultation, job, knowledge record or model budget is enabled. Runtime ownership still comes from the verified server principal, set transaction-locally by the private adapter. Browser roles and `service_role` are excluded. Encryption, recovery, retention, distributed limits, fenced leases, usage accounting and bounded indexing are retained.

The local non-superuser test reproduces the old grant failure before applying the corrected bundle. It verifies successful application, late-failure atomic rollback, collision refusal, unchanged protected Auth ACL/ownership, unchanged synthetic Master data, and denied Auth reads for every new role. PostgreSQL automatically gives a non-superuser creator administrative membership in created roles; the inventory records these creator-only memberships. The SQL creates no application LOGIN, password or membership.

## Verification and infrastructure

**93 scoped tests pass**, covering all advisory migration, consultation, catalogue/search, encryption, ownership, concurrency, recovery, replay, deletion/expiry, rate/spend, indexing and Phase 1/theme regression suites. See [results and logs](../../artifacts/jane-auth-fix-20261011/tests.json). Three separate application processes are used across the concurrency/restart test, with two simultaneously active, sharing local PGlite through the restricted runtime role. PGlite uses PostgreSQL 18.3; hosted PostgreSQL is 17.6.1.166. Hosted role/pooler/RLS/Auth verification is still required.

Read-only [hosted preflight](../../artifacts/jane-auth-fix-20261011/hosted-preflight.json) confirms existing project `hqysjumypgeapgmqkcrx` ACTIVE_HEALTHY on Pro, database size 692,268,179 bytes (about 660.20 MiB), 16 observed connections of 60 and no lock waiters. No advisory schema/roles or Jane migration are present. The latest recorded hosted migration is `20261004064841 browse_twice_daily_low_io`.

The dashboard's last-24-hour cards at approximately 15:08 UTC show CPU 6%, disk I/O 1%, memory 64%, disk usage 50%, and peak connections 10/60. These use a different time window/source from the 16-connection SQL snapshot. The dashboard also reports 948 slow queries and 0.74% database errors. They are existing aggregate observations, not effects of this unapplied migration or permission to index. Fresh telemetry and stop conditions remain mandatory. The prior 2 GB provisioned disk observation is separate from the Pro 8 GB included allowance.

Daily physical backup `2026-10-11 01:03:26 UTC` is visible with a Restore action. No restore rehearsal has been performed. Storage objects are not covered by that database backup. C: measured 40.17 GiB free initially and approximately 40.16 GiB later. Restic PID 20836 was initially running and later disappeared; successful Toshiba completion remains unverified. No cleanup or backup changes occurred. Include this new milestone in a subsequent verified backup.

## Preserved behavior and remaining gates

Jane's concise 40–90-word, no-em-dash profile and existing tool guidance are unchanged. The complete identity-only manifest remains 16,883; hosted descriptive coverage remains **0/16,883**. No repeat full inventory, source-data scan, index population or canonical catalogue change occurred. Six-record batches, shared pacing, checkpoints, before-images, resource guards and 20-batch invocation limits remain intact.

No new model calls or charges. Previous real-model receipts remain US$0.132574. Fresh model evaluation still needs a new budget and key; the owner's last statement says the old key needs revocation. No credentials from this chat were used. Human design scoring, physical iPhone, spoken screen-reader and confirmed background-tab timing checks remain pending as previously recorded. Existing responsive, keyboard and reduced-motion evidence is preserved; this backend correction does not claim new physical-device verification.

Review the [local migration gallery](http://127.0.0.1:8789/auth-fix) and [scripted consultation](http://127.0.0.1:8789/). The preview is a mock, not hosted Auth or live Jane. [Exact changed files](../../artifacts/jane-auth-fix-20261011/CHANGED_FILES.txt) and [implementation summary](../../artifacts/jane-auth-fix-20261011/IMPLEMENTATION.md) cover this increment.

**Recommendation:** approve review of the corrected exact migration as the next milestone. Execution requires separate owner authorization naming the existing project and new checksum, followed by fresh backup/history/resource checks and the protected release procedure. Credentials, protected test deployment, synthetic-account setup, index population, paid evaluation and public activation remain separate gates. No production migration, deployment, merge, publication, paid evaluation, new Supabase project or branch has occurred. PR #167 and all protected customer systems remain unchanged.
