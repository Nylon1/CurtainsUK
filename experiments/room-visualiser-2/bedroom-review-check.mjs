import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('C:/Users/hamza/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out='C:/Users/hamza/curtainsuk-visualiser-2-bedroom-inspiration-evidence-20261009',results=[];
const b=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--enable-webgl','--use-gl=angle','--use-angle=d3d11']});
try{for(const mobile of [false,true]){
const p=await b.newPage({viewport:{width:mobile?390:1440,height:mobile?844:1000},reducedMotion:'reduce'}),errors=[];
p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const response=await p.goto('http://127.0.0.1:4382/rooms-review');assert.equal(response.status(),200);assert.equal(await p.locator('article').count(),4);
for(const summary of await p.locator('summary').all())await summary.click();
for(const profile of ['STANDARD','FIXED140'])for(const viewport of ['desktop','mobile'])for(const mode of ['daylight','daylight-closed','evening','inspection']){
await p.selectOption('#profile',profile);await p.selectOption('#viewport',viewport);await p.selectOption('#lighting',mode==='daylight-closed'?'daylight':mode);if(mode.startsWith('daylight'))await p.selectOption('#pose',mode==='daylight-closed'?'closed':'open');
await p.waitForFunction(()=>[...document.querySelectorAll('article img,[data-room-comparison]')].every(i=>i.complete&&i.naturalWidth>0));
for(const room of ['bedroom','lounge'])assert.equal(await p.locator('[data-'+room+'-comparison="before"]').getAttribute('src'),`before-${room}-${viewport}-${profile}-${mode}.png`);
}
await p.selectOption('#lighting','evening');await p.check('#fire');await p.waitForFunction(()=>document.querySelector('article[data-room="living"] img').src.endsWith('-fireplace.png')&&document.querySelector('article[data-room="living"] img').complete);
for(const room of ['Bedroom','Lounge']){await p.locator('[aria-label="Enlarge after '+room+'"]').click();assert.equal(await p.locator('#zoom').isVisible(),true);await p.keyboard.press('Escape');assert.equal(await p.locator('#zoom').isVisible(),false);}
assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
await p.selectOption('#profile','STANDARD');await p.selectOption('#viewport',mobile?'mobile':'desktop');await p.selectOption('#lighting','daylight');await p.selectOption('#pose','open');
await p.waitForFunction(()=>[...document.querySelectorAll('article img,[data-room-comparison]')].every(i=>i.complete&&i.naturalWidth>0));
await p.screenshot({path:out+'/gallery-'+(mobile?'mobile':'desktop')+'.png',fullPage:true});
await p.locator('article[data-room="bedroom"] .live').click();await p.waitForFunction(()=>window.roomProof?.ready,null,{timeout:120000});assert.equal(await p.evaluate(()=>roomProof.room),'bedroom');assert.equal(await p.locator('#room-style').textContent(),'Ivory & brass');
const physical=await p.evaluate(async()=>{const T=await import('three'),root=roomRefinement.scene.getObjectByName('Bedroom — ivory and brass'),wardrobe=root.children.find(o=>o.material?.name==='Bedroom fitted wardrobe'),wb=new T.Box3().setFromObject(wardrobe),chair=new T.Box3(),handles=new T.Box3(),v=new T.Vector3();
root.updateWorldMatrix(true,true);for(const mesh of root.children.filter(o=>o.isMesh)){const pos=mesh.geometry.attributes.position;for(let i=0;i<pos.count;i++){v.fromBufferAttribute(pos,i).applyMatrix4(mesh.matrixWorld);if(mesh.material.name==='LINEN_FIXED'&&v.x<-80)chair.expandByPoint(v);if(mesh.material.name==='Bedroom BRASS'&&v.x<-260&&v.y>120&&v.y<150&&v.z>135&&v.z<422)handles.expandByPoint(v);}}
const envelope=new T.Box3(new T.Vector3(-115,0,-18),new T.Vector3(115,250,18)),triangle=new T.Triangle();let collisions=0;
for(const mesh of root.children.filter(o=>o.isMesh)){const g=mesh.geometry,position=g.attributes.position,index=g.index,count=index?index.count:position.count;for(let i=0;i<count;i+=3){for(const [vertex,n]of [[triangle.a,0],[triangle.b,1],[triangle.c,2]])vertex.fromBufferAttribute(position,index?index.getX(i+n):i+n).applyMatrix4(mesh.matrixWorld);if(envelope.intersectsTriangle(triangle))collisions++;}}
return{wardrobeBounds:{min:wb.min.toArray(),max:wb.max.toArray()},chairBounds:{min:chair.min.toArray(),max:chair.max.toArray()},clearanceCm:chair.min.x-handles.max.x,curtainEnvelopeTriangleIntersections:collisions};});
assert.ok(physical.clearanceCm>60);assert.equal(physical.curtainEnvelopeTriangleIntersections,0);
for(const mode of ['evening','inspection']){await p.evaluate(mode=>{roomAmbience.set('mode',mode);roomAmbience.set('lamps',true);},mode);const emissions=await p.evaluate(()=>{const root=roomRefinement.scene.getObjectByName('Bedroom — ivory and brass');return root.children.filter(o=>['Bedroom lamp linen','Bedroom faceted crystal'].includes(o.material?.name)).map(o=>o.material.emissiveIntensity);});assert.equal(emissions.length,2);assert.ok(emissions.every(v=>mode==='inspection'?v===0:v>0));}
assert.deepEqual(errors,[]);results.push({mobile,galleryStatus:200,fourRooms:true,allSavedViews:true,bothComparisonsZoom:true,workingBedroomLink:true,overflow:false,neutralEmissions:true,physical,errors});console.log(JSON.stringify({mobile,passed:true,clearanceCm:physical.clearanceCm,curtainIntersections:physical.curtainEnvelopeTriangleIntersections}));await p.close();
}}finally{await b.close();}
await writeFile(out+'/gallery-verification.json',JSON.stringify(results,null,2));
