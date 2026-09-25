import assert from "node:assert/strict";
import test from "node:test";
import { isRetryableVisualDatabaseError, retryVisualDatabase, visualFailureReason } from "../visual-enrichment-runner";

test("preserves PostgREST failure context in the visual ledger report", () => {
  assert.equal(
    visualFailureReason({ code: "57014", message: "canceling statement due to statement timeout", details: null, hint: "retry later", status: 500 }),
    "57014_CANCELING_STATEMENT_DUE_TO_STATEMENT_TIMEOUT_RETRY_LATER_500",
  );
});

test("retries only transient visual database failures with bounded backoff", async () => {
  let calls = 0;
  const waits: number[] = [];
  const value = await retryVisualDatabase(async () => {
    calls += 1;
    return calls < 3
      ? { data: null, error: { code: "57014", message: "canceling statement due to statement timeout" } }
      : { data: "ledger-id", error: null };
  }, { wait: async (milliseconds) => { waits.push(milliseconds); } });
  assert.equal(value, "ledger-id");
  assert.equal(calls, 3);
  assert.deepEqual(waits, [15_000, 15_000]);
});

test("does not repeat non-transient ledger failures", async () => {
  let calls = 0;
  const error = { code: "23514", message: "check constraint violation" };
  await assert.rejects(
    retryVisualDatabase(async () => { calls += 1; return { data: null, error }; }),
    (received) => received === error,
  );
  assert.equal(calls, 1);
  assert.equal(isRetryableVisualDatabaseError(error), false);
});

test("stops after the configured transient retry budget", async () => {
  let calls = 0;
  const error = { code: "57014", message: "canceling statement due to statement timeout" };
  await assert.rejects(
    retryVisualDatabase(async () => { calls += 1; return { data: null, error }; }, { attempts: 2, wait: async () => {} }),
    (received) => received === error,
  );
  assert.equal(calls, 2);
});
