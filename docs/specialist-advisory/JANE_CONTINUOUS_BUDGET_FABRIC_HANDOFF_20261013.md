# Jane continuous daily budget and fabric handoff, release review

**Status: implemented and locally tested; not migrated, merged or deployed.** Source branch starts from protected `release/production` commit `58998518f10f20d3f0dd22dcef205e4f025c1a26`. PR #169 is merged; this is a separate successor. Jane is already public on MAIN theme `182339731835` and the existing production Vercel project. The current dated budget map covers 13 and 14 October UTC only. No further model call is needed for this change.

## Behaviour

- On the first paid reply of each UTC day, the server obtains one private `advisory.evaluation_runs` row capped at **US$5** and expiring at the next UTC midnight. A transaction lock makes creation idempotent across Vercel instances. The browser cannot choose or create a spending ledger. Existing per-consultation reservations still apply.
- A trigger checks all receipts for the same consultation, including the existing 13–14 October dated runs, so a saved consultation cannot restart its **US$1 total** allowance at midnight or during migration. An over-cap insert or settlement fails within the same transaction. The existing conservative pre-call reservation and uncertain-charge rules remain.
- Jane's Browse and canonical fabric-page links pass only the exact Fabric Master ID. The signed chat independently reads the current customer-safe retail detail. It asks the customer to consent before sharing that selection. Out-of-stock fabrics can be discussed as design references and Jane can suggest alternatives, but `orderReady` remains the purchase gate.
- The canonical profile's eight “Make curtains” links start without `href` and are removed from keyboard tab order. They are enabled together only after a successful exact-ID retail response with `orderReady: true` and the global purchase control enabled. A failed lookup, wrong ID or stock/price ineligibility leaves them disabled. The Browse fallback detail now uses `orderReady` instead of `browseReady`.

## Exact hosted SQL review scope

Only `supabase/migrations/20261013210935_jane_continuous_daily_budget.sql` is proposed for project `hqysjumypgeapgmqkcrx`. Its SHA-256 is `15B6AE71557B3475E8BE445F37B349030D468AE0C33F80EA9072199132C96D66`. It creates:

1. Private `advisory.public_daily_runs` with one row per UTC day, primary key and unique run ID, RLS enabled, no direct customer or runtime table grants.
2. `advisory.ensure_public_daily_run()`, a fixed-cap `SECURITY DEFINER` function executable only by `advisory_runtime`.
3. `advisory.guard_public_consultation_spend()`, an internal trigger function with no caller grant, and trigger `advisory_public_consultation_spend_guard` on the existing `advisory.spend_reservations` table.
4. `advisory_spend_session_global` on `advisory.spend_reservations(session_id)` so the across-day receipt check remains bounded.

It inserts one new `advisory.evaluation_runs` row per active UTC day. It changes no Fabric Master, stock, price, Naila, visualiser or checkout data. The daily mapping and run rows require under a kilobyte per day before normal accounting receipts. The trigger adds one indexed session-receipt sum per public reservation or settlement; observe latency and database I/O after activation. The migration builds one index on the existing advisory receipt table and briefly locks it during index/trigger creation, with `500ms` lock timeout and `3s` statement timeout. Measure that table's current size before approval; stop if the index cannot build safely within the limit. The SQL is atomic.

**Hosted preflight and stop conditions:** confirm the project is healthy; confirm a recoverable completed backup within the owner's 24-hour limit and newer than affected advisory writes; confirm no active migration conflict and the reviewed schema/roles match; capture consultation and spend table counts, active traffic and query latency. Stop if the backup cannot be verified, migration history drifts, a lock times out, the migration checksum differs or the database shows resource pressure. The migration requires explicit owner approval of this exact SQL after protected review. Supabase Pro alone is not approval.

**Rollback:** first disable Jane's public API switch and restore the previous exact protected Vercel deployment and dated budget map. After 14 October the previous map alone cannot serve new paid replies; leave Jane fail-closed until a reviewed replacement is ready. If the migration itself must be reversed after an approved recovery decision, drop `advisory_public_consultation_spend_guard` on `advisory.spend_reservations`, then drop both new functions, `advisory.public_daily_runs`, and `advisory_spend_session_global`. Keep the historical `advisory.evaluation_runs` and receipt rows for audit. Do not remove consultations or the existing advisory schema. Recheck RLS/grants, the restored deployment and a signed synthetic request before re-enabling public replies.

## MAIN theme file scope

The existing live MAIN theme was read-only pulled into `C:\Users\hamza\.curtainsuk-jane-private-preview\theme-backups\2026-10-13-jane-budget-fabric-preflight`. Protected-source comparison showed no unrelated live-only text in the existing files. Two new assets are absent on MAIN. Upload only these eight files after the protected merge and a fresh pre-write comparison:

