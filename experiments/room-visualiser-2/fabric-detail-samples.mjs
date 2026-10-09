import {createRequire} from 'node:module';
import {writeFile,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('C:/Users/hamza/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out='C:/Users/hamza/curtainsuk-visualiser-2-fabric-detail-evidence-20261009',mobileOnly=process.env.FABRIC_SAMPLES_MOBILE_ONLY==='1';
const results=mobileOnly?JSON.parse(await readFile(out+'/sample-verification.json','utf8')).filter(r=>!r.mobile):[];
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--enable-webgl','--use-gl=angle','--use-angle=d3d11']});
try{for(const mobile of mobileOnly?[true]:[false,true])for(const version of ['previous','current']){
 const p=await browser.newPage({viewport:{width:mobile?390:1440,height:mobile?844:1000},deviceScaleFactor:mobile?2:1,isMobile:mobile,hasTouch:mobile,reducedMotion:'reduce'}),errors=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await p.goto('http://127.0.0.1:4382/?room=living&fabric=sdg-f1541-01&fabricDetail='+version);await p.waitForFunction(()=>window.roomProof?.ready,null,{timeout:120000});
 for(const fabric of ['sdg-f1239-30','sdg-dstr237715','pt-1267-152']){
  await p.evaluate(async fabric=>{const {resolveFabric}=await import('/runtime/rooms/catalogue-client.mjs');await visualiserCustomer.selectRecord(await resolveFabric(fabric));},fabric);
  assert.equal(await p.evaluate(()=>roomProof.rendererProfile),'STANDARD');
  await p.evaluate(()=>{roomReview.setView('room');roomReview.setProgress(0);roomAmbience.set('mode','daylight');});
  const prefix=`${out}/${version}-${mobile?'mobile':'desktop'}-${fabric}`;
  await p.locator('#room-canvas').screenshot({path:prefix+'-room.png'});
  const before=await p.evaluate(async()=>{
   const root=roomRefinement.scene.getObjectByName('APPROVED_WAVE_CURTAIN'),m=root.children.find(o=>o.isMesh&&o.geometry.attributes.position.count>1000),g=m.geometry,map=m.material.map;
   const hash=async array=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(array.buffer,array.byteOffset,array.byteLength)))).map(v=>v.toString(16).padStart(2,'0')).join('');
   return{geometryId:g.uuid,materialId:m.material.uuid,mapId:map.uuid,invariants:{position:await hash(g.attributes.position.array),uv:await hash(g.attributes.uv.array),index:await hash(g.index.array),plan:roomProof.curtain.plan,image:map.image.src,repeat:map.repeat.toArray(),offset:map.offset.toArray(),flipY:map.flipY,wrap:[map.wrapS,map.wrapT],colorSpace:map.colorSpace,color:m.material.color.getHexString(),camera:roomProof.camera},programs:roomRefinement.renderer.info.programs.length};
  });
  await p.locator('[data-view="curtain"]').click();await p.locator('#room-canvas').screenshot({path:prefix+'-close.png'});
  const after=await p.evaluate(()=>{const root=roomRefinement.scene.getObjectByName('APPROVED_WAVE_CURTAIN'),m=root.children.find(o=>o.isMesh&&o.geometry.attributes.position.count>1000);return{geometryId:m.geometry.uuid,materialId:m.material.uuid,mapId:m.material.map.uuid,programs:roomRefinement.renderer.info.programs.length};});
  for(const key of ['geometryId','materialId','mapId','programs'])assert.equal(after[key],before[key],'Camera switch changed '+key);
  if(version==='current')assert.deepEqual(before.invariants,results.find(r=>r.mobile===mobile&&r.version==='previous'&&r.fabric===fabric).invariants);
  await p.evaluate(()=>{roomAmbience.set('mode','inspection');roomReview.setView('room');});await p.locator('#room-canvas').screenshot({path:prefix+'-inspection.png'});
  if(fabric==='sdg-dstr237715')for(const progress of [.38,.40,.42]){await p.evaluate(progress=>roomReview.setProgress(progress),progress);await p.locator('#room-canvas').screenshot({path:prefix+'-motion-'+progress+'.png'});}
  assert.deepEqual(errors,[]);results.push({mobile,version,fabric,invariants:before.invariants,sameGeometryMaterialTextureAcrossViews:true,programs:after.programs,errors:[...errors]});
  await writeFile(out+'/sample-verification.json',JSON.stringify(results,null,2));console.log(JSON.stringify({mobile,version,fabric,passed:true}));
 }
 await p.close();
}
// Exercise the existing direct-render fallback without floating-point targets.
const p=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'}),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await p.addInitScript(()=>{const get=WebGL2RenderingContext.prototype.getExtension;WebGL2RenderingContext.prototype.getExtension=function(name){return name==='EXT_color_buffer_float'?null:get.call(this,name);};});
await p.goto('http://127.0.0.1:4382/?room=office&fabric=pt-1204-212');await p.waitForFunction(()=>window.roomProof?.ready,null,{timeout:120000});
assert.equal(await p.evaluate(()=>roomRefinement.pipeline.enabled),false);assert.equal(await p.evaluate(()=>roomProof.fabricDetail.profile),'FIXED140');assert.deepEqual(errors,[]);
await p.locator('#room-canvas').screenshot({path:out+'/direct-render-fallback.png'});await writeFile(out+'/fallback-verification.json',JSON.stringify({passed:true,profile:'FIXED140',postprocessing:false,errors},null,2));
await p.close();
}finally{await browser.close();}
