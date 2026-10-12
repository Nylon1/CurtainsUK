# Indexed source lookup correction

At **1,866 / 11,517**, the operator switched at a verified read-only recovery wait with no pending write or journal lock. Independent readback confirmed all historical records and permissions unchanged. The new read-only probe passed, then the same job actually resumed beyond1,866. Latest receipt in this evidence snapshot: **1914** at **2026-10-12T08:44:38.356Z**.

Hosted query plans identified the recurring source-lookup problem: encoded ID expressions inherit the **C collation**, while the valid existing fabric identity index uses **default**. PostgreSQL therefore scanned the broader eligibility index and filtered fabric IDs afterward. Strictly validated ASCII identity literals preserve the approved IDs and permit direct use of the existing primary key. No index, schema, source record, eligibility rule or generated write plan was changed.

The estimated plan cost dropped from1,735.85 to30.08. One bounded six-ID execution took20.825ms (planning24.557ms), with104 shared-buffer hits and zero disk reads. This sample does not establish whole-run throughput or cold-cache performance. **Nine focused tests passed**, including rejection of SQL syntax/control characters, all11,517 manifest IDs, local PostgreSQL result/order/null equivalence, index usage, timeout recovery and retail recovery. The canonical source-query fields are unchanged. All pressure, source/publication, supplier, ownership, backup, timeout and grant-restoration gates remain active.

No migration, new index, canonical data change, paid AI call, deployment, public activation or PR167 change.10:00UTC deadline remains pending separate extension. Prior cancelled reads, Retry-After waits and all receipts remain preserved.
