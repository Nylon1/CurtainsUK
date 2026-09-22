# CurtainsUK production gate V1 — implementation for owner review

## State: BLOCKED, no application deployment performed

**Concurrent release detected:** later readback during this task showed
`dpl_Ceg5VuFRTV7micGHXVk9K73W4DXx`, commit
`2314c6daec3b82d504cf6c26ebc77026ff6939f9`. This task did not deploy it.
The captured source is now explicitly stale; the offline comparison below is
against the earlier reconstructed capture, not the new live deployment.
Preflight checks both actual live alias targets against the recorded baseline
and refuses unrecorded releases. Reconcile the new deployment before bootstrap.

The gate deliberately cannot deploy until missing runtime proof, bootstrap and
credential isolation are resolved. It does not claim that passing unit tests
proves the Production paid-order lifecycle. No Build My Rooms deployment,
Shopify theme change, database migration or production business change occurred.

## Production lineage and source reconstruction

The live gateway inspected on 2026-09-22 is
`dpl_GsynQ3vdZTekQdA5aDDEzPdumKqD`. Its reported commit is
`a63f5fddd969ec6cbdc5b14b472ceadbd9a5dc0b`, branch
`feature/build-my-rooms-v1`. It already existed before this task.
The restoration worktree has five staged Fabric Knowledge restoration files
not represented by that SHA. Commit `6668e22` preserves those files on top of
the reported deployment source. It is a reconstructed source snapshot, not
a falsely attested exact deployment tree.

`release/production` has been created from that snapshot and protected in
GitHub. `main` is not silently reset or treated as Production. The candidate
must descend from the recorded snapshot and incorporate the current protected
branch. A release rechecks remote branch HEAD immediately before activation.

`baseline.json` intentionally says `UNVERIFIED_BOOTSTRAP`. Before changing it
to `KNOWN_GOOD`, independently attest the source tree against the deployed
artefact and collect all protected runtime results. The eventual atomic
baseline writer must record full commit SHA, deployment ID, manifest digest,
test-result digest and timestamp only after post-deployment smoke succeeds.
That writer is not implemented/activated in V1; no fabricated receipt exists.

## Enforced now in GitHub

- Branch `release/production`: pull request and one approval required; stale
  approvals dismissed; latest push approval; CODEOWNERS review required;
  administrators included; force pushes/deletion disallowed; linear history.
- Strict required checks from GitHub Actions app 15368:
  `curtainsuk-production-gate` and `protected-production-policy`.
- Environment `curtainsuk-production`: only branch `release/production`;
  required owner `Nylon1`; self-approval disabled and administrator bypass disabled.
- No Production credential has been installed in Actions. Existing supplier
  workflow secrets were neither read nor repurposed.

The checked-in workflows/CODEOWNERS are pending this review, not already
installed on the protected base. The first PR is therefore deliberately
blocked at bootstrap. Do not weaken the check to merge it. An independently
authenticated owner must approve the initial policy installation and source
attestation through a recorded bootstrap operation. Agents currently using
the owner's own account cannot provide independent approval of their own PR.

## Gate implementation

`capabilities.json` contains the owner's policy, controls and critical versions.
`protected-tests/` freezes the selected existing assertions. `gate.mjs`
hash-checks them and runs the same trusted assertions against candidate and
production source. It fails on missing tests, zero tests, skips, failures,
lineage mismatch or candidate/baseline differences. It writes per-capability
TAP logs and a JSON result. CI runs the checker and assertions from the
protected base, never silently substitutes feature-branch tests.

The suite covers identity/readiness, knowledge mapping, exact sample identity,
freshness, pricing 3.0.0-production.1, heading compatibility, single checkout,
House cumulative stock, multi-line contracts and financial reconciliation.
Paid lifecycle/manufacture/staff checks currently include source-contract
guards and existing House webhook parsing tests, **not a full database/runtime
execution proof**. Full protected Production-suite status remains BLOCKED.

`policy-change.mjs` requires an `OWNER_APPROVED_POLICY_CHANGE` record with
previous rule, new rule, reason and owner decision, plus a real owner approval
of the exact current PR HEAD. A file claiming approval is not approval.
Semantic policy changes require a separately reviewed policy release: the old
trusted suite remains active until the new policy is deliberately installed.

## Deployment permission blocker

Vercel project `prj_vl2GLLlSf0AJAKqjs1Nk26ipKHBA` currently has no Git link.
Existing owner CLI credentials can deploy/promote/alias arbitrary worktrees.
A GitHub required check cannot stop that route. Do not claim otherwise.

Before enabling deployment: use a dedicated CI release identity with project
Production permission, restrict operator/agent accounts to Preview/non-production,
remove shared owner credentials from their execution environment, and keep
break-glass owner access separate and audited. Verify those restrictions with
a denied feature-branch Production attempt using the restricted identity.
No owner credentials were revoked during setup, preventing accidental lockout.

## Runtime and rollback blockers

`live-smoke.mjs` performs genuine read-only Shopify checks: COMPLETE, PARTIAL,
PENDING and canonical identity, plus the existing £2.50 sample variant.
It explicitly returns BLOCKED for missing signed sample preparation, stock
policy, production pricing, single/House checkout, paid lifecycle and workroom
runtime probes. It never creates a real checkout, order, payment or staff release.

Those probes must be implemented over the existing rehearsal mechanisms in an
isolated test context, tied to the exact candidate deployment. A successful
GET or an arbitrary submitted JSON file must not stand in for execution.
Run them on candidate before alias promotion, then on the live Shopify route.

The release workflow is environment-gated, checks current production health,
lineage and bootstrap, and ends in an explicit activation blocker. There is no
hidden deploy command. Adding deployment/promotion and an atomic receipt
writer is protected policy work once the missing proofs/permissions exist.

`rollback.mjs` is a guarded procedure for an authorised future release failure:
restore the verified baseline deployment and **both** gateway aliases; refuse
an unverified target. Mark release unhealthy, rerun live controls, and never
advance the baseline after failure. If restore fails, stop further releases
and require owner intervention. This task tested rejection of an unverified
rollback target, not a live rollback. No automatic purchasing kill switch has
been invented or enabled.

## Validation

Both reconstructed baseline and candidate passed the same 11 test groups
(133 test executions per tree, with deliberate overlap between capability groups).
Negative controls reject changed protected tests, feature/stale branches and
unverified rollback. Live COMPLETE `pt-1223-374`, `sdg-aarc520004`, PARTIAL
`pt-1204-212`, PENDING `sdg-ccf0865-01` and the £2.50 sample price passed.
Remaining runtime probes correctly return BLOCKED; deployment remains disabled.

Run `node release/gate.mjs . <baseline-worktree>` in disposable checkouts;
the runner installs the frozen test files there. Run
`node --test release/gate.test.mjs` for fail-closed negative controls.
`node release/live-smoke.mjs` never writes commercial data and currently exits
nonzero because the full runtime gate is incomplete.
