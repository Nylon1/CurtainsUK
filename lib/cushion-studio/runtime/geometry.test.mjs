import test from "node:test";
import assert from "node:assert/strict";
import {
  panelPoint,
  panelSourceUv,
  coverageBounds,
  pipingPreviewSegments,
} from "./geometry.mjs";

test("front and rear preserve identical upright artwork in outward coordinates", () => {
  for (const round of [false, true])
    for (const u of [0, 0.17, 0.5, 0.83, 1])
      for (const v of [0, 0.23, 0.5, 0.91, 1]) {
        const front = panelPoint({ u, v, widthMm: 450, heightMm: 300, round });
        const rear = panelPoint({
          u,
          v,
          widthMm: 450,
          heightMm: 300,
          round,
          back: true,
        });
        assert.ok(front.x === -rear.x);
        assert.ok(front.y === rear.y);
        assert.ok(front.z === -rear.z);
        const source = (p) =>
          panelSourceUv({
            u: p.clothU,
            v: p.clothV,
            placementMm: { x: 120, y: 200 },
            physicalWidthMm: 1415,
            physicalHeightMm: 1000,
            widthMm: 450,
            heightMm: 300,
          });
        assert.deepEqual(source(front), source(rear));
      }
});
test("flat artwork coordinates use independent physical X and Y calibration", () => {
  assert.deepEqual(
    panelSourceUv({
      u: 0,
      v: 1,
      placementMm: { x: 140, y: 100 },
      physicalWidthMm: 1400,
      physicalHeightMm: 1000,
      widthMm: 450,
      heightMm: 300,
    }),
    [0.1, 0.9],
  );
  assert.deepEqual(
    panelSourceUv({
      u: 1,
      v: 0,
      placementMm: { x: 140, y: 100 },
      physicalWidthMm: 1400,
      physicalHeightMm: 1000,
      widthMm: 450,
      heightMm: 300,
    }),
    [590 / 1400, 0.6],
  );
});
test("finite coverage bounds reserve the complete bolster circumference", () => {
  const bounds = coverageBounds(
    { widthMm: 560, heightMm: 230, shape: "bolster" },
    { physicalWidthMm: 1400, physicalHeightMm: 1000 },
  );
  assert.equal(bounds.x, 840);
  assert.equal(bounds.y, 1000 - Math.PI * 230);
  assert.deepEqual(
    coverageBounds({ widthMm: 450, heightMm: 450, shape: "square" }, null),
    { x: 0, y: 0 },
  );
});
test("front and rear share a closed seam and piping can use those same boundary points", () => {
  for (const round of [false, true])
    for (const [u, v] of [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
      [0, 0.25],
      [1, 0.75],
      [0.75, 0],
      [0.25, 1],
    ]) {
      const p = panelPoint({ u, v, widthMm: 500, heightMm: 380, round });
      assert.equal(p.z, 0);
      assert.ok(Math.abs(p.x) <= 0.25);
      assert.ok(Math.abs(p.y) <= 0.19);
    }
});
test("confirmed piping preserves physical strip joins and uses only visible cord circumference", () => {
  const calibration = { physicalWidthMm: 1400, physicalHeightMm: 1000 },
    plan = {
      confirmed: true,
      stripWidthMm: 40,
      cordDiameterMm: 3,
      segments: [
        { axis: "x", lengthMm: 1300, sourceOriginMm: { x: 10, y: 20 } },
        { axis: "x", lengthMm: 600, sourceOriginMm: { x: 10, y: 60 } },
      ],
    };
  const mapped = pipingPreviewSegments(plan, calibration, 1800);
  assert.equal(mapped.length, 2);
  assert.equal(mapped[1].startMm, 1300);
  assert.equal(mapped[1].lengthMm, 500);
  assert.equal(mapped[0].visibleBandMm, Math.PI * 3);
  assert.equal(mapped[0].yMm, 20 + (40 - Math.PI * 3) / 2);
  assert.equal(
    pipingPreviewSegments({ ...plan, confirmed: false }, calibration, 1800),
    null,
  );
  assert.equal(pipingPreviewSegments(plan, calibration, 2000), null);
  assert.equal(
    pipingPreviewSegments(
      {
        ...plan,
        segments: [
          { axis: "x", lengthMm: 1800, sourceOriginMm: { x: 0, y: 0 } },
        ],
      },
      calibration,
      1800,
    ),
    null,
  );
});
