import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assertUnassigned,physicalWidth,preflight,sourceKind,sourceReviewReason,validateV1} from '../../scripts/room-visualiser-fixed140-tranche/policy.mjs';
import {eligibleBrowseIds} from '../../scripts/room-visualiser-fixed140-tranche/browse-selection.mjs';

const fabric={
  fabric_id:'test-pattern',staging_catalog_visible:true,storefront_selectable:true,lifecycle_state:'CURRENT',
  usable_width_mm:1350,full_width_mm:1380,horizontal_repeat_mm:450,vertical_repeat_mm:465,
  source_url:'https://cdn.shopify.com/s/files/example.jpg',main_count:1,
  declared_width_px:1350,declared_height_px:1350,
};

test('V1 tranche never reselects STANDARD or non-retail/ambiguous imagery',()=>{
  assert.equal(preflight(fabric,new Set(['test-pattern'])),'STANDARD_OR_INVALID_ID');
  assert.equal(preflight(fabric,new Set()),null);
  assert.equal(preflight({...fabric,staging_catalog_visible:false},new Set()),'NOT_CURRENT_RETAIL');
  assert.equal(preflight({...fabric,main_count:2},new Set()),'AMBIGUOUS_APPROVED_MAIN');
  assert.equal(preflight({...fabric,horizontal_repeat_mm:0,vertical_repeat_mm:0},new Set()),
    'NO_PATTERN_OR_PLAIN_EVIDENCE');
});

test('no-repeat candidates require an exact governed plain classification and provisional selection',()=>{
  const noRepeat={...fabric,horizontal_repeat_mm:null,vertical_repeat_mm:null};
  assert.equal(preflight({...noRepeat,selection_basis:'BROWSE_PLAIN_PROVISIONAL',
    pattern_class:'plain'},new Set()),null);
  assert.equal(preflight({...noRepeat,selection_basis:'BROWSE_TEXTURED_PLAIN_PROVISIONAL',
    pattern_class:'textured-plain'},new Set()),null);
  assert.equal(preflight({...noRepeat,selection_basis:'BROWSE_PLAIN_PROVISIONAL',
    pattern_class:'stripe'},new Set()),'NO_PATTERN_OR_PLAIN_EVIDENCE');
  assert.equal(preflight({...noRepeat,selection_basis:'PUBLISHED_REPEAT',
    pattern_class:'plain'},new Set()),'NO_PATTERN_OR_PLAIN_EVIDENCE');
});

test('Tranche 3 rejects both existing renderer manifests before source work',()=>{
  const rows=[{fabric_id:'new-pattern'}];
  assert.doesNotThrow(()=>assertUnassigned(rows,new Set(['standard']),new Set(['v1'])));
  assert.throws(()=>assertUnassigned([{fabric_id:'standard'}],new Set(['standard']),new Set()),/already-enabled fabric: standard/);
  assert.throws(()=>assertUnassigned([{fabric_id:'v1'}],new Set(),new Set(['v1'])),/already-enabled fabric: v1/);
});

test('Browse is the only selection universe, with prior holds and existing renderers excluded',()=>{
  const browse=['pt-z','pt-c','pt-b','pt-a','pt-d'];
  const repeat=new Set(['pt-a','pt-b','pt-c','pt-d','pt-z']);
  const result=eligibleBrowseIds(browse,repeat,new Set(['pt-a']),new Set(['pt-b']),new Set(['pt-c']));
  assert.deepEqual(result.remaining,['pt-z','pt-c','pt-d']);
  assert.deepEqual(result.skippedPrior,['pt-c']);
  assert.deepEqual(result.eligible,['pt-d','pt-z']);
  assert.throws(()=>eligibleBrowseIds(browse,new Set([...repeat,'master-only']),
    new Set(),new Set(),new Set()),/outside Browse/);
});

test('No-repeat metadata cannot enter the patterned V1 tranche and manifest overlap fails',()=>{
  const result=eligibleBrowseIds(['b','a','c'],new Set(['a','c']),
    new Set(),new Set(),new Set());
  assert.deepEqual(result.eligible,['a','c']);
  assert.throws(()=>eligibleBrowseIds(['a'],new Set(['a']),
    new Set(['a']),new Set(['a']),new Set()),/manifest overlap/);
});

test('governed usable width takes priority; full width can stand in only when usable is absent',()=>{
  assert.deepEqual(physicalWidth(fabric),{cm:135,basis:'USABLE_WIDTH'});
  assert.deepEqual(physicalWidth({...fabric,usable_width_mm:null}),{cm:138,basis:'FULL_WIDTH_AS_USABLE'});
  assert.deepEqual(physicalWidth({...fabric,usable_width_mm:null,full_width_mm:null}),{cm:null,basis:'MISSING'});
});

test('120 cm physical height uses one isotropic source scale and frozen mesh/UV',()=>{
  const pass=validateV1(fabric,1350,1350);
  assert.equal(pass.state,'V1_PASS');
  assert.equal(pass.sourceHeightCm,135);
  assert.equal(pass.plan.pixelsPerCmX,pass.plan.pixelsPerCmY);
  assert.equal(pass.mesh.flatPanelWidthCm,135);
  assert.equal(pass.mesh.flatPairWidthCm,270);
  assert.equal(pass.mesh.vertices,11050);
  assert.equal(pass.mesh.triangles,21120);
  assert.equal(validateV1(fabric,1350,1199).state,'INSUFFICIENT_COVERAGE');
  const wide=validateV1({...fabric,usable_width_mm:1600},1600,1100);
  assert.equal(wide.state,'INSUFFICIENT_COVERAGE');
  const widePass=validateV1({...fabric,usable_width_mm:1600},1600,1600);
  assert.equal(widePass.state,'V1_PASS');
  assert.equal(widePass.plan.cropStartCm,10);
  assert.equal(widePass.mesh.flatPanelWidthCm,140);
});

test('exact supplier bytes must be JPEG/WebP; dimension drift remains on review',()=>{
  assert.equal(sourceKind(Buffer.from([0xff,0xd8,0xff,0xd9])).extension,'jpg');
  assert.equal(sourceKind(Buffer.from('RIFFabcdWEBPxxxx')).extension,'webp');
  assert.equal(sourceKind(Buffer.from('not an image')),null);
  assert.equal(sourceReviewReason(fabric,{width:800,height:800}), 'SOURCE_DIMENSIONS_DIFFER_FROM_GOVERNED_MAIN');
  assert.equal(sourceReviewReason(fabric,{width:1350,height:1350,orientation:1,pages:1}),null);
});
