import test from "node:test";
import assert from "node:assert/strict";
import { planArrangement, FURNITURE_LAYOUTS } from "./arrangement.mjs";
const piece = (i, size = "square-45", rotation = 0) => ({
  spec: { id: "p" + i, sizeId: size },
  position: { slot: 0, rotation, offsetX: 0, offsetY: 0 },
});
test("32 cushions exceed furniture capacity into an explicit tray without duplicated positions", () => {
  for (const scene of Object.keys(FURNITURE_LAYOUTS)) {
    const plan = planArrangement({
      scene,
      pieces: Array.from({ length: 32 }, (_, i) => piece(i)),
    });
    assert.equal(plan.placements.length + plan.unplaced.length, 32);
    assert.ok(plan.placements.length <= plan.capacity);
    assert.equal(
      new Set(plan.placements.map((p) => p.slot)).size,
      plan.placements.length,
    );
    for (const a of plan.placements)
      for (const b of plan.placements) {
        if (a === b) continue;
        if (a.row === b.row)
          assert.ok(Math.abs(a.xMm - b.xMm) >= (a.widthMm + b.widthMm) / 2);
        else assert.ok(Math.abs(a.zMm - b.zMm) >= (a.depthMm + b.depthMm) / 2);
      }
  }
});
test("70cm square fits armchair straight but rotated width cannot be silently clamped", () => {
  assert.equal(
    planArrangement({ scene: "armchair", pieces: [piece(0, "bed-square-70")] })
      .placements.length,
    1,
  );
  const plan = planArrangement({
    scene: "armchair",
    pieces: [piece(0, "bed-square-70", 20)],
  });
  assert.equal(plan.placements.length, 0);
  assert.match(plan.unplaced[0].reason, /wider/);
});
test("resolved layer slots remain stable across save/restore", () => {
  const design = {
      scene: "sofa-2",
      pieces: Array.from({ length: 6 }, (_, i) => piece(i)),
    },
    first = planArrangement(design);
  for (const p of first.placements)
    design.pieces.find((x) => x.spec.id === p.id).position.slot = p.slot;
  assert.deepEqual(planArrangement(structuredClone(design)), first);
});

test("square sofa support reaches the backrest and reserves its measured leaning depth", () => {
  for (const scene of ["sofa-2", "sofa-3", "corner", "armchair"])
    for (const size of [38, 45, 50, 55, 60]) {
      const p = planArrangement({ scene, pieces: [piece(0, `square-${size}`)] })
        .placements[0];
      assert.ok(p.squareSofa);
      assert.ok(Math.abs(p.zMm - p.depthMm / 2 + 185) < 1e-9);
      assert.ok(p.depthMm > 100 && p.depthMm < 300);
    }
  const rectangle = planArrangement({
    scene: "sofa-2",
    pieces: [piece(0, "rectangle-30-45")],
  }).placements[0];
  assert.equal(rectangle.squareSofa, undefined);
  assert.ok(Math.abs(rectangle.zMm - rectangle.depthMm / 2 + 150) < 1e-9);
});
