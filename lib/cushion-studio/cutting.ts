import {
  cushionSize,
  parseCushionSpec,
  previewIssues,
  visiblePanelSize,
  type CushionSpec,
  type FabricCuttingFacts,
  type ConstructionRules,
  type PlacementMm,
} from "./domain";

export type CutPiece = {
  id: string;
  specId: string;
  fabricId: string;
  unit: number;
  role: "front" | "back" | "body" | "end-a" | "end-b" | "piping";
  shape: "rectangle" | "circle";
  widthMm: number;
  heightMm: number;
  xMm: number;
  yMm: number;
  /** Source-image visible origin; front/back equality is explicit and testable. */
  sourcePlacementMm: PlacementMm;
  seamAllowanceMm: number;
  rotation: 0;
};
export type FabricCutPlan = {
  fabricId: string;
  cuttingWidthMm: number | null;
  pieces: CutPiece[];
  requiredMetres: number;
  leadingAlignmentAllowanceMm: number;
  orderedMetres: number | null;
  wasteAreaMm2: number | null;
};
export type CushionCutPlan = {
  version: 1;
  constructionVersion: string;
  specs: CushionSpec[];
  fabrics: FabricCutPlan[];
  matchingVerified: boolean;
  ready: boolean;
  issues: string[];
  instructions: string[];
};
const positive = (n: number | null | undefined): n is number =>
  typeof n === "number" && Number.isFinite(n) && n > 0;
const mod = (n: number, d: number) => ((n % d) + d) % d;
const roundMm = (n: number) => Math.ceil(n * 1000) / 1000;
type Pending = Omit<CutPiece, "xMm" | "yMm">;
function overlaps(a: CutPiece, b: CutPiece) {
  return (
    a.xMm < b.xMm + b.widthMm - 1e-6 &&
    a.xMm + a.widthMm > b.xMm + 1e-6 &&
    a.yMm < b.yMm + b.heightMm - 1e-6 &&
    a.yMm + a.heightMm > b.yMm + 1e-6
  );
}
function alignAtLeast(value: number, phase: number, repeat: number) {
  return phase + Math.ceil((value - phase - 1e-7) / repeat) * repeat;
}

