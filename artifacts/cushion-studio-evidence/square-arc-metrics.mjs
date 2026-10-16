import {
  squarePanelPoint as point,
  squareDrapeFootprint,
} from "../../lib/cushion-studio/runtime/geometry.mjs";
import { writeFileSync } from "node:fs";
const results = [];
for (const size of [380, 450, 500, 550, 600]) {
  let worst = { error: 0 };
  for (const axis of ["u", "v"])
    for (const fixed of [0.1, 0.25, 0.5, 0.75, 0.9])
      for (const end of [0, 1])
        for (let mm = 0; mm < 20; mm += 2) {
          const p = (t) =>
            point({
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
              Math.hypot(q.x - previous.x, q.y - previous.y, q.z - previous.z);
            source +=
              size *
              Math.hypot(
                q.clothU - previous.clothU,
                q.clothV - previous.clothV,
              );
            previous = q;
          }
          const error = Math.abs(source / world - 1);
          if (error > worst.error)
            worst = {
              error,
              size,
              axis,
              fixed,
              end,
              mm,
              worldMm: world,
              sourceMm: source,
            };
        }
  results.push({
    size,
    footprint: squareDrapeFootprint(size, size),
    worstTwoMillimetreBand: worst,
  });
}
writeFileSync(
  new URL("./square-arc-metrics.json", import.meta.url),
  JSON.stringify(
    {
      description:
        "Independent 3D surface arc vs two-dimensional physical source-coordinate path in 2mm parameter bands through outer20mm. Samples along both axes, both ends, five cross-sections and all five standard sizes.",
      results,
    },
    null,
    2,
  ),
);
console.log(
  results.map((r) => ({
    size: r.size,
    error: r.worstTwoMillimetreBand.error,
    footprint: r.footprint,
  })),
);
