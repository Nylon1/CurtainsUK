# Jane: 11,004 independently verified

Observed 13 October 2026 at 00:24:32.843476 UTC. The directory retains the initial run date; the evidence timestamps are authoritative.

The existing job `ac425f78-f6ec-4623-97bb-df8763d79d5a` has processed **11,004 / 11,517**, leaving **513**. The bounded read-only hosted audit and a fixed fsynced journal prefix agree on all identity and content digests across 1,834 verified batches. Zero duplicate IDs, five historical eligible no-ops, all six original records and restored transaction-local permissions were verified. This is progress, not completed population or reconciliation.

The operator response timeout at checkpoint 10,524 left the next plan uncertain. Two independent readbacks after its expiry proved no write, no pending IDs/receipts, no old or prepared transactions and restored permissions. The existing tested procedure recorded the expired-uncommitted plan in the append-only journal. Fresh admission generated new SQL, and the unchanged operator resumed. No uncertain SQL was replayed. Three such resolutions are retained in the complete journal.

All 35 implementation dependencies and the operator binding match their approved hashes. Migration count remains 81, latest `20261011180354`. Observed database size is 723,405,971 bytes; advisory knowledge size is 15,040,512 bytes. Resource admission, six-record transactions, pacing, latency ceilings, backup RPO and credential-age limits remain unchanged.

Files: `hosted-readback.json` is the independent bounded database observation; `verification.json` records the local comparison with the exact journal prefix. The same initial population continues. Automatic updates, public Jane activation, migrations, deployment and paid AI calls remain disabled for this work. The separate authorised PR #183 one-file release used protected source and did not publish Jane draft assets.
