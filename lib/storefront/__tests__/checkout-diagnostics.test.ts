import test from "node:test";
import assert from "node:assert/strict";
import { traceCheckout, type CheckoutBoundary } from "../checkout-diagnostics";

test("checkout diagnostics preserve the exact failure and identify its boundary without request data", async () => {
  for (const boundary of [
    "PRICE_AND_STOCK",
    "SHIPPING",
    "HANDOFF_PERSISTENCE",
    "SHOPIFY_EXECUTION",
    "EXECUTION_RECEIPT",
  ] as CheckoutBoundary[]) {
    const original = new Error("CHECKOUT_HANDOFF_PERSISTENCE_FAILED");
    const events: unknown[] = [];
    await assert.rejects(
      traceCheckout(
        async (enter) => {
          enter(boundary);
          throw original;
        },
        (event) => events.push(event),
      ),
      (error) => error === original,
    );
    assert.equal((events[0] as { boundary: string }).boundary, boundary);
    assert.doesNotMatch(
      JSON.stringify(events),
      /configuration|token|cost|stockMetres/,
    );
  }
});
test("diagnostics redact arbitrary upstream errors, do not retry, and survive unavailable logging", async () => {
  let calls = 0;
  const original = new Error("upstream private payload and credentials");
  await assert.rejects(
    traceCheckout(
      async () => {
        calls++;
        throw original;
      },
      (event) => {
        assert.equal(event.code, "UNCLASSIFIED_FAILURE");
        throw new Error("logger unavailable");
      },
    ),
    (error) => error === original,
  );
  assert.equal(calls, 1);
  assert.equal(
    await traceCheckout(
      async () => 42,
      () => assert.fail("success must not log"),
    ),
    42,
  );
});