function pack(
  pending: Pending[],
  facts: FabricCuttingFacts,
  issues: string[],
): FabricCutPlan {
  // Existing owner-approved Full Width calculation policy; independent of image calibration.
  const width = facts.fullWidthMm,
    patterned = facts.pattern.kind !== "plain",
    v = facts.pattern.verticalRepeatMm,
    h = facts.pattern.horizontalRepeatMm;
  const repeatReady = facts.pattern.kind === "straight" && positive(v);
  const leading = repeatReady ? v : 0;
  const plan: FabricCutPlan = {
    fabricId: facts.id,
    cuttingWidthMm: width,
    pieces: [],
    requiredMetres: 0,
    leadingAlignmentAllowanceMm: leading,
    orderedMetres: null,
    wasteAreaMm2: null,
  };
  if (!positive(width)) {
    issues.push(
      `${facts.id}: supplier Full Width calculation width is required.`,
    );
    return plan;
  }
  if (repeatReady && positive(h) && width / h > 2048) {
    issues.push(
      `${facts.id}: exceptionally fine horizontal repeat requires a workroom cutting plan.`,
    );
    return plan;
  }
  if (patterned && !repeatReady)
    issues.push(
      `${facts.id}: exact matching requires a confirmed straight-repeat lattice; ${facts.pattern.kind} is awaiting workroom confirmation.`,
    );
  const left = 0;
  let bottom = 0;
  // Largest pieces first is deterministic. Circles use conservative bounding boxes.
  for (const piece of [...pending].sort(
    (a, b) =>
      b.heightMm - a.heightMm ||
      b.widthMm - a.widthMm ||
      a.id.localeCompare(b.id),
  )) {
    if (piece.widthMm > width) {
      issues.push(
        `${piece.id}: the unjoined cut is wider than supplier Full Width.`,
      );
      continue;
    }
    const phaseX =
      repeatReady && positive(h)
        ? mod(piece.sourcePlacementMm.x - piece.seamAllowanceMm - left, h)
        : Math.max(0, piece.sourcePlacementMm.x - piece.seamAllowanceMm - left);
    const phaseY = repeatReady
      ? mod(piece.sourcePlacementMm.y - piece.seamAllowanceMm, v)
      : 0;
    const ySeeds = [0, ...plan.pieces.map((p) => p.yMm + p.heightMm - leading)];
    const ys = [
      ...new Set(
        ySeeds.map((y) => (repeatReady ? alignAtLeast(y, phaseY, v) : y)),
      ),
    ].sort((a, b) => a - b);
    let best: CutPiece | null = null,
      bestBottom = Infinity;
    for (const localY of ys) {
      let xs: number[];
      if (repeatReady && positive(h)) {
        xs = [];
        for (let x = phaseX; x + piece.widthMm <= width + 1e-6; x += h)
          xs.push(x);
      } else if (repeatReady)
        xs = [phaseX]; // No horizontal repeat claim: same column only.
      else xs = [0, ...plan.pieces.map((p) => p.xMm + p.widthMm)];
      for (const x of xs) {
        if (x + piece.widthMm > width + 1e-6) continue;
        const trial: CutPiece = {
          ...piece,
          xMm: roundMm(x),
          yMm: roundMm(localY + leading),
        };
        if (plan.pieces.some((p) => overlaps(p, trial))) continue;
        const used = Math.max(bottom, trial.yMm + trial.heightMm);
        if (
          used < bestBottom - 1e-6 ||
          (Math.abs(used - bestBottom) < 1e-6 &&
            (!best ||
              trial.yMm < best.yMm ||
              (trial.yMm === best.yMm && trial.xMm < best.xMm)))
        ) {
          best = trial;
          bestBottom = used;
        }
      }
    }
    if (!best) {
      issues.push(
        `${piece.id}: selected motif cannot fit across supplier Full Width without an unapproved join.`,
      );
      continue;
    }
    plan.pieces.push(best);
    bottom = bestBottom;
  }
  plan.requiredMetres = Math.ceil(bottom) / 1000;
  if (
    facts.minimumOrderMetres === null ||
    !Number.isFinite(facts.minimumOrderMetres) ||
    facts.minimumOrderMetres < 0
  )
    issues.push(`${facts.id}: supplier minimum order needs confirmation.`);
  else if (plan.requiredMetres <= facts.minimumOrderMetres + 1e-9)
    // A confirmed minimum is itself a purchasable cut. This does not invent
    // the increment needed for orders larger than that minimum.
    plan.orderedMetres = facts.minimumOrderMetres;
  else if (!positive(facts.orderIncrementMetres))
    issues.push(
      `${facts.id}: metre increments above the confirmed minimum need confirmation.`,
    );
  else
    plan.orderedMetres = Number(
      (
        Math.ceil(
          (Math.max(plan.requiredMetres, facts.minimumOrderMetres) - 1e-9) /
            facts.orderIncrementMetres,
        ) * facts.orderIncrementMetres
      ).toFixed(6),
    );
  const length = plan.orderedMetres ?? plan.requiredMetres;
  plan.wasteAreaMm2 = Math.max(
    0,
    width * length * 1000 -
      plan.pieces.reduce((sum, p) => sum + p.widthMm * p.heightMm, 0),
  );
  if (
    plan.orderedMetres !== null &&
    (facts.availableMetres === null ||
      facts.availableMetres + 1e-9 < plan.orderedMetres)
  )
    issues.push(
      `${facts.id}: current verified stock does not cover the ordered cloth requirement.`,
    );
  return plan;
}

