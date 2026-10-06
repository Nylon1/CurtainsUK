// Offline publication policy. This module never changes the customer renderer.
export const WIDTH_CM = 460;
export const DROP_CM = 250;
export const RUNTIME_SIZE = Object.freeze([2048, 1113]);
export const MAX_BATCH_SIZE = 250;
export const HELD_DESIGNS = /^(?:park west|lyra|paper straw stripe)$/i;
const OFFSET = /HALF|OFFSET|STAGGER|BRICK/i;

export function classify(row) {
  if (!row?.fabricId || !row.designId) return {mode:'hold', reason:'IDENTITY_MISSING'};
  if (row.active === false) return {mode:'hold', reason:'NOT_IN_ACTIVE_CATALOGUE'};
  if (HELD_DESIGNS.test(row.design || '')) return {mode:'hold', reason:'KNOWN_UNSAFE_DESIGN'};
  if (OFFSET.test(row.patternMatchType || '')) return {mode:'hold', reason:'OFFSET_LATTICE_METHOD_PENDING'};
  const h = Number(row.hRepeatCm), v = Number(row.vRepeatCm);
  if (h > 0 && v > 0) return {mode:'straight', reason:null};
  if (h > 0 || v > 0) return {mode:'hold', reason:'ONE_AXIS_REPEAT_REVIEW'};
  if (row.plainStatus === 'PLAIN_COLOUR_VISUAL_MODE_PROPOSED' && row.noRepeatEvidence === true)
    return {mode:'plain', reason:null};
  return {mode:'hold', reason:row.plainStatus || 'UNKNOWN_REPEAT_STATUS'};
}

export function assessStraight(row) {
  const e = row.straightEvidence;
  if (!e) return 'SCALE_OR_MASTER_UNVERIFIED';
  if (e.registrationConfidence !== 'AUTOMATED_VERTICAL_FIRST_PROPOSAL') return 'SCALE_UNVERIFIED';
  const corroborated = e.horizontalCrosscheck === 'CORROBORATES' && e.anchorConsensus >= .95 && e.matchedVerticalAnchors >= 100;
  const vertical = e.horizontalCrosscheck === 'INCONCLUSIVE' && e.anchorConsensus >= .98 && e.matchedVerticalAnchors >= 120;
  if (!corroborated && !vertical) return 'SCALE_CONFIDENCE_LOW';
  if (!(e.pixelsPerCm > 0) || Math.abs(e.detectedVRepeatPx - row.vRepeatCm * e.pixelsPerCm) > .05)
    return 'PHYSICAL_SCALE_MISMATCH';
  if (e.visualDecision !== 'PASS' || !e.visualReviewer || !e.visualReviewedAt || e.visualMasterSha256 !== e.masterSha256)
    return 'CLOTH_VISUAL_QA_PENDING';
  if (!e.master || !/^[a-f0-9]{64}$/.test(e.masterSha256 || '')) return 'PROVENANCE_MISSING';
  return null;
}

export function assessPlain(row) {
  if (row.plainStatus !== 'PLAIN_COLOUR_VISUAL_MODE_PROPOSED' || !row.noRepeatEvidence)
    return 'PLAIN_CLASSIFICATION_UNVERIFIED';
  if (row.plainEvidence?.state !== 'PROPOSED_FOR_REVIEW') return 'PLAIN_IMAGE_EVIDENCE_MISSING';
  if (!/^#[a-f0-9]{6}$/i.test(row.plainEvidence.representativeColour || '')) return 'PLAIN_COLOUR_EVIDENCE_MISSING';
  if (!['GENERAL_TEXTILE','WOVEN_TEXTILE'].includes(row.plainEvidence.materialProfile))
    return 'PLAIN_MATERIAL_PROFILE_REVIEW';
  if (!Number.isFinite(row.plainEvidence.tonalStrength) || row.plainEvidence.tonalStrength < 0 || row.plainEvidence.tonalStrength > .6)
    return 'PLAIN_TONAL_CHARACTER_REVIEW';
  return null;
}

export function verifyRetail(row, fabric, mode) {
  if (!fabric || fabric.id !== row.fabricId) return 'RETAIL_ID_MISMATCH';
  if (fabric.launchReady !== true || fabric.browseReady !== true) return 'NOT_IN_LIVE_CATALOGUE';
  const normalized=value=>String(value||'').trim().toLocaleLowerCase('en-GB');
  if (normalized(fabric.design)!==normalized(row.design) ||
      normalized(fabric.colour)!==normalized(row.colourway)) return 'LIVE_DESIGN_IDENTITY_MISMATCH';
  const main = fabric.images?.find(image => image.imageType === 'MAIN' && image.approved === true);
  if (!main || main.url !== row.sourceUrl || !main.url.startsWith('https://cdn.shopify.com/'))
    return 'LIVE_MAIN_IMAGE_MISMATCH';
  const h = Number(fabric.horizontalRepeatMm || 0) / 10;
  const v = Number(fabric.verticalRepeatMm || 0) / 10;
  if (mode === 'straight' && (Math.abs(h-row.hRepeatCm) > 1e-8 || Math.abs(v-row.vRepeatCm) > 1e-8))
    return 'LIVE_REPEAT_MISMATCH';
  if (mode === 'plain' && (h > 0 || v > 0)) return 'LIVE_REPEAT_NOW_PRESENT';
  if (OFFSET.test(fabric.patternMatchType || '')) return 'LIVE_OFFSET_MATCH';
  return null;
}

export function makeEntry(row, mode, image, sha256, encodedBytes, sourceSha256) {
  const common = {id:row.fabricId,fabricId:row.fabricId,mode:mode==='straight'?'patterned':'plain',image,sha256,encodedBytes,pixelSize:[...RUNTIME_SIZE]};
  if (mode === 'plain') return {...common,scaleClaim:'Colour and general fabric character only; no physical weave scale claim.',sourceSha256,
    colourMaster:{algorithm:'plain-colour-v1',representativeColour:row.plainEvidence.representativeColour,
      tonalStrength:row.plainEvidence.tonalStrength,materialProfile:row.plainEvidence.materialProfile},
    publication:{method:'plain-colour-v1',sourceImageUrl:row.sourceUrl,sourceEvidence:row.plainEvidence.evidence}};
  const e=row.straightEvidence;
  return {...common,hRepeat:row.hRepeatCm,vRepeat:row.vRepeatCm,physicalClothCm:[WIDTH_CM,DROP_CM],sourceMasterSha256:e.masterSha256,
    calibration:{kind:'multiple-repeats',repeatsH:WIDTH_CM/row.hRepeatCm,repeatsV:DROP_CM/row.vRepeatCm,
      sourcePixelsPerCm:e.pixelsPerCm,detectedVRepeatPx:e.detectedVRepeatPx,anchorConsensus:e.anchorConsensus,
      matchedAnchors:e.matchedVerticalAnchors,horizontalCrosscheck:e.horizontalCrosscheck},
    publication:{method:'frozen-source-jigsaw',sourceImageUrl:row.sourceUrl,sourceSha256,visualDecision:e.visualDecision}};
}
