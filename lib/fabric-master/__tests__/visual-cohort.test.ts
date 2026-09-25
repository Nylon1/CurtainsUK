import test from "node:test";
import assert from "node:assert/strict";
import { selectVisualCohort } from "../visual-cohort";
const row = (id: string, design = "design-a") => ({ fabric_id: id, supplier_id: "pt", brand_id: "pt", design_id: design, source_image_hash: `hash-${id}` });
test("exact cohort never selects a sibling's image outside the cohort", () => {
  const result = selectVisualCohort(["a", "b"], [row("a"), row("b"), row("other")], [row("other")]);
  assert.deepEqual(result.colours.map(r => r.fabric_id), ["a", "b"]);
  assert.equal(result.designs[0].fabric_id, "a");
  assert.equal(result.designs[0].source_image_hash, "hash-a");
  assert.equal(result.singles, 0);
});
test("reject absent, duplicate, or ambiguous image identities", () => {
  for (const ids of [[], ["a", "a"], ["absent"], ["a,b"]]) assert.throws(() => selectVisualCohort(ids, [row("a")], [row("a")]));
  assert.throws(() => selectVisualCohort(["a"], [row("a"), row("a")], [row("a")]));
  assert.throws(() => selectVisualCohort(["a"], [row("a")], [row("a"), row("b")]));
});
