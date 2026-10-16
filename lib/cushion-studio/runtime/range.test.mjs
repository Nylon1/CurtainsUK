import test from "node:test";
import assert from "node:assert/strict";
import { CUSHION_VISUAL_SIZES, CUSHION_ACTIVE_SIZE_IDS, CUSHION_LEGACY_SIZE_REPLACEMENTS, sizeOf } from "./geometry.mjs";
import { selectRangeSize, selectFilling, fillingLabel, insertSpecificationLabel, historySnapshot, restoreHistory } from "./state.mjs";

test("active range has thirteen distinct options while original dimensions stay addressable", () => {
  assert.deepEqual(CUSHION_ACTIVE_SIZE_IDS, ["square-35", "square-40", "square-45", "square-50", "square-55", "square-60", "bed-square-65", "bed-square-68", "rectangle-28-48", "rectangle-38-58", "round-40", "round-50", "bolster-19-44"]);
  const original = {"square-38":[380,380],"square-45":[450,450],"square-50":[500,500],"square-55":[550,550],"square-60":[600,600],"rectangle-30-45":[450,300],"rectangle-38-50":[500,380],"bed-square-65":[650,650],"bed-square-70":[700,700],"round-40":[400,400],"round-50":[500,500],"bolster-23-56":[560,230]};
  for (const [id, dimensions] of Object.entries(original)) {
    assert.equal(sizeOf(id).id,id);
    assert.deepEqual([sizeOf(id).widthMm,sizeOf(id).heightMm],dimensions);
  }
  assert.deepEqual(CUSHION_LEGACY_SIZE_REPLACEMENTS,{"square-38":"square-35","rectangle-30-45":"rectangle-28-48","rectangle-38-50":"rectangle-38-58","bed-square-70":"bed-square-68","bolster-23-56":"bolster-19-44"});
  assert.deepEqual([sizeOf("bolster-19-44").widthMm,sizeOf("bolster-19-44").heightMm],[440,190]);
  for (const size of CUSHION_VISUAL_SIZES.filter(s=>!Object.hasOwn(original,s.id))) assert.equal(size.approval,"proposed");
});

test("saved legacy choices remain unchanged until explicit conversion and undo restores their authority", () => {
  for (const [oldId,newId] of Object.entries(CUSHION_LEGACY_SIZE_REPLACEMENTS)) {
    const spec={id:"saved",sizeId:oldId,filling:"filled",fillingType:"hollowfibre",placementMm:{x:100,y:100}};
    const saved=historySnapshot({id:"design",pieces:[{spec}]});
    assert.deepEqual(restoreHistory(saved).design.pieces[0].spec,spec);
    assert.equal(spec.rangeVersion,undefined);
    assert.equal(selectRangeSize(spec,newId),true);
    assert.equal(spec.sizeId,newId);
    assert.equal(spec.rangeVersion,"standard-inserts-v1");
    assert.equal(spec.fillingType,"polyester");
    assert.deepEqual(spec.placementMm,{x:100,y:100});
    const restored=restoreHistory(saved).design.pieces[0].spec;
    assert.equal(restored.sizeId,oldId);
    assert.equal(restored.rangeVersion,undefined);
    assert.equal(restored.fillingType,"hollowfibre");
  }
});

test("unchanged active legacy size adopts a revised pairing only on explicit action", () => {
  const spec={id:"saved",sizeId:"square-45",filling:"filled",fillingType:"hollowfibre"};
  const restored=restoreHistory(historySnapshot({id:"design",pieces:[{spec}]})).design.pieces[0].spec;
  assert.deepEqual(restored,spec);
  selectRangeSize(restored,"square-45");
  assert.equal(restored.rangeVersion,"standard-inserts-v1");
  assert.equal(restored.fillingType,"polyester");
  assert.equal(fillingLabel(spec),"Cover & hollowfibre insert");
});

test("unsupported size changes do nothing and only the new cylinder permits a new filled choice", () => {
  const spec={sizeId:"square-50",filling:"filled",fillingType:"hollowfibre"};
  const before=structuredClone(spec);
  assert.equal(selectRangeSize(spec,"square-38"),false);
  assert.equal(selectRangeSize(spec,"invented"),false);
  assert.deepEqual(spec,before);
  assert.equal(selectRangeSize(spec,"bolster-23-56"),false);
  assert.deepEqual(spec,before);
  selectRangeSize(spec,"bolster-19-44");
  assert.equal(spec.filling,"filled");
  assert.equal(spec.fillingType,"polyester");
  assert.equal(spec.rangeVersion,"standard-inserts-v1");
  selectFilling(spec,"cover");
  assert.equal(spec.filling,"cover");
  assert.equal(spec.fillingType,undefined);
  selectFilling(spec,"filled");
  assert.equal(spec.filling,"filled");
  assert.equal(spec.fillingType,"polyester");
  const old={sizeId:"bolster-23-56",filling:"filled",fillingType:"hollowfibre"};
  selectFilling(old,"legacy-filled");
  assert.equal(old.filling,"filled");
  assert.equal(old.rangeVersion,undefined);
  selectFilling(old,"filled");
  assert.equal(old.fillingType,"hollowfibre");
  assert.equal(old.rangeVersion,undefined);
});

test("insert facts distinguish pad from cover and do not infer materials, fit or prices", () => {
  const evidence={supplier:"Example",productName:"Cotton pad",description:"Polyester-filled insert with cotton casing",padDimensionsMm:[300,500],finishedCoverDimensionsMm:[280,480],fitStatus:"pending",priceMinor:999};
  const label=insertSpecificationLabel({filling:"filled"},evidence);
  assert.match(label,/Pad: 30 × 50 cm/);
  assert.match(label,/Finished cover: 28 × 48 cm/);
  assert.match(label,/fit confirmation pending/);
  assert.doesNotMatch(label,/hollowfibre|999|£/);
  assert.equal(insertSpecificationLabel({filling:"cover"},evidence),"");
  assert.match(insertSpecificationLabel({filling:"filled"},{padDimensionsMm:[450],finishedCoverDimensionsMm:[400],fitStatus:"pending"}),/Pad: Ø45 cm.*Finished cover: Ø40 cm/);
  assert.doesNotMatch(insertSpecificationLabel({filling:"filled"},{padDimensionsMm:[NaN],finishedCoverDimensionsMm:[]}),/NaN|undefined/);
  const cylinder = insertSpecificationLabel({filling:"filled",sizeId:"bolster-19-44"},{supplier:"Dunelm",padDimensionsMm:[200,460],finishedCoverDimensionsMm:[190,440],description:"Polyester-filled insert with cotton casing",fitStatus:"pending"});
  assert.match(cylinder,/Pad: diameter 20 cm, length 46 cm/);
  assert.match(cylinder,/Finished cover: diameter 19 cm, length 44 cm/);
  assert.match(cylinder,/fit confirmation pending/);
  assert.doesNotMatch(cylinder,/hollowfibre/);
});
