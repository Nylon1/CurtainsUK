import test from "node:test";
import assert from "node:assert/strict";
import { PREVIEW_PRICING_RULES, insertForSpec, parseCushionSpec, type CushionSpec, type FabricCuttingFacts } from "../domain";
import { DUNELM_INSERTS_BY_SIZE, WILLOWS_INSERTS_BY_SIZE } from "../insert-sourcing";
import { quoteCushion, quoteCushionSet } from "../pricing";
import { buildCutPlan } from "../cutting";
const fabric: FabricCuttingFacts={id:"test",fullWidthMm:1400,usableWidthMm:1400,pattern:{kind:"plain",horizontalRepeatMm:0,verticalRepeatMm:0},directional:false,calibration:{imageUrl:"https://example.invalid/plain",physicalWidthMm:1400,physicalHeightMm:1000,evidence:"TEST",orientation:"upright",tileable:false},supplierCostMinorPerMetre:2000,minimumOrderMetres:1,orderIncrementMetres:.01,availableMetres:100};
const spec=(sizeId:string,id=sizeId):CushionSpec=>({version:1,id,sizeId,rangeVersion:"standard-inserts-v1",manufacturingProfile:"flat-sewn-v1",fabricId:fabric.id,filling:"filled",fillingType:"polyester",edge:"unpiped",placementMm:{x:100,y:100},quantity:1});
const rules=()=>({...structuredClone(PREVIEW_PRICING_RULES),vatBasisPoints:2000,supplierCarriageMinor:0});
test("selected Dunelm variants retain actual costs and separate pad and cover dimensions",()=>{
 const expected:Record<string,[string,number,number[],number[]]>={
 "square-35":["30678578",400,[370,370],[350,350]],"square-40":["30287924",500,[420,420],[400,400]],"square-45":["30926443",600,[470,470],[450,450]],"square-50":["30287926",700,[520,520],[500,500]],"square-55":["30287927",900,[570,570],[550,550]],"square-60":["30287928",1000,[620,620],[600,600]],"bed-square-65":["30287929",1200,[670,670],[650,650]],"bed-square-68":["30678641",1400,[700,700],[680,680]],"rectangle-28-48":["30663252",600,[500,300],[480,280]],"rectangle-38-58":["30678580",600,[600,400],[580,380]],"bolster-19-44":["30926140",600,[200,460],[190,440]]};
 assert.equal(Object.keys(DUNELM_INSERTS_BY_SIZE).length,11);
 for(const [id,[sku,gross,pad,cover]] of Object.entries(expected)){
 const r=DUNELM_INSERTS_BY_SIZE[id];assert.equal(r.supplierSku,sku);assert.equal(r.sourcing!.grossPriceMinor,gross);assert.equal(r.costMinor,Math.round(gross/1.2));assert.deepEqual(r.dimensionsMm,pad);assert.deepEqual(r.finishedCoverDimensionsMm,cover);assert.equal(r.confirmed,false);assert.equal(r.fitEvidence!.status,"pending");assert.equal(r.fillingType,id.startsWith("rectangle")||id.startsWith("bolster")?"polyester":"hollowfibre");}
 for(const id of ["square-55","rectangle-38-58"])assert.equal(DUNELM_INSERTS_BY_SIZE[id].sourcing!.stockObservation!.status,"out-of-stock");
 for(const [id,variant,price,pad] of [["round-40","39462557516011",599,450],["round-50","39462564724971",699,550]] as const){const r=WILLOWS_INSERTS_BY_SIZE[id];assert.equal(r.supplierVariantId,variant);assert.equal(r.supplierSku,"");assert.equal(r.costMinor,price);assert.equal(r.costBasisConfirmed,false);assert.equal(r.sourcing!.vatBasisPoints,null);assert.deepEqual(r.dimensionsMm,[pad]);}
});
test("known costs price provisional inserts without bypassing fit approval or blocking cover-only",()=>{
 const r=rules(),s=spec("square-50"),q=quoteCushion(s,fabric,r);
 assert.equal(q.fixedCostMinor,1903);assert.equal(q.purchaseReady,false);assert.match(q.issues.join(" "),/fit confirmation/);assert.deepEqual(q.insertSpecification!.padDimensionsMm,[520,520]);
 assert.equal(quoteCushion({...s,filling:"cover",fillingType:undefined},fabric,r).purchaseReady,true);
 const pad=r.compatibleInsertsBySize![s.sizeId];pad.confirmed=true;assert.equal(quoteCushion(s,fabric,r).purchaseReady,false);
 pad.fitEvidence={version:"TEST",status:"confirmed",reference:"Synthetic approval only"};assert.equal(quoteCushion(s,fabric,r).purchaseReady,true);
 pad.finishedCoverDimensionsMm=[520,520];assert.equal(quoteCushion(s,fabric,r).purchaseReady,false);
 pad.finishedCoverDimensionsMm=[500,500];delete pad.fitEvidence;delete pad.sourcing;assert.equal(quoteCushion(s,fabric,r).purchaseReady,false,"new range cannot bypass fit by omitting source metadata");
});
test("individual and set prices reconcile actual pad costs with one shared cloth minimum",()=>{
 const r=rules(),s=spec("square-45"),pad=r.compatibleInsertsBySize![s.sizeId];pad.confirmed=true;pad.fitEvidence={version:"TEST",status:"confirmed",reference:"Synthetic approval only"};
 const single=quoteCushion(s,fabric,r),set=quoteCushionSet([s,{...s,id:"second"}].map(spec=>({spec,facts:fabric})),r);
 assert.equal(single.purchaseReady,true);assert.equal(set.purchaseReady,true);assert.equal(single.fixedCostMinor,1820);assert.equal(set.fixedCostMinor,3640);assert.equal(set.cutPlan.fabrics.length,1);assert.equal(set.cutPlan.fabrics[0].orderedMetres,1);
 assert.equal(set.items.reduce((n,i)=>n+i.fixedCostMinor,0),set.fixedCostMinor);assert.equal(set.items.reduce((n,i)=>n+(i.goodsGrossMinor??0),0),set.totalMinor! - set.deliveryGrossMinor!);
 assert.ok(single.cutPlan.fabrics[0].requiredMetres<set.cutPlan.fabrics[0].requiredMetres);
});
test("legacy saved dimensions and insert meaning survive reopen, current range requires explicit opt-in",()=>{
 const r=rules();for(const id of ["square-45","bed-square-70","bolster-23-56","rectangle-30-45"]){const old=spec(id);delete old.rangeVersion;old.fillingType="hollowfibre";assert.deepEqual(parseCushionSpec(JSON.parse(JSON.stringify(old))),old);}
 const old=spec("square-45");delete old.rangeVersion;assert.equal(insertForSpec(old,r)!.supplierSku,"30287925");assert.equal(insertForSpec(spec("square-45"),r)!.supplierSku,"30926443");assert.throws(()=>parseCushionSpec({...old,rangeVersion:"unknown"}));
 const rect=spec("rectangle-28-48");assert.equal(quoteCushion(rect,fabric,r).fixedCostMinor,1820);assert.equal(quoteCushion({...rect,fillingType:"hollowfibre"},fabric,r).insertSpecification,null);
});
test("new cover panel sizes do not inherit historical construction approval",()=>{
 const r=rules();for(const [id,dims] of Object.entries({"square-35":[380,380],"square-40":[430,430],"rectangle-28-48":[510,310],"rectangle-38-58":[610,410],"bed-square-68":[710,710]})){
 const p=buildCutPlan(spec(id),fabric,r.construction);assert.deepEqual([p.fabrics[0].pieces[0].widthMm,p.fabrics[0].pieces[0].heightMm],dims);assert.equal(p.ready,false);}
 assert.equal(buildCutPlan(spec("bed-square-68"),fabric,r.construction).fabrics[0].requiredMetres,1.42);
});
test("replacement cylinder uses its own body and identical end cuts, pad cost and retained legacy interpretation",()=>{
 const r=rules(),s=spec("bolster-19-44"),q=quoteCushion(s,fabric,r),p=q.cutPlan.fabrics[0].pieces;
 assert.equal(p.length,3);assert.deepEqual([p[0].widthMm,p[0].heightMm],[470,626.903]);assert.ok(p.slice(1).every(p=>p.widthMm===220&&p.heightMm===220&&p.shape==="circle"));assert.deepEqual(p[1].sourcePlacementMm,p[2].sourcePlacementMm);
 assert.equal(q.fixedCostMinor,2220);assert.equal(q.purchaseReady,false);assert.equal(q.insertSpecification!.shape,"bolster");assert.deepEqual(q.insertSpecification!.padDimensionsMm,[200,460]);assert.doesNotMatch(q.cutPlan.instructions.join(" "),/560 mm|230 mm/);
 const old={...s,sizeId:"bolster-23-56"};delete old.rangeVersion;const prior=buildCutPlan(old,fabric,r.construction).fabrics[0].pieces;assert.deepEqual([prior[0].widthMm,prior[0].heightMm],[590,752.567]);
 for(const horizontalRepeatMm of [80,350]){const f={...fabric,directional:true,pattern:{kind:"straight" as const,horizontalRepeatMm,verticalRepeatMm:400}};const ends=buildCutPlan(s,f,r.construction).fabrics[0].pieces.filter(p=>p.role.startsWith("end"));assert.equal(Math.abs(ends[0].xMm-ends[1].xMm)%horizontalRepeatMm,0);assert.equal(Math.abs(ends[0].yMm-ends[1].yMm)%400,0);assert.ok(ends.every(p=>p.rotation===0));assert.deepEqual(ends[0].sourcePlacementMm,ends[1].sourcePlacementMm);}
});
