import assert from "node:assert/strict";
import test from "node:test";
import { visualVocabulary } from "../../lib/fabric-master/visual-enrichment";
import { missingUsefulFields, validateAndApplyPatch, patchResponseSchema } from "../curtainsuk-partial-hybrid-pilot-core";
import { assertReadOnlyDatabaseRequest } from "../curtainsuk-partial-hybrid-pilot";

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
  const schema=patchResponseSchema(["pt-1","pt-2"],["primaryColour"],true);
  assert.deepEqual((schema as any).properties.patches.items.properties.fabric_id.enum,["pt-1","pt-2"]);
});
