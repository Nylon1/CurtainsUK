import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  CUSHION_VISUAL_SIZES,
  SHAPED_CONSTRUCTION_VERSION,
  sizeOf,
  shapedPanelPoint,
  shapedPanelAxis,
  roundPanelPoint,
  bolsterBodyPoint,
  bolsterEndPoint,
  shapeDrapeFootprints,
  shapeDrapeFitsSource,
  shapeFilledDepthMm,
} from "./geometry.mjs";
const near = (a, b, epsilon = 1e-8) =>
  assert.ok(Math.abs(a - b) <= epsilon, `${a} != ${b}`);
const distance = (a, b) => 1000 * Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const panels = CUSHION_VISUAL_SIZES.filter((s) =>
  ["rectangle", "bed"].includes(s.shape),
);

test("accepted standard square source remains byte-for-byte unchanged", () => {
  const source = readFileSync(
    new URL("./geometry.mjs", import.meta.url),
    "utf8",
  ).replaceAll("\r\n", "\n");
  const square = source.slice(
    source.indexOf("/** Sewn square"),
    source.indexOf("export function coverageBounds"),
  );
  assert.equal(
    createHash("sha256").update(square).digest("hex"),
    "15aeeb96eb88bcf0b316ce3086b59b008d544d2725d55534eb8bcdd0df3e96da",
  );
});
test("shared size authority retains legacy entries and separates proposed added dimensions", () => {
  assert.equal(CUSHION_VISUAL_SIZES.length, 18);
  assert.equal(new Set(CUSHION_VISUAL_SIZES.map((s) => s.id)).size, 18);
  assert.equal(
    CUSHION_VISUAL_SIZES.filter((s) => s.shape === "square").length,
    7,
  );
  assert.equal(
    CUSHION_VISUAL_SIZES.filter((s) => s.approval === "proposed").length,
    10,
  );
  for (const size of CUSHION_VISUAL_SIZES) {
    assert.equal(sizeOf(size.id), size);
    assert.ok(Object.isFrozen(size));
  }
});
test("independent rectangular and bed profiles keep finished spans, closed thin seams and identical upright faces", () => {
  for (const size of panels) {
    const xs = shapedPanelAxis(size.widthMm),
      ys = shapedPanelAxis(size.heightMm);
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    const footprint = shapeDrapeFootprints(size).body;
    for (const u of xs)
      for (const v of ys) {
        const front = shapedPanelPoint({ ...size, u, v });
        const back = shapedPanelPoint({ ...size, u, v, back: true });
        near(front.x, -back.x);
        near(front.y, back.y);
        near(front.z, -back.z);
        near(front.clothU, back.clothU);
        near(front.clothV, back.clothV);
        minX = Math.min(minX, front.x);
        maxX = Math.max(maxX, front.x);
        minY = Math.min(minY, front.y);
        maxY = Math.max(maxY, front.y);
        const sx = front.clothU * size.widthMm,
          sy = (1 - front.clothV) * size.heightMm;
        assert.ok(sx >= footprint.minX - 1e-7 && sx <= footprint.maxX + 1e-7);
        assert.ok(sy >= footprint.minY - 1e-7 && sy <= footprint.maxY + 1e-7);
        if (u === 0 || u === 1 || v === 0 || v === 1) {
          near(front.z, 0);
          const opposite = shapedPanelPoint({
            ...size,
            u: 1 - u,
            v,
            back: true,
          });
          near(front.x, opposite.x);
          near(front.y, opposite.y);
          near(opposite.z, 0);
        }
      }
    near((maxX - minX) * 1000, size.widthMm);
    near((maxY - minY) * 1000, size.heightMm);
    const centre = shapedPanelPoint({ ...size, u: 0.5, v: 0.5 });
    assert.ok(centre.z > 0.03 && centre.z < 0.1);
    near(centre.clothU, 0.5);
    near(centre.clothV, 0.5);
  }
  assert.throws(() =>
    shapedPanelPoint({ ...sizeOf("square-50"), u: 0.5, v: 0.5 }),
  );
});
test("shaped panel axis distances are measured on the curved face, not flat nominal artwork", () => {
  for (const size of panels)
    for (const axis of ["u", "v"]) {
      let previous,
        length = 0,
        first,
        last;
      for (let i = 0; i <= 4096; i++) {
        const t = i / 4096,
          p = shapedPanelPoint({
            ...size,
            u: axis === "u" ? t : 0.5,
            v: axis === "v" ? t : 0.5,
          });
        first ||= p;
        last = p;
        if (previous) length += distance(p, previous);
        previous = p;
      }
      const source =
        axis === "u"
          ? (last.clothU - first.clothU) * size.widthMm
          : (last.clothV - first.clothV) * size.heightMm;
      assert.ok(
        Math.abs(source / length - 1) < 0.0005,
        `${size.id} ${axis}: ${source}/${length}`,
      );
      assert.ok(source > (axis === "u" ? size.widthMm : size.heightMm));
    }
});
test("round panels are circular with matched outward motifs, radial physical scale and bounded proposed seam easing", () => {
  for (const diameterMm of [400, 500]) {
    const footprint = shapeDrapeFootprints({
      shape: "round",
      widthMm: diameterMm,
      heightMm: diameterMm,
    }).body;
    assert.equal(footprint.cutShape, "circle");
    let previous,
      arc = 0;
    for (let i = 0; i <= 4096; i++) {
      const r = Math.sin(((i / 4096) * Math.PI) / 2),
        p = roundPanelPoint({ radiusFraction: r, angle: 0, diameterMm });
      if (previous) arc += distance(p, previous);
      previous = p;
      const back = roundPanelPoint({
        radiusFraction: r,
        angle: 0,
        diameterMm,
        back: true,
      });
      near(p.x, -back.x);
      near(p.y, back.y);
      near(p.z, -back.z);
      near(p.clothU, back.clothU);
      near(p.clothV, back.clothV);
    }
    near(arc * 2, footprint.visibleWidthMm, 0.0001);
    for (let i = 0; i < 64; i++) {
      const angle = (i * Math.PI) / 32,
        p = roundPanelPoint({ radiusFraction: 1, angle, diameterMm });
      near(Math.hypot(p.x, p.y) * 2000, diameterMm);
      near(p.z, 0);
      const opposite = roundPanelPoint({
        radiusFraction: 1,
        angle: Math.PI - angle,
        diameterMm,
        back: true,
      });
      near(p.x, opposite.x);
      near(p.y, opposite.y);
    }
    // A curved dome cannot be globally isometric to a flat circular cut.
    // Record explicit circumference easing, never silently claim 1:1 in both directions.
    const easing = footprint.visibleWidthMm / diameterMm - 1;
    assert.ok(easing > 0.05 && easing < 0.051);
  }
});
test("bolster is one exact-scale continuous wrap and two matching domed caps with exact finished dimensions", () => {
  for (const id of ["bolster-23-56", "bolster-19-44"]) {
  const size = sizeOf(id),
    lengthMm = size.widthMm,
    diameterMm = size.heightMm;
  const { body, end } = shapeDrapeFootprints(size);
  near(body.visibleWidthMm, id === "bolster-23-56" ? 539.3 : 422.9);
  near(body.visibleHeightMm, Math.PI * diameterMm);
  for (const along of [0, 0.25, 0.5, 0.75, 1]) {
    const start = bolsterBodyPoint({ along, around: 0, lengthMm, diameterMm });
    const finish = bolsterBodyPoint({ along, around: 1, lengthMm, diameterMm });
    near(distance(start, finish), 0);
    near(start.clothV - finish.clothV, 1);
    near(Math.hypot(start.y, start.z) * 2000, diameterMm);
  }
  const left = bolsterEndPoint({
    radiusFraction: 0,
    angle: 0,
    lengthMm,
    diameterMm,
    back: true,
  });
  const right = bolsterEndPoint({
    radiusFraction: 0,
    angle: 0,
    lengthMm,
    diameterMm,
  });
  near((right.x - left.x) * 1000, lengthMm);
  for (let i = 0; i < 64; i++) {
    const around = i / 64,
      alpha = around * 2 * Math.PI - Math.PI / 2;
    for (const back of [false, true]) {
      const cap = bolsterEndPoint({
        radiusFraction: 1,
        angle: back ? alpha : Math.PI - alpha,
        lengthMm,
        diameterMm,
        back,
      });
      const tube = bolsterBodyPoint({
        along: back ? 0 : 1,
        around,
        lengthMm,
        diameterMm,
      });
      near(distance(cap, tube), 0);
    }
    const a = bolsterEndPoint({
      radiusFraction: 0.8,
      angle: alpha,
      lengthMm,
      diameterMm,
    });
    const b = bolsterEndPoint({
      radiusFraction: 0.8,
      angle: alpha,
      lengthMm,
      diameterMm,
      back: true,
    });
    near(a.x, -b.x);
    near(a.y, b.y);
    near(a.z, -b.z);
    near(a.clothU, b.clothU);
    near(a.clothV, b.clothV);
  }
  assert.ok(end.visibleWidthMm / diameterMm - 1 < 0.014);
  }
});
test("shape-specific finite bounds include both bolster caps, reject missing calibration and exclude square authority", () => {
  for (const size of CUSHION_VISUAL_SIZES.filter((s) => s.shape !== "square")) {
    const calibration = { physicalWidthMm: 1400, physicalHeightMm: 1000 };
    assert.equal(
      shapeDrapeFitsSource(size, calibration, { x: 100, y: 100 }),
      true,
    );
    assert.equal(
      shapeDrapeFitsSource(size, calibration, { x: 1300, y: 900 }),
      false,
    );
    assert.equal(shapeDrapeFitsSource(size, null, { x: 100, y: 100 }), false);
    assert.equal(
      shapeDrapeFootprints(size).version,
      SHAPED_CONSTRUCTION_VERSION,
    );
  }
  assert.equal(
    shapeDrapeFitsSource(
      sizeOf("bolster-23-56"),
      { physicalWidthMm: 1400, physicalHeightMm: 1000 },
      { x: 100, y: 100 },
      { x: 0, y: 0 },
    ),
    false,
  );
  assert.throws(() => shapeDrapeFootprints(sizeOf("square-50")));
});

