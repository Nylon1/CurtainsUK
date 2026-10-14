import test from "node:test";
import assert from "node:assert/strict";
import {
  squarePanelPoint,
  squareDrapeFootprint,
  squarePreviewPoint,
  squarePreviewFootprint,
  squarePreviewFitsSource,
  squareInspectionCamera,
} from "./geometry.mjs";

test("experimental preview keeps baseline construction, exact default mapping and separate footprint", () => {
  const baseline = squareDrapeFootprint(500, 500);
  assert.equal(baseline.version, "square-drape-arc-v1");
  assert.ok(Math.abs(baseline.visibleWidthMm - 547.2181927217559) < 1e-9);
  assert.ok(Math.abs(baseline.visibleHeightMm - 520.0655545674557) < 1e-9);
  for (const size of [380, 450, 500, 550, 600])
    for (const u of [0, 0.2, 0.5, 0.8, 1])
      for (const v of [0, 0.2, 0.5, 0.8, 1]) {
        const input = { u, v, widthMm: size, heightMm: size };
        assert.deepEqual(squarePreviewPoint(input), squarePanelPoint(input));
        const front = squarePreviewPoint(input, "soft-fullness"),
          back = squarePreviewPoint({ ...input, back: true }, "soft-fullness");
        assert.equal(front.clothU, back.clothU);
        assert.equal(front.clothV, back.clothV);
        assert.ok(
          front.x === -back.x && front.z === -back.z && front.y === back.y,
        );
        if (u === 0.5) assert.equal(front.clothU, 0.5);
        if (v === 0.5) assert.equal(front.clothV, 0.5);
      }
  const alternative = squarePreviewFootprint(500, 500, "soft-fullness");
  assert.equal(alternative.version, "square-experimental-fullness-v1");
  assert.ok(alternative.visibleWidthMm > baseline.visibleWidthMm);
  assert.ok(alternative.visibleHeightMm > baseline.visibleHeightMm);
  assert.deepEqual(squareDrapeFootprint(500, 500), baseline);
});
test("experimental shape visibly reduces bottom bow while retaining maximum finished spans and centre depth", () => {
  for (const size of [380, 450, 500, 550, 600]) {
    const input = { widthMm: size, heightMm: size },
      oldBottom = squarePanelPoint({ ...input, u: 0.5, v: 0 }),
      bottom = squarePreviewPoint({ ...input, u: 0.5, v: 0 }, "soft-fullness");
    assert.ok(
      Math.abs(
        bottom.y -
          oldBottom.y +
          (size / 2000) *
            0.045 *
            Math.min(1, 0.2 + Math.max(0, size - 380) / 87.5),
      ) < 1e-12,
    );
    for (const p of [
      { u: 1, v: 1 - 4 / size },
      { u: 1 - 4 / size, v: 1 },
      { u: 1 - 4 / size, v: 0 },
    ]) {
      const before = squarePanelPoint({ ...input, ...p }),
        after = squarePreviewPoint({ ...input, ...p }, "soft-fullness");
      assert.equal(before.x, after.x);
      assert.ok(Math.abs(before.y - after.y) < 1e-12);
    }
    assert.equal(
      squarePreviewPoint({ ...input, u: 0.5, v: 0.5 }, "soft-fullness").z,
      squarePanelPoint({ ...input, u: 0.5, v: 0.5 }).z,
    );
    const broader = squarePreviewPoint(
      { ...input, u: 0.5, v: 0.75 },
      "soft-fullness",
    );
    assert.ok(
      broader.z >
        squarePanelPoint({ ...input, u: 0.5, v: 0.75 }).z +
          (size / 1000) * 0.001,
    );
  }
});
test("experimental source extent fails closed without moving the selected anchor", () => {
  const size = { widthMm: 500, heightMm: 500 },
    calibration = { physicalWidthMm: 1400, physicalHeightMm: 1000 },
    placement = { x: 24, y: 8 };
  assert.equal(
    squarePreviewFitsSource(size, calibration, placement, "baseline"),
    true,
  );
  assert.equal(
    squarePreviewFitsSource(size, calibration, placement, "soft-fullness"),
    false,
  );
  assert.deepEqual(placement, { x: 24, y: 8 });
  assert.equal(
    squarePreviewFitsSource(
      size,
      calibration,
      { x: 100, y: 100 },
      "soft-fullness",
    ),
    true,
  );
});
test("true side camera is exactly orthogonal to the face and retained for either shape", () => {
  for (const size of [380, 450, 500, 550, 600]) {
    const camera = squareInspectionCamera(size, size, "side");
    assert.ok(camera.x > 0);
    assert.equal(camera.z, 0);
    assert.equal(camera.y, size / 2000);
  }
});

const experimentalSample = (input) =>
  squarePreviewPoint(input, "soft-fullness");
test("experimental two-millimetre edge bands keep full source-path and surface-path distance within one percent", () => {
  for (const size of [380, 450, 500, 550, 600])
    for (const axis of ["u", "v"])
      for (const fixed of [0.1, 0.5, 0.9])
        for (const end of [0, 1])
          for (let mm = 0; mm < 20; mm += 2) {
            const p = (t) =>
              experimentalSample({
                u: axis === "u" ? t : fixed,
                v: axis === "v" ? t : fixed,
                widthMm: size,
                heightMm: size,
              });
            let world = 0,
              source = 0,
              previous = p(end === 0 ? mm / size : 1 - mm / size);
            for (let i = 1; i <= 16; i++) {
              const q = p(
                end === 0 ? (mm + i / 8) / size : 1 - (mm + i / 8) / size,
              );
              world +=
                1000 *
                Math.hypot(
                  q.x - previous.x,
                  q.y - previous.y,
                  q.z - previous.z,
                );
              source +=
                size *
                Math.hypot(
                  q.clothU - previous.clothU,
                  q.clothV - previous.clothV,
                );
              previous = q;
            }
            assert.ok(
              Math.abs(source / world - 1) < 0.01,
              `${size}/${axis}/${fixed}/${end}/${mm}: ${source / world}`,
            );
          }
});
