import test from "node:test";
import assert from "node:assert/strict";
import { normalizePrestigiousFormationRows } from "../prestigious";
import { toDecisionEngineFabric } from "../decision-engine";
import { calculateStagingPriceForTest } from "@/lib/storefront/staging-pricing";

const [base] = normalizePrestigiousFormationRows([{Title:"ESCHER",Tags:"Formation%20Collection","Option1%20Value":"MOCHA","Variant%20SKU":"4269/147","Image%20Src":""}]);
const record = {...base, supplier_name:"Prestigious Textiles"};
const request = { windowSlug:"standard-window", measurementBasis:"TRACK_WIDTH" as const, widthCm:180, dropCm:210, fabricId:record.fabric_id, heading:"PENCIL_PLEAT" as const, lining:"STANDARD" as const, construction:"PAIR" as const, stackDirection:"SPLIT" as const };

test("unknown manufacturer match uses additive 50cm per cut with immutable policy provenance", () => {
  const source = {...record, pattern_match_type:null, vertical_repeat_mm:335};
  const fabric = toDecisionEngineFabric(source, 2000, "2026-09-14");
  assert.equal(fabric.patternMatchType,null);
  assert.equal(fabric.verticalRepeatMm,335);
  assert.equal(fabric.patternAllowance?.provenance,"DEFAULT_PATTERN_ALLOWANCE");
  const result = calculateStagingPriceForTest(request,fabric);
  const plain = calculateStagingPriceForTest(request,toDecisionEngineFabric({...record,pattern_match_type:"RANDOM_MATCH",vertical_repeat_mm:0},2000,"2026-09-14"));
  assert.equal(result.fabricMetres,plain.fabricMetres! + result.fabricWidths! * 0.5);
  assert.equal(result.outcome,"INSTANT_PRICE");
  assert.equal(source.pattern_match_type,null);
});

test("known no-repeat and verified match take precedence; missing width and half-drop remain protected", () => {
  const plain = toDecisionEngineFabric({...record,pattern_match_type:null,vertical_repeat_mm:0},2000,"2026-09-14");
  assert.equal(plain.patternAllowance?.provenance,"PLAIN_NO_MATCH_REQUIRED");
  for (const match of ["STRAIGHT_MATCH","HALF_DROP_MATCH"] as const) {
    const fabric = toDecisionEngineFabric({...record,pattern_match_type:match,vertical_repeat_mm:640},2000,"2026-09-14");
    assert.equal(fabric.patternMatchType,match);
    assert.equal(fabric.patternAllowance,undefined);
    if(match === "HALF_DROP_MATCH") assert.throws(()=>calculateStagingPriceForTest(request,fabric),/halfDropMatch/);
  }
  assert.throws(()=>toDecisionEngineFabric({...record,usable_width_mm:null},2000,"2026-09-14"),/INCOMPLETE/);
});
