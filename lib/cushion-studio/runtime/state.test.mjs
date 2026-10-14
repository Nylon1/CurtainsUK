import test from "node:test";
import assert from "node:assert/strict";
import { historySnapshot, restoreHistory } from "./state.mjs";
test("undo and comparison retain the latest saved revision of a previously saved design", () => {
  const snapshot = historySnapshot(
    { id: "saved", pieces: [{ spec: { id: "one" } }] },
    { revision: 2 },
  );
  const restored = restoreHistory(snapshot, new Map([["saved", 5]]));
  assert.equal(restored.revision, 5);
});
test("undo across a new design restores server revision, selection and workflow", () => {
  const old = {
    version: 1,
    id: "saved-design",
    pieces: [{ spec: { id: "piece-a" } }, { spec: { id: "piece-b" } }],
  };
  const snapshot = historySnapshot(old, {
    revision: 7,
    selectedId: "piece-b",
    mode: "layout",
  });
  old.pieces[0].spec.id = "changed";
  const restored = restoreHistory(snapshot);
  assert.equal(restored.design.id, "saved-design");
  assert.equal(restored.revision, 7);
  assert.equal(restored.selectedId, "piece-b");
  assert.equal(restored.mode, "layout");
  assert.equal(restored.design.pieces[0].spec.id, "piece-a");
});
test("restoring another saved design can be undone without losing prior revision", () => {
  const snapshot = historySnapshot(
    { id: "first", pieces: [{ spec: { id: "one" } }] },
    { revision: 4, selectedId: "one" },
  );
  const state = {
    design: { id: "second", pieces: [{ spec: { id: "two" } }] },
    revision: 9,
    selectedId: "two",
    mode: "layout",
  };
  Object.assign(state, restoreHistory(snapshot));
  assert.equal(state.design.id, "first");
  assert.equal(state.revision, 4);
  assert.equal(state.selectedId, "one");
});
