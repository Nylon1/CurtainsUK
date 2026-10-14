# Local candidate verification — 14 October 2026

- `npm test`: **576 passing**, zero failures across all nine suites, including **41 Cushion Studio/domain/runtime tests**. The first run failed only because the inherited sparse checkout omitted existing theme sections; expanding this worktree's sparse paths resolved that missing-file failure without changing source.
- `npx tsc --noEmit`: passed.
- Protected capability gate: **11 groups, 133 tests passed** against the working candidate. `production-gate/result.json` records the pre-commit base HEAD because the gate ran before the candidate commit; it is working-tree evidence, not a deployed-source attestation. The unchanged protected test copy was restored after the local gate run. GitHub must rerun both required checks on the final PR SHA.
- Shopify CLI full Dawn theme check: **zero errors**, 13 warnings in existing theme files. No store write occurred.
- Next.js production compilation/prerender: `npm run build -- --webpack` passed. This checkout uses an external `node_modules` junction; normal Turbopack rejects that junction. Webpack was used without changing project configuration. Existing admin client prerender requires public Supabase variables, so this offline build used `https://example.invalid` and a clearly labelled noncredential placeholder key. No private service credential or hosted state was used.
- Browser evidence: see `../cushion-studio-evidence/browser-review.md` and the final front/back, workroom and mobile images. Real plain/stripe/directional original-source evidence is separate from synthetic price fixtures.

Not proven by these checks: physical mobile Safari, hosted account/session integration after migration, a current private supplier-priced quote in this local public-catalogue fallback, production Draft Order/payment execution, or deployment. Hosted migration and feature/payment flags remain unapplied/off. The local feature is reviewable; it is not publicly released.
