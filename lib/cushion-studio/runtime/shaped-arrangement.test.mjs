import test from "node:test";
import assert from "node:assert/strict";
import {
  planArrangement,
  FURNITURE_LAYOUTS,
  furniturePose,
  shapedFurnitureBounds,
} from "./arrangement.mjs";
import {
  CUSHION_VISUAL_SIZES,
  SHAPED_CONSTRUCTION_VERSION,
  shapedPanelPoint,
  roundPanelPoint,
  bolsterBodyPoint,
  bolsterEndPoint,
  sizeOf,
} from "./geometry.mjs";
const sizes = CUSHION_VISUAL_SIZES.filter((size) => size.shape !== "square");
const piece = (
  id,
  sizeId,
  slot = 1,
  rotation = 0,
  offsetX = 0,
  offsetY = 0,
) => ({
  spec: { id, sizeId, constructionProfile: SHAPED_CONSTRUCTION_VERSION },
  position: { slot, rotation, offsetX, offsetY },
});
function assertClear(plan, scene, expected) {
  assert.equal(plan.placements.length + plan.unplaced.length, expected);
  assert.equal(
    new Set([...plan.placements, ...plan.unplaced].map((p) => p.id)).size,
    expected,
  );
  assert.ok(plan.placements.length <= plan.capacity);
  assert.equal(
    new Set(plan.placements.map((p) => p.slot)).size,
    plan.placements.length,
  );
  const furniture = FURNITURE_LAYOUTS[scene];
  for (const a of plan.placements) {
    assert.ok(Math.abs(a.xMm) + a.widthMm / 2 <= furniture.widthMm / 2 + 1e-8);
    assert.ok(a.zMm - a.depthMm / 2 >= furniture.backMm - 1e-8);
    const front =
      scene === "corner" && a.row === 2
        ? furniture.chaiseFrontMm
        : furniture.frontMm;
    assert.ok(a.zMm + a.depthMm / 2 <= front + 1e-8);
    for (const b of plan.placements)
      if (a !== b)
        assert.ok(
          Math.abs(a.xMm - b.xMm) >= (a.widthMm + b.widthMm) / 2 - 1e-8 ||
            Math.abs(a.zMm - b.zMm) >= (a.depthMm + b.depthMm) / 2 - 1e-8,
          `${a.id}/${b.id} overlap on ${scene}`,
        );
  }
  assert.ok(plan.unplaced.every((p) => p.reason.length > 0));
}
test("every new shape has a supported furniture placement with unchanged spec and explicit finite capacity", () => {
  for (const size of sizes) {
    const scenes =
      size.shape === "bed"
        ? ["double-bed", "king-bed"]
        : ["sofa-2", "sofa-3", "corner", "armchair", "double-bed"];
    for (const scene of scenes) {
      const design = { scene, pieces: [piece("single", size.id)] },
        original = structuredClone(design);
      const single = planArrangement(design);
      assert.equal(single.placements.length, 1, `${scene}/${size.id}`);
      assertClear(single, scene, 1);
      assert.deepEqual(design, original);
      const full = planArrangement({
        scene,
        pieces: Array.from({ length: 32 }, (_, i) =>
          piece(`p${i}`, size.id, i % 6, i % 2 ? 20 : -20),
        ),
      });
      assertClear(full, scene, 32);
      assert.ok(full.unplaced.length > 0);
    }
  }
});
function surfacePoints(size) {
  const points = [];
  if (["rectangle", "bed"].includes(size.shape)) {
    for (const back of [false, true])
      for (const u of [0, 0.1, 0.5, 0.9, 1])
        for (const v of [0, 0.1, 0.5, 0.9, 1])
          points.push(shapedPanelPoint({ ...size, u, v, back }));
  } else {
    for (const back of [false, true])
      for (const radiusFraction of [0, 0.5, 0.9, 1])
        for (let i = 0; i < 32; i++) {
          const input = {
            radiusFraction,
            angle: (i / 16) * Math.PI,
            back,
            diameterMm: size.heightMm,
            lengthMm: size.widthMm,
          };
          points.push(
            size.shape === "round"
              ? roundPanelPoint(input)
              : bolsterEndPoint(input),
          );
        }
    if (size.shape === "bolster")
      for (const along of [0, 0.5, 1])
        for (let i = 0; i <= 32; i++)
          points.push(
            bolsterBodyPoint({
              along,
              around: i / 32,
              lengthMm: size.widthMm,
              diameterMm: size.heightMm,
            }),
          );
  }
  return points;
}
// Independent sequential application of Three's XYZ Euler convention (Rz, Ry, Rx).
function rotate(point, lean, yaw, roll) {
  const x0 = point.x * Math.cos(roll) - point.y * Math.sin(roll),
    y0 = point.x * Math.sin(roll) + point.y * Math.cos(roll);
  const x1 = x0 * Math.cos(yaw) + point.z * Math.sin(yaw),
    z1 = -x0 * Math.sin(yaw) + point.z * Math.cos(yaw);
  return {
    x: x1 * 1000,
    y: (y0 * Math.cos(lean) - z1 * Math.sin(lean)) * 1000,
    z: (y0 * Math.sin(lean) + z1 * Math.cos(lean)) * 1000,
  };
}
test("rotation-aware furniture bounds enclose sampled real new-profile geometry at every allowed lean and yaw", () => {
  for (const size of sizes) {
    const points = surfacePoints(size);
    for (const scene of ["sofa-2", "king-bed"])
      for (const roll of [-20, -7, 0, 11, 20]) {
        const bounds = shapedFurnitureBounds(size, scene, roll),
          pose = furniturePose(size, scene);
        const rotated = points.map((p) =>
          rotate(p, pose.lean, pose.yaw, (roll * Math.PI) / 180),
        );
        for (const [axis, dimension] of [
          ["x", "widthMm"],
          ["y", "heightMm"],
          ["z", "depthMm"],
        ]) {
          const span =
            Math.max(...rotated.map((p) => p[axis])) -
            Math.min(...rotated.map((p) => p[axis]));
          assert.ok(
            span <= bounds[dimension] + 1e-7,
            `${size.id}/${scene}/${roll}/${axis}: ${span}>${bounds[dimension]}`,
          );
        }
      }
  }
});
test("rotated large bed squares and oversized offsets use the tray instead of clamping through furniture", () => {
  const straight = planArrangement({
    scene: "armchair",
    pieces: [piece("bed", "bed-square-70")],
  });
  assert.equal(straight.placements.length, 1);
  const rotated = planArrangement({
    scene: "armchair",
    pieces: [piece("bed", "bed-square-70", 1, 20)],
  });
  assert.equal(rotated.placements.length, 0);
  assert.match(rotated.unplaced[0].reason, /wider/);
  for (const [offsetX, offsetY] of [
    [2000, 0],
    [0, 2000],
    [0, -2000],
  ]) {
    const plan = planArrangement({
      scene: "sofa-2",
      pieces: [piece("shift", "round-50", 1, 0, offsetX, offsetY)],
    });
    assert.equal(plan.placements.length, 0);
    assert.equal(plan.unplaced.length, 1);
  }
});
test("mixed new shapes retain clear positions through resolved-slot save and restore", () => {
  for (const scene of Object.keys(FURNITURE_LAYOUTS)) {
    const design = {
        scene,
        pieces: sizes.map((size, i) =>
          piece(`mixed${i}`, size.id, i % 6, i % 2 ? -12 : 12),
        ),
      },
      first = planArrangement(design);
    assertClear(first, scene, sizes.length);
    for (const placement of first.placements)
      design.pieces.find((p) => p.spec.id === placement.id).position.slot =
        placement.slot;
    assert.deepEqual(planArrangement(structuredClone(design)), first);
  }
});
test("saved depth offsets cannot move one new-profile row through another", () => {
  const scene = "sofa-2",
    plan = planArrangement({
      scene,
      pieces: [
        piece("rear", "rectangle-30-45", 1),
        piece("front", "rectangle-30-45", 4, 0, 0, -80),
      ],
    });
  assertClear(plan, scene, 2);
});
