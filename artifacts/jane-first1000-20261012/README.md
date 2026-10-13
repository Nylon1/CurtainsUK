# Jane first 1,000 eligible fabrics

Independent hosted readback at **12 October 07:08:34 UTC** confirms **1,008 / 11,517 eligible identities**, 1,008 matching current/receipt hashes and 1,009 total knowledge rows. All 168 saved plans and receipts match the exact approved manifest prefix without duplicate IDs. Five eligible historical records remain no-ops; the sixth historical excluded record is preserved and must not be offered for purchase. The operator is continuing the same job; this is a progress snapshot, not completion.

Two later interruptions were recovered after exact read-only reconciliation: a read-only operator response timeout at546, then a failed read-only source lookup at978. No pending write existed in either case. The source reread succeeded; monitoring subsequently identified one SQLSTATE57014 cancelled statement. Writes remained blocked until the five-minute error window was clean. Temporary resource/activity holds continue to reconcile and recover automatically without raising limits or replaying uncertain writes.

Migration history is unchanged at81 entries, latest20261011180354. Database size is702,008,467 bytes; advisory tables/indexes total2,678,784 bytes. Completed backup1937679152 remains the recovery point checked before each batch under Nylon1's24-hour RPO. It predates these writes, so a subsequent verified backup is still required. C: free space was41,532,203,008 bytes; Toshiba completion remains unverified. No migration, source mutation, deployment, paid AI call, public activation or PR167 change. The10:00UTC deadline remains pending explicit extension.

Implemented code remains942556b2. Earlier12 overlap/transport tests and9 retail-recovery tests are preserved; this milestone adds operational evidence only.
