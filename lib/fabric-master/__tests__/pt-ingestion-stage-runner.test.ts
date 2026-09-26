import assert from "node:assert/strict";
import test from "node:test";
import { fetchPtMediaWithRetry, runPtStageCohort, runWebtexWithAutomaticSplit, type PtClaim, type PtCheckpointPort } from "../pt-ingestion-stage-runner";

const claims: PtClaim[] = [
  { itemId: "one", supplierSku: "1000/001", fabricId: "fabric-one", claimToken: "claim-one", retryCount: 0 },
  { itemId: "two", supplierSku: "1000/002", fabricId: "fabric-two", claimToken: "claim-two", retryCount: 0 },
];

function checkpoints() {
  const events: string[] = [];
  const port: PtCheckpointPort = {
    commit: async (item) => { events.push(`commit:${item.itemId}`); },
    retry: async (item, code) => { events.push(`retry:${item.itemId}:${code}`); },
    exception: async (item, code) => { events.push(`exception:${item.itemId}:${code}`); },
    stopSystemic: async (code) => { events.push(`systemic:${code}`); },
  };
  return { events, port };
}

test("isolates a media failure while committing clean records", async () => {
  const state = checkpoints();
  const summary = await runPtStageCohort("MEDIA_READY", claims, async () => ({ succeeded: ["one"], failures: [{ itemId: "two", code: "IMAGE_FETCH_REJECTED" }] }), state.port);
  assert.deepEqual(summary, { committed: 1, retried: 1, excepted: 0, stoppedSystemic: false });
  assert.deepEqual(state.events, ["commit:one", "retry:two:IMAGE_FETCH_REJECTED"]);
});

test("stops only a systemic failure", async () => {
  const state = checkpoints();
  const summary = await runPtStageCohort("KNOWLEDGE_READY", claims, async () => { throw new Error("AUTH_CREDENTIAL_REJECTED"); }, state.port);
  assert.deepEqual(summary, { committed: 0, retried: 0, excepted: 0, stoppedSystemic: true });
  assert.deepEqual(state.events, ["systemic:AUTH_CREDENTIAL_REJECTED"]);
});

test("bisects a Webtex cohort and exceptions only the unsupported leaf", async () => {
  const more = [...claims, { itemId: "three", supplierSku: "1000/003", fabricId: "fabric-three", claimToken: "claim-three", retryCount: 0 }];
  const calls: string[][] = [];
  const result = await runWebtexWithAutomaticSplit(more, async (scope) => {
    calls.push(scope.map((item) => item.itemId));
    if (scope.length > 1) throw new Error("PT_WEBTEX_QUERY_STATUS_500");
    if (scope[0].itemId === "two") throw new Error("WEBTEX_UNSUPPORTED_SKU");
    return { succeeded: [scope[0].itemId] };
  });
  assert.deepEqual(result.succeeded.sort(), ["one", "three"]);
  assert.deepEqual(result.failures, [{ itemId: "two", code: "WEBTEX_UNSUPPORTED_SKU" }]);
  assert.ok(calls.length > 3);
});

test("media retry is bounded and cannot stall after a timeout", async () => {
  let calls = 0, waits = 0;
  await assert.rejects(fetchPtMediaWithRetry("https://example.invalid/image.jpg", {
    attempts: 3, timeoutMs: 1_000,
    fetcher: async () => { calls += 1; throw new DOMException("timeout", "TimeoutError"); },
    sleep: async () => { waits += 1; },
  }), /NETWORK_TIMEOUT/);
  assert.equal(calls, 3);
  assert.equal(waits, 2);
});
