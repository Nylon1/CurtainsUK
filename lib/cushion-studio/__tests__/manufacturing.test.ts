import assert from "node:assert/strict";
import test from "node:test";
import { buildCutPlan, buildSetCutPlan } from "../cutting";
import { quoteCushion, quoteCushionSet, cushionHash } from "../pricing";
import { cushionOrderingTerms } from "../catalogue";
import { squareDrapeFootprint } from "../runtime/geometry.mjs";
import {
  CUSHION_MAKING_RATE_CARD,
  PREVIEW_PRICING_RULES,
  parseCushionSpec,
  parseCushionDesign,
  previewIssues,
  type CushionSpec,
  type FabricCuttingFacts,
  type CushionPricingRules,
} from "../domain";

// Synthetic arithmetic fixtures, explicitly not supplier or owner-approved commercial rates.
const spec: CushionSpec = {
  version: 1,
  id: "test-square",
  sizeId: "square-50",
  fabricId: "test-fabric",
  filling: "filled",
  edge: "unpiped",
  placementMm: { x: 100, y: 100 },
  quantity: 1,
};
const fabric: FabricCuttingFacts = {
  id: "test-fabric",
  fullWidthMm: 1400,
  usableWidthMm: null,
  pattern: { kind: "plain", horizontalRepeatMm: 0, verticalRepeatMm: 0 },
  directional: false,
  calibration: {
    imageUrl: "https://example.invalid/original.jpg",
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
const rules: CushionPricingRules = {
  version: "test",
  construction: {
    version: "test",
    seamAllowanceMm: 20,
    confirmed: true,
    squareDrapeConfirmed: true,
    pipingStripWidthMm: 40,
    pipingJoinAllowanceMm: 20,
    pipingCut: "straight",
    pipingConfirmed: true,
  },
  marginBasisPoints: 5000,
  vatBasisPoints: 2000,
  supplierCarriageMinor: 0,
  carriageMinor: 500,
};

test("draped 50 cm square uses two matching curved-face cuts across actual Full Width", () => {
  const p = buildCutPlan(spec, fabric, rules.construction),
    f = p.fabrics[0];
  assert.equal(f.requiredMetres, 0.561);
  assert.equal(f.orderedMetres, 0.57);
  assert.equal(f.pieces.length, 2);
  assert.equal(f.cuttingWidthMm, 1400);
  assert.equal(p.ready, true);
  assert.deepEqual(f.pieces.map((c) => c.role).sort(), ["back", "front"]);
  assert.deepEqual(
    f.pieces[0].sourcePlacementMm,
    f.pieces[1].sourcePlacementMm,
  );
  assert.ok(f.pieces.every((piece) => piece.widthMm > 580));
  assert.ok(f.pieces.every((piece) => piece.heightMm > 550));
  const drape = squareDrapeFootprint(500, 500);
  assert.equal(
    f.pieces[0].widthMm,
    Math.ceil((drape.visibleWidthMm + 40) * 1000) / 1000,
  );
  assert.deepEqual(f.pieces[0].sourcePlacementMm, {
    x: spec.placementMm.x + drape.minX,
    y: spec.placementMm.y + drape.minY,
  });
});
test("patterned matching includes phase alignment and leading waste, with two matching upright cuts", () => {
  const pf = {
    ...fabric,
    directional: true,
    pattern: {
      kind: "straight" as const,
      horizontalRepeatMm: 345,
      verticalRepeatMm: 460,
    },
  };
  const p = buildCutPlan(spec, pf, rules.construction),
    f = p.fabrics[0],
    [a, b] = f.pieces;
  assert.equal(p.matchingVerified, true);
  assert.equal(f.leadingAlignmentAllowanceMm, 460);
  assert.ok(f.requiredMetres > 0.56);
  assert.equal((b.xMm - a.xMm) % 345, 0);
  assert.equal(Math.abs(b.yMm - a.yMm) % 460, 0);
  assert.equal(a.rotation, 0);
  assert.equal(b.rotation, 0);
  assert.ok(a.xMm + a.widthMm <= f.cuttingWidthMm!);
  assert.ok(b.xMm + b.widthMm <= f.cuttingWidthMm!);
});
test("unknown and half-drop lattices never promise identical reproducible cuts", () => {
  for (const kind of ["unknown", "half-drop"] as const) {
    const p = buildCutPlan(
      spec,
      {
        ...fabric,
        pattern: { kind, horizontalRepeatMm: 300, verticalRepeatMm: 400 },
      },
      rules.construction,
    );
    assert.equal(p.ready, false);
    assert.equal(p.matchingVerified, false);
  }
});
test("a selected motif that cannot fit the cutting width fails closed", () => {
  const s = { ...spec, placementMm: { x: 850, y: 100 } };
  const p = buildCutPlan(
    s,
    {
      ...fabric,
      fullWidthMm: 800,
      pattern: {
        kind: "straight",
        horizontalRepeatMm: null,
        verticalRepeatMm: 400,
      },
    },
    rules.construction,
  );
  assert.equal(p.ready, false);
  assert.match(p.issues.join(" "), /motif cannot fit/);
});
test("source bounds use independently confirmed X/Y extents; never stretch or tile", () => {
  assert.equal(previewIssues(spec, fabric).length, 0);
  assert.match(
    previewIssues({ ...spec, placementMm: { x: 0, y: 0 } }, fabric).join(" "),
    /curved surface exceeds/,
  );
  assert.match(
    previewIssues({ ...spec, placementMm: { x: 100, y: 600 } }, fabric).join(
      " ",
    ),
    /exceeds/,
  );
  assert.match(
    previewIssues(spec, { ...fabric, calibration: null }).join(" "),
    /unavailable/,
  );
});
test("unconfirmed draped-square construction blocks only affected configurations", () => {
  const unconfirmed = {
    ...rules.construction,
    squareDrapeConfirmed: false,
  };
  const square = buildCutPlan(spec, fabric, unconfirmed);
  assert.equal(square.ready, false);
  assert.equal(square.matchingVerified, false);
  assert.match(square.issues.join(" "), /curved-face panel dimensions/);
  assert.equal(square.fabrics[0].requiredMetres, 0.561);
  const rectangular = buildCutPlan(
    { ...spec, sizeId: "rectangle-38-50" },
    fabric,
    unconfirmed,
  );
  assert.equal(rectangular.ready, true);
  const squareQuote = quoteCushion(spec, fabric, {
    ...rules,
    construction: unconfirmed,
  });
  assert.equal(squareQuote.purchaseReady, false);
  assert.equal(squareQuote.status, "review-required");
});
test("bolster has one continuous wrap plus two identical end caps", () => {
  const p = buildCutPlan(
      { ...spec, sizeId: "bolster-23-56" },
      fabric,
      rules.construction,
    ),
    pieces = p.fabrics[0].pieces;
  assert.equal(pieces.filter((p) => p.role === "body").length, 1);
  assert.equal(pieces.filter((p) => p.role.startsWith("end")).length, 2);
  const body = pieces.find((p) => p.role === "body")!;
  assert.equal(body.widthMm, 600);
  assert.ok(Math.abs(body.heightMm - (230 * Math.PI + 40)) < 0.0011);
});
test("set packing combines compatible cloth before supplier minimum/increment", () => {
  const small = { ...spec, sizeId: "square-38" },
    inputs = [
      { spec: small, facts: fabric },
      { spec: { ...small, id: "second" }, facts: fabric },
    ];
  const grouped = buildSetCutPlan(inputs, rules.construction).fabrics[0];
  assert.equal(grouped.pieces.length, 4);
  assert.equal(grouped.requiredMetres, 0.871);
  const orderFabric = {
    ...fabric,
    minimumOrderMetres: 1,
    orderIncrementMetres: 0.1,
  };
  assert.equal(
    quoteCushionSet(
      inputs.map((i) => ({ ...i, facts: orderFabric })),
      rules,
    ).materials[0].orderedMetres,
    1,
  );
  assert.equal(
    quoteCushion(small, orderFabric, rules).materials[0].orderedMetres,
    1,
  );
});
test("fixed basis is £18.20 filled and £13.20 cover; draped cloth is costed separately", () => {
  const filled = quoteCushion(spec, fabric, rules),
    cover = quoteCushion({ ...spec, filling: "cover" }, fabric, rules);
  assert.equal(filled.fixedCostMinor, 1820);
  assert.equal(cover.fixedCostMinor, 1320);
  assert.equal(filled.materialCostMinor, 1140);
  assert.equal(filled.totalCostMinor, 2960);
  assert.equal(filled.netGoodsMinor, 5920);
  assert.equal(filled.totalMinor, 7704);
  assert.equal(filled.ready, true);
});

test("owner's editable 40 percent target applies to actual draped material cost", () => {
  assert.equal(PREVIEW_PRICING_RULES.marginBasisPoints, 4000);
  const quote = quoteCushion(spec, fabric, {
    ...rules,
    marginBasisPoints: PREVIEW_PRICING_RULES.marginBasisPoints,
    carriageMinor: 0,
  });
  assert.equal(quote.totalCostMinor, 2960);
  assert.equal(quote.netGoodsMinor, 4933);
  assert.equal(quote.vatMinor, 987);
  assert.equal(quote.totalMinor, 5920);
  assert.equal(quote.staffPricing.targetMarginBasisPoints, 4000);
  assert.notEqual(quote.staffPricing.resultingMarginBasisPoints, null);
  assert.ok(
    Math.abs(quote.staffPricing.resultingMarginBasisPoints! - 4000) < 1,
  );
  assert.equal(
    quoteCushion(spec, fabric, {
      ...rules,
      marginBasisPoints: 5000,
      carriageMinor: 0,
    }).totalMinor,
    7104,
  );
});

test("owner 1 metre minimum prices the plain 50 cm filled example at £76.40 and cover at £66.40", () => {
  const facts = { ...fabric, ...cushionOrderingTerms() };
  assert.equal(facts.minimumOrderMetres, 1);
  assert.equal(facts.orderIncrementMetres, 1);
  const pricing = { ...rules, marginBasisPoints: 4000, carriageMinor: 0 };
  const filled = quoteCushion(spec, facts, pricing),
    cover = quoteCushion({ ...spec, filling: "cover" }, facts, pricing);
  assert.equal(filled.cutPlan.fabrics[0].requiredMetres, 0.561);
  assert.equal(filled.cutPlan.fabrics[0].orderedMetres, 1);
  assert.equal(filled.materialCostMinor, 2000);
  assert.equal(filled.totalCostMinor, 3820);
  assert.equal(filled.netGoodsMinor, 6367);
  assert.equal(filled.vatMinor, 1273);
  assert.equal(filled.totalMinor, 7640);
  assert.equal(cover.totalCostMinor, 3320);
  assert.equal(cover.totalMinor, 6640);
  assert.equal(filled.ready, true);
});

test("1 metre minimum and increments apply once per distinct shared cloth group", () => {
  const main = { ...fabric, ...cushionOrderingTerms() },
    contrast = { ...main, id: "contrast" };
  const small = {
    ...spec,
    sizeId: "square-38",
    edge: "contrast" as const,
    pipingFabricId: "contrast",
  };
  const plan = buildSetCutPlan(
    [small, { ...small, id: "second" }].map((spec) => ({
      spec,
      facts: main,
      pipingFacts: contrast,
    })),
    rules.construction,
  );
  assert.equal(plan.fabrics.length, 2);
  assert.deepEqual(
    plan.fabrics.map((f) => f.orderedMetres),
    [1, 1],
  );
  const larger = buildSetCutPlan(
    [spec, { ...spec, id: "second" }].map((spec) => ({ spec, facts: main })),
    rules.construction,
  );
  assert.equal(larger.fabrics[0].requiredMetres, 1.121);
  assert.equal(larger.fabrics[0].orderedMetres, 2);
  assert.doesNotMatch(larger.issues.join(" "), /increments above/);
});

test("fabric-level terms cannot override the owner-wide one metre increment", () => {
  const source = {
    originalImageUrl: "https://example.invalid/test.jpg",
    evidence: "Image source only",
    minimumOrderMetres: 0.5,
    orderIncrementMetres: 0.1,
  };
  assert.equal(cushionOrderingTerms(source).minimumOrderMetres, 1);
  assert.equal(cushionOrderingTerms(source).orderIncrementMetres, 1);
  const verified = cushionOrderingTerms({
    ...source,
    supplierTermsVerified: true,
    supplierTermsEvidence: "Synthetic verified terms fixture",
  });
  assert.equal(verified.minimumOrderMetres, 1);
  assert.equal(verified.orderIncrementMetres, 1);
});
test("missing cost, construction, piping, minimum or margin remain explicit blockers", () => {
  const p = quoteCushion(
    { ...spec, edge: "self" },
    { ...fabric, supplierCostMinorPerMetre: null, minimumOrderMetres: null },
    {
      ...rules,
      marginBasisPoints: null,
      construction: { ...rules.construction, pipingConfirmed: false },
    },
  );
  assert.equal(p.ready, false);
  assert.equal(p.totalMinor, null);
  assert.equal(p.materialCostMinor, null);
  assert.equal(p.additionCostMinor, null);
  assert.equal(p.knownCostMinor, 2120);
  assert.ok(p.issues.length >= 4);
});
test("single making rate produces owner fixed cost totals with no duplicate baseline or cord charge", () => {
  const expected = {
    unpiped: [1320, 1820],
    self: [1620, 2120],
    contrast: [1720, 2220],
  };
  for (const edge of ["unpiped", "self", "contrast"] as const)
    for (const [index, filling] of (["cover", "filled"] as const).entries()) {
      const q = quoteCushion(
        {
          ...spec,
          edge,
          filling,
          ...(edge === "contrast" ? { pipingFabricId: fabric.id } : {}),
        },
        fabric,
        rules,
        fabric,
      );
      assert.equal(q.fixedCostMinor, expected[edge][index]);
    }
});

test("paused contrast piping blocks binding quotes even with approved rates, without changing saved specifications", () => {
  const card = structuredClone(CUSHION_MAKING_RATE_CARD);
  card[spec.sizeId].self.approval = "confirmed";
  card[spec.sizeId].contrast.approval = "confirmed";
  const approved = { ...rules, makingRateCard: card, dispatchEstimate: PREVIEW_PRICING_RULES.dispatchEstimate };
  const saved = { ...spec, edge: "contrast" as const, pipingFabricId: fabric.id };
  const before = structuredClone(saved);
  const contrast = quoteCushion(saved, fabric, approved, fabric);
  assert.equal(contrast.ready, false);
  assert.equal(contrast.purchaseReady, false);
  assert.match(contrast.issues.join(" "), /contrast piping is currently unavailable/);
  assert.deepEqual(saved, before);
  assert.equal(quoteCushion(spec, fabric, approved).ready, true);
  const self = quoteCushion({ ...spec, edge: "self" }, fabric, approved);
  assert.equal(self.ready, true);
  assert.equal(self.issues.some((issue) => issue.includes("contrast piping")), false);
});
test("round bolster and large bed inserts never silently inherit the standard £5", () => {
  for (const sizeId of [
    "round-40",
    "bolster-23-56",
    "bed-square-65",
    "bed-square-70",
  ]) {
    const q = quoteCushion({ ...spec, sizeId }, fabric, rules);
    assert.equal(q.totalCostMinor, null);
    assert.match(q.issues.join(" "), /compatible insert supplier cost/);
  }
});
test("editable making rates affect only their selected rate and retain proposed workroom gate", () => {
  const card = structuredClone(CUSHION_MAKING_RATE_CARD);
  card["square-50"].self = { amountMinor: 1300, approval: "proposed" };
  const q = quoteCushion({ ...spec, edge: "self" }, fabric, {
    ...rules,
    makingRateCard: card,
  });
  assert.equal(q.fixedCostMinor, 2320);
  assert.equal(q.ready, false);
  assert.match(q.issues.join(" "), /proposed making/);
});
test("set prices follow attributable fabric and making costs and reconcile every penny", () => {
  const expensive = {
    ...fabric,
    id: "expensive-fabric",
    supplierCostMinorPerMetre: 8000,
  };
  const q = quoteCushionSet(
    [
      { spec, facts: fabric },
      {
        spec: { ...spec, id: "second", fabricId: expensive.id },
        facts: expensive,
      },
    ],
    { ...rules, supplierCarriageMinor: 333 },
  );
  assert.ok(q.items[1].goodsGrossMinor! > q.items[0].goodsGrossMinor!);
  assert.equal(
    q.items.reduce((s, i) => s + i.netGoodsMinor!, 0),
    q.netGoodsMinor,
  );
  assert.equal(
    q.items.reduce((s, i) => s + i.allocatedCostMinor!, 0),
    q.totalCostMinor,
  );
  assert.equal(
    q.items.reduce((s, i) => s + i.goodsGrossMinor!, 0) +
      Math.round(q.carriageMinor! * 1.2),
    q.totalMinor,
  );
});
test("missing calculation width cannot claim matching verification without complete cuts", () => {
  const p = buildCutPlan(
    spec,
    { ...fabric, fullWidthMm: null },
    rules.construction,
  );
  assert.equal(p.matchingVerified, false);
  assert.equal(p.ready, false);
});
test("VAT rounds per quantity-one Shopify line, including the 1338p counterexample", () => {
  const inputs = [spec, { ...spec, id: "second" }].map((s) => ({
    spec: { ...s, filling: "cover" as const },
    facts: { ...fabric, supplierCostMinorPerMetre: 0 },
  }));
  const card = structuredClone(CUSHION_MAKING_RATE_CARD);
  card["square-50"].unpiped = { amountMinor: 818, approval: "confirmed" };
  const q = quoteCushionSet(inputs, {
    ...rules,
    marginBasisPoints: 0,
    carriageMinor: 0,
    makingRateCard: card,
  });
  assert.deepEqual(
    q.items.map((i) => i.netGoodsMinor),
    [1338, 1338],
  );
  assert.deepEqual(
    q.items.map((i) => i.goodsVatMinor),
    [268, 268],
  );
  assert.equal(q.vatMinor, 536);
  for (const item of q.items)
    assert.equal(
      Math.round((item.goodsGrossMinor! * 2000) / 12000),
      item.goodsVatMinor,
    );
  assert.equal(q.staffPricing.resultingMarginBasisPoints, 0);
});
test("immutable quote hash includes source identity, placement and rate rules", () => {
  const initial = quoteCushion(spec, fabric, rules);
  assert.notEqual(
    initial.quoteId,
    quoteCushion({ ...spec, placementMm: { x: 101, y: 100 } }, fabric, rules)
      .quoteId,
  );
  assert.notEqual(
    initial.quoteId,
    quoteCushion(spec, { ...fabric, supplierCostMinorPerMetre: 2100 }, rules)
      .quoteId,
  );
  assert.equal(cushionHash({ b: 2, a: 1 }), cushionHash({ a: 1, b: 2 }));
});
test("customer input cannot set rates or independent back-face placement", () => {
  const parsed = parseCushionSpec({
    ...spec,
    priceMinor: 1,
    backPlacementMm: { x: 0, y: 0 },
  });
  assert.deepEqual(parsed, spec);
  assert.throws(() => parseCushionSpec({ ...spec, quantity: -1 }));
  assert.throws(() =>
    parseCushionSpec({ ...spec, placementMm: { x: NaN, y: 0 } }),
  );
  assert.throws(() =>
    parseCushionDesign({
      version: 1,
      id: "d",
      name: "D",
      scene: "sofa-2",
      colours: { furniture: "#ffffff", wall: "#ffffff", floor: "#ffffff" },
      pieces: [
        { spec, position: { slot: 0, offsetX: 0, offsetY: 0, rotation: 0 } },
        { spec, position: { slot: 1, offsetX: 0, offsetY: 0, rotation: 0 } },
      ],
    }),
  );
});
