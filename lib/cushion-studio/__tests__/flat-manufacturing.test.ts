import test from "node:test";
import assert from "node:assert/strict";
import { buildCutPlan, buildSetCutPlan } from "../cutting";
import { quoteCushion } from "../pricing";
import { PREVIEW_PRICING_RULES, CUSHION_SIZES, parseCushionSpec, type CushionSpec, type FabricCuttingFacts } from "../domain";

// Synthetic commercial data and approvals only. No supplier cost or maker approval implied.
const fabric: FabricCuttingFacts = {
  id: "test-flat", fullWidthMm: 1400, usableWidthMm: 1400,
  pattern: {kind: "plain", horizontalRepeatMm: 0, verticalRepeatMm: 0}, directional: false,
  calibration: {imageUrl: "https://example.invalid/plain", physicalWidthMm: 1400, physicalHeightMm: 1000, evidence: "TEST", orientation: "upright", tileable: false},
  supplierCostMinorPerMetre: 2000, minimumOrderMetres: 1, orderIncrementMetres: .01, availableMetres: 100,
};
function spec(sizeId = "square-50"): CushionSpec {
  return { version: 1, id: sizeId, sizeId, manufacturingProfile: "flat-sewn-v1", fabricId: fabric.id, filling: "cover", edge: "unpiped", placementMm: {x:100,y:100}, quantity: 1 };
}
const rules = () => structuredClone(PREVIEW_PRICING_RULES);

test("all twelve flat starting panels use 15 mm per edge, independent of visual fullness", () => {
  const expected: Record<string, number[]> = {
    "square-38":[410,410], "square-45":[480,480], "square-50":[530,530], "square-55":[580,580], "square-60":[630,630],
    "rectangle-30-45":[480,330], "rectangle-38-50":[530,410],
    "round-40":[430,430], "round-50":[530,530], "bed-square-65":[680,680], "bed-square-70":[730,730],
    "bolster-23-56":[590,752.567],
  };
  for (const size of CUSHION_SIZES) {
    const s=spec(size.id), plan=buildCutPlan(s,fabric,rules().construction);
    const pieces=plan.fabrics[0].pieces;
    assert.deepEqual([pieces[0].widthMm,pieces[0].heightMm], expected[size.id], size.id);
    assert.ok(pieces.every(p => p.seamAllowanceMm===15));
    assert.equal(plan.ready,false); assert.equal(plan.matchingVerified,false);
    assert.match(plan.issues.join(" "), /workroom acceptance/);
    if (size.shape === "bolster") assert.ok(pieces.filter(p=>p.role.startsWith("end")).every(p=>p.widthMm===260 && p.heightMm===260));
    else assert.deepEqual(pieces[0].sourcePlacementMm,pieces[1].sourcePlacementMm);
  }
});

test("70 cm bed panels need separate rows; 65 cm panels respect usable width", () => {
  assert.equal(buildCutPlan(spec("bed-square-70"),fabric,rules().construction).fabrics[0].requiredMetres,1.46);
  assert.equal(buildCutPlan(spec("bed-square-65"),fabric,rules().construction).fabrics[0].requiredMetres,.68);
  assert.equal(buildCutPlan(spec("bed-square-65"),{...fabric,usableWidthMm:1350},rules().construction).fabrics[0].requiredMetres,1.36);
  assert.match(buildCutPlan(spec(),{...fabric,usableWidthMm:null},rules().construction).issues.join(" "),/usable cutting width/);
});

test("plain, stripe and directional pairs retain physical repeat phase rather than assume adjacent motifs match", () => {
  for (const horizontalRepeatMm of [80,350]) {
    const f={...fabric, directional:true, pattern:{kind:"straight" as const,horizontalRepeatMm,verticalRepeatMm:400}};
    const plan=buildCutPlan(spec(),f,rules().construction), [a,b]=plan.fabrics[0].pieces;
    assert.equal(Math.abs(a.xMm-b.xMm)%horizontalRepeatMm,0);
    assert.equal(Math.abs(a.yMm-b.yMm)%400,0);
    assert.equal(a.rotation,0); assert.equal(b.rotation,0);
    assert.deepEqual(a.sourcePlacementMm,b.sourcePlacementMm);
    assert.ok(plan.fabrics[0].requiredMetres>.53);
  }
});

test("shared fabric minimum applies once and removal recomputes consumption", () => {
  const a=spec("square-38"), b={...a,id:"second"};
  const set=buildSetCutPlan([{spec:a,facts:fabric},{spec:b,facts:fabric}],rules().construction);
  assert.equal(set.fabrics.length,1); assert.equal(set.fabrics[0].orderedMetres,1);
  const single=buildCutPlan(a,fabric,rules().construction);
  assert.ok(single.fabrics[0].requiredMetres<set.fabrics[0].requiredMetres);
});

test("new flat proposals require evidenced inserts only when filled; legacy specs retain their contract", () => {
  const s=spec(), r=rules(); r.vatBasisPoints=2000; r.supplierCarriageMinor=0;
  r.construction.flatConstructionBySize![s.sizeId]={seamAllowanceMm:15,confirmed:true,approvalReference:"SYNTHETIC TEST"};
  assert.equal(quoteCushion(s,fabric,r).purchaseReady,true);
  const filled={...s,filling:"filled" as const};
  assert.match(quoteCushion(filled,fabric,r).issues.join(" "),/insert SKU/);
  r.compatibleInsertsBySize={ [s.sizeId]: {supplierSku:"TEST-INSERT",coverSizeId:s.sizeId,dimensionsMm:[500,500],costMinor:500,confirmed:true,approvalReference:"TEST ONLY"} };
  const q=quoteCushion(filled,fabric,r);
  assert.equal(q.fixedCostMinor,1820); assert.equal(q.purchaseReady,true);
  assert.match(q.dispatchMessage!,/3-4 calendar weeks/);
  r.dispatchEstimate=null; assert.equal(quoteCushion(filled,fabric,r).purchaseReady,false);
  const legacy={...s}; delete legacy.manufacturingProfile;
  assert.equal(parseCushionSpec(legacy).manufacturingProfile,undefined);
  assert.notEqual(buildCutPlan(legacy,fabric,r.construction).fabrics[0].pieces[0].widthMm,530);
  assert.throws(()=>parseCushionSpec({...s,manufacturingProfile:"future"}),/MANUFACTURING_PROFILE/);
});
