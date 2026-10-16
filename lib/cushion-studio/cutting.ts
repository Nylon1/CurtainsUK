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
import { squareDrapeFootprint, shapeDrapeFootprints, sizeOf, SHAPED_CONSTRUCTION_VERSION } from "./runtime/geometry.mjs";

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
  /** False means a net panel envelope only; never a production-ready cut. */
  seamAllowanceKnown?: boolean;
  /** A bias piping strip is cut at 45 degrees inside its reserved square. */
  rotation: 0 | 45;
  stripLengthMm?: number;
  stripWidthMm?: number;
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
  /** Separate from costed cloth until the entire straight-strip method is confirmed. */
  pipingProposals?: PipingProposalPlan[];
  matchingVerified: boolean;
  ready: boolean;
  issues: string[];
  instructions: string[];
};
export type PipingProposalPlan = {
  specId: string;
  fabricId: string;
  version: string;
  quantity: number;
  direction: "straight" | "bias";
  stripWidthMm: number;
  cordDiameterMm: number;
  finishedPerimeterMm: number;
  finishingAllowanceMm: number;
  /** Per cushion, not multiplied by quantity. */
  grossTargetLengthMm: number;
  allowanceConfirmed: boolean;
  materialIncluded: boolean;
  straightLayout?: {
    pieces: CutPiece[];
    requiredMetres: number;
    orderedMetres: number | null;
    additionalRequiredMetres: number;
    issues: string[];
  };
  biasLayout?: {
    pieces: CutPiece[];
    requiredMetres: number;
    orderedMetres: number | null;
    additionalRequiredMetres: number;
    issues: string[];
  };
};
const positive = (n: number | null | undefined): n is number =>
  typeof n === "number" && Number.isFinite(n) && n > 0;
const mod = (n: number, d: number) => ((n % d) + d) % d;
const roundMm = (n: number) => Math.ceil(n * 1000) / 1000;
type Pending = Omit<CutPiece, "xMm" | "yMm">;
function flatConstruction(spec: CushionSpec, rules: ConstructionRules) {
  const rule = rules.flatConstructionBySize?.[spec.sizeId];
  const known = positive(rule?.seamAllowanceMm) && rule!.seamAllowanceMm <= 100;
  return { seam: known ? rule!.seamAllowanceMm : 0, known,
    approvalAuthority: rule?.approvalAuthority,
    confirmed: Boolean(known && rule?.confirmed === true &&
      typeof rule.approvalReference === "string" && rule.approvalReference.trim() &&
      (rule.approvalAuthority === undefined || ["owner", "workroom"].includes(rule.approvalAuthority))) };
}
function shapedConstruction(spec: CushionSpec, rules: ConstructionRules) {
  const rule = rules.shapedConstructionBySize?.[spec.sizeId];
  const known = rule?.profileVersion === spec.constructionProfile &&
    typeof rule?.seamAllowanceMm === "number" && Number.isFinite(rule.seamAllowanceMm) &&
    rule.seamAllowanceMm > 0 && rule.seamAllowanceMm <= 100;
  return {
    seam: known ? rule!.seamAllowanceMm! : 0,
    known,
    confirmed: Boolean(known && rule?.confirmed === true && typeof rule.approvalReference === "string" && rule.approvalReference.trim()),
  };
}
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
  useUsableWidth = false,
): FabricCutPlan {
  // Existing owner-approved Full Width calculation policy; independent of image calibration.
  const width = useUsableWidth && positive(facts.usableWidthMm) && positive(facts.fullWidthMm)
      ? Math.min(facts.fullWidthMm, facts.usableWidthMm) : facts.fullWidthMm,
    patterned = facts.pattern.kind !== "plain",
    v = facts.pattern.verticalRepeatMm,
    h = facts.pattern.horizontalRepeatMm;
  const repeatReady = facts.pattern.kind === "straight" && positive(v);
  if (useUsableWidth && !positive(facts.usableWidthMm))
    issues.push(`${facts.id}: usable cutting width requires supplier/workroom confirmation; full width is a planning fallback only.`);
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
  finishPack(plan, facts, issues);
  return plan;
}