test("curved rectangular source paths stay within one percent of surface distance in narrow edge bands", () => {
  for (const size of panels)
    for (const axis of ["u", "v"])
      for (const fixed of [0.1, 0.5, 0.9])
        for (const end of [0, 1])
          for (const mm of [0, 8, 18]) {
            let world = 0,
              source = 0,
              previous;
            for (let i = 0; i <= 16; i++) {
              const t =
                (mm + (2 * i) / 16) /
                (axis === "u" ? size.widthMm : size.heightMm);
              const p = shapedPanelPoint({
                ...size,
                u: axis === "u" ? (end ? 1 - t : t) : fixed,
                v: axis === "v" ? (end ? 1 - t : t) : fixed,
              });
              if (previous) {
                world += distance(p, previous);
                source += Math.hypot(
                  (p.clothU - previous.clothU) * size.widthMm,
                  (p.clothV - previous.clothV) * size.heightMm,
                );
              }
              previous = p;
            }
            assert.ok(
              Math.abs(source / world - 1) < 0.01,
              `${size.id} ${axis}/${fixed}/${end}/${mm}: ${source}/${world}`,
            );
          }
});
test("cheap profile depth conservatively bounds its maximum filled extent", () => {
  for (const size of panels) {
    const depth = shapeFilledDepthMm(size);
    for (const u of [0, 0.25, 0.5, 0.75, 1])
      for (const v of [0, 0.25, 0.5, 0.75, 1])
        assert.ok(2000 * shapedPanelPoint({ ...size, u, v }).z <= depth + 1e-8);
  }
  near(shapeFilledDepthMm(sizeOf("round-50")), 100);
  near(shapeFilledDepthMm(sizeOf("bolster-23-56")), 230);
  assert.throws(() => shapeFilledDepthMm(sizeOf("square-50")));
});
