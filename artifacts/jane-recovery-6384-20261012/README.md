# Jane: expired uncommitted transport recovery

On 12 October 2026 at 17:38:28 UTC the connector failed to send the next write request. The last fsynced successful receipt was **6,384 / 11,517**, batch **1,064**, at 17:38:08.615 UTC. The failed plan covered six identities, offsets 6,384–6,390. This report does not claim those six were indexed.

- Existing job: `ac425f78-f6ec-4623-97bb-df8763d79d5a`.
- Failed SQL SHA-256: `0850b0353d5be2ae68b229a662172ef8e08c4932af851101d172028abc36340f`.
- SQL evidence expiry: `2026-10-12T17:39:21.355Z`.
- Independent hosted observations: `17:45:56.332924` and `17:46:05.813574` UTC.
- Both observed unchanged checkpoint 6,384, zero pending six-ID knowledge rows, zero corresponding job receipts, zero transactions predating the expired plan, zero prepared transactions and restored role membership.
- Exact previous six-row hashes, receipt fields and historical job/rows were also verified.
- Resolution evidence SHA-256: `2533c70e54c9c6d1d80a03ebf731b785b7c9598eacc237522311674c697bc1e0`.

The original prepared SQL and full history remain in the existing fsynced journal. A separate `expired-uncommitted` entry records the two readbacks and verification. No hosted write, retry, deletion or rollback was used to resolve the ambiguity. A resumed batch must generate new SQL from all fresh admission evidence. The old SQL remains expired.

## Implementation and validation

`uncommitted-plan.mjs` validates only a six-record, post-canary insert plan with an expired SQL deadline. It requires exact preceding receipt evidence, two independent observations at least five seconds apart, absence of knowledge rows and receipts, drained old/prepared transactions, preserved history and restored permissions. Partial, committed, stale, in-flight or mismatched states remain blocked. The operator runner does not automatically classify transport failures as retryable.

`index-journal.mjs` appends and revalidates this resolution under its existing exclusive lock. No journal entry is removed, and no false success receipt is generated. The private operator reconciliation now locates the latest verified receipt even when followed by this explicit resolution.

**26 targeted tests passed, zero failed**, using Node's test runner and existing local PGlite. Suites: `uncommitted-plan`, `eligible-execution`, `eligible-transport`, `continuation-runner`. The new actual SQL test confirms an expired delayed plan cannot commit or retain elevated role membership and fresh valid SQL still succeeds. The full synthetic 11,517-identity bounded continuation test also passes. The three new focused recovery tests passed again after a test-only assertion cleanup.

Updated execution implementation SHA-256: `c45505b1ee612e90dbba76379cbffeec47ebb4c263e05654c4937ec2d6ff00e9`. Private binding SHA-256: `fac19d2716584f2c2a1da4cf3cd2292da9c5647ef8ec22b35ad425e1e08e87ff`. Earlier binding, review and approval files were copied before this local update. Scope, resources, credentials, pacing, SQL limits and owner approval references are unchanged.

Full readback and resolution evidence remains outside Git in `.codex/tmp/jane-6384-*.json`, alongside the existing operator journal. No credentials or customer data are included in this report. No migration, source mutation, public activation, deployment, merge, paid AI call or PR #167 change occurred.

At 17:46 UTC backup/metrics reads returned HTTP 200. Backup 1937679152 remains COMPLETED, physical, recovery point `2026-10-12T01:11:28.231Z`, within Nylon1's approved 24-hour RPO. It predates new writes; a later verified backup is still required. The private monitoring credential renewal remains pending, with conservative use cutoff 20:25 UTC. The until-complete instruction does not waive that credential limit. Toshiba backup completion remains unverified.
