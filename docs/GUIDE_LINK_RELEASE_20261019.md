# Smart Track guide-link publication, 19 October 2026

The owner authorised publication with “Publish”. PR [#241](https://github.com/Nylon1/CurtainsUK/pull/241) changes only the Smart Track Studio footer destination from the missing `/pages/how-to-use-curtainsuk` to the published `/pages/how-to-use`.

GitHub required the candidate to include the latest documentation-only production changes. Updated PR head `3aa57eb24ed583dc48257aa774204a266e4788cd` retained the same one-line application diff and passed both required checks in [run 39202997993](https://github.com/Nylon1/CurtainsUK/actions/runs/39202997993). It merged into protected `release/production` at the runtime source below.

## Serving source of truth

| Surface | Identity |
| --- | --- |
| Protected runtime source | `b8faa4e96a3b4cea2c4393041b6e9c5152b4b8f4` |
| Runtime Git tree | `3e2a3d926811a2d1a2a8a64d82ce1e8b02dfeeba` |
| READY Vercel deployment | `dpl_6wMYuRjo38cURYrwQUuzbuqM4mE8` |
| Deployment URL | `curtainsuk-staging-hvt9qdloy-hamzas-projects-4ef62f35.vercel.app` |
| Existing project / team | `prj_vl2GLLlSf0AJAKqjs1Nk26ipKHBA` / `team_U8WXxsKS9LT2DmEllVkOpihz` |
| Existing Shopify MAIN theme | `182339731835`, unchanged |
| Existing Supabase project | `hqysjumypgeapgmqkcrx`, unchanged |
| Immediate runtime rollback | `dpl_BWj7SCCARGac4pkYZJjYeCoiojoz`, source `881fd80c9c911186bd4476c5f18cbecf7058445b` |

All three customer-serving aliases were read back on the new deployment: `curtainsuk-production-api.vercel.app`, `curtainsuk-staging-api.vercel.app` and `curtainsuk-staging-gateway.vercel.app`. The protected head was checked again immediately before promotion. Later documentation-only protected commits record this release without changing its runtime identity.

The complete clean Git export passed the existing 3,150-file immutable visualiser asset guard. The Vercel dry-run included 6,567 deployment files. The Production build was staged with domain assignment skipped, checked, then promoted. Its deployment metadata records the exact runtime SHA and tree above.

## Preserved settings and scoped verification

All 95 project environment entries remain present, including 67 Production entries. Only the four source attestations changed to the deployed SHA: `ADVISORY_SHOPIFY_APPROVED_COMMIT`, `ADVISORY_SPECIALISTS_APPROVED_COMMIT`, `CURTAINSUK_BUILD_SOURCE_COMMIT` and persistent runtime `VERCEL_GIT_COMMIT_SHA`. Existing sensitive/encrypted/plain types, targets and all other stored values were preserved. No released feature, purchase, adviser, provider or budget setting was disabled.

The staged unsigned Jane and four specialist routes returned their authentication denial rather than a disabled 404. After promotion, all five signed Shopify proxy routes returned HTTP 401 `CUSTOMER_SIGN_IN_REQUIRED`. No signed-in AI generation was performed.

The live Smart Track HTML contains the corrected guide destination and no old destination. A browser click reached the native How to use CurtainsUK page and its existing Smart Track walkthrough. All 20 Smart Track runtime assets passed the existing live smoke. Go 200 cm pencil quoted £514.29 and iOn 200 cm wave £565.71, with purchases enabled. Track-only and two-track reviews retained one £12.95 delivery charge and totals of £527.24 and £1,092.95. The unsupported BT postcode remained blocked. No Shopify order, payment or supplier release was created.

Fresh post-publication readback checked all 11,016 distinct released Room Visualiser URLs: both runtime packs, STANDARD textures and FIXED140 supplier images. Every URL returned HTTP 200, the protected SHA-256 and usable CORS, with zero retries. The result was recorded at 05:22:50 UTC. The earlier intermittent room loading observation is not a missing/altered asset in this readback.

No theme upload, migration, customer-data change, supplier refresh, catalogue regeneration or new infrastructure was needed. The preceding complete 541-file MAIN readback and hosted migration/privilege audit remain dated evidence in [the earlier live audit](LIVE_SITE_AUDIT_20261019.md). The previously observed intermittent Room Visualiser load failure is not claimed resolved by this link change.

Local receipts are retained in `C:/Users/hamza/curtainsuk-guide-release-20261019`, including the clean source receipt, deployment input manifest, deployment logs, live track smoke and post-publication evidence. Restore the immediate rollback deployment and align the four persisted source attestations with its source if a runtime rollback becomes necessary; preserve all existing feature flags and theme/database state.
