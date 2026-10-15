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
  roundPreviewDepthMm,
  squareSeatContactY,
} from "./geometry.mjs";
import { furniturePose, shapedFurnitureBounds } from "./arrangement.mjs";

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

// Sequential rotation independently matches Three's XYZ Euler order: Rz, Ry, Rx.
function rotateForFurniture(p, pose, rotationDegrees) {
  const roll = (rotationDegrees * Math.PI) / 180;
  const x = p.x * Math.cos(roll) - p.y * Math.sin(roll);
  const y = p.x * Math.sin(roll) + p.y * Math.cos(roll);
  const yawX = x * Math.cos(pose.yaw) + p.z * Math.sin(pose.yaw);
  const yawZ = -x * Math.sin(pose.yaw) + p.z * Math.cos(pose.yaw);
  return {
    x: yawX,
    y: y * Math.cos(pose.lean) - yawZ * Math.sin(pose.lean),
    z: y * Math.sin(pose.lean) + yawZ * Math.cos(pose.lean),
    clothU: p.clothU,
    clothV: p.clothV,
  };
}

function roundSurface(diameter) {
  const points = [];
  for (const back of [false, true])
    for (let i = 0; i < 96; i++)
      for (let j = 0; j <= 64; j++)
        points.push(point(diameter, j / 64, (i / 96) * Math.PI * 2, back));
  return points;
}

test("fuller round visual surfaces fit rotated sofa and bed bounds without changing manufacturing depth", () => {
  for (const diameter of [400, 500]) {
    const points = roundSurface(diameter);
    const fullDepth = 1000 * (Math.max(...points.map((p) => p.z)) - Math.min(...points.map((p) => p.z)));
    near(shapeFilledDepthMm(size(diameter)), diameter * 0.2);
    assert.ok(fullDepth > shapeFilledDepthMm(size(diameter)) + 6);
    assert.ok(fullDepth <= roundPreviewDepthMm(diameter));
    for (const p of points)
      assert.ok(Math.hypot(p.x, p.y) * 2000 <= diameter + 1e-8);
    for (const scene of ["sofa-2", "sofa-3", "armchair", "corner", "double-bed", "king-bed"])
      for (const rotation of [-20, -7, 0, 11, 20]) {
        const bounds = shapedFurnitureBounds(size(diameter), scene, rotation);
        const pose = furniturePose(size(diameter), scene);
        const rotated = points.map((p) => rotateForFurniture(p, pose, rotation));
        for (const [axis, dimension] of [["x", "widthMm"], ["y", "heightMm"], ["z", "depthMm"]]) {
          const minimum = Math.min(...rotated.map((p) => p[axis])) * 1000;
          const maximum = Math.max(...rotated.map((p) => p[axis])) * 1000;
          assert.ok(minimum >= -bounds[dimension] / 2 - 1e-7, `${diameter}/${scene}/${rotation}/${axis} minimum`);
          assert.ok(maximum <= bounds[dimension] / 2 + 1e-7, `${diameter}/${scene}/${rotation}/${axis} maximum`);
        }
      }
    const input = { diameterMm: diameter, radiusFraction: 0.7, angle: 0 };
    assert.ok(roundPreviewPoint(input).z > roundPanelPoint(input).z);
  }
});

test("round contact deformation creates a supported patch without moving source samples or upper cloth", () => {
  for (const diameter of [400, 500]) {
    const original = roundSurface(diameter);
    for (const scene of ["configurator", "sofa-2", "king-bed"]) {
      const points = scene === "configurator" ? original : original.map((p) =>
        rotateForFurniture(p, furniturePose(size(diameter), scene), 11));
      const minimum = Math.min(...points.map((p) => p.y));
      // These are the renderer's proposed visual contact depths, not cutting allowances.
      const compression = scene === "configurator"
        ? Math.min(0.010, diameter * 0.00002)
        : Math.min(0.012, diameter * 0.000024);
      const contact = minimum + compression;
      const supported = points.map((p) => ({ ...p, y: squareSeatContactY(p.y, minimum, compression) }));
      const patch = supported.filter((p) => Math.abs(p.y - contact) < 1e-10);
      assert.ok(patch.length > 10, `${diameter}/${scene}: contact is more than a point`);
      assert.ok(Math.max(...patch.map((p) => p.x)) - Math.min(...patch.map((p) => p.x)) > 0.04);
      for (let i = 0; i < points.length; i++) {
        assert.ok(supported[i].y >= contact - 1e-12);
        near(supported[i].x, points[i].x);
        near(supported[i].z, points[i].z);
        near(supported[i].clothU, points[i].clothU);
        near(supported[i].clothV, points[i].clothV);
        if (points[i].y >= contact + compression / 5)
          near(supported[i].y, points[i].y);
      }
    }
  }
});
