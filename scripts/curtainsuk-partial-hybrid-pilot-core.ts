import { visualVocabulary, type VisualDimension } from "../lib/fabric-master/visual-enrichment";

export type Row = Record<string, any>;
export type PatchEntry = { field:VisualDimension; value:string|string[]; confidence:"HIGH"|"MEDIUM"; provenance:"MANUFACTURER"|"IMAGE"|"BOTH"|"AI_ESTIMATE_IMAGE_SUPPORTED"; reason:string };
export type RawPatch = { new_values_only:PatchEntry[]; legitimate_remaining_gaps:{field:VisualDimension;reason:string}[]; manufacturer_authority_applied:boolean; material_review:{needed:boolean;reason:string} };
export const designFields = ["patternClass","motif","visualSurface","sheenAppearance","visualActivity","character"] as const;
export const colourwayFields = ["primaryColour","secondaryColours","colourTemperature","lightness","saturation","contrast","colourComplexity","visualWeight","visualActivity","character"] as const;
const setFields = new Set<VisualDimension>(["secondaryColours","motif","visualSurface","character"]);
const allFields = Object.keys(visualVocabulary) as VisualDimension[];
export type PatchDiagnostic = {fabric_id:string;field:string|null;returned_value:unknown;expected_value_type:string|null;allowed_values:readonly string[];requested_fields:VisualDimension[];validation_failure:string};
export class PatchValidationError extends Error {
  constructor(public diagnostic:PatchDiagnostic) {super("PATCH_NEW_VALUE_INVALID");}
}

function exactKeys(value:unknown, keys:string[]): value is Row {
  return Boolean(value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === keys.length && keys.every(key=>Object.hasOwn(value,key)));
}
function observationMissing(fields:Row, field:VisualDimension) {
  const observation = fields[field];
  if (!exactKeys(observation,["value","confidence"])) throw new Error(`EXISTING_OBSERVATION_INVALID_${field}`);
  return observation.confidence === "REVIEW" || observation.value === "unknown" || (Array.isArray(observation.value) && observation.value.length === 0);
}
export function missingUsefulFields(fields:Row, provenance:Row) {
  if (!exactKeys(fields,allFields) || !exactKeys(provenance,allFields)) throw new Error("EXISTING_VISUAL_READING_INVALID");
  const colourway:VisualDimension[] = [], design:VisualDimension[] = [];
  for (const field of colourwayFields) {
    if (!observationMissing(fields,field)) continue;
    if (field === "secondaryColours" && Array.isArray(fields[field].value) && !fields[field].value.length && ["tonal","monochromatic"].includes(fields.colourComplexity.value)) continue;
    if ((field === "visualActivity" || field === "character") && provenance[field] !== "colourway_inference") continue;
    colourway.push(field);
  }
  for (const field of designFields) {
    if (!observationMissing(fields,field)) continue;
    if (field === "motif" && Array.isArray(fields.motif.value) && !fields.motif.value.length && ["plain","textured-plain"].includes(fields.patternClass.value)) continue;
    if ((field === "visualActivity" || field === "character") && provenance[field] === "colourway_inference") continue;
    design.push(field);
  }
  return {colourway,design};
}

function validValue(field:VisualDimension, value:unknown) {
  const allowed = visualVocabulary[field] as readonly string[];
  if (setFields.has(field)) return Array.isArray(value) && value.length > 0 && new Set(value).size === value.length && value.every(item=>typeof item === "string" && allowed.includes(item));
  return typeof value === "string" && value !== "unknown" && allowed.includes(value);
}
function legitimateGap(field:VisualDimension, fields:Row) {
  if (field === "motif") return ["plain","textured-plain"].includes(fields.patternClass.value);
  if (field === "secondaryColours") return ["tonal","monochromatic"].includes(fields.colourComplexity.value);
  return false;
}

