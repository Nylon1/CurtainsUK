import assert from "node:assert/strict";
import test from "node:test";
import { buildPtReleaseGroups, classifyPtIngestionFailure, nextPtIngestionStage, stageNeedsRequeue, validatePtSeedItem, type ReleaseCandidate } from "../pt-ingestion-orchestrator";

test("continues isolated media and unsupported Webtex failures as exceptions", () => {
  assert.equal(classifyPtIngestionFailure("MEDIA_READY", "IMAGE_FETCH_REJECTED", 0), "RETRY");
  assert.equal(classifyPtIngestionFailure("MEDIA_READY", "MEDIA_IMPORT_FAILED", 3), "EXCEPTION");
  assert.equal(classifyPtIngestionFailure("STOCK_READY", "WEBTEX_NO_NUMERIC_STOCK", 0), "EXCEPTION");
  assert.equal(classifyPtIngestionFailure("KNOWLEDGE_READY", "AUTH_CREDENTIAL_REJECTED", 0), "STOP_SYSTEMIC");
});

test("advances only in the governed stage order", () => {
  assert.equal(nextPtIngestionStage("SOURCE_READY"), "MEDIA_READY");
  assert.equal(nextPtIngestionStage("RELEASE_READY"), "RELEASED");
});

test("builds clean logical release groups and never includes exceptions", () => {
  const candidates: ReleaseCandidate[] = Array.from({ length: 1002 }, (_, index) => ({ itemId: `item-${index}`, stage: "RELEASE_READY", workState: "READY" }));
  candidates.push({ itemId: "held", stage: "EXCEPTION", workState: "EXCEPTION" });
  const groups = buildPtReleaseGroups(candidates);
  assert.deepEqual(groups.map(group => group.itemIds.length), [1000, 2]);
  assert.equal(groups.flatMap(group => group.itemIds).includes("held"), false);
  assert.deepEqual(groups[0].phases, ["PAUSE_BROWSE_REFRESH", "WRITE_KNOWLEDGE_AND_STOCK", "RECONCILE_ONCE", "VERIFY_PARITY", "ATOMIC_PUBLISH", "RESTORE_BROWSE_REFRESH"]);
});

test("accepts evidence-backed released and exception checkpoint seeds without replay", () => {
  const fingerprint = "a".repeat(64);
  const committed = Object.fromEntries(["SOURCE_READY", "MEDIA_READY", "PRICE_APPROVED", "KNOWLEDGE_READY", "STOCK_READY", "RELEASE_READY"].map((stage) => [stage, fingerprint]));
  assert.doesNotThrow(() => validatePtSeedItem({ supplierSku: "4324/119", initialStage: "RELEASED", committedFingerprints: committed }));
  assert.doesNotThrow(() => validatePtSeedItem({ supplierSku: "7876/076", initialStage: "EXCEPTION", exceptionCode: "WEBTEX_UNSUPPORTED_SKU" }));
  assert.throws(() => validatePtSeedItem({ supplierSku: "4324/119", initialStage: "RELEASED", committedFingerprints: {} }), /PT_SEED_COMMITTED_EVIDENCE_REQUIRED/);
});

test("does not repeat a completed stage until its governed input changes", () => {
  const same = "a".repeat(64), changed = "b".repeat(64);
  assert.equal(stageNeedsRequeue(same, same), false);
  assert.equal(stageNeedsRequeue(same, changed), true);
  assert.throws(() => stageNeedsRequeue(undefined, "bad"), /PT_STAGE_FINGERPRINT_INVALID/);
});
