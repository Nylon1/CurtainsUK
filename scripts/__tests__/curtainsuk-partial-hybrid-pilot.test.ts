import assert from "node:assert/strict";
import test from "node:test";
import Ajv from "ajv";
import { visualVocabulary } from "../../lib/fabric-master/visual-enrichment";
import { missingUsefulFields, validateAndApplyPatch, patchResponseSchema, PatchValidationError, reusableDesignPatch, mergePatchFragments } from "../curtainsuk-partial-hybrid-pilot-core";
import { assertReadOnlyDatabaseRequest, verifyGroupSelection } from "../curtainsuk-partial-hybrid-pilot";

function reading() {
  const fields:Record<string,{value:string|string[];confidence:string}>=Object.fromEntries(Object.entries(visualVocabulary).map(([key,allowed])=>[key,{value:["secondaryColours","motif","visualSurface","character"].includes(key)?[allowed[0]]:allowed[0],confidence:"HIGH"}]));
  const provenance=Object.fromEntries(Object.keys(visualVocabulary).map(key=>[key,"design_inference"]));
  return {fields,provenance};
}

test("read boundary denies database writes and unapproved tables",()=>{
  const approved=new URL("https://hqysjumypgeapgmqkcrx.supabase.co/rest/v1/fabric_colourways");
  assert.doesNotThrow(()=>assertReadOnlyDatabaseRequest("GET",approved));
  assert.throws(()=>assertReadOnlyDatabaseRequest("POST",approved));
  assert.throws(()=>assertReadOnlyDatabaseRequest("GET",new URL("https://hqysjumypgeapgmqkcrx.supabase.co/rest/v1/rpc/browse_projection_refresh_dirty")));
});

test("practical missing-field rule preserves legitimate none and v1 withholding",()=>{
  const {fields,provenance}=reading();
  fields.patternClass={value:"plain",confidence:"HIGH"};
  fields.motif={value:[],confidence:"REVIEW"};
  fields.colourComplexity={value:"tonal",confidence:"HIGH"};
  fields.secondaryColours={value:[],confidence:"REVIEW"};
  fields.patternScale={value:"unknown",confidence:"REVIEW"};
  fields.directionality={value:"unknown",confidence:"REVIEW"};
  fields.sheenAppearance={value:"unknown",confidence:"REVIEW"};
  fields.primaryColour={value:"unknown",confidence:"REVIEW"};
  provenance.primaryColour="not_applicable";
  assert.deepEqual(missingUsefulFields(fields,provenance),{colourway:["primaryColour"],design:["sheenAppearance"]});
});

test("patch changes only requested field and preserves every known observation byte-for-byte",()=>{
  const {fields,provenance}=reading();
  fields.sheenAppearance={value:"unknown",confidence:"REVIEW"};
  const before=JSON.stringify(fields);
  const raw={new_values_only:[{field:"sheenAppearance",value:"low",confidence:"MEDIUM",provenance:"AI_ESTIMATE_IMAGE_SUPPORTED",reason:"Approved swatch shows low shine."}],legitimate_remaining_gaps:[],manufacturer_authority_applied:false,material_review:{needed:false,reason:"No identity concern."}};
  const result=validateAndApplyPatch("pt-1",["sheenAppearance"],raw,fields,provenance);
  assert.equal(result.changedOutsideDelta,0);
  assert.equal(result.finalFields.sheenAppearance.value,"low");
  assert.equal(result.patch.practical_completion_status,"MAXIMALLY_PRACTICALLY_ENRICHED");
  assert.equal(JSON.stringify(fields),before);
  for (const key of Object.keys(fields)) if (key!=="sheenAppearance") assert.equal(JSON.stringify(result.finalFields[key]),JSON.stringify(fields[key]));
});

