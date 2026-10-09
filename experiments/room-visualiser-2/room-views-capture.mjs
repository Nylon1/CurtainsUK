import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('C:/Users/hamza/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out='C:/Users/hamza/curtainsuk-visualiser-2-room-views-evidence-20261009',results=[];
const files={living:'user-garden.jpg',bedroom:'bedroom-view.jpg',lounge:'lounge-garden.jpg',office:'office-garden.jpg'};
const b=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--enable-webgl','--use-gl=angle','--use-angle=d3d11']});
try{for(const mobile of [false,true])for(const profile of ['STANDARD','FIXED140']){
 const p=await b.newPage({viewport:{width:mobile?390:1440,height:mobile?844:1000},deviceScaleFactor:mobile?2:1,isMobile:mobile,hasTouch:mobile,reducedMotion:'reduce'}),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await p.goto('http://127.0.0.1:4382/?room=living&fabric='+(profile==='STANDARD'?'sdg-f1541-01':'pt-1204-212'));await p.waitForFunction(()=>window.roomProof?.ready,null,{timeout:120000});
 for(const room of ['living','bedroom','lounge','office']){if(room!=='living')await p.evaluate(room=>roomReview.setRoom(room),room);
  const actual=await p.evaluate(()=>roomRefinement.scene.getObjectByName('PVC window and garden').children.find(o=>o.visible).children.find(o=>o.material?.name==='User garden photograph').material.map.image.src);assert.ok(actual.endsWith(files[room]));
  for(const mode of ['daylight','daylight-closed','evening','inspection',...(room==='living'?['fireplace']:[])]){
   await p.evaluate(mode=>{roomReview.setProgress(mode==='daylight-closed'?0:1);roomAmbience.set('mode',mode==='fireplace'?'evening':mode==='daylight-closed'?'daylight':mode);roomAmbience.set('lamps',!mode.startsWith('daylight'));if(roomProof.room==='living')roomAmbience.set('fire',mode==='fireplace');},mode);
   await p.locator('#room-canvas').screenshot({path:out+'/'+room+'-'+(mobile?'mobile':'desktop')+'-'+profile+'-'+mode+'.png'});
  }
  if(!mobile&&room==='bedroom'){await p.evaluate(()=>roomAmbience.set('mode','daylight'));await p.locator('[data-view="curtain"]').click();await p.locator('#room-canvas').screenshot({path:out+'/bedroom-'+profile+'-detail.png'});await p.locator('[data-view="room"]').click();}
 }
 // Visit again to verify that cached maps stay associated with their own room.
 for(const room of ['office','lounge','bedroom','living']){await p.evaluate(room=>roomReview.setRoom(room),room);assert.ok(await p.evaluate(file=>roomRefinement.scene.getObjectByName('PVC window and garden').children.find(o=>o.visible).children.find(o=>o.material?.name==='User garden photograph').material.map.image.src.endsWith(file),files[room]));}
 const requests=await p.evaluate(()=>performance.getEntriesByType('resource').filter(r=>r.name.includes('/assets/window/')).map(r=>r.name));assert.equal(requests.length,4);assert.equal(new Set(requests).size,4);assert.deepEqual(errors,[]);
 results.push({mobile,profile,correctRoomPhotos:true,retainedAfterSwitch:true,oneRequestPerPhoto:true,requests,errors});await writeFile(out+'/capture-verification.json',JSON.stringify(results,null,2));console.log(JSON.stringify({mobile,profile,passed:true}));await p.close();
}}finally{await b.close();}
