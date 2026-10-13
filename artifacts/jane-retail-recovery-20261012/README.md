# Temporary retail read recovery

## Retail read recovery added at verified checkpoint 246

The repaired overlap operator committed 16 batches from 150 to **246**, and recovered automatically through three short activity holds using exact read-only reconciliation. At05:57:23 UTC a catalogue/profile status check failed before the next write. The old binding did not capture the failing HTTP status. A bounded independent reread of all six next IDs returned **HTTP200**, exact identities, matching canonical profiles and browse/launch eligibility. Last committed receipt, checkpoint246, original history and permissions were independently reconciled.

The focused follow-up adds retryable read-only holds for HTTP429/5xx and explicit network timeout/reset failures. It honours Retry-After, waits for all parallel read ports to settle, reconciles the last exact commit and re-runs complete fresh admission. HTTP404/400/401/403, redirects, changed eligibility/identity and integrity failures remain closed. No failed write is replayed. **Nine focused tests passed**. [Evidence](run-evidence.json). No migration, source change, paid API call, threshold increase or public activation. The10:00UTC deadline remains pending explicit extension.

[Executed and prepared evidence](run-evidence.json), [fresh six-fabric checks](fresh-retail-readback.json), [new binding](operator.mjs), [dependency hashes](execution-review.json), [exact files](changed-files.txt), [tests](quality-checks.json).
