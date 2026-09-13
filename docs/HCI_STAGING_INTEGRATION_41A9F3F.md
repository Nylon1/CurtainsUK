# CurtainsUK ↔ HCI final staging integration checkpoint

Status: **BLOCKED for the complete requested browser/Draft Order rehearsal.**

Deployed CurtainsUK code: `f8b6e9da50992b93c9b5cd5ed38719971c07ab61`. Isolated HCI adapter: `0e59870f25bbb80325557301c1fd142d7cf5f3e5`, based on the unchanged `41a9f3f` intelligence. Gateway deployment: `curtainsuk-staging-973pjorrb-hamzas-projects-4ef62f35.vercel.app`; upstream: `hci-strategy-performance-staging-drk2k98rz.vercel.app`. Both are previews.

Intelligence baseline: HCI `41a9f3f4a878a81cfed83ebeca47aa968e0744c7`. CurtainsUK branch: `feature/curtainsuk-phase-5a-prelaunch`. Gateway: https://curtainsuk-staging-gateway.vercel.app/admin/curtain-consultation. Dawn remains unpublished, theme `182264234363`; Minimal is untouched. No payment, Merchant Center, supplier ordering or HCI customer activation was enabled. PR #24 remains draft/unmerged.

## Implemented

- Real protected server-to-server HCI adapter; browser sends only bounded commands to CurtainsUK. Preview-only flags and existing staff authorization are mandatory.
- One optional reference image, up to 2 MiB JPEG/PNG/WebP, original observation preserved, editable/confirmable palette with up to three colours in each category.
- Shared image-first and guided-first consultation, five exact named directions, independent strategy/fabric feedback, one refinement.
- Exact Fabric Master hydration through the existing customer-safe retail projection. No alternative fabric is silently substituted.
- Sample/Make Curtains links carry consultation, exact fabric, supplier SKU, strategy, refinement digest and known window context. Theme changes also update an existing sample's consultation context and bind the return link to the exact saved session.
- Private immutable session versions with owner scoping, request digest/replay checks and optimistic revision enforcement. No raw image files are stored. Old sessions are excluded from reads after seven days; this is not a physical deletion schedule or approved customer retention policy.

The older `hci-release.ts` quality-blocked provider remains unchanged for its legacy contract. This internal trial uses `hci-integration-contract.ts` pinned to `41a9f3f`, not the legacy provider. It grants no customer release approval.

## Demonstrated integration defects fixed

1. HCI's colour question returned 18 options; the gateway accepted only 12. It now accepts a bounded 24 and has regression coverage. The previously rejected answer retried successfully with its saved request identity.
2. Staff-preview cards incorrectly called `/catalog`, a Shopify-proxy-only route. They now use an authenticated CurtainsUK GET endpoint delegating to the same safe retail projection. Exact-ID/CTA regression passed.
3. A new Standard consultation inherited an old Apex project during handoff because no explicit window query was carried. Explicit Standard/Bay answers now produce a safe window handoff hint, retained on resume. No ranking logic is copied.
4. Returning from an older sample could open the newest consultation. The theme return URL now carries the exact session, with a validated sign-in/resume path. Both assets are now uploaded and the remote return restored the original shortlist.
5. Resuming the configurator at Price displayed a stale loading summary after catalogue hydration. Theme commit `7f883fc0574ec44cb360cd328c0e2e7fe4c11496` observes only the summary's select contents and updates the text without moving the current step/focus or changing commerce. A regression failed before implementation and passed afterward; all 146 storefront tests, changed-test lint and JavaScript syntax checks passed.

## Browser evidence

| Journey | Evidence | Remaining |
| --- | --- | --- |
| Desktop image-first | Room 20 upload; grey removed, cream added, beige moved, white kept; palette confirmed; 14 questions/22 calibration reactions; four available directions and one honestly unavailable; separate feedback; final shortlist; Sadira Lagoon saved in Dawn samples; latest assets preserve Standard window and return to exact original shortlist | No successful integrated Draft Order |
| 390px guided without image | All questions/calibration; prominent Skip; strategies and one refinement; Wilfred Bluebell exact fabric; Standard window; 180 × 210 cm, pencil pleat, bonded combined layer, pair; safe confirmation outcome | Manufacturing pattern-match evidence missing; no numeric price/order |
| 412px guided with image | Guided questions/calibration; one licensed image; unchanged palette accepted; same session; directions; separate reactions; final shortlist | Sample/checkout handoff with latest theme assets and complete viewport matrix outstanding |

After the final deployment, an explicit older-session return restored the original image-first shortlist despite a newer consultation having been created. Its Make Curtains link correctly carried `pt-4262-770` and `standard-window`. The desktop configurator retained Sadira Lagoon at 180 × 210 cm, pencil pleat, bonded combined layer and pair; the commerce engine safely returned confirmation required due to missing pattern-match evidence. No order was created. Advancing the pre-existing configurator before catalogue hydration briefly left a stale loading summary; returning to the Window step after hydration refreshed it. Fast-load navigation deserves another check after the prepared theme assets are uploaded.