/** Recalculate the same shared fabric order after adding approved strips. */
function finishPack(plan: FabricCutPlan, facts: FabricCuttingFacts, issues: string[]) {
  const width = plan.cuttingWidthMm;
  if (!positive(width)) return;
  plan.requiredMetres = Math.ceil(Math.max(0, ...plan.pieces.map(p => p.yMm + p.heightMm))) / 1000;
  plan.orderedMetres = null;
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
      plan.pieces.reduce((sum, p) => sum +
        (p.rotation === 45 && p.stripLengthMm && p.stripWidthMm
          ? p.stripLengthMm * p.stripWidthMm : p.widthMm * p.heightMm), 0),
  );
  if (
    plan.orderedMetres !== null &&
    (facts.availableMetres === null ||
      facts.availableMetres + 1e-9 < plan.orderedMetres)
  )
    issues.push(
      `${facts.id}: current verified stock does not cover the ordered cloth requirement.`,
    );
}

function finishedPipingPerimeter(spec: CushionSpec) {
  const size = cushionSize(spec.sizeId);
  return size.shape === "bolster" ? 2 * Math.PI * size.heightMm
    : size.shape === "round" ? Math.PI * size.widthMm
    : 2 * (size.widthMm + size.heightMm);
}

/** Straight, unrotated strips only. Bounding boxes deliberately exclude curved
 * panel corners: no circle nesting, bias yield or invisible offcut is invented.
 * Main panels from the entire shared-fabric set have already been placed.
 */
function allocateStraightPiping(
  plan: FabricCutPlan, spec: CushionSpec, proposal: PipingProposalPlan,
  joinAllowanceMm: number, issues: string[],
) {
  const width = plan.cuttingWidthMm, strips: CutPiece[] = [];
  if (!positive(width) || width <= 2 * joinAllowanceMm) {
    issues.push(`${spec.id}: usable width cannot supply a straight piping strip.`);
    return strips;
  }
  for (let unit = 1; unit <= spec.quantity; unit++) {
    let remaining = roundMm(proposal.grossTargetLengthMm), index = 0;
    const maximumStrips = joinAllowanceMm > 0
      ? Math.floor((proposal.finishingAllowanceMm + 1e-6) / (2 * joinAllowanceMm))
      : Infinity;
    const unitStrips: CutPiece[] = [];
    while (remaining > 0.0005 && index < 4096) {
      const bottom = Math.max(0, ...plan.pieces.map(p => p.yMm + p.heightMm));
      const ys = [...new Set([0, ...plan.pieces.map(p => p.yMm + p.heightMm)])].sort((a,b) => a-b);
      const options: { x: number; y: number; length: number; extendsCloth: boolean }[] = [];
      for (const y of ys) {
        const blocked = plan.pieces.filter(p => p.yMm < y + proposal.stripWidthMm - 1e-6 && p.yMm + p.heightMm > y + 1e-6)
          .sort((a,b) => a.xMm - b.xMm);
        let x = 0;
        for (const obstacle of [...blocked, { xMm: width, widthMm: 0 }]) {
          const length = Math.min(remaining, obstacle.xMm - x);
          // A remnant is only suitable when its extra joins fit the confirmed
          // gross allowance. Otherwise retain it and use a longer cloth strip.
          if (length > 2 * joinAllowanceMm + 0.0005 &&
              index + 1 + Math.ceil(Math.max(0, remaining - length - 1e-6) / width) <= maximumStrips)
            options.push({x, y, length, extendsCloth: y + proposal.stripWidthMm > bottom + 1e-6});
          x = Math.max(x, obstacle.xMm + obstacle.widthMm);
        }
      }
      // Spend existing rectangular remnants before adding any cloth. Within
      // those remnants prefer long strips, limiting join loss and tiny slivers.
      options.sort((a,b) => Number(a.extendsCloth)-Number(b.extendsCloth) ||
        (a.extendsCloth ? a.y-b.y || b.length-a.length : b.length-a.length || a.y-b.y) || a.x-b.x);
      const best = options[0];
      if (!best) break;
      const piece: CutPiece = {
        id: `${spec.id}-${unit}-piping-${index++}`, specId: spec.id,
        fabricId: plan.fabricId, unit, role: "piping", shape: "rectangle",
        widthMm: roundMm(best.length), heightMm: proposal.stripWidthMm,
        xMm: roundMm(best.x), yMm: roundMm(best.y),
        sourcePlacementMm: {x: roundMm(best.x), y: roundMm(best.y)},
        seamAllowanceMm: 0, rotation: 0,
      };
      plan.pieces.push(piece); strips.push(piece); unitStrips.push(piece);
      remaining = Math.max(0, roundMm(remaining - piece.widthMm));
    }
    if (remaining > 0.0005 || unitStrips.reduce((sum,p) => sum + p.widthMm - 2 * joinAllowanceMm, 0) + 0.001 < proposal.finishedPerimeterMm)
      issues.push(`${spec.id}: the proposed gross strip allowance cannot cover the perimeter and these joins; confirm a revised piping layout.`);
  }
  return strips;
}

