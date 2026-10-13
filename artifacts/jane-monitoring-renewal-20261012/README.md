# Monitoring renewal and verified continuation

The owner entered a replacement through the masked local renewal form. Windows DPAPI CurrentUser encryption, current-user-only directory/file ACLs, exact project metadata and a different replacement value were verified without logging either credential.

At 20:19 UTC on 12 October 2026, the existing GET-only metrics, error-log and backup helpers all returned HTTP 200. The five-minute error gate returned zero errors and no missing severity fields. Physical backup 1945273696 was COMPLETED, with recovery point 18:32:09.471 UTC, WALG enabled and PITR disabled. No restore was performed. Writes after that recovery point still need a later backup.

The previous process stopped at 20:13:29 UTC waiting for a read-only request. Independent readback and the existing journal verifier reconciled checkpoint 8,148, the exact latest records, historical baseline and restored permissions, with no pending write. No uncertain transaction was retried.

The unchanged operator resumed the same job `ac425f78-f6ec-4623-97bb-df8763d79d5a`. The fsynced post-COMMIT receipt at 20:21:09.272 UTC confirms **8,160 / 11,517**, with 3,357 remaining and 1,360 verified batches. This is partial population, not completed reconciliation or launch readiness. Five eligible historical no-ops and the separate excluded historical row remain preserved.

The private masked helper's save callback failed to load `Get-Acl`. Equivalent .NET ACL inspection replaced those calls; synthetic encryption, save/readback, existing-directory retry, no-overwrite and restricted-access checks passed, followed by verification of the real saved record. This local helper is outside Git and is not part of the population implementation. No token, encrypted credential, customer data or raw telemetry is included here.

The replacement retains the same conservative 23-hour age limit, ending 13 October 2026 at 19:18:30.791 UTC. The existing six-record, pacing, transaction, backup, resource, latency, source, publication and grant-restoration gates remain unchanged. Automatic updates remain disabled.

Only this evidence file and the two programme status documents change in this documentation update. No migration, deployment, canonical source mutation, paid AI call, public activation or merge occurred. PR #167 and customer systems are unchanged.
