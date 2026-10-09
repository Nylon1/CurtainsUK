import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('C:/Users/hamza/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out='C:/Users/hamza/curtainsuk-visualiser-2-window-evidence-20261009',results=[];
const b=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--enable-webgl','--use-gl=angle','--use-angle=d3d11']});
const loaded=p=>p.waitForFunction(()=>[...document.querySelectorAll('article img,[data-room-comparison],[data-window-comparison]')].every(i=>i.complete&&i.naturalWidth>0));
try{for(const mobile of [false,true]){
 const p=await b.newPage({viewport:{width:mobile?390:1440,height:mobile?844:1000},reducedMotion:'reduce'}),errors=[],httpErrors=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});p.on('response',r=>{if(r.status()>=400)httpErrors.push({status:r.status(),url:r.url()});});
 assert.equal((await p.goto('http://127.0.0.1:4382/rooms-review')).status(),200);assert.equal(await p.locator('article').count(),4);
 for(const detail of await p.locator('details').all())if(!(await detail.getAttribute('open')!==null))await detail.locator('summary').click();
 for(const profile of ['STANDARD','FIXED140'])for(const viewport of ['desktop','mobile'])for(const mode of ['daylight','daylight-closed','evening','inspection']){
  await p.selectOption('#profile',profile);await p.selectOption('#viewport',viewport);await p.selectOption('#lighting',mode==='daylight-closed'?'daylight':mode);if(mode.startsWith('daylight'))await p.selectOption('#pose',mode==='daylight-closed'?'closed':'open');
  for(const room of ['living','bedroom','lounge','office']){await p.selectOption('#window-room',room);await loaded(p);assert.equal(await p.locator('[data-window-comparison="before"]').getAttribute('src'),`window-before-${room}-${viewport}-${profile}-${mode}.png`);assert.equal(await p.locator('[data-window-comparison="after"]').getAttribute('src'),`${room}-${viewport}-${profile}-${mode}.png`);}
 }
 await p.selectOption('#window-room','living');await p.selectOption('#lighting','evening');await p.check('#fire');await loaded(p);for(const side of ['before','after'])assert.ok((await p.locator('[data-window-comparison="'+side+'"]').getAttribute('src')).endsWith('-fireplace.png'));
 for(const name of ['window before','window after','after Living Room','after Office','after Bedroom','after Lounge']){await p.locator('[aria-label="Enlarge '+name+'"]').click();assert.equal(await p.locator('#zoom').isVisible(),true);await p.keyboard.press('Escape');}
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
 await p.selectOption('#profile','STANDARD');await p.selectOption('#viewport',mobile?'mobile':'desktop');await p.selectOption('#lighting','daylight');await p.selectOption('#pose','open');await loaded(p);
 await p.screenshot({path:out+'/gallery-'+(mobile?'mobile':'desktop')+'.png',fullPage:true});
 const links=await p.locator('article .live').evaluateAll(nodes=>nodes.map(a=>a.href));assert.equal(links.length,4);assert.ok(links.every(l=>l.startsWith('http://127.0.0.1:4382/?room=')));
 await p.locator('article[data-room="living"] .live').click();await p.waitForFunction(()=>window.roomProof?.ready,null,{timeout:120000});assert.equal(await p.evaluate(()=>!!roomRefinement.scene.getObjectByName('PVC window and garden')),true);
 assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);results.push({mobile,status:200,fourRooms:true,allWindowComparisons:true,allGalleryImagesLoaded:true,fireplaceBeforeAfter:true,zoom:true,overflow:false,livingLinkReady:true,links,errors,httpErrors});await writeFile(out+'/gallery-verification.json',JSON.stringify(results,null,2));console.log(JSON.stringify({mobile,passed:true}));await p.close();
}}finally{await b.close();}
