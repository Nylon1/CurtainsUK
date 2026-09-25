import assert from "node:assert/strict";
import test from "node:test";
import { chunkPreparedScopeIds, createSerialWorkQueue, maxDesignWorkerConcurrency, parseDesignWorkerConcurrency, runPreparedDesignBatches } from "../visual-enrichment-throughput";

test("chunks every prepared identity exactly once and keeps source order", () => {
  const ids = Array.from({ length: 251 }, (_, index) => `fabric-${index}`);
  const chunks = chunkPreparedScopeIds(ids);
  assert.deepEqual(chunks.map(chunk => chunk.length), [100, 100, 51]);
  assert.deepEqual(chunks.flat(), ids);
  assert.equal(new Set(chunks.flat()).size, ids.length);
});

test("uses sequential design analysis by default and permits only bounded opt-in concurrency", () => {
  assert.equal(parseDesignWorkerConcurrency(undefined), 1);
  assert.equal(parseDesignWorkerConcurrency("3"), maxDesignWorkerConcurrency);
  for (const value of ["0", "4", "1.5", "no"]) assert.throws(() => parseDesignWorkerConcurrency(value), /VISUAL_DESIGN_CONCURRENCY_INVALID/);
});

test("limits concurrent analysis while serializing each design lineage exactly once", async () => {
  let active = 0;
  let peak = 0;
  const persisted: number[] = [];
  await runPreparedDesignBatches([0, 1, 2, 3, 4], 3, async (item) => {
    active += 1;
    peak = Math.max(peak, active);
    await new Promise(resolve => setTimeout(resolve, (4 - item) * 2));
    active -= 1;
    return item;
  }, async (result) => {
    assert.equal(result.ok, true);
    if (result.ok) persisted.push(result.value);
  });
  assert.equal(peak, 3);
  assert.deepEqual(persisted, [0, 1, 2, 3, 4]);
  assert.equal(new Set(persisted).size, 5);
});

test("does not start a later group after serialized persistence stops on a systemic failure", async () => {
  const analyzed: number[] = [];
  await assert.rejects(
    runPreparedDesignBatches([0, 1, 2, 3], 2, async (item) => { analyzed.push(item); return item; }, async (result) => {
      if (!result.ok || result.value === 0) throw new Error("SYSTEMIC");
    }),
    /SYSTEMIC/,
  );
  assert.deepEqual(analyzed, [0, 1]);
});

test("shared database queue serializes writes and releases after a rejected write", async () => {
  let active = 0;
  let peak = 0;
  const order: string[] = [];
  const waits: number[] = [];
  const writes: number[] = [];
  const queue = createSerialWorkQueue({ onQueueWait: milliseconds => waits.push(milliseconds), onWrite: milliseconds => writes.push(milliseconds) });
  const first = queue(async () => {
    active += 1; peak = Math.max(peak, active); order.push("first-start");
    await new Promise(resolve => setTimeout(resolve, 5));
    order.push("first-end"); active -= 1;
    throw new Error("expected-write-failure");
  });
  const second = queue(async () => {
    active += 1; peak = Math.max(peak, active); order.push("second"); active -= 1;
    return "second-result";
  });
  await assert.rejects(first, /expected-write-failure/);
  assert.equal(await second, "second-result");
  assert.equal(peak, 1);
  assert.deepEqual(order, ["first-start", "first-end", "second"]);
  assert.equal(waits.length, 2);
  assert.equal(writes.length, 2);
});
