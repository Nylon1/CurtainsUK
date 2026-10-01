import assert from "node:assert/strict";
import { test } from "node:test";
import { assertArtifactOnlyDatabaseRequest, classifyPracticalCompletion, countStillUnknownFieldInstances, validateArtifactReading, validateManufacturerAuthority } from "../curtainsuk-visual-hybrid-artifact";
import { visualVocabulary } from "../../lib/fabric-master/visual-enrichment";

const allowed = new URL("https://hqysjumypgeapgmqkcrx.supabase.co/rest/v1/fabric_colourways?select=fabric_id");

test("artifact-only database boundary permits only allowlisted GET reads", () => {
  assert.doesNotThrow(() => assertArtifactOnlyDatabaseRequest("GET", allowed));
  for (const method of ["POST","PATCH","PUT","DELETE"]) {
    assert.throws(() => assertArtifactOnlyDatabaseRequest(method, allowed), /ARTIFACT_ONLY_DATABASE_REQUEST_DENIED/);
  }
  assert.throws(() => assertArtifactOnlyDatabaseRequest("GET", new URL("https://hqysjumypgeapgmqkcrx.supabase.co/rest/v1/rpc/browse_projection_refresh_dirty")), /ARTIFACT_ONLY_DATABASE_REQUEST_DENIED/);
  assert.throws(() => assertArtifactOnlyDatabaseRequest("GET", new URL("https://other.supabase.co/rest/v1/fabric_colourways")), /ARTIFACT_ONLY_DATABASE_REQUEST_DENIED/);
  assert.throws(() => assertArtifactOnlyDatabaseRequest("GET", new URL("https://hqysjumypgeapgmqkcrx.supabase.co/rest/v1/fabric_visual_enrichment_ledger")), /ARTIFACT_ONLY_DATABASE_REQUEST_DENIED/);
});

test("experimental scale and direction remain isolated from validated production v1 reading", () => {
  const keys = Object.keys(visualVocabulary);
  const setFields = new Set(["secondaryColours","motif","visualSurface","character"]);
  const observations = Object.fromEntries(keys.map(key=>[key,{value:setFields.has(key)?[]:"unknown",confidence:"REVIEW"}]));
  observations.patternScale = {value:"large",confidence:"MEDIUM"};
  observations.directionality = {value:"vertical",confidence:"MEDIUM"};
  const evidence = Object.fromEntries(keys.map(key=>[key,{basis:"NONE",reason:"No defensible evidence."}]));
  evidence.patternScale = {basis:"BOTH",reason:"Positive manufacturer repeat and visible layout support a large aesthetic scale."};
  evidence.directionality = {basis:"IMAGE",reason:"Visible elements align vertically."};
  const {experimental,v1Compatible} = validateArtifactReading({imageContext:"CLEAN_SWATCH",observations,reviewFlags:[]},evidence,{vertical_repeat_mm:430});
  assert.equal(experimental.observations.patternScale.value,"large");
  assert.equal(experimental.observations.directionality.value,"vertical");
  assert.equal(v1Compatible.observations.patternScale.value,"unknown");
  assert.equal(v1Compatible.observations.directionality.value,"unknown");
});

test("legitimate absent motif and secondary colours do not require material review", () => {
  const keys = Object.keys(visualVocabulary);
  const setFields = new Set(["secondaryColours","motif","visualSurface","character"]);
  const observations = Object.fromEntries(keys.map(key=>[key,{value:setFields.has(key)?[]:"unknown",confidence:"REVIEW"}]));
  const evidence = Object.fromEntries(keys.map(key=>[key,{basis:"NONE",reason:"No defensible evidence."}]));
  for (const [key,value] of [["primaryColour","beige"],["colourComplexity","tonal"],["patternClass","textured-plain"]]) {
    observations[key] = {value,confidence:"MEDIUM"};
    evidence[key] = {basis:"BOTH",reason:"Manufacturer context and governed image agree."};
  }
  evidence.motif = {basis:"IMAGE",reason:"No distinct motif is visible."};
  evidence.secondaryColours = {basis:"IMAGE",reason:"The palette is tonal without a distinct secondary colour."};
  const {experimental,v1Compatible,evidence:checkedEvidence} = validateArtifactReading({imageContext:"CLEAN_SWATCH",observations,reviewFlags:[]},evidence,{});
  const practical = classifyPracticalCompletion(experimental,v1Compatible,checkedEvidence,{needed:false,issueType:"NONE",reason:"No material issue."});
  assert.deepEqual(practical.legitimateNone.sort(),["motif","secondaryColours"]);
  assert.deepEqual(practical.v1IntentionalLimitations,["patternScale","directionality"]);
  assert.equal(practical.status,"INCOMPLETE_NONMATERIAL");
  assert.ok(practical.genuinelyUnresolved.includes("colourTemperature"));
  experimental.reviewFlags.push("REVIEW_REQUIRED");
  assert.equal(classifyPracticalCompletion(experimental,v1Compatible,checkedEvidence,{needed:false,issueType:"NONE",reason:"A manufacturer colourway label differs from image appearance."}).status,"INCOMPLETE_NONMATERIAL");
  assert.equal(classifyPracticalCompletion(experimental,v1Compatible,checkedEvidence,{needed:true,issueType:"WRONG_IMAGE_IDENTITY",reason:"Image is for a different SKU."}).status,"NEEDS_MATERIAL_REVIEW");
  for (const key of practical.genuinelyUnresolved) {
    experimental.observations[key] = {value:visualVocabulary[key][0],confidence:"MEDIUM"};
    checkedEvidence[key] = {basis:"IMAGE",reason:"Visible image evidence supports this estimate."};
  }
  assert.equal(classifyPracticalCompletion(experimental,v1Compatible,checkedEvidence,{needed:false,issueType:"NONE",reason:"No material issue."}).status,"MAXIMALLY_PRACTICALLY_ENRICHED");
});

test("unknown-field summary is the numeric sum of per-fabric outputs", () => {
  const rows = [
    {status:"SUCCESS",fields_still_unknown:[{field:"motif"},{field:"patternScale"}]},
    {status:"SUCCESS",fields_still_unknown:[{field:"secondaryColours"}]},
    {status:"FAILED"},
  ];
  assert.equal(countStillUnknownFieldInstances(rows),3);
  assert.ok(Number.isInteger(countStillUnknownFieldInstances(rows)));
  assert.throws(() => countStillUnknownFieldInstances([{status:"SUCCESS"}]), /ARTIFACT_UNKNOWN_FIELDS_MISSING/);
});

test("manufacturer conflict retains the exact governed value", () => {
  const overrides = validateManufacturerAuthority({conflicts:[{field:"colourway_name",imageValue:"green with gold",reason:"The image looks greener than the colourway label."}]},{colourway_name:"Ink/ Gold"});
  assert.equal(overrides.length,1);
  assert.equal(overrides[0].manufacturer_value,"Ink/ Gold");
  assert.equal(overrides[0].ai_image_value,"green with gold");
  assert.throws(() => validateManufacturerAuthority({conflicts:[{field:"colourway_name",imageValue:"green",reason:"difference"}]},{colourway_name:null}), /ARTIFACT_MANUFACTURER_CONFLICT_INVALID/);
});