export function validateAndApplyPatch(fabricId:string, requested:VisualDimension[], raw:unknown, existingFields:Row, existingProvenance:Row) {
  if (!exactKeys(raw,["new_values_only","legitimate_remaining_gaps","manufacturer_authority_applied","material_review"])) throw new Error("PATCH_OUTPUT_SCHEMA_INVALID");
  if (!Array.isArray(raw.new_values_only) || !Array.isArray(raw.legitimate_remaining_gaps) || typeof raw.manufacturer_authority_applied !== "boolean" || !exactKeys(raw.material_review,["needed","reason"]) || typeof raw.material_review.needed !== "boolean" || typeof raw.material_review.reason !== "string") throw new Error("PATCH_OUTPUT_SCHEMA_INVALID");
  if (requested.length===0 || new Set(requested).size!==requested.length || requested.some(field=>!allFields.includes(field) || ["patternScale","directionality"].includes(field))) throw new Error("PATCH_REQUESTED_FIELDS_INVALID");
  const allowed = new Set(requested), newValues:Row={}, confidences:Row={}, provenance:Row={}, reasons:Row={};
  for (const entry of raw.new_values_only) {
    const field=typeof entry?.field==="string"?entry.field:null;
    const known=field!==null && allFields.includes(field as VisualDimension);
    const isSet=known && setFields.has(field as VisualDimension);
    let failure="";
    if (!exactKeys(entry,["field","value","confidence","provenance","reason"])) failure="ENTRY_SHAPE_INVALID";
    else if (!allowed.has(entry.field)) failure="FIELD_NOT_REQUESTED_FOR_FABRIC";
    else if (Object.hasOwn(newValues,entry.field)) failure="DUPLICATE_FIELD";
    else if (!validValue(entry.field,entry.value)) failure=entry.value==="unknown"?"UNKNOWN_NOT_ALLOWED":isSet && !Array.isArray(entry.value) || !isSet && typeof entry.value!=="string"?"WRONG_VALUE_TYPE":Array.isArray(entry.value) && !entry.value.length?"EMPTY_SET":Array.isArray(entry.value) && new Set(entry.value).size!==entry.value.length?"DUPLICATE_SET_VALUE":"VALUE_OUTSIDE_GOVERNED_VOCABULARY";
    else if (!["HIGH","MEDIUM"].includes(entry.confidence)) failure="CONFIDENCE_INVALID";
    else if (!["MANUFACTURER","IMAGE","BOTH","AI_ESTIMATE_IMAGE_SUPPORTED"].includes(entry.provenance)) failure="PROVENANCE_INVALID";
    else if (typeof entry.reason!=="string" || !entry.reason.trim()) failure="REASON_MISSING";
    if (failure) throw new PatchValidationError({fabric_id:fabricId,field,returned_value:entry?.value,expected_value_type:known?(isSet?"nonempty unique string[]":"string"):null,allowed_values:known?visualVocabulary[field as VisualDimension]:[],requested_fields:requested,validation_failure:failure});
    newValues[entry.field]=entry.value; confidences[entry.field]=entry.confidence; provenance[entry.field]=entry.provenance; reasons[entry.field]=entry.reason;
  }
  const gapFields = new Set<string>();
  for (const gap of raw.legitimate_remaining_gaps) {
    if (!exactKeys(gap,["field","reason"]) || !allowed.has(gap.field) || Object.hasOwn(newValues,gap.field) || gapFields.has(gap.field) || typeof gap.reason !== "string" || !gap.reason.trim()) throw new Error("PATCH_GAP_INVALID");
    gapFields.add(gap.field);
  }
  if (requested.some(field=>!Object.hasOwn(newValues,field) && !gapFields.has(field))) throw new Error("PATCH_REQUESTED_FIELD_OMITTED");
  const finalFields=structuredClone(existingFields), finalProvenance=structuredClone(existingProvenance);
  for (const field of requested) if (Object.hasOwn(newValues,field)) {
    finalFields[field]={value:newValues[field],confidence:confidences[field]};
    finalProvenance[field]=provenance[field];
  }
  let changedOutsideDelta=0;
  for (const field of allFields) if (!allowed.has(field)) {
    if (JSON.stringify(existingFields[field])!==JSON.stringify(finalFields[field]) || JSON.stringify(existingProvenance[field])!==JSON.stringify(finalProvenance[field])) changedOutsideDelta++;
  }
  if (changedOutsideDelta) throw new Error("KNOWN_FIELD_CHANGED_OUTSIDE_REQUESTED_DELTA");
  const genuinelyUnresolved=raw.legitimate_remaining_gaps.filter((gap:Row)=>!legitimateGap(gap.field,finalFields));
  const status=raw.material_review.needed ? "NEEDS_MATERIAL_REVIEW" : genuinelyUnresolved.length ? "PRACTICALLY_ENRICHED_WITH_MINOR_GAPS" : "MAXIMALLY_PRACTICALLY_ENRICHED";
  const patch={fabric_id:fabricId,requested_missing_fields:requested,new_values_only:newValues,confidence_per_new_field:confidences,provenance_per_new_field:provenance,manufacturer_authority_applied:raw.manufacturer_authority_applied,legitimate_remaining_gaps:raw.legitimate_remaining_gaps,practical_completion_status:status};
  return {patch,finalFields,finalProvenance,changedOutsideDelta,genuinelyUnresolved,evidenceReasons:reasons,materialReview:raw.material_review};
}

