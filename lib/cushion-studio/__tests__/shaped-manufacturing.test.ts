import assert from "node:assert/strict";
import test from "node:test";
import { buildCutPlan, buildSetCutPlan } from "../cutting";
import { quoteCushion, cushionHash } from "../pricing";
import { currentCushionRules } from "../server";
import {
  CUSHION_MAKING_RATE_CARD,
  parseCushionSpec,
  parseCushionDesign,
  type CushionSpec,
  type FabricCuttingFacts,
  type CushionPricingRules,
} from "../domain";
import {
  CUSHION_VISUAL_SIZES,
  SHAPED_CONSTRUCTION_VERSION,
  shapeDrapeFootprints,
  sizeOf,
} from "../runtime/geometry.mjs";

// All rates, approvals, stock and dispatch below are synthetic fixtures. None
// represent supplier evidence, owner instructions or a real workroom approval.
const facts: FabricCuttingFacts = {
  id: "synthetic-shaped-cloth",
  fullWidthMm: 1400,
  usableWidthMm: null,
  pattern: { kind: "plain", horizontalRepeatMm: 0, verticalRepeatMm: 0 },
  directional: false,
  calibration: {
    imageUrl: "https://example.invalid/test-original.jpg",
    physicalWidthMm: 1400,
    physicalHeightMm: 1000,
    evidence: "Synthetic test only",
    orientation: "upright",
    tileable: false,
  },
  supplierCostMinorPerMetre: 2000,
  orderIncrementMetres: 0.01,
  minimumOrderMetres: 0,
  availableMetres: 100,
};
function specFor(sizeId: string, shaped = true): CushionSpec {
  return {
    version: 1,
    id: `test-${sizeId}`,
    sizeId,
    fabricId: facts.id,
    filling: "filled",
    edge: "unpiped",
    placementMm: { x: 100, y: 100 },
    quantity: 1,
    ...(shaped ? { constructionProfile: SHAPED_CONSTRUCTION_VERSION } : {}),
    ...(sizeId.startsWith("bolster")
      ? { bolsterEndPlacementMm: { x: 200, y: 200 } }
      : {}),
  };
}
function rulesFor(sizeId: string, seamAllowanceMm = 12): CushionPricingRules {
  const card = structuredClone(CUSHION_MAKING_RATE_CARD);
  card[sizeId].unpiped.approval = "confirmed";
  return {
    version: "synthetic-shaped-pricing-test",
    marginBasisPoints: 4000,
    vatBasisPoints: 2000,
    supplierCarriageMinor: 0,
    carriageMinor: null,
    customerDeliveryGrossMinor: 495,
    makingRateCard: card,
    compatibleInsertCostMinorBySize: { [sizeId]: 1000 },
    dispatchEstimate: {
      version: "synthetic-dispatch",
      status: "confirmed",
      minimumWorkingDays: 5,
      maximumWorkingDays: 7,
      startsFrom: "order-confirmation",
      confirmedAt: "2026-10-15T00:00:00Z",
      approvalReference: "TEST ONLY",
    },
    construction: {
      version: "synthetic-shaped-construction-test",
      seamAllowanceMm: 20,
      confirmed: true,
      squareDrapeConfirmed: true,
      approvedSizeIds: [sizeId],
      shapedConstructionBySize: {
        [sizeId]: {
          profileVersion: SHAPED_CONSTRUCTION_VERSION,
          seamAllowanceMm,
          confirmed: true,
          approvalReference: "SYNTHETIC TEST ONLY",
        },
      },
      pipingStripWidthMm: null,
      pipingJoinAllowanceMm: null,
      pipingCut: null,
      pipingConfirmed: false,
    },
  };
}
const roundMm = (n: number) => Math.ceil(n * 1000) / 1000;
const shapedSizes = CUSHION_VISUAL_SIZES.filter((s) => s.shape !== "square");