| Theme path | Purpose |
| --- | --- |
| `assets/curtainsuk-jane-fabric-entry.js` | Exact-ID Ask Jane link in Browse detail; currently absent on MAIN |
| `assets/curtainsuk-jane-chat.js` | Allow consented discussion of an unavailable fabric without purchase claims |
| `assets/curtainsuk-storefront.js` | Stock-gated fallback View Fabric button and Jane adapter call |
| `assets/curtainsuk-profile-availability.js` | New exact-ID retail availability check for canonical fabric profile |
| `assets/curtainsuk-fabric-experience.js` | Existing, already protected Jane adapter call missing on MAIN |
| `sections/curtainsuk-fabric-browser.liquid` | Existing, protected conditional adapter loader missing on MAIN |
| `sections/curtainsuk-metaobject-fabric-discovery.liquid` | Disabled-until-checked curtain links and Ask Jane entry |
| `templates/page.browse-fabrics.json` | Turns on the already defined Jane handoff setting |

Never push the whole theme or publish a duplicate. Preserve the live originals in the backup directory, read each updated file back and compare SHA-256 with the exact protected source. Test in-stock and out-of-stock fabric detail on desktop and phone, exact-ID Jane consent, and checkout isolation. If a fresh live file contains new Shopify-only changes, stop and reconcile before overwriting it.

The 13 October read-only preflight SHA-256 pairs below are `live → local candidate`. The live chat and profile Liquid are text-identical to the preceding protected source apart from line endings; the browser section and fabric experience asset differ only by Jane's already protected hook. Recheck these immediately before any push.

| File (same order as above) | Live SHA-256 | Candidate SHA-256 |
| --- | --- | --- |
| Jane fabric entry | absent | `CD3FB024F0AD5AEEF0800B2B2680A5C5C45017DE65DA07F8D3025258522A9383` |
| Jane chat | `9A429CF2349F6143A3782FFA080962F9A17A0421ED5AB78B8A6FA05FCDEB5555` | `B98493B7D2069FE923189DE023A717414E87C0944D53999C4E75300174FFE82A` |
| Storefront | `2AAB0C7F6E60B0F9E350115DC0A65897F085C24FAFFE9BD9361D7D235DFFE2AF` | `2CC05CCAA2CE3F3B4EBE9CA0D71088B2796355547CC00970F3F7DAB47E41BBC5` |
| Profile availability | absent | `4EB074332D0170145719FAE5E73F2E8E0EBC8B638B81B8BBECA082B1FA0C05D5` |
| Fabric experience | `F73ED884FE3866C28ACB2CA8E66CFEA72FD1C6CEC28302582AFCE8DB178956EA` | `F59C5BE9E5E9525F83B23D19535AA4852A0B364F2CA95919DE0B835A711EFFDB` |
| Fabric browser section | `5F94BC5D8737CEBCB8D261F2BA5541EBA015A61E96CC0671CA530AB3B22AE15E` | `5E9F406C52AAC3137F231A5F64D1257D2DD3C162EA78305A126F28A0811C2EF8` |
| Canonical fabric profile | `AA77522CCEB5571596BA121BF2427B45C6EE58DDE5B203FA26FA1BC662474099` | `09393E78B7A89EC3B302BF8D1B7653E0752525916607B610FA6DAD02A2BB6929` |
| Browse template | `68C88FE284187601CCD9836008F8E5FFC1C96CF7BF29F599FC19AFAD9975B61C` | `1146D6C4ABBC7541AA4D147AC4B8ED63C53EC11FC9B6FDF45F93E3D52A741E03` |

## Validation and release order

Local PGlite tests exercise UTC ledger creation, idempotence, cross-day consultation spend, private role denial and invalid-ledger failure. Theme tests exercise all eight disabled links, exact-ID re-enable, unavailable/mismatched/failing retail responses and Jane's out-of-stock alternative handoff. The advisory suite passed **208/208**. The broader storefront suite passed **329/330**; the one failing pre-existing test reads an absent historical `curtainsuk-new-design-live-base/sections/curtainsuk-configurator.liquid` fixture, unrelated to this change. Shopify Theme Check found **zero errors** and existing warnings. No hosted migration, hosted budget test, live handoff test or live file upload has yet occurred.

After exact-head policy approval and both production checks: merge the reviewed code, verify the current backup, apply only the approved migration to the existing project, read back objects/grants and run a synthetic fixed-cap concurrency test, stage the exact protected Vercel deployment, test signed consent/reply/recovery/deletion and budget failure, promote it, then upload only the eight theme files. Confirm all live hashes and repeat exact-ID, out-of-stock, keyboard and mobile checks. Keep automatic fabric refresh off. If any stage fails, leave or return Jane's previous live version, record the failed boundary and use the rollback above.