/** Reserve complete square envelopes for 45 degree strips. This deliberately
 * does not nest strips in curved-panel corners or count triangular offcuts.
 * Every reserved square contains its entire diagonal strip and cannot overlap
 * another panel or strip. Compare up to four candidate strip counts, then charge the
 * cheapest complete shared-fabric layout rather than an assumed bias yield.
 */
function allocateBiasPiping(
  plan: FabricCutPlan, spec: CushionSpec, proposal: PipingProposalPlan,
  facts: FabricCuttingFacts,
) {
  const width = plan.cuttingWidthMm;
  if (!positive(width) || !positive(facts.usableWidthMm))
    return {plan, pieces: [] as CutPiece[], issues: [`${spec.id}: usable cutting width is required for bias piping.`]};
  const maxLength = width * Math.SQRT2 - proposal.stripWidthMm;
  if (maxLength <= 0)
    return {plan, pieces: [] as CutPiece[], issues: [`${spec.id}: usable width cannot contain a bias piping strip.`]};
  const minimumCount = Math.max(1, Math.ceil(proposal.grossTargetLengthMm / maxLength));
  let best: {plan: FabricCutPlan; pieces: CutPiece[]; issues: string[]} | null = null;
  for (let count = minimumCount; count <= Math.min(8, minimumCount + 3); count++) {
    const trial = structuredClone(plan), pieces: CutPiece[] = [];
    let possible = true;
    const length = roundMm(proposal.grossTargetLengthMm / count);
    const side = roundMm((length + proposal.stripWidthMm) / Math.SQRT2);
    if (side > width + 1e-6) continue;
    for (let unit = 1; unit <= spec.quantity && possible; unit++) {
      for (let index = 0; index < count; index++) {
        const xs = [...new Set([0, ...trial.pieces.map(p => roundMm(p.xMm + p.widthMm))])]
          .filter(x => x + side <= width + 1e-6);
        const ys = [...new Set([0, ...trial.pieces.map(p => roundMm(p.yMm + p.heightMm))])];
        let chosen: CutPiece | null = null, bestBottom = Infinity;
        for (const y of ys) for (const x of xs) {
          const candidate: CutPiece = {
            id: `${spec.id}-${unit}-bias-piping-${index}`, specId: spec.id,
            fabricId: plan.fabricId, unit, role: "piping", shape: "rectangle",
            widthMm: side, heightMm: side, xMm: x, yMm: y,
            sourcePlacementMm: {x, y}, seamAllowanceMm: 0, rotation: 45,
            stripLengthMm: length, stripWidthMm: proposal.stripWidthMm,
          };
          if (trial.pieces.some(p => overlaps(p, candidate))) continue;
          const bottom = Math.max(y + side, ...trial.pieces.map(p => p.yMm + p.heightMm));
          if (bottom < bestBottom - 1e-6 ||
              (Math.abs(bottom - bestBottom) < 1e-6 &&
                (!chosen || y < chosen.yMm || y === chosen.yMm && x < chosen.xMm))) {
            chosen = candidate; bestBottom = bottom;
          }
        }
        if (!chosen) { possible = false; break; }
        trial.pieces.push(chosen); pieces.push(chosen);
      }
    }
    if (!possible) continue;
    const issues: string[] = [];
    finishPack(trial, facts, issues);
    if (!best ||
        (trial.orderedMetres ?? Infinity) < (best.plan.orderedMetres ?? Infinity) ||
        (trial.orderedMetres === best.plan.orderedMetres &&
          trial.requiredMetres < best.plan.requiredMetres - 1e-6))
      best = {plan: trial, pieces, issues};
  }
  return best ?? {plan, pieces: [] as CutPiece[], issues: [`${spec.id}: no non-overlapping bias strip layout fits the cutting width.`]};
}

