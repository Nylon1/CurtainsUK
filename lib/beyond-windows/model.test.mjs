import test from 'node:test';
import assert from 'node:assert/strict';
import {normaliseState,readState,stateQuery,designUrl,makeRoute,routePoints,panelSpans,foldSection,textureSpec,commercePolicy,projectBrief,useExamples,roomCamera,ROOM,INSTALLATION} from './runtime/model.mjs';
test('every supported configuration survives a URL round trip; invalid IDs cannot escape the allowlist',()=>{
  for(const scene of['hide','divide','screens'])for(const layout of['straight','corner','curve']){
    const state=normaliseState({scene,layout,material:'layered',draw:'right',construction:'double',heading:'pencil',open:.37,layer:.81,view:'reverse',fabric:'pt-1204-212'});
    assert.deepEqual(readState('?'+stateQuery(state)).state,state);
  }
  assert.equal(readState('?fabric=a&fabric=b').invalidFabric,true);
  assert.equal(readState('?fabric=%3Cscript%3E').invalidFabric,true);
  assert.equal(normaliseState({scene:'../../secret',open:Infinity}).scene,'hide');
});
test('Shopify page design links preserve camera without activating a template view',()=>{
  const state=normaliseState({scene:'divide',layout:'curve',view:'reverse',open:.37});
  const page=designUrl('https://www.curtainsuk.com/pages/curtains-beyond-windows',state);
  assert.equal(page.searchParams.get('camera'),'reverse');
  assert.equal(page.searchParams.has('view'),false);
  assert.equal(page.searchParams.get('layout'),'curve');
  const proxy=designUrl('https://www.curtainsuk.com/apps/curtainsuk-decision/beyond-windows/',state);
  assert.equal(proxy.searchParams.get('view'),'reverse');
  assert.equal(proxy.searchParams.has('camera'),false);
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
test('only server-approved inputs render; plains make no physical weave claim',()=>{
  const r={beyondPreview:{mode:'patterned',width:460,height:250,top:0,tileWidth:45,tileHeight:46.5},roomPreview:{rendererProfile:'STANDARD',worktableImageUrl:'https://example.test/x.webp'}};
  assert.equal(textureSpec(r).calibrated,true);assert.equal(textureSpec(r).tileWidth,45);
  assert.throws(()=>textureSpec({...r,beyondPreview:undefined}),/approved/);
  assert.throws(()=>textureSpec({...r,roomPreview:{...r.roomPreview,rendererProfile:'FIXED140_SINGLE_WIDTH_V1'}}),/approved/);
  const plain=textureSpec({...r,beyondPreview:{...r.beyondPreview,mode:'plain'}});
  assert.equal(plain.calibrated,false);assert.match(plain.label,/weave scale is not verified/);
});
test('legacy pencil links use Wave; examples follow the scene and layout',()=>{
  const s=readState('?scene=divide&layout=curve&heading=pencil&open=0.37').state;
  assert.equal(s.heading,'wave');assert.equal(s.open,.37);assert.equal(s.layout,'curve');
  assert.match(projectBrief(s),/Heading concept: Wave/);assert.doesNotMatch(projectBrief(s),/Pencil/);
  assert.match(useExamples(s).items.join(' '),/fitting enclosure/);
  assert.match(useExamples({...s,layout:'straight'}).items.join(' '),/living and dining/);
  assert.match(useExamples({...s,scene:'hide'}).items.join(' '),/wardrobe/);
  assert.match(useExamples({...s,scene:'screens'}).items.join(' '),/reception/);
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

test('all cameras remain within the enclosed room across scenes and viewport shapes',()=>{
  for(const scene of ['hide','divide','screens'])for(const view of ['room','curtain','reverse'])for(const aspect of [.7,1.4,2.36,3]){
    const camera=roomCamera(normaliseState({scene,view}),aspect),[x,y,z]=camera.position;
    assert.ok(x>ROOM.left&&x<ROOM.right,`${scene}/${view}: camera crosses a side wall`);
    assert.ok(z>ROOM.back&&z<ROOM.front,`${scene}/${view}: camera crosses an end wall`);
    assert.ok(y>0&&y<INSTALLATION.ceiling);
    assert.ok(camera.fov>=40&&camera.fov<=92);
  }
});
