/** Offline V1 preparation only. The frozen renderer is imported, never edited. */
import {buildFixed140Mesh,imageUV,meshMetrics,sourcePlan} from '../../lib/room-visualiser/runtime/fixed140-v1/fixed140_single_width_v1.mjs';

export const STATES=Object.freeze(['V1_PASS','SOURCE_REVIEW','INSUFFICIENT_COVERAGE','BAD_SOURCE_IMAGE','V1_RUNTIME_FAILURE']);

export function assertUnassigned(rows,standardIds,assignedIds) {
  const collision=rows.find(row=>standardIds.has(row.fabric_id)||assignedIds.has(row.fabric_id));
  if(collision)throw Error(`Tranche contains an already-enabled fabric: ${collision.fabric_id}`);
}

export function physicalWidth(row) {
  const usable=Number(row.usable_width_mm);
  const full=Number(row.full_width_mm);
  if(Number.isFinite(usable)&&usable>0)return {cm:usable/10,basis:'USABLE_WIDTH'};
  if(Number.isFinite(full)&&full>0)return {cm:full/10,basis:'FULL_WIDTH_AS_USABLE'};
  return {cm:null,basis:'MISSING'};
}

export function preflight(row,standardIds) {
  if(!row?.fabric_id||standardIds.has(row.fabric_id))return 'STANDARD_OR_INVALID_ID';
  if(!row.staging_catalog_visible||!row.storefront_selectable||row.lifecycle_state==='DISCONTINUED')return 'NOT_CURRENT_RETAIL';
  const hasRepeat=Number(row.horizontal_repeat_mm)>0||Number(row.vertical_repeat_mm)>0;
  const governedPlain=
    row.selection_basis==='BROWSE_PLAIN_PROVISIONAL'&&row.pattern_class==='plain'||
    row.selection_basis==='BROWSE_TEXTURED_PLAIN_PROVISIONAL'&&row.pattern_class==='textured-plain';
  if(!hasRepeat&&!governedPlain)return 'NO_PATTERN_OR_PLAIN_EVIDENCE';
  const width=physicalWidth(row);
  if(width.cm===null||width.cm<70||width.cm>200)return 'INVALID_PHYSICAL_WIDTH';
  if(!row.source_url||!/^https:\/\/cdn\.shopify\.com\/[^?#]+\.(?:jpe?g|webp)$/i.test(row.source_url))return 'APPROVED_MAIN_MISSING_OR_UNSAFE_URL';
  if(Number(row.main_count)!==1)return 'AMBIGUOUS_APPROVED_MAIN';
  return null;
}

export function sourceKind(bytes) {
  if(bytes.length>=3&&bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff)return {extension:'jpg',mime:'image/jpeg'};
  if(bytes.length>=12&&bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP')return {extension:'webp',mime:'image/webp'};
  return null;
}

export function validateV1(row,widthPx,heightPx) {
  const width=physicalWidth(row);
  if(!Number.isSafeInteger(widthPx)||!Number.isSafeInteger(heightPx)||widthPx<=0||heightPx<=0)
    return {state:'BAD_SOURCE_IMAGE',reason:'INVALID_DECODED_DIMENSIONS'};
  let plan;
  try{plan=sourcePlan(widthPx,heightPx,width.cm);}
  catch(error){return {state:'V1_RUNTIME_FAILURE',reason:String(error.message)};}
  const sourceHeightCm=heightPx*width.cm/widthPx;
  if(!plan.dropCovered)return {state:'INSUFFICIENT_COVERAGE',reason:'SOURCE_HEIGHT_BELOW_120_CM',sourceHeightCm,plan};
  try{
    const mesh=buildFixed140Mesh(width.cm);
    const metrics=meshMetrics(mesh);
    const uv=imageUV(mesh,widthPx,heightPx);
    const flat=Math.min(width.cm,140);
    const good=metrics.vertices===11050&&metrics.triangles===21120&&
      Math.abs(metrics.finishedPairWidthCm-140)<.002&&
      Math.abs(metrics.flatPanelWidthCm-flat)<1e-8&&
      Math.abs(metrics.flatPairWidthCm-2*flat)<1e-8&&
      Math.abs(metrics.renderedRowLengthCm[0]-flat)<.02&&
      Math.abs(metrics.renderedRowLengthCm[1]-flat)<.02&&
      metrics.wavePitchCm===14&&
      uv.length===mesh.materialCm.length&&
      Number.isFinite(uv[0])&&Number.isFinite(uv.at(-1));
    if(!good)throw Error('FROZEN_MESH_UV_INVARIANT');
    return {state:'V1_PASS',reason:null,sourceHeightCm,plan,mesh:{
      vertices:metrics.vertices,triangles:metrics.triangles,finishedPairWidthCm:metrics.finishedPairWidthCm,
      flatPanelWidthCm:metrics.flatPanelWidthCm,flatPairWidthCm:metrics.flatPairWidthCm,
      fullness:metrics.fullness,wavePitchCm:metrics.wavePitchCm,
      renderedRowLengthCm:metrics.renderedRowLengthCm,
    }};
  }catch(error){return {state:'V1_RUNTIME_FAILURE',reason:String(error.message),sourceHeightCm,plan};}
}

export function sourceReviewReason(row,metadata) {
  if(metadata.width!==Number(row.declared_width_px)||metadata.height!==Number(row.declared_height_px))
    return 'SOURCE_DIMENSIONS_DIFFER_FROM_GOVERNED_MAIN';
  if(metadata.orientation&&metadata.orientation!==1)return 'EXIF_ORIENTATION_REVIEW';
  if(metadata.pages&&metadata.pages!==1)return 'MULTIPAGE_SOURCE_REVIEW';
  if(metadata.width<512||metadata.height<512)return 'LOW_RESOLUTION_SOURCE_REVIEW';
  if(metadata.width>4096||metadata.height>4096)return 'MOBILE_TEXTURE_SIZE_REVIEW';
  return null;
}
