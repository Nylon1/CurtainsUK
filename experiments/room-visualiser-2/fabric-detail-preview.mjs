import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('C:/Users/hamza/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out='C:/Users/hamza/curtainsuk-visualiser-2-fabric-detail-evidence-20261009',results=[];
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--enable-webgl','--use-gl=angle','--use-angle=d3d11']});
try{for(const profile of ['STANDARD','FIXED140'])for(const version of ['previous','current']){
 const p=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await p.goto('http://127.0.0.1:4382/?room=lounge&fabric='+(profile==='STANDARD'?'sdg-f1541-01':'pt-1204-212')+'&fabricDetail='+version);await p.waitForFunction(()=>window.roomProof?.ready,null,{timeout:120000});
 const poses=[];
 for(const progress of [0,.5,1]){
  await p.evaluate(progress=>roomReview.setProgress(progress),progress);
  const invariant=await p.evaluate(async()=>{
   const root=roomRefinement.scene.getObjectByName('APPROVED_WAVE_CURTAIN')||roomRefinement.scene.getObjectByName('FIXED140_SINGLE_WIDTH_V1'),mesh=root.children.find(o=>o.isMesh&&o.geometry.attributes.position.count>1000),g=mesh.geometry,map=mesh.material.map;
   const hash=async array=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(array.buffer,array.byteOffset,array.byteLength)))).map(v=>v.toString(16).padStart(2,'0')).join('');
   return{position:await hash(g.attributes.position.array),normal:await hash(g.attributes.normal.array),uv:await hash(g.attributes.uv.array),index:await hash(g.index.array),camera:roomProof.camera,transform:roomProof.curtainTransform,plan:roomProof.curtain.plan,texture:{src:map.image.src,width:map.image.width,height:map.image.height,repeat:map.repeat.toArray(),offset:map.offset.toArray(),wrap:[map.wrapS,map.wrapT],flipY:map.flipY,colorSpace:map.colorSpace,color:mesh.material.color.getHexString()}};
  });poses.push({progress,...invariant});
  await p.locator('#room-canvas').screenshot({path:`${out}/${version}-${profile}-room-${progress}.png`});
 }
 await p.evaluate(()=>roomReview.setProgress(0));await p.locator('[data-view="curtain"]').click();
 await p.locator('#room-canvas').screenshot({path:`${out}/${version}-${profile}-close.png`});
 await p.evaluate(()=>roomAmbience.set('mode','inspection'));
 await p.locator('#room-canvas').screenshot({path:`${out}/${version}-${profile}-inspection-close.png`});
 const material=await p.evaluate(()=>{const root=roomRefinement.scene.getObjectByName('APPROVED_WAVE_CURTAIN')||roomRefinement.scene.getObjectByName('FIXED140_SINGLE_WIDTH_V1'),m=root.children.find(o=>o.isMesh&&o.geometry.attributes.position.count>1000).material;return{detail:roomProof.fabricDetail,roughness:m.roughness,sheen:m.sheen,anisotropy:m.map.anisotropy,programs:roomRefinement.renderer.info.programs.length};});
 assert.deepEqual(errors,[]);if(version==='current')assert.deepEqual(poses,results.find(r=>r.profile===profile&&r.version==='previous').poses);
 results.push({profile,version,poses,material,errors});await writeFile(out+'/preview-verification.json',JSON.stringify(results,null,2));console.log(JSON.stringify({profile,version,passed:true,material}));await p.close();
}}finally{await browser.close();}
