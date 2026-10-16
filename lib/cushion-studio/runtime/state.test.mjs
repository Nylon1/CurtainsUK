import test from "node:test";
import assert from "node:assert/strict";
import {
  historySnapshot,
  restoreHistory,
  defaultVisualFill,
  createVisualFillTrial,
  selectFilling,
  fillingLabel,
} from "./state.mjs";
import { squareDrapeFootprint } from "./geometry.mjs";

test("explicit filling selection records synthetic material, cover removes it and legacy choices are not relabelled", () => {
  const spec = { filling: "filled" };
  assert.equal(fillingLabel(spec), "Cover & filling (type unconfirmed)");
  selectFilling(spec, "legacy-filled");
  assert.equal(spec.fillingType, undefined);
  selectFilling(spec, "filled");
  assert.equal(spec.fillingType, "polyester");
  assert.equal(spec.rangeVersion, "standard-inserts-v1");
  assert.equal(fillingLabel(spec), "Cover & standard synthetic insert");
  const snapshot=historySnapshot({pieces:[{spec}],id:"test"});
  assert.equal(restoreHistory(snapshot).design.pieces[0].spec.fillingType,"polyester");
  selectFilling(spec, "cover");
  assert.equal(spec.fillingType, undefined);
  assert.equal(fillingLabel(spec), "Cover only");
});

test("only the standard 50 cm square defaults to the fuller visual fill trial", () => {
  assert.equal(defaultVisualFill({ sizeId: "square-50" }), "soft-fullness");
  for (const sizeId of [
    "square-38",
    "square-45",
    "square-55",
    "square-60",
    "bed-65",
    "rectangle-38x50",
    "round-50",
    "bolster-23x56",
  ])
    assert.equal(defaultVisualFill({ sizeId }), "baseline");
});
test("visual fill choices leave frozen saved specs, quote inputs and construction footprint unchanged", () => {
  const spec = Object.freeze({
    id: "one",
    sizeId: "square-50",
    fabricId: "sdg-f1239-30",
    edge: "unpiped",
    placementMm: Object.freeze({ x: 100, y: 100 }),
  });
  const design = Object.freeze({
    pieces: Object.freeze([Object.freeze({ spec })]),
  });
  const before = JSON.stringify(design);
  const quoteBefore = JSON.stringify({
    specs: design.pieces.map((piece) => piece.spec),
  });
  const footprint = squareDrapeFootprint(500, 500);
  const trial = createVisualFillTrial();
  assert.deepEqual(trial.forDesign(design), { one: "soft-fullness" });
  trial.choose(spec, "baseline");
  assert.equal(trial.resolve(spec), "baseline");
  trial.choose(spec, "soft-fullness");
  assert.equal(JSON.stringify(design), before);
  assert.equal(
    JSON.stringify({ specs: design.pieces.map((piece) => piece.spec) }),
    quoteBefore,
  );
  assert.deepEqual(squareDrapeFootprint(500, 500), footprint);
  assert.deepEqual(historySnapshot(design).design, design);
});
test("comparison overrides are ephemeral and isolated by piece and size", () => {
  const trial = createVisualFillTrial(),
    spec = { id: "one", sizeId: "square-50" };
  trial.choose(spec, "baseline");
  assert.equal(trial.resolve({ ...spec, id: "two" }), "soft-fullness");
  assert.equal(trial.resolve({ ...spec, sizeId: "square-45" }), "baseline");
  trial.choose({ ...spec, sizeId: "square-45" }, "soft-fullness");
  assert.equal(trial.resolve(spec), "baseline");
  assert.equal(createVisualFillTrial().resolve(spec), "soft-fullness");
});
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
