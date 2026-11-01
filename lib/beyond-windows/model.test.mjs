import test from 'node:test';
import assert from 'node:assert/strict';
import {normaliseState,readState,stateQuery,makeRoute,routePoints,panelSpans,foldSection,textureSpec,commercePolicy,projectBrief} from './runtime/model.mjs';
test('every supported configuration survives a URL round trip; invalid IDs cannot escape the allowlist',()=>{
  for(const scene of['hide','divide','screens'])for(const layout of['straight','corner','curve']){
    const state=normaliseState({scene,layout,material:'layered',draw:'right',construction:'double',heading:'pencil',open:.37,layer:.81,view:'reverse',fabric:'pt-1204-212'});
    assert.deepEqual(readState('?'+stateQuery(state)).state,state);
  }
  assert.equal(readState('?fabric=a&fabric=b').invalidFabric,true);
  assert.equal(readState('?fabric=%3Cscript%3E').invalidFabric,true);
  assert.equal(normaliseState({scene:'../../secret',open:Infinity}).scene,'hide');
});
test('all tracks and parking remain outside the clear passage; gathers travel along their route',()=>{
  for(const scene of['hide','divide','screens'])for(const layout of['straight','corner','curve'])for(const draw of['pair','left','right']){
    const route=makeRoute(routePoints(normaliseState({scene,layout})));
    for(let p=0;p<=1;p+=.1)for(const span of panelSpans(route.length,draw,p)){
      assert.ok(span.start>=0&&span.start+span.span<=route.length+.0001);
      for(let k=0;k<=10;k++)assert.ok(route.at(span.start+k/10*span.span).x<270);
    }
  }
});
test('fold gathering retains cloth length and endpoints, including partial positions',()=>{
  for(const opening of[0,.25,.5,.75,1])for(const draw of['pair','left'])for(const s of panelSpans(480,draw,opening)){
    const section=foldSection(s.span,s.cloth,Math.round(s.full/16),960);
    const length=section.slice(1).reduce((total,p,i)=>total+Math.hypot(p[0]-section[i][0],p[1]-section[i][1]),0);
    assert.ok(Math.abs(length-s.cloth)/s.cloth<.008,`${opening}: ${length}/${s.cloth}`);
    assert.ok(Math.abs(section.at(-1)[0]-s.span)<.01);
  }
});
test('only calibrated, compatible repeat evidence establishes pattern scale',()=>{
  const r={horizontalRepeatMm:450,verticalRepeatMm:465,roomPreview:{worktableImageUrl:'https://example.test/x.jpg',worktableSource:{imageWidthCm:140,imageHeightCm:140,imageTopCm:0,scaleKind:'calibrated'}}};
  assert.equal(textureSpec(r).calibrated,true);assert.equal(textureSpec(r).tileWidth,45);
  assert.equal(textureSpec({...r,patternMatchType:'HALF_DROP'}).calibrated,false);
  assert.equal(textureSpec({...r,verticalRepeatMm:2000}).calibrated,false);
  assert.equal(textureSpec({...r,roomPreview:{...r.roomPreview,worktableSource:{...r.roomPreview.worktableSource,scaleKind:'colour-only'}}}).calibrated,false);
});
test('unavailable products and metallic systems cannot become automated purchase handoffs',()=>{
  const actions={profile:'profile',sample:'sample',make:'make',sampleAvailable:true};
  assert.equal(commercePolicy(normaliseState(),{orderReady:false},actions).make,null);
  assert.equal(commercePolicy(normaliseState({scene:'screens',material:'ball'}),{orderReady:true},actions).make,null);
  assert.equal(commercePolicy(normaliseState(),{orderReady:true},actions).quoteRequired,true);
  assert.equal(commercePolicy(normaliseState(),{orderReady:true},actions).configurationTransferred,false);
  const brief=projectBrief(normaliseState({scene:'divide',layout:'curve',open:.5}),{id:'a',design:'Example',colour:'Green'});
  assert.match(brief,/Curved enclosure/);assert.match(brief,/not manufacturing quantities/);assert.match(brief,/Measurements needed/);
});

test('double-faced fabric is an explicit quote construction, never inferred for a lined divider',()=>{
  const lined=normaliseState(),double=normaliseState({scene:'divide',construction:'double'});
  assert.equal(lined.construction,'lined');assert.match(projectBrief(lined),/neutral lining reverse/);
  assert.match(projectBrief(double),/selected decorative fabric on both sides, instead of lining/);
  assert.equal(commercePolicy(double,{orderReady:true},{profile:null,sampleAvailable:false,make:null}).quoteRequired,true);
});
