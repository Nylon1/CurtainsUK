# Jane protected synthetic trial

11 October 2026. Owner approval to proceed follows the completed advisory migration. This authorizes invented-account mock testing, not paid OpenAI calls, catalogue population or public Jane activation. PR #167 remains independent. Application changes remain in draft PR #169.

## Implemented

The Next consultation endpoint now composes the existing mock provider, official server-side Auth verification, encrypted CloudSessionStore and private advisory RPC. Disabled and production requests return 404 before creating clients. The infrastructure trial intentionally has no catalogue credential or real-model adapter.

The operator signs a grant after verifying protection on the completed preview. Ed25519 verification binds the exact Vercel project, deployment ID, source commit, origin, applied SQL checksum, synthetic account allowlist and expiry. Grants last at most one hour. The deployment receives only the public signing key. This avoids an impossible cycle of redeploying to configure the previous deployment's ID. Request-provided JSON cannot authorize itself.

Fresh Supabase Auth verification precedes owner-scoped database operations. Bootstrap supplies session-bound CSRF and consumes the same distributed owner limit as consultations. Cookies, user metadata and browser-supplied owner IDs are not authority. Revocation remains a hosted test requirement: official Auth documentation distinguishes JWT validity from server-side session checks; a mocked denial alone is insufficient.

The `pg` pool uses at most two connections, a four-second acquisition timeout, verified TLS with the project CA, transaction-local role/owner context and bounded statement/lock timeouts. It accepts only a dedicated trial login for the existing project. Failed or ambiguous transactions discard their connection; writes are never automatically retried.

## Temporary access scope

`trial-access.mjs` generates an expiring LOGIN role with NOINHERIT, no administrative privileges, no RLS bypass and connection limit four. Its sole application membership is `advisory_runtime`, SET allowed, INHERIT and ADMIN denied. It cannot use Auth, the private catalogue schema or the indexer role. Passwords are random; only a SCRAM verifier enters provisioning SQL. New roles fail on name collisions. No existing table, function, policy or source record changes.

The generator and rollback were tested using a non-superuser CREATEROLE operator. Rollback closes pools, revokes runtime membership and drops just the temporary role without CASCADE. It does not remove advisory storage or migration history. If a test is interrupted, expire/disable the login, remove the branch's trial credentials, then retry deletion of only recorded synthetic consultations. Never delete customer rows or Auth accounts through SQL.

## Operator sequence

1. Verify existing project Pro/ACTIVE_HEALTHY, backup/recovery point, database connections and absence of lock waiters. Confirm the exact existing migration SHA-256 `eeaf8c9da085277783a263c8caf28ac3e1e46dac472ad508d3cb18f584948a50` and preserve its recorded hosted version.
2. Confirm two dedicated synthetic Auth users. `jane-synthetic-login.mjs` accepts credentials via non-echoed terminal input and stores only DPAPI-encrypted sessions outside Git. `jane-trial-prepare.mjs` verifies getUser and cryptographic claims before generating private trial material. Neither script creates users, migrates or deploys.
3. Review the exact expiring access SQL and its checksum. Provision only that connection role. Confirm its grants and TLS connection before any consultation test. Project Connect reports shared pooler `aws-0-eu-central-1.pooler.supabase.com:6543`. Obtain the CA from the project's Database Settings; never disable certificate validation. Current certificate source: <https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt>.
4. The existing Vercel project has no Git connection. Its API rejected branch-scoped variables without creating any. Use `build-jane-trial.mjs` to package only the exact consultation route with the supported Build Output API, then `deploy-jane-trial.mjs` for Preview in existing project `prj_vl2GLLlSf0AJAKqjs1Nk26ipKHBA`. Credentials are deployment-scoped: the verified CLI reads `--env NAME` from its process environment without placing values in argv. No project-wide or production variables change. Vercel Authentication covers previews. Read back the completed deployment identity, source and protection before signing. Do not link Git or deploy the sparse full storefront.
5. Run `jane-hosted-check.mjs` with private operator configuration. Vercel CLI authenticates protected requests using the existing operator identity. Application tokens and passwords are not CLI arguments, logs, screenshots or receipt contents. Request headers/body reach curl through stdin. Do not enable CLI tracing/debugging.
6. Record separate evidence for hosted HTTP flows, actual database ciphertext, connection reuse, distinct concurrent application instances, expiry, revocation and deletion. The protocol removes its created consultation rows in `finally`; failed cleanup is an error. Concurrent HTTP calls alone do not prove distinct Vercel instances. Preserve the raw outcome and do not relabel local PGlite tests as hosted tests.
7. Close the trial window and remove temporary access when testing ends. Preserve code, receipts and backup evidence. No OpenAI credential is required or used.

## Verification and limits

See [trial evidence](../../artifacts/jane-hosted-trial-20261011/README.md) for actual executed results. The existing 93 local checks remain, supplemented by seven runtime/provisioning checks. Physical iPhone Safari, spoken screen reader, the revised real-model evaluation and human interior-design scoring remain separate pending work. No supplier PDFs or full catalogue jobs run.

Database at preflight: 699,444,371 bytes, 16 connections and zero lock waiters. The latest visible physical backup is 11 October 01:03:26 UTC; restore rehearsal and Toshiba completion remain unverified. The package manager replaced the previous dependency link with a local dependency directory while adding the pinned `pg` driver; free C: space remains about 39.36 GiB. No historical data, evidence or worktree was deleted. This development still needs a subsequent verified backup.

No OpenAI charges arise from this mock trial. Existing Supabase/Vercel plan usage applies; no new project, paid add-on or subscription was created. Historical OpenAI cost remains US$0.132574. A new real-model budget and replacement key remain required.

Official references: [Supabase server-side Auth guidance](https://supabase.com/docs/guides/auth/server-side/advanced-guide), [session semantics](https://supabase.com/docs/guides/auth/sessions), [connection pooling](https://supabase.com/docs/guides/database/connecting-to-postgres), [node-postgres TLS](https://node-postgres.com/features/ssl), [Vercel system variables](https://vercel.com/docs/environment-variables/system-environment-variables), [preview protection](https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication).
