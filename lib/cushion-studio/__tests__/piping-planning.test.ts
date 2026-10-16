import test from "node:test";
import assert from "node:assert/strict";
import { buildCutPlan, buildSetCutPlan, type CutPiece } from "../cutting";
import { quoteCushion } from "../pricing";
import type { ConstructionRules, CushionSpec, FabricCuttingFacts } from "../domain";
import { PREVIEW_CONSTRUCTION_RULES } from "../domain";

// All commercial facts, join allowances and confirmations here are synthetic.
const fabric: FabricCuttingFacts = {
  id: "synthetic-piping", fullWidthMm: 1400, usableWidthMm: 1400,
  pattern: {kind: "plain", horizontalRepeatMm: 0, verticalRepeatMm: 0}, directional: false,
  calibration: {imageUrl: "https://example.invalid/cloth", physicalWidthMm: 1400, physicalHeightMm: 1000, evidence: "TEST ONLY", orientation: "upright", tileable: false},
  supplierCostMinorPerMetre: 2000, minimumOrderMetres: 1, orderIncrementMetres: .01, availableMetres: 100,
};
const spec = (sizeId = "square-50", id = sizeId): CushionSpec => ({
  version: 1, id, sizeId, manufacturingProfile: "flat-sewn-v1", fabricId: fabric.id,
  filling: "cover", edge: "self", placementMm: {x:100,y:100}, quantity: 1,
});
function rules(confirmed = false): ConstructionRules {
  const sizes = ["square-50", "rectangle-30-45", "bed-square-65", "round-40", "round-50", "bolster-23-56"];
  return {
    version: "synthetic-piping-method", confirmed: true, squareDrapeConfirmed: true, seamAllowanceMm: 15,
    flatConstructionBySize: Object.fromEntries(sizes.map(id => [id, {seamAllowanceMm: 15, confirmed: true, approvalReference: "TEST ONLY"}])),
    approvedSizeIds: sizes,
    pipingConfirmed: confirmed, pipingCut: "straight", pipingStripWidthMm: 40,
    pipingCordDiameterMm: 4, pipingJoinAllowanceMm: 20,
    pipingProposal: {
      version: "synthetic-proposal", stripWidthMm: 40, cordDiameterMm: 4,
      finishingAllowanceMm: 300, allowanceConfirmed: confirmed,
      cutBySize: Object.fromEntries(sizes.map(id => [id, id.startsWith("round") || id.startsWith("bolster") ? "bias" : "straight"])),
    },
  };
}
function assertLayout(pieces: CutPiece[], width: number) {
  for (const [index, p] of pieces.entries()) {
    assert.equal(p.rotation, 0);
    assert.ok(p.xMm >= 0 && p.yMm >= 0 && p.xMm + p.widthMm <= width + .001);
    for (const q of pieces.slice(index + 1))
      assert.ok(!(p.xMm < q.xMm + q.widthMm - .001 && q.xMm < p.xMm + p.widthMm - .001 && p.yMm < q.yMm + q.heightMm - .001 && q.yMm < p.yMm + p.heightMm - .001), `${p.id} overlaps ${q.id}`);
  }
}

