# SDG Production stock promotion — 18 September 2026

The owner authorised a fresh authenticated SDG Trade Portal stock read and Production promotion of exact validated observations. This was a one-time operator run. The daily scheduler was not changed.

- CurtainsUK application/database work: PR #10, merged as `54dfa145c3cc2fe2dd08d04bb02ffd1f037dca04` (including the approved scoped materialiser from `2f3c898`).
- Matching Production gateway deployment: `dpl_3rj5u8uNF4GxyadnwSXsVDJfPswM`, alias `https://curtainsuk-staging-api.vercel.app`.
- Private local source report: `artifacts/sdg-portal-private/dry-run-2026-09-18T18-06-34-267Z.json`; SHA-256 `d1788d83fd62355cd6643dcd8c52a3fc0ec994bd8a95f2bbb564e288400f2835`.
- The local report and generated SQL packets contain private supplier evidence and are excluded from Git. The source snapshot in Production retains the exact Product/detail SKU reference, retrieval timestamp, current primary metres, and separate raw portal detail (including future/offsite data). No bearer token was stored in a Production secret or committed.
- The manifest had 8,636 non-discontinued SDG identities and matched Production Fabric Master by supplier SKU and brand. Retrieval completed in 281.9 seconds with 87 requests, no retries or throttling.

| Result | Count |
| --- | ---: |
| Expected current SDG identities | 8,636 |
| Fresh exact metre observations imported and materialised | 7,861 |
| Primary stock at least 30m | 5,355 |
| Primary stock positive below 30m | 1,177 |
| Primary stock explicitly zero | 1,329 |
| Unknown/unresolved Zoffany | 775 |
| Future-positive supplier records, retained separately | 1,191 |

The 775 unresolved Zoffany identities consist of 636 records affected by Product/detail HTTP 404 batches and 139 SKUs absent from successful responses. They were not interpreted as zero, approved, or materialised. Their stock remains unknown.

The 7,861 validated snapshots were imported in 197 serializable 40-record packets. Each packet required exact Fabric Master supplier/brand/SKU identity, current approved supplier evidence, and the existing one-to-three-record scoped materialiser. Production has 197 matching supplier runs, 7,861 source snapshots, and 2,751 scoped materialisation events covering exactly 7,861 rows. Every materialised quantity and timestamp matches its supplier snapshot; every snapshot is validated and approved. The fresh supplier timestamps range from 18:07:08 to 18:11:20 UTC. Existing 72-hour freshness rules apply; observations will become stale beginning 21 September 2026 around 18:07 UTC unless a new genuine refresh occurs.

Representative Production commercial evidence after promotion:

- `AARC520004` — 44.3m: curtain stock floor passes and samples pass; a curtain job must also require no more than 44.3m.
- `AARC520020` — 20.3m: curtains fail the intentional 30m floor; samples pass because current stock is positive.
- `CCF0874-01` — 0m: curtains and samples fail.
- `ZALD332703` — unknown Zoffany: availability requires confirmation; no stock claim or sample eligibility.

Focused commercial-readiness tests passed (5/5), including 30m floor plus order-specific required metres. Production `fabric_commercial_evidence` agrees with those four cases. HCI bundle, Shopify theme, and scheduler were unchanged. The pre-existing scheduler refresh-failure flag can remain true on `daily_stock_position` while the new genuine observation is within 72 hours; the current stock policy correctly evaluates the observation's timestamp independently. Routine daily refresh remains separate work.
