import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  roundPanelPoint,
  roundPreviewPoint,
  roundPreviewFootprint,
  roundPreviewFitsSource,
  shapeDrapeFootprints,
  shapeFilledDepthMm,
} from "./geometry.mjs";

const near = (a, b, tolerance = 1e-8) =>
  assert.ok(Math.abs(a - b) <= tolerance, `${a} != ${b}`);
const distanceMm = (a, b) =>
  1000 * Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const clothDistanceMm = (a, b, diameter) =>
  diameter * Math.hypot(a.clothU - b.clothU, a.clothV - b.clothV);
const size = (diameter) => ({
  shape: "round",
  widthMm: diameter,
  heightMm: diameter,
});
const point = (diameterMm, radiusFraction, angle, back = false) =>
  roundPreviewPoint({ diameterMm, radiusFraction, angle, back });

test("round visual fill leaves manufacturing dome, caps, footprints and depth authority unchanged", () => {
  const source = readFileSync(new URL("./geometry.mjs", import.meta.url), "utf8")
    .replaceAll("\r\n", "\n");
  const construction = source.slice(
    source.indexOf("// Circular panels use"),
    source.indexOf("// Visual fill only:"),
  ).trim();
  assert.equal(
    createHash("sha256").update(construction).digest("hex"),
    "b62cbd33bae233275303e419ea5162218a592ff06bb73b11857fb7afbd201ec0",
  );
  for (const [diameter, expected] of [[400, 420.2008804940563], [500, 525.251100617571]]) {
    const before = structuredClone(shapeDrapeFootprints(size(diameter)));
    roundPreviewFootprint(diameter);
    near(before.body.visibleWidthMm, expected);
    assert.deepEqual(shapeDrapeFootprints(size(diameter)), before);
    near(roundPanelPoint({ diameterMm: diameter, radiusFraction: 0, angle: 0 }).z * 2000, diameter * 0.2);
  }
});

test("preview keeps nominal cardinal spans, matching upright outward artwork and a closed seam", () => {
  for (const diameter of [400, 500]) {
    for (let i = 0; i < 96; i++) {
      const angle = (i / 96) * Math.PI * 2;
      const rim = point(diameter, 1, angle);
      near(distanceMm(rim, point(diameter, 1, Math.PI - angle, true)), 0);
      near(rim.z, 0);
      for (const r of [0, 0.25, 0.7, 0.95, 0.99, 1]) {
        const front = point(diameter, r, angle), back = point(diameter, r, angle, true);
        near(front.x, -back.x);
        near(front.y, back.y);
        near(front.z, -back.z);
        near(front.clothU, back.clothU);
        near(front.clothV, back.clothV);
        assert.ok(Object.values(front).every(Number.isFinite));
      }
    }
    near(point(diameter, 1, 0).x * 2000, diameter);
    near(point(diameter, 1, Math.PI / 2).y * 2000, diameter);
    assert.ok(point(diameter, 0.5, 0).clothU > 0.5);
    assert.ok(point(diameter, 0.5, Math.PI / 2).clothV > 0.5);
    for (const r of [0, 0.5, 0.99, 1]) {
      const first = point(diameter, r, 0), last = point(diameter, r, 2 * Math.PI);
      near(distanceMm(first, last), 0);
      near(clothDistanceMm(first, last, diameter), 0);
    }
  }
});

test("radial source distance follows measured curved cloth through the outer 20 mm", () => {
  for (const diameter of [400, 500]) {
    for (let i = 0; i < 32; i++) {
      // Off-grid angles independently exercise folds and table interpolation.
      const angle = ((i + 0.371) / 32) * Math.PI * 2;
      for (let mm = 0; mm < 20; mm += 2) {
        const start = 1 - (mm + 2) / (diameter / 2), end = 1 - mm / (diameter / 2);
        const first = point(diameter, start, angle);
        let previous = first, arc = 0;
        for (let step = 1; step <= 128; step++) {
          const next = point(diameter, start + ((end - start) * step) / 128, angle);
          arc += distanceMm(previous, next);
          previous = next;
        }
        const relativeError = Math.abs(clothDistanceMm(first, previous, diameter) / arc - 1);
        assert.ok(relativeError < 0.001, `radial scale error ${relativeError}`);
      }
    }
  }
});

test("circumferential easing is explicitly bounded rather than claimed globally isometric", () => {
  for (const diameter of [400, 500]) {
    let largestEasing = 0;
    for (let i = 0; i < 96; i++) {
      const angle = ((i + 0.217) / 96) * Math.PI * 2;
      const a = point(diameter, 1, angle), b = point(diameter, 1, angle + 0.0001);
      largestEasing = Math.max(largestEasing, Math.abs(clothDistanceMm(a, b, diameter) / distanceMm(a, b) - 1));
    }
    assert.ok(largestEasing > 0.05 && largestEasing < 0.08, `rim easing ${largestEasing}`);
  }
});

test("independent angular samples fit finite preview bounds without changing the selected anchor", () => {
  for (const diameter of [400, 500]) {
    const footprint = roundPreviewFootprint(diameter);
    for (let i = 0; i < 257; i++) {
      const angle = ((i + 0.413) / 257) * Math.PI * 2;
      for (const r of [0, 0.4, 0.9, 0.99, 1]) {
        const p = point(diameter, r, angle);
        const x = p.clothU * diameter, y = p.clothV * diameter;
        assert.ok(x >= footprint.minX && x <= footprint.maxX);
        assert.ok(y >= footprint.minY && y <= footprint.maxY);
      }
    }
    const placement = Object.freeze({ x: 100, y: 100 });
    const calibration = Object.freeze({ physicalWidthMm: 1400, physicalHeightMm: 1000 });
    assert.equal(roundPreviewFitsSource(size(diameter), calibration, placement), true);
    assert.equal(roundPreviewFitsSource(size(diameter), calibration, { x: 0, y: 0 }), false);
    assert.equal(roundPreviewFitsSource(size(diameter), calibration, { x: NaN, y: 100 }), false);
    assert.equal(roundPreviewFitsSource(size(diameter), { physicalWidthMm: 100, physicalHeightMm: 100 }, placement), false);
    assert.equal(roundPreviewFitsSource(size(diameter), null, placement), false);
    assert.deepEqual(placement, { x: 100, y: 100 });
  }
});

test("visual shoulders broaden within the existing 6 mm furniture support margin", () => {
  for (const diameter of [400, 500]) {
    let maxHalfDepth = 0;
    for (let i = 0; i < 96; i++) {
      const angle = (i / 96) * Math.PI * 2;
      for (let j = 0; j <= 128; j++) {
        const p = point(diameter, j / 128, angle);
        assert.ok(Math.hypot(p.x, p.y) * 2000 <= diameter + 1e-8);
        maxHalfDepth = Math.max(maxHalfDepth, p.z * 1000);
      }
    }
    assert.ok(maxHalfDepth * 2 <= shapeFilledDepthMm(size(diameter)) + 6);
    const input = { diameterMm: diameter, radiusFraction: 0.7, angle: 0 };
    assert.ok(roundPreviewPoint(input).z > roundPanelPoint(input).z);
  }
});