test("patch rejects fields outside requested delta and duplicate fabric evidence",()=>{
  const {fields,provenance}=reading();
  const raw={new_values_only:[{field:"primaryColour",value:"blue",confidence:"MEDIUM",provenance:"IMAGE",reason:"Blue image."}],legitimate_remaining_gaps:[],manufacturer_authority_applied:false,material_review:{needed:false,reason:"No issue."}};
  assert.throws(()=>validateAndApplyPatch("pt-1",["sheenAppearance"],raw,fields,provenance),/PATCH_NEW_VALUE_INVALID/);
  const schema=patchResponseSchema({"pt-1":["primaryColour"],"pt-2":["sheenAppearance"]},true);
  const variants=schema.properties.patches.items.anyOf;
  assert.deepEqual(variants.map((x:any)=>x.properties.fabric_id.enum),[["pt-1"],["pt-2"]]);
  assert.deepEqual(variants[0].properties.new_values_only.items.properties.field.enum,["primaryColour"]);
  assert.deepEqual(variants[1].properties.new_values_only.items.properties.field.enum,["sheenAppearance"]);
});

test("each requested field has exact governed enum and scalar or set shape",()=>{
  const sets=new Set(["secondaryColours","motif","visualSurface","character"]);
  for (const [field,values] of Object.entries(visualVocabulary)) {
    if (["patternScale","directionality"].includes(field)) continue;
    const schema=patchResponseSchema({"pt-1":[field as keyof typeof visualVocabulary]},false);
    const entry=schema.properties.shared_patch.properties.new_values_only.items;
    assert.deepEqual(entry.properties.field.enum,[field]);
    assert.deepEqual(entry.properties.value.type,sets.has(field)?"array":"string");
    const value=sets.has(field)?entry.properties.value.items:entry.properties.value;
    assert.deepEqual(value.enum,values);
    assert.equal(value.enum.includes("unknown"),false);
    if (sets.has(field)) assert.equal(entry.properties.value.minItems,1);
  }
});

test("grouped schema binds each fabric to only its requested fields",()=>{
  const schema=patchResponseSchema({"pt-a":["primaryColour","secondaryColours"],"pt-b":["sheenAppearance"]},true);
  const [a,b]=schema.properties.patches.items.anyOf;
  assert.deepEqual(a.properties.fabric_id.enum,["pt-a"]);
  assert.deepEqual(b.properties.fabric_id.enum,["pt-b"]);
  assert.deepEqual(a.properties.new_values_only.items.anyOf.map((x:any)=>x.properties.field.enum[0]),["primaryColour","secondaryColours"]);
  assert.deepEqual(b.properties.new_values_only.items.properties.field.enum,["sheenAppearance"]);
  assert.deepEqual(b.properties.legitimate_remaining_gaps.items.properties.field.enum,["sheenAppearance"]);
  assert.equal(schema.properties.patches.minItems,2);
  assert.equal(schema.properties.patches.maxItems,2);
});

test("strict JSON schema rejects unknowns, wrong types and sibling-only fields",()=>{
  const validate=new Ajv().compile(patchResponseSchema({"pt-a":["primaryColour","motif"],"pt-b":["sheenAppearance"]},true));
  const patch=(fabric_id:string,field:string,value:unknown)=>({fabric_id,new_values_only:[{field,value,confidence:"MEDIUM",provenance:"IMAGE",reason:"Approved image."}],legitimate_remaining_gaps:[],manufacturer_authority_applied:false,material_review:{needed:false,reason:"No issue."}});
  const valid={patches:[patch("pt-a","motif",["flower"]),patch("pt-b","sheenAppearance","low")]};
  assert.equal(validate(valid),true);
  assert.equal(validate({patches:[patch("pt-a","primaryColour","unknown"),valid.patches[1]]}),false);
  assert.equal(validate({patches:[patch("pt-a","motif","flower"),valid.patches[1]]}),false);
  assert.equal(validate({patches:[patch("pt-a","primaryColour",["blue"]),valid.patches[1]]}),false);
  assert.equal(validate({patches:[patch("pt-a","sheenAppearance","low"),valid.patches[1]]}),false);
});

test("unknown, wrong shape and duplicate set values fail locally with diagnostics",()=>{
  const {fields,provenance}=reading();
  const base={legitimate_remaining_gaps:[],manufacturer_authority_applied:false,material_review:{needed:false,reason:"No issue."}};
  for (const [field,value,failure] of [["primaryColour","unknown","UNKNOWN_NOT_ALLOWED"],["primaryColour",["blue"],"WRONG_VALUE_TYPE"],["motif","flower","WRONG_VALUE_TYPE"],["motif",["flower","flower"],"DUPLICATE_SET_VALUE"]] as const) {
    const raw={...base,new_values_only:[{field,value,confidence:"MEDIUM",provenance:"IMAGE",reason:"Approved image."}]};
    assert.throws(()=>validateAndApplyPatch("pt-1",[field],raw,fields,provenance),(error:unknown)=>error instanceof PatchValidationError && error.diagnostic.validation_failure===failure && error.diagnostic.fabric_id==="pt-1" && error.diagnostic.field===field);
  }
});

