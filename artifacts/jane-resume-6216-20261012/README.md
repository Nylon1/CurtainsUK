# Jane indexing continuation after checkpoint 6,216

12 October 2026. Existing project hqysjumypgeapgmqkcrx and job ac425f78-f6ec-4623-97bb-df8763d79d5a. Approved eligible population: 11,517. This is an evidence-only continuation, with no implementation or migration change.

## Verified recovery

- Last original verified receipt: 6,216 at 2026-10-12T16:41:57.562Z.
- Stop: OPERATOR_RESPONSE_TIMEOUT at 16:43:08.960Z.
- Timed-out request was a bounded read-only source query. The late response did not cause a write.
- Independent hosted readback and existing verifyEligibleResult at 17:23:21.961Z matched the exact saved plan, six records/receipt hashes, original historical rows and permissions. Job failures: zero. No pending journal write.
- No failed/uncertain mutation was retried. The existing runner checks its unchanged code manifest and refreshes full admission before subsequent transactions.

## Actual resumed progress

The existing operator restarted in population mode and the original fsynced journal records **6,228 processed/indexed**, **1,038 batches**, incomplete, permissions restored, at **2026-10-12T17:25:55.188Z**. **5,289 remain** in this snapshot. The job continues under the existing owner instruction to proceed without a deadline, with unchanged resource, source/publication, error, supplier, backup, pacing and latency gates.

## Resources and recovery

Fresh official monitoring and backup reads at 17:22 UTC returned HTTP 200. Latest completed physical backup: 1937679152, recovery point 2026-10-12T01:11:28.231Z, WALG enabled. It remains within Nylon1's 24-hour RPO but predates later index writes; a subsequent verified backup is required. Toshiba backup completion remains unverified. C: free space was 38,632,419,328 bytes. No cleanup occurred.

The existing replacement read-only monitoring token remains encrypted outside Git. Its configured conservative age ceiling is 20:25 UTC; the pending secure renewal must be verified before replacement use. The operator transport stops before crossing that ceiling. No token value, private telemetry payload or customer personal data is included here.

## Evidence and scope

Local detailed evidence is preserved outside Git: jane-checkpoint6216-reconciliation.json, jane-resume6216-verification.json, the original journal, original operator evidence and monitoring readback summaries. Original tests remain preserved; this continuation did not alter code and makes no claim of a new test suite run.

Changed repository files are this README and the two source-of-truth documents. PR #169 remains the owner's requested review destination. No new project, migration, catalogue rebuild/source mutation, supplier refresh, paid AI call, deployment, merge, public activation or PR #167 change occurred.
