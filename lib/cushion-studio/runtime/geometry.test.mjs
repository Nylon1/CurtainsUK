import test from "node:test";
import assert from "node:assert/strict";
import {
  panelPoint,
  panelSourceUv,
  coverageBounds,
  pipingPreviewSegments,
  squarePanelPoint,
  squareSofaBounds,
  squareSofaPoint,
  squareSeatContactY,
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

test("sewn square keeps every finished corner span, thin seam and full centre at all standard sizes", () => {
  for (const widthMm of [380, 450, 500, 550, 600]) {
    const corner = squarePanelPoint({ u: 1, v: 1, widthMm, heightMm: widthMm });
    const opposite = squarePanelPoint({
      u: 0,
      v: 0,
      widthMm,
      heightMm: widthMm,
    });
    assert.equal(corner.x - opposite.x, widthMm / 1000);
    assert.equal(corner.y - opposite.y, widthMm / 1000);
    assert.equal(corner.z, 0);
    const centre = squarePanelPoint({
      u: 0.5,
      v: 0.5,
      widthMm,
      heightMm: widthMm,
    });
    const top = squarePanelPoint({ u: 0.5, v: 1, widthMm, heightMm: widthMm });
    const side = squarePanelPoint({ u: 1, v: 0.5, widthMm, heightMm: widthMm });
    assert.ok(centre.z > (widthMm / 1000) * 0.14);
    assert.ok(top.y < corner.y && side.x < corner.x);
    assert.equal(top.z, 0);
    assert.equal(side.z, 0);
  }
});

test("square drape retains calibrated artwork and identical upright outward faces", () => {
  for (const widthMm of [380, 450, 500, 550, 600])
    for (let v = 0; v <= 1; v += 0.125)
      for (let u = 0; u <= 1; u += 0.125) {
        const front = panelPoint({
          u,
          v,
          widthMm,
          heightMm: widthMm,
          square: true,
        });
        const back = panelPoint({
          u,
          v,
          widthMm,
          heightMm: widthMm,
          square: true,
          back: true,
        });
        assert.ok(
          front.x === -back.x && front.z === -back.z && front.y === back.y,
        );
        assert.equal(front.clothU, u);
        assert.equal(front.clothV, v);
        const source = (p) =>
          panelSourceUv({
            u: p.clothU,
            v: p.clothV,
            placementMm: { x: 120, y: 100 },
            physicalWidthMm: 1375,
            physicalHeightMm: 1000,
            widthMm,
            heightMm: widthMm,
          });
        assert.deepEqual(source(front), source(back));
        if (Math.abs(2 * u - 1) <= 0.62 && Math.abs(2 * v - 1) <= 0.62) {
          assert.equal(front.x, ((u - 0.5) * widthMm) / 1000);
          assert.equal(front.y, ((v - 0.5) * widthMm) / 1000);
        }
      }
});

test("square seat compression creates a bounded contact patch after actual lean and rotation", () => {
  for (const size of [380, 450, 500, 550, 600])
    for (const rotation of [-20, 0, 20]) {
      const bounds = squareSofaBounds(size, size, rotation);
      const plane = bounds.minY + bounds.compression;
      let contactCount = 0;
      for (let v = 0; v <= 64; v++)
        for (let u = 0; u <= 64; u++)
          for (const back of [false, true]) {
            const original = squarePanelPoint({
              u: u / 64,
              v: v / 64,
              widthMm: size,
              heightMm: size,
              back,
            });
            const p = squareSofaPoint(original, rotation);
            const y = squareSeatContactY(p.y, bounds.minY, bounds.compression);
            assert.ok(y >= plane - 1e-12);
            assert.ok(
              y >= p.y - 1e-12 && y - p.y <= bounds.compression + 1e-12,
            );
            if (y === plane) contactCount++;
            assert.ok(p.z >= bounds.minZ - 1e-12 && p.z <= bounds.maxZ + 1e-12);
          }
      assert.ok(
        contactCount > 8,
        "Resting area must be a patch, not one suspended corner",
      );
    }
});

test("non-square geometry retains the original rectangle and round equations", () => {
  for (const round of [false, true])
    for (const [u, v] of [
      [0.2, 0.3],
      [0.7, 0.8],
      [1, 1],
    ]) {
      const a = 2 * u - 1,
        b = 2 * v - 1,
        x = round ? a * Math.sqrt(1 - (b * b) / 2) : a,
        y = round ? b * Math.sqrt(1 - (a * a) / 2) : b;
      const p = panelPoint({ u, v, widthMm: 500, heightMm: 380, round });
      assert.equal(
        p.x,
        ((round ? x : x * (1 - 0.075 * Math.pow(Math.abs(b), 12))) * 500) /
          2000,
      );
      assert.equal(
        p.y,
        ((round ? y : y * (1 - 0.075 * Math.pow(Math.abs(a), 12))) * 380) /
          2000,
      );
      assert.equal(
        p.z,
        0.074 * Math.pow(Math.max(0, (1 - a * a) * (1 - b * b)), 0.48),
      );
    }
});
