import test from "node:test";
import assert from "node:assert/strict";
import { buildCutPlan, buildSetCutPlan } from "../cutting";
import { quoteCushion } from "../pricing";
import { PREVIEW_PRICING_RULES, CUSHION_SIZES, OWNER_APPROVED_ORIGINAL_CUSHION_SIZE_IDS, parseCushionSpec, type CushionSpec, type FabricCuttingFacts } from "../domain";

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
const rules = () => { const r=structuredClone(PREVIEW_PRICING_RULES); delete r.legacyCompatibleInsertsBySize; r.compatibleInsertsBySize={}; return r; };

test("owner making approval covers exact complete rates without clearing piping and insert gates", () => {
  const r=rules(); r.vatBasisPoints=2000; r.supplierCarriageMinor=0;
  for (const size of CUSHION_SIZES.filter(size => (OWNER_APPROVED_ORIGINAL_CUSHION_SIZE_IDS as readonly string[]).includes(size.id))) {
    const base = size.id === "bolster-23-56" || size.id === "bed-square-70" ? 1200
      : size.shape === "round" || size.id === "bed-square-65" ? 1000 : 800;
    const card=r.makingRateCard![size.id];
    assert.equal(card.unpiped.amountMinor,base,size.id);
    assert.equal(card.self.amountMinor,base+300,size.id);
    assert.equal(card.unpiped.approval,"confirmed");
    assert.equal(card.self.approval,"confirmed");
    assert.match(card.self.approvalReference!,/Owner approved 2026-10-15/);
    assert.equal(card.contrast.approval,"proposed");
    const cover=quoteCushion(spec(size.id),fabric,r);
    assert.equal(cover.fixedCostMinor,base+520);
    assert.equal(cover.purchaseReady,true,size.id);
    assert.doesNotMatch(cover.issues.join(" "),/proposed making/);
    const piped=quoteCushion({...spec(size.id),edge:"self"},fabric,r);
    assert.equal(piped.fixedCostMinor,base+820);
    assert.equal(piped.purchaseReady,false);
    assert.match(piped.issues.join(" "),/piping/i);
    assert.doesNotMatch(piped.issues.join(" "),/proposed making/);
    const filled=quoteCushion({...spec(size.id),filling:"filled"},fabric,r);
    assert.equal(filled.purchaseReady,false);
    assert.match(filled.issues.join(" "),/insert SKU/);
  }
});

test("all twelve owner-accepted flat panels retain 15 mm seams and their shape-specific construction", () => {
  const expected: Record<string, number[]> = {
    "square-38":[410,410], "square-45":[480,480], "square-50":[530,530], "square-55":[580,580], "square-60":[630,630],
    "rectangle-30-45":[480,330], "rectangle-38-50":[530,410],
    "round-40":[430,430], "round-50":[530,530], "bed-square-65":[680,680], "bed-square-70":[730,730],
    "bolster-23-56":[590,752.567],
  };
  for (const size of CUSHION_SIZES.filter(size => (OWNER_APPROVED_ORIGINAL_CUSHION_SIZE_IDS as readonly string[]).includes(size.id))) {
    const s=spec(size.id), plan=buildCutPlan(s,fabric,rules().construction);
    const pieces=plan.fabrics[0].pieces;
    assert.deepEqual([pieces[0].widthMm,pieces[0].heightMm], expected[size.id], size.id);
    assert.ok(pieces.every(p => p.seamAllowanceMm===15));
    assert.equal(plan.ready,true,size.id); assert.equal(plan.matchingVerified,true,size.id);
    assert.match(plan.instructions.join(" "), /owner-accepted construction specification/);
    assert.doesNotMatch(plan.instructions.join(" "), /workroom accepted/);
    assert.equal(pieces.length,size.shape === "bolster" ? 3 : 2);
    if (size.shape === "bolster") assert.ok(pieces.filter(p=>p.role.startsWith("end")).every(p=>p.widthMm===260 && p.heightMm===260));
    else assert.deepEqual(pieces[0].sourcePlacementMm,pieces[1].sourcePlacementMm);
  }
});

