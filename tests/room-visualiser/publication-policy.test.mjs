import test from 'node:test';
import assert from 'node:assert/strict';
import {classify,assessPlain,assessStraight,verifyRetail,makeEntry} from '../../scripts/room-visualiser-publication/core.mjs';
import {normaliseLedger,recordHold,holdPreflightFailures} from '../../scripts/room-visualiser-publication/ledger.mjs';

const base={fabricId:'pt-1234-567',designId:'pt-design-1234',design:'Example',colourway:'Sage',sourceUrl:'https://cdn.shopify.com/example.jpg',
  hRepeatCm:45,vRepeatCm:46.5,patternMatchType:'STRAIGHT_MATCH'};
test('mode selection holds offsets, one-axis repeats and unknown blanks',()=>{
  assert.equal(classify(base).mode,'straight');
  assert.equal(classify({...base,patternMatchType:'HALF_DROP_MATCH'}).reason,'OFFSET_LATTICE_METHOD_PENDING');
  assert.equal(classify({...base,hRepeatCm:0}).reason,'ONE_AXIS_REPEAT_REVIEW');
  assert.equal(classify({...base,hRepeatCm:0,vRepeatCm:0}).reason,'UNKNOWN_REPEAT_STATUS');
  assert.equal(classify({...base,design:'LYRA'}).reason,'KNOWN_UNSAFE_DESIGN');
});
test('plain mode requires evidence and creates no invented motif scale',()=>{
  const row={...base,hRepeatCm:0,vRepeatCm:0,noRepeatEvidence:true,plainStatus:'PLAIN_COLOUR_VISUAL_MODE_PROPOSED',
    plainEvidence:{state:'PROPOSED_FOR_REVIEW',representativeColour:'#aaa394',tonalStrength:.2,materialProfile:'GENERAL_TEXTILE'}};
  assert.equal(classify(row).mode,'plain');
  assert.equal(assessPlain(row),null);
  const entry=makeEntry(row,'plain','textures/a.webp','a',100,'source');
  assert.equal(entry.mode,'plain');
  assert.equal(entry.hRepeat,undefined);
  assert.equal(entry.vRepeat,undefined);
  assert.equal(entry.calibration,undefined);
  assert.equal(assessPlain({...row,plainEvidence:{...row.plainEvidence,materialProfile:'SHEER'}}),'PLAIN_MATERIAL_PROFILE_REVIEW');
});
test('straight mode requires reviewed master, exact physical period and strong anchor consensus',()=>{
  const e={registrationConfidence:'AUTOMATED_VERTICAL_FIRST_PROPOSAL',horizontalCrosscheck:'CORROBORATES',anchorConsensus:.99,
    matchedVerticalAnchors:150,pixelsPerCm:10,detectedVRepeatPx:465,visualDecision:'PASS',visualReviewer:'reviewer',
    visualReviewedAt:'2026-10-06T00:00:00Z',visualMasterSha256:'a'.repeat(64),master:'C:/master.png',masterSha256:'a'.repeat(64)};
  assert.equal(assessStraight({...base,straightEvidence:e}),null);
  assert.equal(assessStraight({...base,straightEvidence:{...e,detectedVRepeatPx:200}}),'PHYSICAL_SCALE_MISMATCH');
  assert.equal(assessStraight({...base,straightEvidence:{...e,visualDecision:'REVIEW'}}),'CLOTH_VISUAL_QA_PENDING');
  assert.equal(assessStraight({...base,straightEvidence:{...e,visualMasterSha256:'b'.repeat(64)}}),'CLOTH_VISUAL_QA_PENDING');
  assert.equal(assessStraight(base),'SCALE_OR_MASTER_UNVERIFIED');
  const entry=makeEntry({...base,straightEvidence:e},'straight','textures/b.webp','b',200,'original');
  assert.equal(entry.calibration.repeatsH,460/45);
  assert.equal(entry.calibration.repeatsV,250/46.5);
});
test('retail checks prevent stale image and repeat data from publishing',()=>{
  const fabric={id:base.fabricId,design:'Example',colour:'Sage',launchReady:true,browseReady:true,images:[{imageType:'MAIN',approved:true,url:base.sourceUrl}],horizontalRepeatMm:450,verticalRepeatMm:465,patternMatchType:'STRAIGHT_MATCH'};
  assert.equal(verifyRetail(base,fabric,'straight'),null);
  assert.equal(verifyRetail(base,{...fabric,verticalRepeatMm:500},'straight'),'LIVE_REPEAT_MISMATCH');
  assert.equal(verifyRetail(base,{...fabric,images:[{...fabric.images[0],url:'https://cdn.shopify.com/other.jpg'}]},'straight'),'LIVE_MAIN_IMAGE_MISMATCH');
});
test('runtime failures remain held across batches without counting as published',()=>{
  const ledger=normaliseLedger({version:1,published:['live'],staged:[]},['live']);
  recordHold(ledger,'unavailable','BUILD_OR_SOURCE:HTTP_404');
  assert.equal(ledger.holds.unavailable,'BUILD_OR_SOURCE:HTTP_404');
  assert.equal(normaliseLedger(structuredClone(ledger),['live']).holds.unavailable,'BUILD_OR_SOURCE:HTTP_404');
  assert.throws(()=>recordHold(ledger,'live','bad'),/Cannot hold/);
  assert.throws(()=>normaliseLedger({...ledger,staged:['unavailable']},['live','unavailable']),/both published\/staged and held/);
});
test('a few preflight failures become individual holds while valid staged fabrics continue',()=>{
  const ledger={version:1,published:['live'],staged:['good-a','bad','good-b'],holds:{}};
  const manifest={fabrics:['live','good-a','bad','good-b'].map(fabricId=>({fabricId,image:`/room-visualiser/textures/${'a'.repeat(64)}.webp`}))};
  const report={staged:3,newlyHeld:0,held:1,manifestTotal:4,stagedFabricIds:[...ledger.staged],
    holdReasons:{OLDER:1},results:ledger.staged.map(fabricId=>({fabricId,status:'STAGED',sha256:'a'}))};
  const removed=holdPreflightFailures(ledger,manifest,report,[{id:'bad',reason:'HTTP_503'}]);
  assert.deepEqual(ledger.staged,['good-a','good-b']);
  assert.equal(ledger.holds.bad,'PREFLIGHT:HTTP_503');
  assert.deepEqual(manifest.fabrics.map(entry=>entry.fabricId),['live','good-a','good-b']);
  assert.deepEqual(removed.map(entry=>entry.fabricId),['bad']);
  assert.equal(report.staged,2);
  assert.equal(report.newlyHeld,1);
  assert.equal(report.held,2);
  assert.equal(report.results.find(item=>item.fabricId==='bad').status,'HOLD');
  assert.equal(report.holdReasons['PREFLIGHT:HTTP_503'],1);
});
test('a systemic preflight outage cannot be hidden as individual holds',()=>{
  const staged=Array.from({length:100},(_,i)=>`id-${i}`);
  const ledger={version:1,published:[],staged,holds:{}};
  const manifest={fabrics:staged.map(fabricId=>({fabricId}))};
  const report={staged:100,newlyHeld:0,held:0,manifestTotal:100,stagedFabricIds:staged,
    holdReasons:{},results:staged.map(fabricId=>({fabricId,status:'STAGED'}))};
  assert.throws(()=>holdPreflightFailures(ledger,manifest,report,staged.slice(0,11).map(id=>({id,reason:'HTTP_503'}))),/SYSTEMIC_PREFLIGHT_FAILURE/);
  assert.equal(ledger.staged.length,100);
});
