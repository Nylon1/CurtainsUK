# Fabric Knowledge display restoration

## Confirmed regression

Production gateway `dpl_GbYFBeXsXrTKzhzJizdARroBJDYz` was deployed from
`430c1ac27dba29c11b7d4eca3a5c8678b13c2cb1` (MTM pricing provenance).
That source predates the Fabric Knowledge reader/projection merged in PR #17,
main `2cc4fbf7414315ae11603a976e11451d0e34c625`.

The live theme `182339731835` still loads `curtainsuk-fabric-experience.js` with
the `visualIntelligence`/`fabricIntelligenceGuidance` renderer. Its signed
catalogue response resolves `1223/374` as `pt-1223-374`, but omits the stored
reading. The gateway used the older sparse retail-profile interpretation
instead of `fabric_visual_knowledge_read_cache`.

Read-only database verification: all 789 COMPLETE, 6,898 PARTIAL_GOVERNED and
1,561 PENDING_EXTERNAL_RETRY cache IDs match current Fabric Master IDs exactly.
This is a shared projection regression, not an alias mismatch. No canonical
identities, duplicate records or supplier data need changing.

## Narrow restoration

Restore the existing `retail-repository.ts`, `visual-knowledge.ts` and
`knowledge-discovery.ts` from merged main onto `2d54639`, which retains the
current MTM deployment source and its verification record. Preserve current
pricing, stock, checkout, proxy security and theme assets.

Source: governed stored visual reading → private read cache → exact Fabric
Master ID → customer-safe catalogue projection → existing Shopify JS renderer.
Unknown dimensions remain omitted. Supplier facts remain separate.

## Regression gate

`node scripts/check-fabric-knowledge-display.mjs` reads the real signed Shopify
catalogue route and fails if any of four COMPLETE or three PARTIAL fixtures lose
their exact identity, stored visual projection or renderer dimensions. It
reproduced the Production failure before restoration. Run this after gateway
deployments, including unrelated commerce deployments; do not infer success
solely from a successful build or theme publication.

Focused unit tests cover complete/partial projections and unchanged evidence.
No inference requests, database writes or cache regeneration are part of this fix.

## Verified release

- Code commits: `a8953d0`, `ee25941` (the latter aligns the existing read-only QA fixture with supplierFacts).
- Protected Preview: `dpl_Ggc6Us2PTedtiqcpjsn1LAdVWU5v`; seven exact fixtures passed through its existing read-only preview endpoint.
- Production: `dpl_GbfAvYMiBZuuPGAoJLCRJCiPRc9A`, deployed from `ee25941` using Production configuration.
- Both existing aliases `curtainsuk-staging-api.vercel.app` and `curtainsuk-staging-gateway.vercel.app` now target that deployment. Live request logs identified the latter as the Shopify-facing host; updating only the project Production alias was insufficient.
- Rollback deployment retained: `dpl_GbYFBeXsXrTKzhzJizdARroBJDYz`.
- 68 Fabric Master tests passed; focused ESLint and TypeScript passed; Vercel production build passed.
- All seven signed live catalogue checks passed: four COMPLETE and three PARTIAL_GOVERNED. Pending `sdg-ccf0865-01` has zero intelligence dimensions.
- Browser verified existing live theme rendering for Dunbar Gemstone and Mellora Blush. Complete palette/pattern/surface/character/advice returned; partial reading omitted unknown palette while retaining its known pattern/surface/character.
- Dunbar identity, composition, widths, sample flag, commercial stock state and £33.12 browse guide matched the pre-change public response.
- No Shopify theme or installed proxy configuration changes. No AI regeneration or governed-data changes.

The restoration branch is `fix/restore-fabric-readings`. Do not later deploy an
older commerce branch without reconciling these files; retained Production MTM
work is also ahead of the earlier Fabric Knowledge main baseline.