test("owner construction acceptance leaves piping, inserts and supplier requirements independent", () => {
  const r=rules(); r.vatBasisPoints=2000; r.supplierCarriageMinor=0;
  const plainCover=quoteCushion(spec(),fabric,r);
  assert.equal(plainCover.purchaseReady,true);
  assert.equal(plainCover.fixedCostMinor,1320);
  for (const sizeId of ["round-40","round-50","bolster-23-56"]) {
    const q=quoteCushion(spec(sizeId),fabric,r);
    assert.equal(q.purchaseReady,true,sizeId);
    assert.doesNotMatch(q.issues.join(" "),/proposed dimensions/);
  }
  const self=quoteCushion({...spec(),edge:"self"},fabric,r);
  assert.equal(self.purchaseReady,false);
  assert.match(self.issues.join(" "),/piping/i);
  const filled=quoteCushion({...spec(),filling:"filled"},fabric,r);
  assert.equal(filled.purchaseReady,false);
  assert.match(filled.issues.join(" "),/insert SKU/);
  assert.equal(quoteCushion(spec(),{...fabric,usableWidthMm:null},r).purchaseReady,false);
  assert.equal(quoteCushion(spec(),fabric,{...r,supplierCarriageMinor:null}).purchaseReady,false);
  const legacy={...spec()}; delete legacy.manufacturingProfile;
  assert.equal(quoteCushion(legacy,fabric,r).purchaseReady,false);
});

test("hollowfibre selection survives parsing and requires matching compatible supplier evidence", () => {
  const r=rules(); r.vatBasisPoints=2000; r.supplierCarriageMinor=0;
  const s={...spec(),filling:"filled" as const,fillingType:"hollowfibre" as const};
  assert.deepEqual(parseCushionSpec(s),s);
  assert.throws(()=>parseCushionSpec({...s,fillingType:"feather"}),/FILLING_TYPE_INVALID/);
  assert.throws(()=>parseCushionSpec({...s,filling:"cover"}),/FILLING_TYPE_INVALID/);
  assert.equal(parseCushionSpec({...spec(),filling:"filled"}).fillingType,undefined);
  r.compatibleInsertsBySize={ [s.sizeId]: {
    supplierSku:"SYNTHETIC-INSERT",coverSizeId:s.sizeId,dimensionsMm:[500,500],costMinor:500,
    confirmed:true,approvalReference:"SYNTHETIC TEST ONLY",
  } };
  assert.equal(quoteCushion(s,fabric,r).purchaseReady,false);
  r.compatibleInsertsBySize[s.sizeId].fillingType="hollowfibre";
  const quote=quoteCushion(s,fabric,r);
  assert.equal(quote.purchaseReady,true);
  assert.equal(quote.fixedCostMinor,1820);
  assert.equal(quote.specs[0].fillingType,"hollowfibre");
  const round={...s,id:"round",sizeId:"round-40"};
  assert.equal(quoteCushion(round,fabric,r).purchaseReady,false);
  assert.equal(quoteCushion({...round,filling:"cover",fillingType:undefined},fabric,r).purchaseReady,true);
});

test("approved construction retains owner provenance and malformed acceptance fails closed", () => {
  const r=rules(), flat=r.construction.flatConstructionBySize!["square-50"];
  assert.equal(flat.approvalAuthority,"owner");
  assert.match(flat.approvalReference!,/2026-10-15/);
  for (const invalid of [
    {...flat,approvalReference:123},
    {...flat,approvalReference:" "},
    {...flat,approvalAuthority:"inferred"},
  ]) {
    r.construction.flatConstructionBySize!["square-50"]=invalid as typeof flat;
    assert.equal(buildCutPlan(spec(),fabric,r.construction).ready,false);
  }
  r.construction.flatConstructionBySize!["square-50"]={...flat,approvalAuthority:undefined};
  const instructions=buildCutPlan(spec(),fabric,r.construction).instructions.join(" ");
  assert.match(instructions,/construction accepted under the recorded approval reference/);
  assert.doesNotMatch(instructions,/workroom accepted|owner-accepted/);
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