test("50 cm proposal is 2300 mm gross, reuses rectangular remnants and never charges provisional strips", () => {
  const r = rules(), s = spec(), before = structuredClone({r,s,fabric});
  const plan = buildCutPlan(s, fabric, r), pipe = plan.pipingProposals![0];
  assert.equal(pipe.finishedPerimeterMm, 2000);
  assert.equal(pipe.grossTargetLengthMm, 2300);
  assert.equal(pipe.direction, "straight");
  assert.equal(pipe.allowanceConfirmed, false);
  assert.equal(pipe.materialIncluded, false);
  assert.equal(plan.ready, false);
  assert.equal(plan.fabrics[0].requiredMetres, .53);
  assert.equal(plan.fabrics[0].orderedMetres, 1);
  assert.equal(plan.fabrics[0].pieces.filter(p => p.role === "piping").length, 0);
  const strips = pipe.straightLayout!.pieces;
  assert.equal(strips.reduce((n,p) => n+p.widthMm, 0), 2300);
  assert.equal(pipe.straightLayout!.additionalRequiredMetres, 0);
  assertLayout([...plan.fabrics[0].pieces, ...strips], 1400);
  assert.deepEqual({r,s,fabric}, before);
  const quote = quoteCushion(s, fabric, {version:"TEST",construction:r,marginBasisPoints:4000,vatBasisPoints:2000,carriageMinor:null,customerDeliveryGrossMinor:495,supplierCarriageMinor:0});
  assert.equal(quote.materialCostMinor, 2000); // Main cloth's single 1 m minimum only.
  assert.equal(quote.ready, false);
  const set = buildSetCutPlan([s,{...s,id:"other"}].map(spec=>({spec,facts:fabric})), r);
  const allProposed = set.pipingProposals!.flatMap(p=>p.straightLayout!.pieces);
  assert.equal(allProposed.reduce((n,p)=>n+p.widthMm,0),4600);
  assertLayout([...set.fabrics[0].pieces,...allProposed],1400);
  assert.ok(set.fabrics[0].pieces.every(p=>p.role!=="piping"));
});

test("legacy global confirmation cannot bypass the flat finishing allowance gate", () => {
  const r = rules(true); r.pipingProposal!.allowanceConfirmed = false;
  const plan = buildCutPlan(spec(), fabric, r);
  assert.equal(plan.ready, false);
  assert.equal(plan.pipingProposals![0].materialIncluded, false);
  assert.ok(plan.fabrics[0].pieces.every(p => p.role !== "piping"));
});

test("missing usable width, method mismatch and insufficient allowance never create charged strips", () => {
  for (const change of ["width", "method", "allowance"] as const) {
    const r=rules(true), facts=structuredClone(fabric);
    if(change==="width") facts.usableWidthMm=null;
    if(change==="method") r.pipingStripWidthMm=50;
    if(change==="allowance") r.pipingProposal!.finishingAllowanceMm=10;
    const plan=buildCutPlan(spec(),facts,r);
    assert.equal(plan.ready,false,change);
    assert.equal(plan.pipingProposals![0].materialIncluded,false,change);
    assert.ok(plan.fabrics[0].pieces.every(p=>p.role!=="piping"),change);
  }
});

test("confirmed straight method consumes gross target from remnants with one shared minimum", () => {
  const r=rules(true), s=spec();
  const plan=buildCutPlan(s,fabric,r), cloth=plan.fabrics[0];
  assert.equal(plan.ready,true,plan.issues.join(" "));
  assert.equal(plan.pipingProposals![0].materialIncluded,true);
  const strips=cloth.pieces.filter(p=>p.role==="piping");
  assert.equal(strips.reduce((n,p)=>n+p.widthMm,0),2300);
  assert.ok(strips.reduce((n,p)=>n+p.widthMm-40,0)>=2000);
  assert.equal(cloth.requiredMetres,.53);
  assert.equal(cloth.orderedMetres,1);
  assertLayout(cloth.pieces,1400);
  const set=buildSetCutPlan([s,{...s,id:"second"}].map(spec=>({spec,facts:fabric})),r);
  assert.equal(set.ready,true,set.issues.join(" "));
  assert.equal(set.fabrics.length,1);
  assert.equal(set.fabrics[0].orderedMetres,1.06);
  assert.equal(set.fabrics[0].pieces.filter(p=>p.role==="piping").reduce((n,p)=>n+p.widthMm,0),4600);
  assertLayout(set.fabrics[0].pieces,1400);
});