test("scale selection requests only still-missing fields in its own design or colourway phase",()=>{
  const {fields,provenance}=reading();
  fields.primaryColour={value:"unknown",confidence:"REVIEW"};
  fields.sheenAppearance={value:"unknown",confidence:"REVIEW"};
  provenance.primaryColour="colourway_inference";
  const masters=new Map([["pt-1",{fabric_id:"pt-1",supplier_id:"prestigious-textiles",design_id:"pt-design-1",lifecycle_state:"ACTIVE"}]]);
  const stored=new Map([["pt-1",{fabric_id:"pt-1",knowledge_state:"PARTIAL_GOVERNED",visual_fields:fields,provenance}]]);
  const base={supplier_id:"prestigious-textiles",design_id:"pt-design-1",affected_fabric_ids:["pt-1"]};
  const colourway={...base,requested_missing_fields_by_fabric:{"pt-1":["primaryColour"]}};
  const design={...base,representative_fabric_id:"pt-1",requested_missing_fields_by_fabric:{"pt-1":["sheenAppearance"]}};
  assert.doesNotThrow(()=>verifyGroupSelection(colourway as any,"B",masters,stored,true));
  assert.doesNotThrow(()=>verifyGroupSelection(design as any,"A",masters,stored,true));
  assert.doesNotThrow(()=>verifyGroupSelection({...base,requested_missing_fields_by_fabric:{"pt-1":["primaryColour","sheenAppearance"]}} as any,"B",masters,stored,true,"design-seed"));
  assert.throws(()=>verifyGroupSelection({...base,requested_missing_fields_by_fabric:{"pt-1":["primaryColour","sheenAppearance"]}} as any,"B",masters,stored,true,"colourway-simple"),/PILOT_AUDIT_DELTA_CHANGED/);
  assert.throws(()=>verifyGroupSelection(colourway as any,"B",masters,stored,false),/PILOT_AUDIT_DELTA_CHANGED/);
  assert.throws(()=>verifyGroupSelection({...colourway,requested_missing_fields_by_fabric:{"pt-1":["motif"]}} as any,"B",masters,stored,true),/PILOT_AUDIT_DELTA_CHANGED/);
});

test("accepted design evidence is copied as a disjoint delta, then validated with a new colourway delta",()=>{
  const {fields,provenance}=reading();
  fields.primaryColour={value:"unknown",confidence:"REVIEW"};
  fields.sheenAppearance={value:"unknown",confidence:"REVIEW"};
  const source={patch:{requested_missing_fields:["sheenAppearance"],new_values_only:{sheenAppearance:"low"},confidence_per_new_field:{sheenAppearance:"MEDIUM"},provenance_per_new_field:{sheenAppearance:"IMAGE"},legitimate_remaining_gaps:[],manufacturer_authority_applied:false},evidence_reasons_per_new_field:{sheenAppearance:"Accepted design evidence."},material_review:{needed:false,reason:"No concern."}};
  const design=reusableDesignPatch(source,["sheenAppearance"]);
  const colourway={new_values_only:[{field:"primaryColour",value:"blue",confidence:"HIGH",provenance:"IMAGE",reason:"Approved sibling image."}],legitimate_remaining_gaps:[],manufacturer_authority_applied:false,material_review:{needed:false,reason:"No concern."}} as const;
  const merged=mergePatchFragments(colourway as any,design);
  const applied=validateAndApplyPatch("pt-2",["primaryColour","sheenAppearance"],merged,fields,provenance);
  assert.equal(applied.finalFields.primaryColour.value,"blue");
  assert.equal(applied.finalFields.sheenAppearance.value,"low");
  assert.equal(applied.changedOutsideDelta,0);
  assert.throws(()=>reusableDesignPatch(source,["motif"]),/REUSABLE_DESIGN_FIELD_NOT_IN_SOURCE/);
});
