import {createRequire} from 'node:module';import {mkdir,writeFile} from 'node:fs/promises';import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('C:/Users/hamza/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out='C:/Users/hamza/curtainsuk-visualiser-2-four-rooms-evidence-20261009';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--enable-webgl','--use-gl=angle','--use-angle=d3d11']});const records=[],baselines=new Map();
const exact=page=>page.evaluate(async()=>{const group=roomRefinement.scene.getObjectByName('APPROVED_WAVE_CURTAIN')||roomRefinement.scene.getObjectByName('FIXED140_SINGLE_WIDTH_V1'),mesh=group.children.find(o=>o.isMesh&&o.geometry.attributes.position.count>1000),g=mesh.geometry;
const hash=async a=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(a.buffer,a.byteOffset,a.byteLength)))).map(v=>v.toString(16).padStart(2,'0')).join('');
return{position:await hash(g.attributes.position.array),uv:await hash(g.attributes.uv.array),index:await hash(g.index.array),camera:{position:roomRefinement.camera.position.toArray(),quaternion:roomRefinement.camera.quaternion.toArray(),fov:roomRefinement.camera.fov,aspect:roomRefinement.camera.aspect},transform:{position:group.position.toArray(),scale:group.scale.toArray()},selected:roomProof.selectedFabric};});
try{for(const mobile of [false,true])for(const profile of ['STANDARD','FIXED140'])for(const mode of ['baseline','prototype']){
const context=await browser.newContext({viewport:{width:mobile?390:1440,height:mobile?844:1000},deviceScaleFactor:mobile?2:1,isMobile:mobile,hasTouch:mobile,reducedMotion:'reduce'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await page.goto('http://127.0.0.1:4382/?mode='+mode+'&fabric='+(profile==='STANDARD'?'sdg-f1541-01':'pt-1204-212')+(mobile?'&compareDpr=1.25':''));await page.waitForFunction(()=>window.roomProof?.ready,null,{timeout:120000});
const retained={};
for(const room of ['living','bedroom','lounge','office']){
await page.locator('[data-room="'+room+'"]').click();await page.waitForFunction(room=>roomProof.ready&&roomProof.room===room,room);await page.evaluate(()=>roomReview.setProgress(0));
const closed=await exact(page),key=mobile+'-'+profile+'-'+room;
if(mode==='prototype'){await page.getByRole('button',{name:'Daylight',exact:true}).click();await page.evaluate(()=>roomAmbience.set('lamps',false));await page.locator('#room-canvas').screenshot({path:out+'/'+room+'-'+(mobile?'mobile':'desktop')+'-'+profile+'-daylight-closed.png'});}
await page.evaluate(()=>roomReview.startMotion(1));await page.waitForFunction(()=>roomProof.motion.done);const open=await exact(page);
if(mode==='baseline')baselines.set(key,{closed,open});else{
assert.deepEqual(closed,baselines.get(key).closed,'Closed curtain/camera changed: '+key);assert.deepEqual(open,baselines.get(key).open,'Open curtain/camera changed: '+key);
for(const [name,lighting,fire]of [['daylight','daylight',false],['evening','evening',false],...(room==='living'?[['fireplace','evening',true]]:[]),['inspection','inspection',false]]){
await page.evaluate(({lighting,fire})=>{roomAmbience.set('mode',lighting);if(roomProof.room==='living')roomAmbience.set('fire',fire);roomAmbience.set('lamps',lighting!=='daylight');},{lighting,fire});
await page.locator('#room-canvas').screenshot({path:out+'/'+room+'-'+(mobile?'mobile':'desktop')+'-'+profile+'-'+name+'.png'});
if(name==='inspection'){const neutral=await page.evaluate(()=>{const lights=[];roomRefinement.scene.traverse(o=>{if(o.isPointLight||o.isLightProbe)lights.push(o.intensity)});return lights;});assert.ok(neutral.every(v=>v===0),'Inspection warm contribution');assert.equal(await page.locator('[data-toggle="lamps"]').isDisabled(),true);}
}
assert.equal(await page.locator('[data-toggle="fire"]').isVisible(),room==='living');
// Exercise each room's customer palette through the actual UI.
const zone={living:'SOFA_UPHOLSTERY',bedroom:'BED_COVER',lounge:'SEATING_UPHOLSTERY',office:'DESK_SURFACE'}[room];const old=await page.evaluate(zone=>roomProof.colours[zone],zone);
await page.locator('[data-zone="'+zone+'"][data-colour="3"]').click();assert.equal(await page.evaluate(zone=>roomProof.colours[zone],zone),3);
await page.locator('[data-zone="'+zone+'"][data-colour="'+old+'"]').click();
for(const view of ['curtain',...(profile==='FIXED140'?['full']:[]),'room']){await page.locator('[data-view="'+view+'"]').click();assert.equal(await page.evaluate(()=>roomProof.view),view);}
retained[room]=await page.evaluate(()=>roomAmbience.get());
}
await page.evaluate(()=>roomReview.startMotion(0));await page.waitForFunction(()=>roomProof.motion.done);const returned=await exact(page);assert.deepEqual(returned,closed,'Endpoint restore changed');
const layout=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,ambienceButtons:[...document.querySelectorAll('.ambience button')].filter(b=>!b.hidden).map(b=>({height:b.getBoundingClientRect().height,pressed:b.getAttribute('aria-pressed')}))}));assert.equal(layout.overflow,false,'Horizontal page overflow');
if(mode==='prototype')assert.ok(layout.ambienceButtons.every(b=>b.height>=44),'Ambience touch target');
records.push({mobile,profile,mode,room,closed,open,returned,layout,errors:[...errors]});assert.deepEqual(errors,[]);
await writeFile(out+'/verification.json',JSON.stringify(records,null,2));console.log(JSON.stringify({mobile,profile,mode,room,passed:true}));
}
if(mode==='prototype'){
for(const room of ['living','bedroom','lounge','office']){await page.evaluate(room=>roomReview.setRoom(room),room);assert.deepEqual(await page.evaluate(()=>roomAmbience.get()),retained[room]);}
await page.locator('#change-fabric').click();assert.equal(await page.locator('#fabric-dialog').isVisible(),true);await page.keyboard.press('Escape');assert.equal(await page.locator('#fabric-dialog').isVisible(),false);
if(!mobile){await page.emulateMedia({reducedMotion:'no-preference'});await page.evaluate(()=>roomReview.startMotion(1));await page.waitForFunction(()=>roomProof.motion.done);await page.evaluate(()=>roomReview.startMotion(0));await page.waitForFunction(()=>roomProof.motion.done);const motions=await page.evaluate(()=>roomProof.motionRuns.slice(-2));assert.ok(motions.every(m=>m.frames>3),'Animated motion did not run');}
await page.evaluate(async()=>{await Promise.all([roomReview.setRoom('bedroom'),roomReview.setRoom('lounge'),roomReview.setRoom('office')]);});assert.equal(await page.evaluate(()=>roomProof.room),'office');
assert.deepEqual(errors,[]);
await writeFile(out+'/ui-'+(mobile?'mobile':'desktop')+'-'+profile+'.json',JSON.stringify({retained,rapidRoomSwitch:true,fabricDialog:true,animatedMotion:!mobile,errors},null,2));
}
await context.close();
}}finally{await browser.close();}
