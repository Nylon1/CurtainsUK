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
