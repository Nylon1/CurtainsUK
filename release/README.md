# CurtainsUK production release policy

## State: ACTIVE

The protected production branch is `release/production`.

A candidate reaches `release/production` only through a pull request that passes the two required GitHub checks:

- `curtainsuk-production-gate`
- `protected-production-policy`

Protected policy changes also require an owner comment whose complete body is:

`OWNER_APPROVED_POLICY_CHANGE <CURRENT_HEAD_SHA>`

The checker verifies the comment author is `Nylon1` and that the SHA exactly matches the current PR head.

## Deployment policy

The earlier bootstrap release workflow intentionally blocked every deployment while a future fully automated release system was being designed. That bootstrap blocker is no longer authoritative.

Until a complete CI deployment identity, candidate-runtime probe suite and atomic baseline writer are implemented, production deployment is owner-authorised and manual.

A manual production deployment is permitted only when:

1. the code being deployed is the exact current HEAD of protected branch `release/production`;
2. the required PR checks passed before that code entered the protected branch;
3. `scripts/prepare-production-source.mjs` exports the exact Git tree without an intermediate tar file, audits every tracked file and rejects unexpected files;
4. the published visualiser asset hashes pass the protected asset guard, with only manifest-matched line-ending exceptions;
5. `scripts/deploy-verified-production.mjs` rechecks the receipt immediately before staging a Vercel production build;
6. changed MAIN Shopify theme assets are read back and compared with the verified export;
7. post-deployment smoke checks are run immediately;
8. any regression stops the release and restores the prior live deployment.

Feature branches, local worktrees and stale SHAs must not be deployed directly to Production.

## Production capability gate

`release/gate.mjs` remains the protected cumulative capability gate. It compares the candidate with the recorded production source and protects the existing capability groups, including Fabric Master, Fabric Knowledge, samples, stock, pricing, single-curtain checkout, House checkout, paid lifecycle and staff-only workroom release.

The gate remains required. This policy change removes only the unfinished deployment bootstrap blocker.

## Live smoke and preflight

`release/live-smoke.mjs` and `release/preflight.mjs` remain diagnostic/future automation assets.

Some runtime probes in `live-smoke.mjs` are intentionally not yet implemented, and `baseline.json` contains a historical stale capture. Those incomplete bootstrap artifacts no longer block an owner-authorised deployment from the exact protected `release/production` HEAD.

The validation workflow runs live smoke as advisory so its results remain visible without converting unimplemented probes into a permanent deployment deadlock.

## Current release workflow

`.github/workflows/curtainsuk-production-release.yml` is a protected release-validation workflow. It:

- exports the complete exact protected Git tree;
- audits every tracked file and rejects unexpected files;
- checks published immutable visualiser asset hashes;
- re-audits the export and uploads its source receipt;
- validates the candidate against the protected capability baseline;
- runs the current live smoke script for advisory evidence;
- records the exact protected SHA eligible for manual deployment;
- uploads the production-gate artifacts.

It deliberately does not contain a Vercel deployment credential or hidden deploy command.

The required PR gate performs the same export, full integrity audit, protected asset guard and receipt check for each candidate. A release operator uses:

`node scripts/prepare-production-source.mjs <new-export-directory>`

`node scripts/deploy-verified-production.mjs <new-export-directory> <vercel-scope>`

The deployment command writes only the fixed, non-secret CurtainsUK Vercel project metadata when needed and stages a production build without moving the live alias. It must not call `vercel link`: that command changes `.gitignore` and writes `.env.local` inside the verified export. Promote the staged build only after smoke checks pass. A Vercel project link in `.vercel/project.json` is the only deployment metadata allowed alongside the verified Git tree. Any other extra file, including `.env.local`, blocks the release.

## Future automation

A future fully automated Production release may replace the manual deployment step after these are intentionally implemented and reviewed:

- dedicated CI Production identity;
- complete non-purchasing candidate-runtime probes;
- exact deployment/source attestation;
- atomic known-good baseline writer;
- verified rollback automation.

Until then, the protected branch and required checks are the release authority, and deployment is a deliberate owner-authorised action from its exact HEAD.
