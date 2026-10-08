import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {withRoomPreview,visualiserPage} from '../../lib/room-visualiser/server';

test('production HTML uses the canonical production CDN and local previews stay local',async()=>{
 for(const [input,origin] of [['https://www.curtainsuk.com/apps/curtainsuk-decision/room-visualiser','https://curtainsuk-production-api.vercel.app'],['http://127.0.0.1:4380/room-visualiser','http://127.0.0.1:4380']]){
  const response=await visualiserPage(new Request(input));const html=await response.text();
  assert.ok(html.includes(`<base href="${origin}/room-visualiser/`));assert.ok(!html.includes('curtainsuk-staging-api'));
  assert.equal(response.headers.get('Cache-Control'),'no-store');
 }
});
test('eligibility is additive and never modifies catalogue or commerce data',()=>{
 const original={id:'sdg-f1541-01',horizontalRepeatMm:450,verticalRepeatMm:465,sampleAvailable:false,orderReady:false,fabricProfileUrl:'existing'};
 const result=withRoomPreview(original);assert.equal(result.roomPreview.available,true);assert.equal(result.sampleAvailable,false);assert.equal(result.fabricProfileUrl,'existing');assert.ok(!('roomPreview' in original));
 assert.equal(withRoomPreview({...original,verticalRepeatMm:464}).roomPreview.available,false);
 assert.equal(withRoomPreview({...original,patternMatchType:'HALF_DROP'}).roomPreview.available,false);
 assert.equal(withRoomPreview({id:'pt-3697-575'}).roomPreview.message,'Room preview not available for this fabric yet.');
 assert.equal(withRoomPreview({id:'sdg-f1239-30'}).roomPreview.available,true);
});
test('visualiser stays behind signed proxy authentication and excludes FI reads',()=>{
 const route=readFileSync('app/api/staging/shopify-proxy/[operation]/route.ts','utf8');
 assert.ok(route.indexOf('await operation(request')<route.indexOf("if (selected === 'room-visualiser')"));
 assert.match(route,/if\(visualiser\)\{params.delete\('naila'\)/);assert.match(route,/visualiser\?\{includeIntelligence:false\}/);
 const reader=readFileSync('lib/fabric-master/retail-repository.ts','utf8');assert.match(reader,/options.includeIntelligence === false \? new Map\(\) : await visualKnowledgeByFabricIds/);
});
