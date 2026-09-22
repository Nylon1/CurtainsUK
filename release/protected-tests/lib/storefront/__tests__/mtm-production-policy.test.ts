import assert from "node:assert/strict";
import test from "node:test";
import { assertAutomatedMtmCompatibility, headingsForAutomatedMtm, measurementAnchors } from "../mtm-production-policy";

test("production policy enforces the approved hardware and heading matrix", () => {
  assert.deepEqual(headingsForAutomatedMtm({ windowSlug: "standard-window", hardware: "TRACK" }), ["PENCIL_PLEAT", "DOUBLE_PINCH", "WAVE"]);
  assert.deepEqual(headingsForAutomatedMtm({ windowSlug: "standard-window", hardware: "POLE" }), ["PENCIL_PLEAT", "DOUBLE_PINCH", "EYELET"]);
  assert.deepEqual(headingsForAutomatedMtm({ windowSlug: "bay-window", hardware: "TRACK" }), ["PENCIL_PLEAT", "DOUBLE_PINCH"]);
  assert.throws(() => assertAutomatedMtmCompatibility({ windowSlug: "bay-window", hardware: "TRACK", heading: "WAVE" }), /MTM_HARDWARE_HEADING_INCOMPATIBLE/);
  assert.throws(() => assertAutomatedMtmCompatibility({ windowSlug: "standard-window", hardware: "TRACK", heading: "EYELET" }), /MTM_HARDWARE_HEADING_INCOMPATIBLE/);
  assert.throws(() => assertAutomatedMtmCompatibility({ windowSlug: "standard-window", hardware: "POLE", heading: "WAVE" }), /MTM_HARDWARE_HEADING_INCOMPATIBLE/);
});

test("measurement anchors preserve the customer raw measurement contract", () => {
  assert.deepEqual(measurementAnchors({ windowSlug: "standard-window", hardware: "TRACK", heading: "WAVE" }), { width: "TRACK_FULL_WIDTH", drop: "TRACK_BOTTOM_TO_FINISH" });
  assert.deepEqual(measurementAnchors({ windowSlug: "standard-window", hardware: "TRACK", heading: "PENCIL_PLEAT" }), { width: "TRACK_FULL_WIDTH", drop: "TRACK_TOP_TO_FINISH" });
  assert.deepEqual(measurementAnchors({ windowSlug: "french-doors", hardware: "POLE", heading: "EYELET" }), { width: "POLE_BETWEEN_FINIALS", drop: "POLE_BOTTOM_TO_FINISH" });
  assert.deepEqual(measurementAnchors({ windowSlug: "bay-window", hardware: "TRACK", heading: "DOUBLE_PINCH" }), { width: "BAY_TRACK_ROUTE", drop: "TRACK_TOP_TO_FINISH" });
});