### Remote Dawn verification after Shopify sign-in

On 13 September, Shopify CLI sign-in completed and only `assets/curtainsuk-premium.js` and `assets/curtainsuk-storefront.js` were pushed to existing theme `182264234363`. Shopify returned role `unpublished`. Readback of both initially uploaded assets matched local SHA-256 exactly. The subsequent summary-only fix above was uploaded to the same theme and verified remotely.

Desktop: Order Sample for Sadira Lagoon updated the existing saved sample without adding a duplicate. After hydration, Resume my curtains linked to exact `pt-4262-770` with `standard-window`. Return to my shortlist included the original consultation ID and restored that original final shortlist.

390px: Make Curtains preserved the same exact consultation/fabric/window. Reload at the saved Price step now updated the summary automatically to Standard Window / Sadira Lagoon / Pencil pleat / Bonded lining-interlining / Pair after hydration, without navigating back. Screenshot inspected.

412px: Price check retained 180 × 210 cm and all those selections, returned confirmation required, showed `enquiries@curtainsuk.com`, and kept checkout unavailable. No numeric price was invented and no Draft Order was created. The full viewport/checkout matrix remains incomplete; these checks resolve the asset deployment and summary-hydration blockers only.

Screenshots were inspected in the browser at desktop, 390px and 412px. These are functional staging checks, not a human aesthetic-quality verdict. One return request temporarily reported authentication required; a reload restored the saved session without a new revision or data loss. No authentication safeguard was weakened.

## Performance

Real desktop initial strategy generation including gateway persistence and fabric hydration completed in approximately 2.96 seconds for one observed request. This is a single browser measurement, not p95. Full integrated cold/warm/refinement/sample/Make Curtains distributions are still unproven.

HCI-only protected hosted benchmark: 24/24 successful requests over 12 frozen histories. Warm strategy p50/p95: 966/1,167 ms (11 warm requests); warm refinement: 945/1,186 ms (11). Including cold starts: strategy p95 7,472 ms; refinement p95 6,672 ms. Catalogue initialization accounted for 5.08–5.46 seconds on the two cold requests. All 24 output digests matched the preceding adapter deployment. No warm ranking optimization was made.

The final isolated `41a9f3f` deployment was benchmarked again: 24/24 output digests still matched; warm strategy p50/p95 848/1,027 ms, refinement 879/1,076 ms. Two cold requests took 7,222 and 5,967 ms. This confirms isolation excluded the concurrent quality-refinement changes; it does not replace the outstanding full integrated timing distribution.

## Validation

- Latest storefront suite: 145/145 passed, including existing commerce safeguards. The full CurtainsUK suite was rerun after the final fixes.
- Nine integration/UI regressions passed; sign-in session-return regression is included in the storefront total.
- Changed TypeScript lint and staging builds passed. The isolated pinned HCI suite passed 854 tests. Concurrent quality work in the original HCI checkout is excluded: the final adapter lives on `codex/curtainsuk-integration-41a9f3f`, based directly on the requested `41a9f3f`. This integration does not update or merge PR #24.
- SQL rollback rehearsal: duplicate request creates exactly one revision, stale revision rejected, another owner cannot read the session. Browser roles have no access to private state.
- No pricing, daily stock, 30m floor, shipping, bonded-layer costing or Draft Order engine files changed.
- Staged-file scan checked the 54 CurtainsUK and 8 HCI files for the actual service/platform secrets, private data paths and common credential/private-key patterns: zero findings. Anonymous remote requests to consultation catalogue and assets returned HTTP 401.

## Exact remaining blockers

1. **Shopify CLI authentication and theme upload: resolved.** Both context assets and the small summary fix are on unpublished Dawn. Remote sample, exact-session return and mobile configuration checks are recorded above.
2. **Manufacturing data for recommended test fabrics:** `pt-8837-768` (Wilfred Bluebell), `pt-4262-770` (Sadira Lagoon) and `pt-7247-711` (Java Ocean) all have `pattern_match_type = null`. Their current supplier price snapshots are approved and expire on 15 September; the price is not the missing datum. The existing combined confirmation message masks this specification boundary. Obtain real pattern-match evidence or use a genuinely recommended, fully specified, stock-eligible fabric; do not invent metadata, change ranking or bypass commerce to manufacture a passing order.
3. **Full browser checkout matrix:** no new Draft Order was created in this integration run. Complete image-first → price → availability → delivery → test Draft Order and all requested desktop/390/412 handoffs after the above gates. Recheck development-store payment safety before creation.
4. **Shortened questions:** pinned HCI still asks normal questions after image confirmation. Palette-aware suppression needs an approved intelligence-contract change; no guessed answers were injected.
5. **Cold latency and approval:** cold requests remain 6.7–7.5s with an honest loading state. Full integrated hosted distributions, human recommendation/UX approval and customer privacy/retention approval remain outstanding. Customer HCI stays disabled.
