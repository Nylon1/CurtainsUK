import {createRequire} from 'node:module';import {writeFile} from 'node:fs/promises';import assert from 'node:assert/strict';
const{chromium}=createRequire(import.meta.url)('C:/Users/hamza/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'),out='C:/Users/hamza/curtainsuk-visualiser-2-four-rooms-evidence-20261009';
const b=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--enable-webgl','--use-gl=angle','--use-angle=d3d11']});const results=[];
try{for(const mobile of [false,true]){const p=await b.newPage({viewport:{width:mobile?390:1440,height:mobile?844:1000},deviceScaleFactor:mobile?2:1,isMobile:mobile,hasTouch:mobile,reducedMotion:'reduce'}),errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto('http://127.0.0.1:4382/?room=bedroom&fabric=sdg-f1541-01');await p.waitForFunction(()=>window.roomProof?.ready,null,{timeout:120000});
const states={living:{mode:'evening',lamps:true,fire:true},bedroom:{mode:'daylight',lamps:false,fire:false},lounge:{mode:'evening',lamps:false,fire:false},office:{mode:'inspection',lamps:true,fire:false}};
for(const [room,state]of Object.entries(states)){await p.evaluate(async({room,state})=>{await roomReview.setRoom(room);for(const[key,value]of Object.entries(state))roomAmbience.set(key,value);},{room,state});}
const routing=[];for(const fabric of ['pt-1204-212','sdg-f1541-01']){
const route=await p.evaluate(async fabric=>{const {resolveFabric}=await import('/runtime/rooms/catalogue-client.mjs');const record=await resolveFabric(fabric);const applied=await visualiserCustomer.selectRecord(record);return{applied:applied!==false,fabric:visualiserCustomer.selectedRecord.id,profile:roomProof.rendererProfile,errors:roomProof.errors};},fabric);
assert.equal(route.applied,true);assert.equal(route.fabric,fabric);assert.equal(route.profile,fabric.startsWith('pt-')?'FIXED140_SINGLE_WIDTH_V1':'STANDARD');routing.push(route);
for(const [room,state]of Object.entries(states)){await p.evaluate(room=>roomReview.setRoom(room),room);assert.deepEqual(await p.evaluate(()=>roomAmbience.get()),state);}
}
// Keep distinct stored states through an actual staggered room-loading race.
await p.evaluate(async()=>{const first=roomReview.setRoom('bedroom');await new Promise(r=>setTimeout(r,10));const second=roomReview.setRoom('lounge');await new Promise(r=>setTimeout(r,10));const third=roomReview.setRoom('office');await Promise.all([first,second,third]);});assert.equal(await p.evaluate(()=>roomProof.room),'office');assert.deepEqual(await p.evaluate(()=>roomAmbience.get()),states.office);
await p.locator('#change-fabric').click();await p.waitForFunction(()=>document.querySelector('#fabric-dialog')?.open);await p.keyboard.press('Escape');assert.equal(await p.locator('#fabric-dialog').isVisible(),false);
await p.locator('[data-ambience="daylight"]').focus();await p.keyboard.press('Enter');assert.equal(await p.evaluate(()=>roomAmbience.get().mode),'daylight');
await p.screenshot({path:out+'/interface-'+(mobile?'mobile':'desktop')+'.png',fullPage:true});
await p.goto('http://127.0.0.1:4382/rooms-review');await p.waitForFunction(()=>[...document.querySelectorAll('article img')].length===4&&[...document.querySelectorAll('article img')].every(i=>i.complete&&i.naturalWidth>0));
for(const profile of ['STANDARD','FIXED140'])for(const viewport of ['desktop','mobile'])for(const lighting of ['daylight','evening','inspection']){await p.selectOption('#profile',profile);await p.selectOption('#viewport',viewport);await p.selectOption('#lighting',lighting);await p.waitForFunction(()=>[...document.querySelectorAll('article img')].every(i=>i.complete&&i.naturalWidth>0));}
await p.selectOption('#lighting','evening');await p.check('#fire');await p.waitForFunction(()=>document.querySelector('article[data-room="living"] img').src.endsWith('-fireplace.png'));
await p.locator('.preview').first().click();assert.equal(await p.locator('#zoom').isVisible(),true);await p.keyboard.press('Escape');assert.equal(await p.locator('#zoom').isVisible(),false);
assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
await p.selectOption('#profile','STANDARD');await p.selectOption('#viewport',mobile?'mobile':'desktop');await p.selectOption('#lighting','daylight');await p.screenshot({path:out+'/gallery-'+(mobile?'mobile':'desktop')+'.png',fullPage:true});
assert.deepEqual(errors,[]);results.push({mobile,routing,distinctRoomStates:true,staggeredRoomSwitch:true,keyboardControls:true,galleryImagesAndZoom:true,errors});await writeFile(out+'/interactions.json',JSON.stringify(results,null,2));console.log(JSON.stringify({mobile,passed:true}));await p.close();}}finally{await b.close();}
