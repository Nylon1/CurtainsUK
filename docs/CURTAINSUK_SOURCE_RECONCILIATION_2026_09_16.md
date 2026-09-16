# CurtainsUK source reconciliation — 16 September 2026

Preservation only. No deployment, Shopify write, Supabase write, supplier retrieval/import, PT resumption, payment test, publication or merge was performed.

## Authority and branch

- Read remote README, Project Ledger and Frontend Register before applying changes.
- Branch: `reconcile/curtainsuk-source-2026-09-16`.
- Base: current remote main `dd28810af7407c2c8c35d0d8e3ff8c1001859727` (including the newer documentation and merged PR #2 cleanup).
- Original local checkout remains on `main` at `f7a281a7773b89f0b6785f3027053809c2de0463`; it was not reset, overwritten or pushed.
- Reconciliation uses a separate local worktree, retaining the original private PT evidence/checkpoints and untracked source folders.
- Verified remote `archive/deployed-gateway-2026-09-16` points exactly to `c762683d348874ceccbcfb62cc3d431e20cc4168`. This remains the deployed gateway baseline; main was not rolled back to it.
- The new README, ledger and frontend register remain unchanged. Their historical audit counts are not refreshed by this preservation task.

## Importer fixes: file-by-file and hunk-by-hunk

For each original commit, compared its parent against remote main for its affected paths, then inspected every original patch hunk. Remote main has no intervening changes in these five paths. The three readiness files are absent from main; the two shared-image files exactly match the original commit's parent. None of the fixes is already present or superseded. Both commits therefore apply unchanged, retaining original provenance with `cherry-pick -x`.

| Original | Preserved commit | Files / hunks |
| --- | --- | --- |
| `496bd554b1ab06b1041de35a29d183b79c65b8e0` | `73ee2fb` | `lib/supplier-sync/webtex-product-readiness.ts` (39 lines); `lib/supplier-sync/__tests__/webtex-product-readiness.test.ts` (33 lines); `scripts/lib/webtex-browser-extraction.ts` (81 lines). Three complete new-file hunks, 153 additions. |
| `f7a281a7773b89f0b6785f3027053809c2de0463` | `2b34a5b` | `lib/fabric-master/discovered-media.ts` (one helper-change hunk); `lib/fabric-master/__tests__/discovered-media.test.ts` (one regression-test hunk). 31 additions, two removals. |

Nothing from either commit was omitted or rewritten. No old Apex routes, old README, local sitemap differences or unrelated local-tree changes were brought across.

## Premium candidate: Shopify is authoritative

Authenticated read-only theme listing confirmed:

- `182310502779`: **CurtainsUK New Design – Live Base**, unpublished.
- `182264234363`: **CurtainsUK Phase 4A Dawn 16**, live.
- `182264136059`: **Updated copy of Dawn**, unpublished donor/reference.
- `79650455661`: **Minimal**, unpublished rollback.

Downloaded candidate `182310502779` using Shopify CLI `theme pull` into a new empty local capture directory. No theme push, editing, creation or publication command was run.

The complete download is preserved under `shopify-theme/curtainsuk-new-design-live-base/`: **386 files, 4,673,064 bytes**. It contains 70 CSS, 41 JavaScript, 77 JSON, 109 Liquid, 88 SVG and one GIF file across assets, config, layout, locales, sections, snippets and templates. This includes current `settings_data.json`, all downloaded templates and inherited commercial sections, rather than only the homepage overlay.

Commit: `8fb4f6f`.

### Comparison reported before preservation

The prior local candidate folder held 14 theme files plus three historical documents:

- **12 theme files are byte-identical** to Shopify.
- `sections/header-group.json` and `templates/index.json` differ only because Shopify prepended its standard nine-line auto-generated-file warning. Their remaining bytes/content match.
- No functional/layout/configuration difference was found among those 14 overlapping files.
- The previous folder was an incomplete overlay: the download preserves **372 additional theme files** needed for a complete theme-file snapshot.
- The three original local documents (`README.md`, `COHESION.md`, `SERVICE_PANELS.md`) are preserved separately in `docs/source-reconciliation/2026-09-16/candidate-history/`. They remain historical evidence, not the authority for current remote state.

The Shopify copies of both JSON files were retained with their generated headers. No local code was uploaded or substituted into Shopify.

Evidence:

- [Complete per-file SHA-256 manifest](source-reconciliation/2026-09-16/candidate-manifest.json).
- [Local-versus-Shopify comparison](source-reconciliation/2026-09-16/candidate-local-comparison.json).

Scoped `.gitattributes` entries disable text conversion only for the candidate and donor preservation directories. Every one of the 386 staged candidate Git blobs was checked against the downloaded bytes, with zero mismatches. A checkout of this subtree recovers the exact captured theme-file bytes.

This is a complete **theme-file** snapshot, not a backup of Shopify products, pages, navigation records, Files/CDN objects, app installations or secrets. Existing references to those separate store resources are preserved, not re-created or modified. Any future upload/publication remains a separate explicitly authorised operation.

## Donor/reference preservation

Commit: `5e7ebae`.

`shopify-theme/curtainsuk-updated-dawn-preview/` preserves the existing local donor overlay: **nine theme component files and two historical documents**, all eleven byte-identical to their original files. Added `REFERENCE_ONLY.md` labels the directory as partial donor/reference material, not an active development target or complete theme export. Historical README/image-repair wording is retained unchanged; it does not override the current register.

[Donor manifest](source-reconciliation/2026-09-16/donor-manifest.json) records each original file hash. No fresh full export/comparison of the remote donor is claimed or needed for this local-reference preservation.

## All three frontends preserved

1. Live Shopify: theme `182264234363` unchanged; no live files were pulled into or replaced by the candidate.
2. Premium Shopify: exact unpublished candidate file snapshot preserved as above.
3. Next.js/Vercel frontend: all remote-main `app/`, `components/` and `public/` paths remain unchanged (231 tracked files). No standalone frontend was deleted or designated obsolete. Supporting gateway/HCI/storefront modules are also unchanged by this task; only the five approved importer/media files changed application source.

Existing committed Shopify source and the old local workspace are preserved. Nothing was deployed to make these intentionally different bodies of work look identical.

## Validation

| Check | Result |
| --- | --- |
| `npm run test:supplier-sync` | 15 passed, zero failed; local fixture tests, no supplier import |
| `npm run test:fabric-master` | 58 passed, zero failed; includes shared-image/identity regressions |
| ESLint on the five importer/media source and test files | PASS |
| `tsc --noEmit --incremental false` | PASS |
| Candidate JSON parse, allowing Shopify's leading generated comment | 77/77 PASS |
| Candidate staged Git blob versus captured file bytes | 386/386 exact |
| Original donor file SHA-256 comparison | 11/11 exact |
| Known local credential-value comparison against preserved theme files | Zero matches; values never emitted or committed |
| Credential/private-key/JWT pattern scan of candidate | Zero matches |
| Protected frontend, storefront integration, schema and current documentation diffs | No changes |
| `git diff --check` for reconciled code/docs/attributes | PASS |

No production build, payment/browser rehearsal, full-theme audit, supplier extraction or historical test campaign was repeated: application changes are the two previously implemented fixes, and theme contents are preserved without edits. Existing runtime/theme warnings are not repaired or declared resolved by byte-preservation checks.

## Remaining source drift / review boundary

- This branch is unmerged; remote main stays at the fetched approved base unless someone changes it independently.
- The original local main remains divergent by design. Continue review from this reconciliation branch, not by pushing that old main.
- Gateway deployment still points to `c762683`; reconciliation is not a release.
- Private supplier evidence, PT checkpoint/media queues and runtime secrets remain outside Git. PT stays owner-paused before Madeira, with no new supplier requests.
- The donor snapshot is an explicitly partial local reference, not a claim that every remote donor file is archived.
- Future edits in Shopify after the capture timestamp would require a new comparison; the manifest identifies exactly what was preserved here.

Do not merge or deploy until the owner has reviewed the reconciliation branch. No frontend, theme, runtime, stock, payment or recommendation behaviour was changed remotely.
