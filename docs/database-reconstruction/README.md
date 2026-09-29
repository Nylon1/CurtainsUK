# Already-applied database source evidence

> **Historical/reconstruction documentation only. The SQL in these Markdown files has already been applied to production. Never execute it as a migration, put it in `supabase/migrations/`, add it to a schema/seed path, or feed it to a release script.**

This directory records three applied definitions that were absent from the protected CurtainsUK migration files at `release/production` commit `4bcfc8bd13838372a3547af9b58e8cbe3bcd39d1`. The source is a read-only capture of `supabase_migrations.schema_migrations.statements[1]` in Supabase project `hqysjumypgeapgmqkcrx` on 2026-09-29. Read-only live object introspection was recorded in the preceding database source reconstruction audit. No migration was applied or database object changed to create this record.

| Already-applied version / name | Object | Original ledger MD5 | LF-normalized reference SHA-256 |
| --- | --- | --- | --- |
| [`20260919165007 fabric_visual_knowledge_read_model`](20260919165007_fabric_visual_knowledge_read_model.md) | `curtainsuk_private.fabric_visual_knowledge` view | `2283466112bd687e3623dc31f5c0c210` | `50fba613bf03f9468b7b49dde27b1c2c8143810afc7b26b308f9ae635aab6749` |
| [`20260927192625 naila_prepared_only_read`](20260927192625_naila_prepared_only_read.md) | `curtainsuk_private.search_retail_fabrics_naila_v1(jsonb,integer,integer,integer,integer)` | `450df8eb56faaf4f4d46ff279223d998` | `97e6dd6648621b1466c585b80794575dd11f6912304e4b9548a9fcf591ba17c5` |
| [`20260927225121 naila_prepared_price_level_ids`](20260927225121_naila_prepared_price_level_ids.md) | `curtainsuk_private.retail_guide_price_level_fabric_ids_naila_prepared_v1(integer,integer)` | `8ead0f94f5651fd41026c8fd3732ceeb` | `29041a0d7a0594675a1ad258dacb82a0ae3a5f9d2494b26ac4efacb91d564874` |

The MD5 values are hashes of the original ledger text. The SHA-256 values are hashes of the SQL text after converting CRLF to LF **without trimming whitespace or terminal newlines**. The Naila Browse statement has 6,139 original characters and 6,030 after line-ending normalization; its two trailing LF characters are part of the checksum. The other two statements have no terminal newline. Each document gives the exact normalized byte length so the SQL block can be extracted without including the Markdown fence delimiter.

## Unresolved ledger records

These are documented as unresolved; no SQL has been reconstructed or inferred for them.

| Applied version / name | Evidence | What remains unverified |
| --- | --- | --- |
| `20260921205826 multi_curtain_paid_order_contract` | The ledger's `statements` field is NULL. A same-version file exists in current protected Git, and the three named House tables and expected columns were observed live. | The applied SQL text, historical backfill effects, and complete constraint/side-effect parity cannot be established from the NULL ledger record. |
| `20260925190000 prestigious_cut_price_basis` | The ledger stores an 88-character descriptive note instead of executable SQL. A same-name historical Git file exists; four key function bodies match current live definitions. | The complete applied SQL identity and historical DML effects cannot be established from the note or current function bodies. |

These artifacts document the three recovered definitions; they do **not** make the active migration chain replay-complete. The preceding lineage audit also found 19 applied statements represented only in reachable Git history, absent from protected HEAD. A future isolated rebuild and migration-tooling review are required before claiming full source reconstructability.

## Execution-path check

- All files here are `.md` under `docs/database-reconstruction/`; no `.sql` file or active migration file is introduced.
- `supabase/config.toml` has `[db.migrations] schema_paths = []`; the active migration directory is `supabase/migrations/`, and the seed path is `./seed.sql`. This directory matches neither.
- The repository's scripts and workflow migration references use explicit paths under `supabase/migrations/`. The package `prebuild` bundles explicit component entry points, and `next.config.ts` traces explicit runtime assets under `lib/storefront/hci/`. No repository build or release script reads this directory.
- The PR should be checked again if future tooling introduces a repository-wide SQL/Markdown loader. Do not move or copy these definitions into an executable path without a separately reviewed replay plan.
