// Read-only post-deployment gate. Never calls an inference provider or writes data.
import assert from 'node:assert/strict';
const base=process.argv[2] || 'https://www.curtainsuk.com/apps/curtainsuk-decision/catalog';
for(const id of ['pt-1223-374','pt-1224-002','pt-1290-314','sdg-aarc520004','pt-1204-212','pt-1225-314','pt-1225-722']) {
  const url=new URL(base);
  for(const [key,value] of Object.entries({view:'retail',browseGuide:'1',knowledge:'1',fabric:id})) url.searchParams.set(key,value);
  const response=await fetch(url,{signal:AbortSignal.timeout(60000)});
  assert.equal(response.status,200,`${id}: catalogue HTTP status`);
  const body=await response.json();
  const fabric=body.fabric;
  assert.equal(fabric?.id,id,`${id}: exact identity`);
  assert.ok(fabric.visualIntelligence,`${id}: stored knowledge projection missing`);
  assert.ok(fabric.intelligence?.dimensions?.length,`${id}: customer renderer dimensions missing`);
  if(id==='pt-1223-374') {
    assert.equal(fabric.visualIntelligence.pattern.category,'stripe');
    assert.equal(fabric.visualIntelligence.palette.temperature,'warm');
  }
  console.log(JSON.stringify({id,dimensions:fabric.intelligence.dimensions.map(d=>d.key),pass:true}));
}
