# Jane 10,000 milestone

Independent bounded read-only hosted verification at **12 October 2026 23:08:48.774692 UTC** confirms **10,002 / 11,517** approved eligible identities, leaving **1,515**. This is partial population, not completed reconciliation or launch readiness.

Every current/receipt hash and the whole-job identity/content digests match the exact ordered manifest prefix in 1,667 verified journal batches. Zero duplicate identities. Six historical records and their job are exact; five eligible records remain no-ops and the excluded historical row remains preserved. Two expired/uncommitted resolutions remain recorded separately. Permissions are restored; there are 10,003 total knowledge rows.

Active implementation SHA-256 `13c498432a97f9949b3ef46304976fecc799734db0a021d608eb4721528a08b3` and binding SHA-256 `9af9e2ffb08d1b236bc7bdd981a2f345bb113d7777f4558f6b8715878bd5575e` are unchanged. The 35 checked dependencies include all running safety controls. Migration history remains 81 entries, latest `20261011180354`. Database size: 721,603,731 bytes; advisory knowledge table/indexes: 13,950,976 bytes.

A 22.376-second committed batch stopped at 9,936 under the unchanged 20-second ceiling. Exact readback verified it before resumption. A later response timeout affected an initial read-only admission query. No ambiguous write was replayed, history rewritten, or limit relaxed. The same existing operator repeated fresh admission and continues beyond this snapshot.

The renewed monitoring credential's unchanged 23-hour ceiling ends 13 October 19:18:30.791 UTC. Completed physical recovery point remains 12 October 18:32:09.471 UTC, backup 1945273696, continuously checked under Nylon1's 24-hour RPO. Later writes require a subsequent verified backup; Toshiba completion remains unverified.

No migration, canonical mutation, paid AI call, Jane deployment/merge or public activation. Automatic updates remain disabled. The separately authorised PR #183 single Shopify asset used protected source, not this branch, and did not change the indexer.

Evidence: `hosted-readback.json`, `verification.json`. The same job continues under all existing gates.