function bodyPieces(spec: CushionSpec, rules: ConstructionRules): Pending[] {
  const size = cushionSize(spec.sizeId),
    seam = rules.seamAllowanceMm,
    d = visiblePanelSize(spec),
    pieces: Pending[] = [];
  function add(
    unit: number,
    role: Pending["role"],
    w: number,
    h: number,
    shape: Pending["shape"],
    source: PlacementMm,
  ) {
    pieces.push({
      id: `${spec.id}-${unit}-${role}`,
      specId: spec.id,
      fabricId: spec.fabricId,
      unit,
      role,
      shape,
      widthMm: roundMm(w + 2 * seam),
      heightMm: roundMm(h + 2 * seam),
      sourcePlacementMm: { ...source },
      seamAllowanceMm: seam,
      rotation: 0,
    });
  }
  for (let unit = 1; unit <= spec.quantity; unit++) {
    if (size.shape === "bolster") {
      add(unit, "body", d.widthMm, d.heightMm, "rectangle", spec.placementMm);
      add(
        unit,
        "end-a",
        size.heightMm,
        size.heightMm,
        "circle",
        spec.bolsterEndPlacementMm ?? spec.placementMm,
      );
      add(
        unit,
        "end-b",
        size.heightMm,
        size.heightMm,
        "circle",
        spec.bolsterEndPlacementMm ?? spec.placementMm,
      );
    } else {
      add(
        unit,
        "front",
        d.widthMm,
        d.heightMm,
        size.shape === "round" ? "circle" : "rectangle",
        spec.placementMm,
      );
      add(
        unit,
        "back",
        d.widthMm,
        d.heightMm,
        size.shape === "round" ? "circle" : "rectangle",
        spec.placementMm,
      );
    }
  }
  return pieces;
}
function pipingPieces(
  spec: CushionSpec,
  rules: ConstructionRules,
  fabric: FabricCuttingFacts,
  issues: string[],
): Pending[] {
  if (spec.edge === "unpiped") return [];
  if (
    !rules.pipingConfirmed ||
    !positive(rules.pipingStripWidthMm) ||
    rules.pipingJoinAllowanceMm === null ||
    rules.pipingJoinAllowanceMm < 0 ||
    rules.pipingCut !== "straight"
  ) {
    issues.push(
      `${spec.id}: piping strip width, cut direction, joins and construction require workroom approval; piping cloth is not included in this provisional plan.`,
    );
    return [];
  }
  if (!positive(fabric.fullWidthMm)) return [];
  const size = cushionSize(spec.sizeId),
    perimeter =
      size.shape === "bolster"
        ? 2 * Math.PI * size.heightMm
        : size.shape === "round"
          ? Math.PI * size.widthMm
          : 2 * (size.widthMm + size.heightMm);
  const stripLength = fabric.fullWidthMm - 2 * rules.pipingJoinAllowanceMm;
  if (stripLength <= 0) {
    issues.push("Piping join allowance exceeds cloth width.");
    return [];
  }
  const count = Math.ceil(perimeter / stripLength),
    pieces: Pending[] = [];
  for (let unit = 1; unit <= spec.quantity; unit++)
    for (let index = 0; index < count; index++) {
      pieces.push({
        id: `${spec.id}-${unit}-piping-${index}`,
        specId: spec.id,
        fabricId: fabric.id,
        unit,
        role: "piping",
        shape: "rectangle",
        widthMm:
          Math.min(stripLength, perimeter - index * stripLength) +
          2 * rules.pipingJoinAllowanceMm,
        heightMm: rules.pipingStripWidthMm,
        sourcePlacementMm: { x: 0, y: 0 },
        seamAllowanceMm: 0,
        rotation: 0,
      });
    }
  return pieces;
}