function bodyPieces(spec: CushionSpec, rules: ConstructionRules): Pending[] {
  const size = cushionSize(spec.sizeId),
    flat = spec.manufacturingProfile === "flat-sewn-v1",
    shaped = !flat && spec.constructionProfile === SHAPED_CONSTRUCTION_VERSION,
    construction = flat ? flatConstruction(spec, rules) : shaped ? shapedConstruction(spec, rules) : null,
    seam = construction ? construction.seam : rules.seamAllowanceMm,
    d = visiblePanelSize(spec),
    footprints = shaped ? shapeDrapeFootprints(sizeOf(spec.sizeId)) : null,
    squareDrape = !flat && spec.sizeId.startsWith("square-")
      ? squareDrapeFootprint(d.widthMm, d.heightMm)
      : footprints?.body ?? null,
    panelWidth = squareDrape?.visibleWidthMm ?? d.widthMm,
    panelHeight = squareDrape?.visibleHeightMm ?? d.heightMm,
    panelOrigin = squareDrape
      ? {
          x: spec.placementMm.x + squareDrape.minX,
          y: spec.placementMm.y + squareDrape.minY,
        }
      : spec.placementMm,
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
      ...(construction ? { seamAllowanceKnown: construction.known } : {}),
      rotation: 0,
    });
  }
  for (let unit = 1; unit <= spec.quantity; unit++) {
    if (size.shape === "bolster") {
      const end = footprints?.end,
        endPlacement = spec.bolsterEndPlacementMm ?? spec.placementMm,
        endOrigin = end ? { x: endPlacement.x + end.minX, y: endPlacement.y + end.minY } : endPlacement;
      add(unit, "body", panelWidth, panelHeight, "rectangle", panelOrigin);
      add(
        unit,
        "end-a",
        end?.visibleWidthMm ?? size.heightMm,
        end?.visibleHeightMm ?? size.heightMm,
        "circle",
        endOrigin,
      );
      add(
        unit,
        "end-b",
        end?.visibleWidthMm ?? size.heightMm,
        end?.visibleHeightMm ?? size.heightMm,
        "circle",
        endOrigin,
      );
    } else {
      add(
        unit,
        "front",
        panelWidth,
        panelHeight,
        size.shape === "round" ? "circle" : "rectangle",
        panelOrigin,
      );
      add(
        unit,
        "back",
        panelWidth,
        panelHeight,
        size.shape === "round" ? "circle" : "rectangle",
        panelOrigin,
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
    flatPiping: {spec: CushionSpec; facts: FabricCuttingFacts}[] = [],
    groups = new Map<
      string,
      { facts: FabricCuttingFacts; pieces: Pending[] }
    >(),
    specs = inputs.map((i) => parseCushionSpec(i.spec));
  if (specs.reduce((sum, spec) => sum + spec.quantity, 0) > 100)
    throw new Error("CUSHION_SET_QUANTITY_LIMIT");
  if (new Set(specs.map((s) => s.id)).size !== specs.length)
    throw new Error("CUSHION_DUPLICATE_ID");
  if (specs.some((spec) => !spec.manufacturingProfile && !spec.constructionProfile) && !rules.confirmed)
    issues.push(
      "The 20 mm seam planning allowance and closure construction require workroom approval.",
    );
  if (
    specs.some((spec) => !spec.manufacturingProfile && spec.sizeId.startsWith("square-")) &&
    !rules.squareDrapeConfirmed
  )
    issues.push(
      "Square cushion curved-face panel dimensions and seam allowance require workroom approval before a binding quote.",
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
    if (spec.manufacturingProfile === "flat-sewn-v1") {
      const construction = flatConstruction(spec, rules);
      if (!construction.known) issues.push(`${spec.id}: flat panel seam allowance is unavailable; do not cut from the net diagram.`);
      if (!construction.confirmed) {
        const shape = cushionSize(spec.sizeId).shape;
        issues.push(shape === "round"
          ? `${spec.id}: round panels are specified; perimeter seam and concealed zip construction require workroom acceptance.`
          : shape === "bolster"
            ? `${spec.id}: bolster panels are specified; circular joins, closure and artwork orientation require workroom acceptance before cutting.`
            : `${spec.id}: flat panel dimensions, seam allowance and concealed zip construction require workroom acceptance.`);
      }
    } else if (spec.constructionProfile === SHAPED_CONSTRUCTION_VERSION) {
      const construction = shapedConstruction(spec, rules);
      if (!construction.known)
        issues.push(`${spec.id}: ${spec.sizeId} seam allowance is unconfirmed; diagram shows net panel envelopes only, with no cutting allowance included.`);
      if (!construction.confirmed)
        issues.push(`${spec.id}: ${spec.sizeId} ${spec.constructionProfile} panel dimensions, closure and construction require workroom approval.`);
    }
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
      else if (spec.manufacturingProfile === "flat-sewn-v1" && rules.pipingProposal) {
        append(piping, []);
        flatPiping.push({spec, facts: piping});
      } else append(piping, pipingPieces(spec, rules, piping, issues));
    }
  });
  const fabrics = [...groups.values()].map((g) =>
    pack(g.pieces, g.facts, issues, g.pieces.some(p => specs.find(s => s.id === p.specId)?.manufacturingProfile === "flat-sewn-v1")),
  );
  const pipingProposals: PipingProposalPlan[] = [];
  const trialPlans = new Map<string, FabricCutPlan>();
  for (const {spec, facts} of flatPiping.sort((a,b) => a.spec.id.localeCompare(b.spec.id))) {
    const p = rules.pipingProposal!;
    const direction = p.cutBySize?.[spec.sizeId];
    if (typeof p.version !== "string" || !p.version.trim() ||
        !positive(p.stripWidthMm) || !positive(p.cordDiameterMm) ||
        typeof p.finishingAllowanceMm !== "number" || !Number.isFinite(p.finishingAllowanceMm) || p.finishingAllowanceMm < 0 ||
        !["straight", "bias"].includes(direction) || typeof p.allowanceConfirmed !== "boolean") {
      issues.push(`${spec.id}: piping proposal is incomplete or invalid.`);
      continue;
    }
    const proposal: PipingProposalPlan = {
      specId: spec.id, fabricId: facts.id, version: p.version,
      quantity: spec.quantity, direction,
      stripWidthMm: p.stripWidthMm, cordDiameterMm: p.cordDiameterMm,
      finishedPerimeterMm: finishedPipingPerimeter(spec),
      finishingAllowanceMm: p.finishingAllowanceMm,
      grossTargetLengthMm: finishedPipingPerimeter(spec) + p.finishingAllowanceMm,
      allowanceConfirmed: p.allowanceConfirmed, materialIncluded: false,
    };
    pipingProposals.push(proposal);
    const plan = fabrics.find(f => f.fabricId === facts.id)!;
    if (direction === "bias") {
      const target = structuredClone(trialPlans.get(facts.id) ?? plan);
      const chargedIds = new Set(plan.pieces.map(piece => piece.id));
      const includesUnpricedStrips = target.pieces.some(piece => !chargedIds.has(piece.id));
      const layout = allocateBiasPiping(target, spec, proposal, facts);
      proposal.biasLayout = {
        pieces: layout.pieces, requiredMetres: layout.plan.requiredMetres,
        orderedMetres: layout.plan.orderedMetres,
        additionalRequiredMetres: Math.max(0, layout.plan.requiredMetres - plan.requiredMetres),
        issues: layout.issues,
      };
      const confirmed = p.allowanceConfirmed === true && rules.pipingConfirmed === true &&
        rules.pipingBiasConfirmed === true && rules.pipingStripWidthMm === p.stripWidthMm &&
        rules.pipingCordDiameterMm === p.cordDiameterMm;
      if (confirmed && !includesUnpricedStrips && layout.pieces.length > 0 &&
          layout.issues.length === 0) {
        Object.assign(plan, layout.plan);
        proposal.materialIncluded = true;
      } else {
        trialPlans.set(facts.id, layout.plan);
        issues.push(`${spec.id}: bias piping layout or construction is unconfirmed; piping cloth is not charged.`);
        issues.push(...layout.issues);
      }
      continue;
    }
    const confirmed = positive(facts.usableWidthMm) && positive(facts.fullWidthMm) &&
      p.allowanceConfirmed === true && rules.pipingConfirmed === true &&
      rules.pipingCut === "straight" && rules.pipingStripWidthMm === p.stripWidthMm &&
      rules.pipingCordDiameterMm === p.cordDiameterMm &&
      (rules.pipingJoinAllowanceMm === null ||
        (Number.isFinite(rules.pipingJoinAllowanceMm) && rules.pipingJoinAllowanceMm >= 0));
    const target = structuredClone(trialPlans.get(facts.id) ?? plan);
    const chargedIds = new Set(plan.pieces.map(piece => piece.id));
    const includesUnpricedStrips = target.pieces.some(piece => !chargedIds.has(piece.id));
    const layoutIssues: string[] = [];
    // Null means the workroom accepted one gross 300 mm reserve that includes
    // every join and finishing loss. It is not a claim of zero physical loss.
    const join = confirmed ? (rules.pipingJoinAllowanceMm ?? 0) : 0;
    const strips = allocateStraightPiping(target, spec, proposal, join, layoutIssues);
    finishPack(target, facts, layoutIssues);
    proposal.straightLayout = {
      pieces: strips, requiredMetres: target.requiredMetres,
      orderedMetres: target.orderedMetres,
      additionalRequiredMetres: Math.max(0, target.requiredMetres - plan.requiredMetres),
      issues: layoutIssues,
    };
    if (confirmed && !includesUnpricedStrips && layoutIssues.length === 0) {
      Object.assign(plan, target);
      proposal.materialIncluded = true;
    } else {
      trialPlans.set(facts.id, target);
      issues.push(`${spec.id}: piping finishing allowance, straight-strip method and joins remain unconfirmed or incomplete; proposed strips are not included in charged cloth.`);
      issues.push(...layoutIssues);
    }
  }
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
    specs.every((spec) => spec.manufacturingProfile === "flat-sewn-v1" ? flatConstruction(spec, rules).confirmed : !spec.constructionProfile || shapedConstruction(spec, rules).confirmed) &&
    (rules.squareDrapeConfirmed === true ||
      !specs.some((spec) => !spec.manufacturingProfile && spec.sizeId.startsWith("square-"))) &&
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
    ...(pipingProposals.length ? {pipingProposals} : {}),
    matchingVerified,
    ready: issues.length === 0,
    issues: [...new Set(issues)],
    instructions: [
      "Use the saved fabric ID, colourway, original image and placement coordinates. Check the fabric face and nap before cutting.",
      "Front and back must show the identical motif position, upright when viewed from each outward face. Cut two separate matching pieces; do not mirror or turn one piece upside down.",
      "Supplier cloth width and photographed width retain separate provenance. Flat-sewn plans use verified usable cutting width within supplier full width; missing usable width is a planning fallback requiring confirmation. Diagram coordinates are millimetres from the usable cloth left edge and start of the allocated roll. Patterned plans reserve one vertical repeat to locate the photographed motif before cutting.",
      "Transfer the visible placement to both panels and verify the motif against the saved reference before sewing. Diagram outlines include the stated seam allowance only where confirmed; net-only envelopes with unknown allowances must not be used for cutting.",
      ...(specs.some((s) => !s.manufacturingProfile && s.sizeId.startsWith("square-"))
        ? [
            "Square panels include the measured curved-face fabric extent centred on the selected motif. Confirm this draped panel size and the additional seam allowance with the workroom before purchase.",
          ]
        : []),
      ...specs.filter((s) => !s.manufacturingProfile && s.constructionProfile).map((spec) => {
        const construction = shapedConstruction(spec, rules),
          footprint = shapeDrapeFootprints(sizeOf(spec.sizeId));
        return `${spec.id}: construction profile ${spec.constructionProfile}; finished ${cushionSize(spec.sizeId).label}. Net ${footprint.body.cutShape} panel ${footprint.body.visibleWidthMm.toFixed(3)} × ${footprint.body.visibleHeightMm.toFixed(3)} mm${footprint.end ? `; two matching circular ends ${footprint.end.visibleWidthMm.toFixed(3)} mm net diameter` : '; two identical upright panels'}. ${construction.known ? `Add ${construction.seam} mm seam allowance per edge as shown.` : 'Seam allowance unknown: diagram is a net envelope, not a cutting instruction.'} Confirm panel dimensions and closure with the workroom; do not apply the standard-square profile.`;
      }),
      ...specs.filter(s => s.manufacturingProfile === "flat-sewn-v1").map(spec => {
        const c = flatConstruction(spec, rules);
        const panels = bodyPieces({...spec, quantity: 1}, rules);
        const shape = cushionSize(spec.sizeId).shape;
        const acceptance = c.confirmed
          ? c.approvalAuthority === "owner" ? "owner-accepted construction specification; physical workroom trial not claimed" : "construction accepted under the recorded approval reference"
          : "STARTING PROPOSAL: construction still requires workroom confirmation";
        const closure = shape === "round"
          ? "Two circular faces with no side band; concealed zip in a suitable section of the perimeter seam."
          : shape === "bolster" ? "One continuous body with its concealed zip in the body seam, plus two separate circular ends. Keep the body artwork upright and both end caps identically upright outward; matching the body motif across the end joins is not promised."
          : "Concealed zip in lower seam where practical.";
        return `${spec.id}: flat-sewn-v1; finished ${cushionSize(spec.sizeId).label} measured flat. ${panels.map(p => `${p.role}: ${p.shape === "circle" ? "diameter " + p.widthMm : p.widthMm + " × " + p.heightMm} mm`).join("; ")}. ${c.seam} mm allowance per edge; ${acceptance}. ${closure} Rendered fullness does not add cloth or justify an enlarged insert.`;
      }),
      ...pipingProposals.map(p => `${p.specId}: ${p.direction} piping ${p.stripWidthMm} mm strips for ${p.cordDiameterMm} mm cord. Per cushion: finished perimeter ${p.finishedPerimeterMm.toFixed(3)} mm + ${p.finishingAllowanceMm} mm finishing allowance = ${p.grossTargetLengthMm.toFixed(3)} mm gross strip target. ${p.materialIncluded ? p.direction === "bias" ? "Charged 45 degree bias strips occupy conservative square envelopes in the shared cloth plan; triangular offcuts are not reused." : "Confirmed straight strips are included in shared cloth; usable rectangular remnants are allocated first." : "PLANNING ONLY: strip allowance or layout is not confirmed or charged."}`),
      "Keep all pieces upright. Circle bounding boxes are conservative; no unverified circle nesting or 90-degree rotation savings are charged.",
      ...(specs.some((s) => cushionSize(s.sizeId).shape === "bolster" && !s.constructionProfile)
        ? [
            ...specs.filter(s => cushionSize(s.sizeId).shape === "bolster" && !s.constructionProfile).map(s => `Bolster ${s.id}: cut one continuous body rectangle plus two matching circular end caps. The body length is ${cushionSize(s.sizeId).widthMm} mm; its wrap is π × ${cushionSize(s.sizeId).heightMm} mm before seam allowance.`),
          ]
        : []),
      ...(specs.some((s) => cushionSize(s.sizeId).shape === "bolster" && s.constructionProfile && !s.manufacturingProfile)
        ? ["Shaped bolster: the body is one continuous unmirrored wrap, with its joining seam underneath. The cylinder stops at the two cap seams; domed caps complete the finished overall length. Both end panels have identical upright outward placement. Opposite body views show different portions of that continuous wrap, not duplicate flat faces."]
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