test("workroom total 30 cm reserve prices straight strips without inventing a per-join loss", () => {
  const plan = buildCutPlan(spec(), fabric, PREVIEW_CONSTRUCTION_RULES);
  const pipe = plan.pipingProposals![0];
  assert.equal(PREVIEW_CONSTRUCTION_RULES.pipingJoinAllowanceMm, null);
  assert.equal(pipe.grossTargetLengthMm, 2300);
  assert.equal(pipe.materialIncluded, true);
  assert.equal(pipe.straightLayout!.pieces.reduce((n,p)=>n+p.widthMm,0),2300);
  assert.equal(plan.ready,true,plan.issues.join(" "));
  assertLayout(plan.fabrics[0].pieces,1400);
  const round = buildCutPlan(spec("round-40"),fabric,PREVIEW_CONSTRUCTION_RULES);
  assert.equal(round.pipingProposals![0].direction,"bias");
  assert.equal(round.pipingProposals![0].materialIncluded,false);
  assert.equal(round.ready,false);
});

test("main panels across the whole set are reserved before strip allocation; only shortfall extends cloth", () => {
  const facts={...fabric,usableWidthMm:1060};
  const s=spec(), r=rules(true);
  const plain=buildCutPlan({...s,edge:"unpiped"},facts,r);
  const piped=buildCutPlan(s,facts,r);
  assert.equal(piped.ready,true,piped.issues.join(" "));
  assert.deepEqual(piped.fabrics[0].pieces.filter(p=>p.role!=="piping"),plain.fabrics[0].pieces);
  assert.ok(piped.fabrics[0].requiredMetres>plain.fabrics[0].requiredMetres);
  assert.equal(piped.fabrics[0].orderedMetres,1);
  assertLayout(piped.fabrics[0].pieces,1060);
  assert.ok(piped.fabrics[0].pieces.filter(p=>p.role==="piping").some(p=>p.widthMm===1060));
});

test("remnants that exhaust the confirmed join budget yield to longer strips", () => {
  const r=rules(true); r.pipingJoinAllowanceMm=40;
  const plan=buildCutPlan(spec(),fabric,r), strips=plan.fabrics[0].pieces.filter(p=>p.role==="piping");
  assert.equal(plan.ready,true,plan.issues.join(" "));
  assert.equal(strips.reduce((n,p)=>n+p.widthMm,0),2300);
  assert.ok(strips.reduce((n,p)=>n+p.widthMm-80,0)>=2000);
  assert.ok(strips.some(p=>p.yMm>=530));
  assert.ok(strips.some(p=>p.yMm<530));
  assertLayout(plan.fabrics[0].pieces,1400);
});

test("bias round and bolster targets never imply verified yield even when all flags are true", () => {
  for (const id of ["round-40","round-50","bolster-23-56"]) {
    const plan=buildCutPlan(spec(id),fabric,rules(true)), p=plan.pipingProposals![0];
    const perimeter=id.startsWith("bolster") ? 2*Math.PI*230 : Math.PI*(id==="round-40"?400:500);
    assert.equal(p.finishedPerimeterMm,perimeter);
    assert.equal(p.grossTargetLengthMm,perimeter+300);
    assert.equal(p.direction,"bias"); assert.equal(p.straightLayout,undefined);
    assert.equal(p.materialIncluded,false); assert.equal(plan.ready,false);
    assert.ok(plan.fabrics[0].pieces.every(p=>p.role!=="piping"));
    assert.match(plan.issues.join(" "),/verified bias cutting yield/);
    const text=plan.instructions.join(" ");
    if(id.startsWith("round")) assert.match(text,/no side band; concealed zip.*perimeter seam/);
    else assert.match(text,/concealed zip in the body seam.*two separate circular ends.*end joins is not promised/);
  }
});

test("legacy confirmed piping is unchanged when a flat-only proposal is added", () => {
  const s=spec(); delete s.manufacturingProfile;
  const r=rules(true), without=structuredClone(r); delete without.pipingProposal;
  const old=buildCutPlan(s,fabric,without), current=buildCutPlan(s,fabric,r);
  assert.deepEqual(current,old);
  assert.equal(current.pipingProposals,undefined);
});
