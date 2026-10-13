# Read-only statement timeout recovery

At **1,560 / 11,517**, a six-ID read-only source query was cancelled by the unchanged three-second statement timeout. No next-batch write was prepared or submitted. Exact independent reconciliation confirms the last receipt, 260 completed batches, historical records and restored permissions.

The focused bridge classifier recognises only the observed Supabase57014 statement-timeout response for one exact read-only transaction. Writes, mixed transactions, permission/network errors, malformed responses, user cancellation and ambiguous results remain fatal. Recovery reconciles the exact last commit, waits and repeats complete fresh admission. The normal five-minute database-error gate remains enforced. All parallel read ports settle before recovery.

**12 targeted tests passed.** The first hosted read-only probe passed database safety gates but encountered a live profile503 with Retry-After149 seconds. That wait is being honoured before the next probe. The later hosted read-only probe passed at 2026-10-12T08:01:32.752Z with all six live profiles returning200, exact source IDs and restored permissions. The repaired population operator is now starting at1560; subsequent receipts establish actual continuation.

Original job, approved11517-ID manifest, six-ID transactions, minimumfive-second pacing,20-batch invocations,3-second SQL/500-ms lock timeouts,20-second batch ceiling,180-second host freshness,120-second counter windows and all resource/eligibility/backup checks remain unchanged. No migration, source mutation, paid call, deployment or public activation.10:00UTC deadline remains pending separate extension.