export function patchResponseSchema(requestedByFabric:Record<string,VisualDimension[]>, grouped:boolean):Row {
  const ids=Object.keys(requestedByFabric);
  if (!ids.length || (!grouped && ids.length!==1)) throw new Error("PATCH_SCHEMA_FABRIC_COUNT_INVALID");
  const entry=(field:VisualDimension)=>({type:"object",additionalProperties:false,required:["field","value","confidence","provenance","reason"],properties:{field:{type:"string",enum:[field]},value:setFields.has(field)?{type:"array",minItems:1,items:{type:"string",enum:visualVocabulary[field]}}:{type:"string",enum:visualVocabulary[field]},confidence:{type:"string",enum:["HIGH","MEDIUM"]},provenance:{type:"string",enum:["MANUFACTURER","IMAGE","BOTH","AI_ESTIMATE_IMAGE_SUPPORTED"]},reason:{type:"string"}}});
  const payload=(fields:VisualDimension[])=>{
    const distinct=[...new Set(fields)];
    if (!distinct.length || distinct.some(field=>!allFields.includes(field) || ["patternScale","directionality"].includes(field))) throw new Error("PATCH_SCHEMA_REQUESTED_FIELDS_INVALID");
    return {type:"object",additionalProperties:false,required:["new_values_only","legitimate_remaining_gaps","manufacturer_authority_applied","material_review"],properties:{
      new_values_only:{type:"array",items:distinct.length===1?entry(distinct[0]):{anyOf:distinct.map(entry)}},
      legitimate_remaining_gaps:{type:"array",items:{type:"object",additionalProperties:false,required:["field","reason"],properties:{field:{type:"string",enum:distinct},reason:{type:"string"}}}},
      manufacturer_authority_applied:{type:"boolean"},material_review:{type:"object",additionalProperties:false,required:["needed","reason"],properties:{needed:{type:"boolean"},reason:{type:"string"}}},
    }};
  };
  if (!grouped) return {type:"object",additionalProperties:false,required:["shared_patch"],properties:{shared_patch:payload(requestedByFabric[ids[0]])}};
  const variant=(id:string)=>{const p=payload(requestedByFabric[id]);return {type:"object",additionalProperties:false,required:["fabric_id",...p.required],properties:{fabric_id:{type:"string",enum:[id]},...p.properties}};};
  return {type:"object",additionalProperties:false,required:["patches"],properties:{patches:{type:"array",minItems:ids.length,maxItems:ids.length,items:{anyOf:ids.map(variant)}}}};
}
