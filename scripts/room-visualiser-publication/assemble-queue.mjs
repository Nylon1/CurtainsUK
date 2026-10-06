// Joins read-only catalogue/evidence exports into one resumable publication queue.
// No export is copied into production runtime assets or a second fabric database.
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const args=Object.fromEntries(process.argv.slice(2).map((value,index,array)=>value.startsWith('--')?[value.slice(2),array[index+1]]:null).filter(Boolean));
for(const key of ['audit','identities','plain-decisions','plain-proposals','straight-evidence','output'])
  if(!args[key]) throw Error(`Missing --${key}`);
const readJsonl=async file=>(await readFile(resolve(file),'utf8')).split(/\r?\n/).filter(Boolean).map(JSON.parse);
const [audit,identities,decisions,proposals,straight]=await Promise.all([
  readJsonl(args.audit),readJsonl(args.identities),readJsonl(args['plain-decisions']),
  readJsonl(args['plain-proposals']),readFile(resolve(args['straight-evidence']),'utf8').then(JSON.parse),
]);
const index=rows=>new Map(rows.map(row=>[row.fabric_id,row]));
const byIdentity=index(identities),byDecision=index(decisions),byProposal=index(proposals),byStraight=index(straight);
const rows=audit.map(item=>{
  const identity=byIdentity.get(item.fabric_id)||{},plain=byDecision.get(item.fabric_id)||{},proposal=byProposal.get(item.fabric_id),e=byStraight.get(item.fabric_id);
  return {
    fabricId:item.fabric_id,designId:item.design_id,design:item.design,supplier:item.supplier,
    collection:item.collection,colourway:item.colourway,
    // This is a dated audit extraction, not authority for current eligibility.
    // Recheck the live retail projection immediately before publication.
    active:null,priorLifecycleState:identity.lifecycle_state||null,
    sourceUrl:plain.image_url||identity.source_imagery?.[0]||null,
    hRepeatCm:item.horizontal_repeat_mm>0?item.horizontal_repeat_mm/10:0,
    vRepeatCm:item.vertical_repeat_mm>0?item.vertical_repeat_mm/10:0,
    patternMatchType:item.pattern_match_type||'',
    noRepeatEvidence:!!proposal && /^NO_REPEAT_REQUIRED/.test(plain.prior_repeat_status||''),
    plainStatus:plain.plain_visual_status||null,
    plainEvidence:proposal?{
      state:proposal.state,representativeColour:proposal.representative_colour,
      tonalStrength:proposal.procedural_tonal_strength,materialProfile:proposal.generic_material_profile,
      evidence:proposal.evidence,imageId:proposal.image_id,
    }:null,
    straightEvidence:e?{
      master:e.master,masterSha256:e.master_sha256,pixelsPerCm:e.pixels_per_cm,
      detectedVRepeatPx:e.detected_v_repeat_px,anchorConsensus:e.anchor_consensus,
      matchedVerticalAnchors:e.matched_vertical_anchors,horizontalCrosscheck:e.horizontal_crosscheck,
      registrationConfidence:e.registration_confidence,
      // A reviewed master selection establishes provenance, not customer-facing
      // seam quality. Only an explicit visual approval may clear this gate.
      visualDecision:e.visual_decision||null,visualReviewer:e.visual_reviewer||null,
      visualReviewedAt:e.visual_reviewed_at||null,visualMasterSha256:e.visual_master_sha256||null,
      reviewSelection:e.selection,sourceSha256:e.source_sha256,
    }:null,
  };
});
await writeFile(resolve(args.output),rows.map(row=>JSON.stringify(row)).join('\n')+'\n');
console.log(JSON.stringify({total:rows.length,liveEligibilityPending:rows.length,
  plainProposals:rows.filter(row=>row.plainEvidence).length,reviewedStraight:rows.filter(row=>row.straightEvidence).length,
  output:resolve(args.output)},null,2));
