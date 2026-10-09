import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('C:/Users/hamza/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out='C:/Users/hamza/curtainsuk-visualiser-2-living-inspiration-evidence-20261009';
const prior=JSON.parse(await readFile('C:/Users/hamza/curtainsuk-visualiser-2-four-rooms-evidence-20261009/verification.json','utf8'));
await mkdir(out,{recursive:true});const results=[];
const exact=page=>page.evaluate(async()=>{const group=roomRefinement.scene.getObjectByName('APPROVED_WAVE_CURTAIN')||roomRefinement.scene.getObjectByName('FIXED140_SINGLE_WIDTH_V1'),mesh=group.children.find(o=>o.isMesh&&o.geometry.attributes.position.count>1000),g=mesh.geometry;
const hash=async a=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(a.buffer,a.byteOffset,a.byteLength)))).map(v=>v.toString(16).padStart(2,'0')).join('');
return{position:await hash(g.attributes.position.array),uv:await hash(g.attributes.uv.array),index:await hash(g.index.array),camera:{position:roomRefinement.camera.position.toArray(),quaternion:roomRefinement.camera.quaternion.toArray(),fov:roomRefinement.camera.fov,aspect:roomRefinement.camera.aspect},transform:{position:group.position.toArray(),scale:group.scale.toArray()},selected:roomProof.selectedFabric};});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--enable-webgl','--use-gl=angle','--use-angle=d3d11']});
try{for(const mobile of [false,true])for(const profile of ['STANDARD','FIXED140']){
const p=await browser.newPage({viewport:{width:mobile?390:1440,height:mobile?844:1000},deviceScaleFactor:mobile?2:1,isMobile:mobile,hasTouch:mobile,reducedMotion:'reduce'}),errors=[];
p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await p.goto('http://127.0.0.1:4382/?room=living&fabric='+(profile==='STANDARD'?'sdg-f1541-01':'pt-1204-212')+(mobile?'&compareDpr=1.25':''));await p.waitForFunction(()=>window.roomProof?.ready,null,{timeout:120000});
const baseline=prior.find(r=>r.mode==='baseline'&&r.mobile===mobile&&r.profile===profile&&r.room==='living');
await p.evaluate(()=>roomReview.setProgress(0));const closed=await exact(p);assert.deepEqual(closed,baseline.closed);
const prefix=out+'/living-'+(mobile?'mobile':'desktop')+'-'+profile+'-';
await p.locator('#room-canvas').screenshot({path:prefix+'daylight-closed.png'});
await p.evaluate(()=>roomReview.startMotion(1));await p.waitForFunction(()=>roomProof.motion.done);const open=await exact(p);assert.deepEqual(open,baseline.open);
for(const mode of ['daylight','evening','fireplace','inspection']){
await p.evaluate(mode=>{roomAmbience.set('mode',mode==='fireplace'?'evening':mode);roomAmbience.set('lamps',mode!=='daylight');roomAmbience.set('fire',mode==='fireplace'||mode==='inspection');},mode);
await p.locator('#room-canvas').screenshot({path:prefix+mode+'.png'});
const warm=await p.evaluate(()=>{const root=roomRefinement.scene.getObjectByName('Living — sculpted ivory'),points=[];roomRefinement.scene.traverse(o=>{if(o.isPointLight||o.isLightProbe)points.push(o.intensity)});return{points,cove:root.children.find(o=>o.material?.name==='Living cove wall wash').material.opacity,diffuser:root.children.find(o=>o.material?.name==='Living chandelier diffuser').material.emissiveIntensity};});
const flames=await p.evaluate(()=>{const list=[];roomRefinement.scene.traverse(o=>{if(o.userData.flame)list.push({visible:o.visible,strength:o.material.uniforms.strength.value})});return list;});assert.equal(flames.length,3);assert.ok(flames.every(f=>f.visible===(mode==='fireplace')&&f.strength===(mode==='fireplace'?1:0)));
if(mode==='inspection'){assert.ok(warm.points.every(v=>v===0));assert.equal(warm.cove,0);assert.equal(warm.diffuser,0);assert.equal(await p.locator('[data-toggle="lamps"]').isDisabled(),true);}
if(mode==='daylight'){assert.equal(warm.cove,0);assert.equal(warm.diffuser,0);}
if(mode==='evening'||mode==='fireplace'){assert.ok(warm.points.some(v=>v>0));assert.ok(warm.cove>0);assert.ok(warm.diffuser>0);}
}
assert.equal(await p.locator('[data-toggle="fire"]').isVisible(),true);assert.equal(await p.locator('[data-toggle="fire"]').isDisabled(),true);
const colours=await p.evaluate(()=>roomProof.colours);
assert.deepEqual(colours,{CEILING_MATERIAL:0,WALL_MATERIAL:0,FLOOR_MATERIAL:4,SOFA_UPHOLSTERY:0,ARMCHAIR_UPHOLSTERY:0,CUSHION_UPHOLSTERY:0});
const changed=Object.fromEntries(Object.entries(colours).map(([zone,index])=>[zone,index===3?2:3]));
for(const zone of Object.keys(colours)){
const before=await p.evaluate(zone=>{const list=[];roomRefinement.scene.traverse(o=>{if(o.isMesh&&o.material?.name===zone)list.push(o.material.color.getHexString())});return list;},zone);
await p.locator('[data-zone="'+zone+'"][data-colour="'+changed[zone]+'"]').click();
const after=await p.evaluate(zone=>{const list=[];roomRefinement.scene.traverse(o=>{if(o.isMesh&&o.material?.name===zone)list.push(o.material.color.getHexString())});return list;},zone);
assert.notDeepEqual(before,after,'Palette does not recolour '+zone);
}
for(const view of ['curtain',...(profile==='FIXED140'?['full']:[]),'room']){await p.locator('[data-view="'+view+'"]').click();assert.equal(await p.evaluate(()=>roomProof.view),view);}
await p.evaluate(()=>roomReview.startMotion(0));await p.waitForFunction(()=>roomProof.motion.done);assert.deepEqual(await exact(p),closed);
await p.evaluate(async()=>{await roomReview.setRoom('lounge');await roomReview.setRoom('living');});
assert.deepEqual(await p.evaluate(()=>roomProof.colours),changed,'Living colours reset on return');
for(const [zone,index]of Object.entries(colours))await p.locator('[data-zone="'+zone+'"][data-colour="'+index+'"]').click();
// Check the unchanged curtain/camera state after leaving the new scene.
for(const room of ['office','lounge','bedroom']){
await p.evaluate(room=>roomReview.setRoom(room),room);await p.evaluate(()=>roomReview.setProgress(0));
const expected=prior.find(r=>r.mode==='baseline'&&r.mobile===mobile&&r.profile===profile&&r.room===room);
assert.deepEqual(await exact(p),expected.closed,room+' curtain/camera regression');
assert.equal(await p.evaluate(()=>roomRefinement.scene.getObjectByName('Living — sculpted ivory')===undefined),true);
}
await p.evaluate(()=>roomReview.setRoom('living'));
// Switch both ways through the actual catalogue selector and retain the design.
for(const fabric of ['pt-1204-212','sdg-f1541-01']){
const routed=await p.evaluate(async fabric=>{const {resolveFabric}=await import('/runtime/rooms/catalogue-client.mjs');const applied=await visualiserCustomer.selectRecord(await resolveFabric(fabric));return{applied:applied!==false,profile:roomProof.rendererProfile,design:!!roomRefinement.scene.getObjectByName('Living — sculpted ivory')};},fabric);
assert.equal(routed.applied,true);assert.equal(routed.profile,fabric.startsWith('pt-')?'FIXED140_SINGLE_WIDTH_V1':'STANDARD');assert.equal(routed.design,true);
}
await p.locator('#change-fabric').click();await p.waitForFunction(()=>document.querySelector('#fabric-dialog')?.open);await p.keyboard.press('Escape');assert.equal(await p.locator('#fabric-dialog').isVisible(),false);
await p.evaluate(()=>{roomAmbience.set('mode','daylight');roomAmbience.set('fire',false);});await p.locator('[data-toggle="lamps"]').focus();await p.keyboard.press('Enter');assert.equal(await p.evaluate(()=>roomAmbience.get().lamps),false);
const layout=await p.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,buttons:[...document.querySelectorAll('.ambience button')].filter(b=>!b.hidden).map(b=>b.getBoundingClientRect().height)}));assert.equal(layout.overflow,false);assert.ok(layout.buttons.every(h=>h>=44));
if(!mobile){await p.emulateMedia({reducedMotion:'no-preference'});await p.evaluate(()=>roomReview.startMotion(1));await p.waitForFunction(()=>roomProof.motion.done);assert.ok(await p.evaluate(()=>roomProof.motionRuns.at(-1).frames>3));}
await p.evaluate(async()=>{const a=roomReview.setRoom('bedroom');await new Promise(r=>setTimeout(r,10));const b=roomReview.setRoom('lounge');await new Promise(r=>setTimeout(r,10));const c=roomReview.setRoom('living');await Promise.all([a,b,c]);});assert.equal(await p.evaluate(()=>roomProof.room),'living');
assert.deepEqual(errors,[]);results.push({mobile,profile,closed,open,curtainAndCameraUnchanged:true,neutralInspection:true,palettesAndRoomRetention:true,routing:true,keyboard:true,staggeredSwitch:true,layout,errors});await writeFile(out+'/verification.json',JSON.stringify(results,null,2));console.log(JSON.stringify({mobile,profile,passed:true}));await p.close();
}}finally{await browser.close();}