test("staff server JSON retains the exact per-size construction confirmation", async () => {
  const previous = process.env.CUSHION_STUDIO_PRICING_RULES_JSON;
  const rules = rulesFor("rectangle-30-45");
  try {
    process.env.CUSHION_STUDIO_PRICING_RULES_JSON = JSON.stringify(rules);
    const loaded = await currentCushionRules();
    assert.deepEqual(
      loaded.construction.shapedConstructionBySize,
      rules.construction.shapedConstructionBySize,
    );
    assert.equal(
      quoteCushion(specFor("rectangle-30-45"), facts, loaded).purchaseReady,
      true,
    );
    assert.equal(
      quoteCushion(specFor("rectangle-38-50"), facts, loaded).purchaseReady,
      false,
    );
  } finally {
    if (previous === undefined)
      delete process.env.CUSHION_STUDIO_PRICING_RULES_JSON;
    else process.env.CUSHION_STUDIO_PRICING_RULES_JSON = previous;
  }
});

test("version1 shaped profile is retained in saved specs and hashes, while unsupported and square profiles are rejected", () => {
  const spec = specFor("rectangle-30-45");
  assert.deepEqual(parseCushionSpec(spec), spec);
  assert.throws(
    () => parseCushionSpec({ ...spec, constructionProfile: "unapproved-v9" }),
    /CONSTRUCTION_PROFILE_UNSUPPORTED/,
  );
  assert.throws(
    () => parseCushionSpec({ ...spec, sizeId: "square-50" }),
    /CONSTRUCTION_PROFILE_UNSUPPORTED/,
  );
  const design = {
    version: 1,
    id: "test-design",
    name: "Synthetic shaped design",
    scene: "sofa-2",
    colours: { furniture: "#123456", wall: "#abcdef", floor: "#112233" },
    pieces: [
      { spec, position: { slot: 0, offsetX: 0, offsetY: 0, rotation: 0 } },
    ],
  };
  assert.equal(
    parseCushionDesign(design).pieces[0].spec.constructionProfile,
    SHAPED_CONSTRUCTION_VERSION,
  );
  const legacy = { ...spec };
  delete legacy.constructionProfile;
  assert.notEqual(
    cushionHash(parseCushionSpec(spec)),
    cushionHash(parseCushionSpec(legacy)),
  );
  assert.notEqual(
    quoteCushion(spec, facts, rulesFor(spec.sizeId)).quoteId,
    quoteCushion(legacy, facts, rulesFor(spec.sizeId)).quoteId,
  );
});
test("legacy non-square saved specs retain their original dimensions and no automatic profile upgrade", () => {
  for (const size of shapedSizes) {
    const spec = specFor(size.id, false),
      parsed = parseCushionSpec(spec);
    assert.equal(Object.hasOwn(parsed, "constructionProfile"), false);
    const plan = buildCutPlan(parsed, facts, rulesFor(size.id).construction);
    const body = plan.fabrics[0].pieces.find(
      (p) => p.role === "front" || p.role === "body",
    )!;
    assert.equal(body.widthMm, size.widthMm + 40);
    assert.equal(
      body.heightMm,
      roundMm(
        (size.shape === "bolster" ? Math.PI * size.heightMm : size.heightMm) +
          40,
      ),
    );
    assert.equal(body.seamAllowanceMm, 20);
    assert.equal(Object.hasOwn(body, "seamAllowanceKnown"), false);
  }
});
test("new paired panels and bolster body/end cuts use their own exact profile footprints and per-size allowance", () => {
  for (const size of shapedSizes) {
    const spec = specFor(size.id),
      rule = rulesFor(size.id),
      expected = shapeDrapeFootprints(size);
    const plan = buildCutPlan(spec, facts, rule.construction),
      pieces = plan.fabrics[0].pieces;
    assert.equal(plan.ready, true, plan.issues.join("; "));
    assert.equal(plan.matchingVerified, true);
    assert.equal(pieces.length, size.shape === "bolster" ? 3 : 2);
    for (const piece of pieces) {
      const isEnd = piece.role.startsWith("end-"),
        footprint = isEnd ? expected.end! : expected.body;
      const origin = isEnd ? spec.bolsterEndPlacementMm! : spec.placementMm;
      assert.equal(piece.shape, footprint.cutShape);
      assert.equal(piece.widthMm, roundMm(footprint.visibleWidthMm + 24));
      assert.equal(piece.heightMm, roundMm(footprint.visibleHeightMm + 24));
      assert.deepEqual(piece.sourcePlacementMm, {
        x: origin.x + footprint.minX,
        y: origin.y + footprint.minY,
      });
      assert.equal(piece.rotation, 0);
      assert.equal(piece.seamAllowanceMm, 12);
      assert.equal(piece.seamAllowanceKnown, true);
    }
    const pair = pieces.filter((p) =>
      size.shape === "bolster" ? p.role.startsWith("end-") : true,
    );
    assert.deepEqual(pair[0].sourcePlacementMm, pair[1].sourcePlacementMm);
    assert.equal(pair[0].widthMm, pair[1].widthMm);
  }
});
test("directional shaped pairs and bolster caps retain identical lattice phase and zero rotation", () => {
  const patterned: FabricCuttingFacts = {
    ...facts,
    directional: true,
    pattern: {
      kind: "straight",
      horizontalRepeatMm: 345,
      verticalRepeatMm: 460,
    },
  };
  for (const id of [
    "rectangle-38-50",
    "bed-square-65",
    "round-50",
    "bolster-23-56",
  ]) {
    const spec = specFor(id),
      plan = buildCutPlan(spec, patterned, rulesFor(id).construction),
      cloth = plan.fabrics[0];
    assert.equal(plan.ready, true, plan.issues.join("; "));
    assert.equal(cloth.leadingAlignmentAllowanceMm, 460);
    const pair = cloth.pieces.filter((p) =>
      id.startsWith("bolster") ? p.role.startsWith("end-") : true,
    );
    assert.deepEqual(pair[0].sourcePlacementMm, pair[1].sourcePlacementMm);
    for (const [axis, repeat] of [
      ["xMm", 345],
      ["yMm", 460],
    ] as const) {
      const shifts = (pair[1][axis] - pair[0][axis]) / repeat;
      assert.ok(Math.abs(shifts - Math.round(shifts)) < 0.00001);
    }
    assert.ok(cloth.pieces.every((p) => p.rotation === 0));
    assert.equal(plan.matchingVerified, true);
  }
});
test("missing per-size allowance produces only a net envelope and cannot borrow the generic square seam", () => {
  const spec = specFor("rectangle-30-45"),
    rules = rulesFor(spec.sizeId);
  delete rules.construction.shapedConstructionBySize;
  const plan = buildCutPlan(spec, facts, rules.construction),
    footprint = shapeDrapeFootprints(sizeOf(spec.sizeId)).body;
  assert.equal(plan.ready, false);
  assert.equal(plan.matchingVerified, false);
  assert.match(plan.issues.join(" "), /seam allowance is unconfirmed/);
  assert.match(
    plan.instructions.join(" "),
    /net envelope, not a cutting instruction/,
  );
  for (const piece of plan.fabrics[0].pieces) {
    assert.equal(piece.widthMm, roundMm(footprint.visibleWidthMm));
    assert.equal(piece.heightMm, roundMm(footprint.visibleHeightMm));
    assert.equal(piece.seamAllowanceMm, 0);
    assert.equal(piece.seamAllowanceKnown, false);
  }
  const quote = quoteCushion(spec, facts, rules);
  assert.equal(quote.ready, false);
  assert.equal(quote.purchaseReady, false);
});
test("approval requires the exact profile, valid seam and reference, and enables only the approved size", () => {
  const spec = specFor("rectangle-30-45");
  for (const override of [
    { confirmed: false },
    { confirmed: "false" },
    { confirmed: "true" },
    { confirmed: 1 },
    { approvalReference: " " },
    { approvalReference: 42 },
    { approvalReference: null },
    { seamAllowanceMm: null },
    { seamAllowanceMm: -1 },
    { seamAllowanceMm: 0 },
    { seamAllowanceMm: Infinity },
    { profileVersion: "different-profile" },
  ]) {
    const rules = rulesFor(spec.sizeId);
    Object.assign(
      rules.construction.shapedConstructionBySize![spec.sizeId],
      override,
    );
    assert.equal(quoteCushion(spec, facts, rules).purchaseReady, false);
  }
  const rules = rulesFor(spec.sizeId),
    other = specFor("rectangle-38-50");
  assert.equal(quoteCushion(spec, facts, rules).purchaseReady, true);
  assert.equal(quoteCushion(other, facts, rules).purchaseReady, false);
  const set = buildSetCutPlan(
    [
      { spec, facts },
      { spec: other, facts },
    ],
    rules.construction,
  );
  assert.equal(set.ready, false);
  assert.ok(set.issues.every((issue) => !issue.startsWith(`${spec.id}:`)));
});
test("construction approval does not approve proposed dimensions, higher making or a compatible special insert", () => {
  const spec = specFor("round-50");
  const unapprovedSize = rulesFor(spec.sizeId);
  unapprovedSize.construction.approvedSizeIds = [];
  assert.match(
    quoteCushion(spec, facts, unapprovedSize).issues.join(" "),
    /proposed dimensions/,
  );
  const unapprovedMaking = rulesFor(spec.sizeId);
  // Owner defaults are now approved; exercise an explicitly proposed custom rate.
  unapprovedMaking.makingRateCard![spec.sizeId].unpiped = {
    amountMinor: 1100, approval: "proposed",
  };
  assert.match(
    quoteCushion(spec, facts, unapprovedMaking).issues.join(" "),
    /proposed making rate/,
  );
  const missingInsert = rulesFor(spec.sizeId);
  delete missingInsert.compatibleInsertCostMinorBySize;
  assert.match(
    quoteCushion(spec, facts, missingInsert).issues.join(" "),
    /compatible insert supplier cost/,
  );
  assert.equal(quoteCushion(spec, facts, missingInsert).purchaseReady, false);
  assert.equal(
    quoteCushion({ ...spec, filling: "cover" }, facts, missingInsert)
      .purchaseReady,
    true,
  );
  assert.equal(
    quoteCushion(spec, facts, rulesFor(spec.sizeId)).purchaseReady,
    true,
  );
});
test("quoted shaped fabric cost exactly follows the same versioned cutting plan and purchased metres", () => {
  for (const size of shapedSizes) {
    const spec = specFor(size.id),
      rules = rulesFor(size.id),
      quote = quoteCushion(spec, facts, rules);
    assert.deepEqual(
      quote.cutPlan,
      buildCutPlan(spec, facts, rules.construction),
    );
    assert.equal(
      quote.specs[0].constructionProfile,
      SHAPED_CONSTRUCTION_VERSION,
    );
    assert.equal(
      quote.materialCostMinor,
      Math.ceil(
        quote.cutPlan.fabrics[0].orderedMetres! *
          facts.supplierCostMinorPerMetre!,
      ),
    );
    assert.equal(quote.purchaseReady, true, quote.issues.join("; "));
  }
});
test("the old standard 50 cm square quote and curved cut remain unchanged by shaped rule entries", () => {
  const spec = specFor("square-50", false),
    rules = rulesFor("square-50");
  const withShapedRules = quoteCushion(spec, facts, rules);
  delete rules.construction.shapedConstructionBySize;
  const original = quoteCushion(spec, facts, rules);
  assert.deepEqual(withShapedRules.cutPlan, original.cutPlan);
  assert.equal(original.cutPlan.fabrics[0].requiredMetres, 0.561);
  assert.equal(original.cutPlan.fabrics[0].orderedMetres, 0.57);
  assert.equal(original.fixedCostMinor, 1820);
  assert.equal(original.materialCostMinor, 1140);
  assert.equal(original.totalCostMinor, 2960);
  assert.equal(original.totalMinor, 6415);
  for (const key of [
    "fixedCostMinor",
    "materialCostMinor",
    "totalCostMinor",
    "netGoodsMinor",
    "vatMinor",
    "totalMinor",
    "purchaseReady",
  ] as const)
    assert.equal(withShapedRules[key], original[key]);
});