/** A set is packed by fabric identity, so shared cloth economies are calculated once. */
export function buildSetCutPlan(
  inputs: {
    spec: CushionSpec;
    facts: FabricCuttingFacts;
    pipingFacts?: FabricCuttingFacts;
  }[],
  rules: ConstructionRules,
): CushionCutPlan {
  if (!inputs.length || inputs.length > 32)
    throw new Error("CUSHION_SET_SIZE_INVALID");
  if (
    !Number.isFinite(rules.seamAllowanceMm) ||
    rules.seamAllowanceMm < 0 ||
    rules.seamAllowanceMm > 100
  )
    throw new Error("CUSHION_SEAM_INVALID");
  const issues: string[] = [],
    groups = new Map<
      string,
      { facts: FabricCuttingFacts; pieces: Pending[] }
    >(),
    specs = inputs.map((i) => parseCushionSpec(i.spec));
  if (specs.reduce((sum, spec) => sum + spec.quantity, 0) > 100)
    throw new Error("CUSHION_SET_QUANTITY_LIMIT");
  if (new Set(specs.map((s) => s.id)).size !== specs.length)
    throw new Error("CUSHION_DUPLICATE_ID");
  if (!rules.confirmed)
    issues.push(
      "The 20 mm seam planning allowance and closure construction require workroom approval.",
    );
  function append(facts: FabricCuttingFacts, pieces: Pending[]) {
    const current = groups.get(facts.id);
    if (current && JSON.stringify(current.facts) !== JSON.stringify(facts))
      throw new Error("CUSHION_FABRIC_FACTS_CONFLICT");
    if (current) current.pieces.push(...pieces);
    else groups.set(facts.id, { facts, pieces });
  }
  inputs.forEach((input, index) => {
    const spec = specs[index];
    issues.push(...previewIssues(spec, input.facts));
    if (
      cushionSize(spec.sizeId).approval === "proposed" &&
      !rules.approvedSizeIds?.includes(spec.sizeId)
    )
      issues.push(
        `${spec.sizeId}: proposed dimensions require workroom approval.`,
      );
    append(input.facts, bodyPieces(spec, rules));
    if (spec.edge !== "unpiped") {
      const piping = spec.edge === "self" ? input.facts : input.pipingFacts;
      if (
        !piping ||
        piping.id !==
          (spec.edge === "self" ? spec.fabricId : spec.pipingFabricId)
      )
        issues.push(
          `${spec.id}: contrast piping fabric facts are unavailable.`,
        );
      else append(piping, pipingPieces(spec, rules, piping, issues));
    }
  });
  const fabrics = [...groups.values()].map((g) =>
    pack(g.pieces, g.facts, issues),
  );
  const complete = inputs.every((input, index) => {
    const expected = bodyPieces(specs[index], rules).length;
    return (
      fabrics
        .flatMap((f) => f.pieces)
        .filter((p) => p.specId === specs[index].id && p.role !== "piping")
        .length === expected
    );
  });
  const matchingVerified =
    complete &&
    inputs.every(
      ({ spec, facts }) =>
        previewIssues(spec, facts).length === 0 &&
        (facts.pattern.kind === "plain" ||
          (facts.pattern.kind === "straight" &&
            positive(facts.pattern.verticalRepeatMm))),
    ) &&
    !issues.some((s) => /datum|motif cannot|wider than/.test(s));
  return {
    version: 1,
    constructionVersion: rules.version,
    specs,
    fabrics,
    matchingVerified,
    ready: issues.length === 0,
    issues: [...new Set(issues)],
    instructions: [
      "Use the saved fabric ID, colourway, original image and placement coordinates. Check the fabric face and nap before cutting.",
      "Front and back must show the identical motif position, upright when viewed from each outward face. Cut two separate matching pieces; do not mirror or turn one piece upside down.",
      "The supplier Full Width is the owner-approved calculation width. Image width and supplier calculation width retain separate provenance. Diagram coordinates are millimetres from the cloth left edge and start of the allocated roll. Patterned plans reserve one vertical repeat to locate the photographed motif before cutting.",
      "Transfer the visible placement to both panels and verify the motif against the saved reference before sewing. Dashed seam lines enclose the finished face; outside lines are cut lines.",
      "Keep all pieces upright. Circle bounding boxes are conservative; no unverified circle nesting or 90-degree rotation savings are charged.",
      ...(specs.some((s) => cushionSize(s.sizeId).shape === "bolster")
        ? [
            "Bolster: cut one continuous body rectangle plus two matching circular end caps. The body length is 560 mm; its wrap is π × 230 mm before seam allowance.",
          ]
        : []),
      "Confirm closure, seam allowance, piping construction and any unresolved review items before manufacturing.",
    ],
  };
}
export function buildCutPlan(
  spec: CushionSpec,
  facts: FabricCuttingFacts,
  rules: ConstructionRules,
  pipingFacts?: FabricCuttingFacts,
) {
  return buildSetCutPlan([{ spec, facts, pipingFacts }], rules);
}
