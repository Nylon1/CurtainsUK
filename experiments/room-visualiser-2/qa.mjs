import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=resolve(process.env.ROOM_V2_EVIDENCE||'artifacts/room-visualiser-v1/living-v2');await mkdir(out,{recursive:true});
const gpu=process.env.ROOM_V2_GPU||'d3d11';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH,args:['--enable-webgl','--use-gl=angle',`--use-angle=${gpu}`,...(gpu==='swiftshader'?['--enable-unsafe-swiftshader']:[])]});
const results=[];
try{
for(const mode of ['baseline','prototype'])for(const mobile of [false,true])for(const [profile,id] of [['STANDARD','sdg-f1541-01'],['FIXED140','pt-1204-212']]){
  const name=`${mode}-${mobile?'mobile':'desktop'}-${profile}`,context=await browser.newContext({viewport:{width:mobile?390:1440,height:mobile?844:1000},deviceScaleFactor:mobile?2:1,isMobile:mobile,hasTouch:mobile,recordVideo:mode==='prototype'&&!mobile&&profile==='STANDARD'?{dir:out,size:{width:1280,height:900}}:undefined});
  const page=await context.newPage(),errors=[],bad=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('response',r=>{if(r.status()>=400)bad.push([r.status(),r.url()]);});
  const begin=Date.now();await page.goto(`http://127.0.0.1:4382/?mode=${mode}&fabric=${id}`);
  await page.waitForFunction(()=>window.roomProof?.ready,null,{timeout:90000});
  const initial=await page.evaluate(()=>structuredClone(roomProof)),wallReadyMs=Date.now()-begin;
  const snap=async suffix=>{await page.locator('#room-canvas').screenshot({path:resolve(out,`${name}-${suffix}.png`)});};
  const hashes=await page.evaluate(()=>roomReview.hashes());
  await snap('room-closed');
  await page.evaluate(()=>roomReview.startMotion(1));await page.waitForFunction(()=>roomProof.motion?.done,null,{timeout:15000});await snap('room-open');
  await page.evaluate(()=>roomReview.startMotion(0));await page.waitForFunction(()=>roomProof.motion?.done,null,{timeout:15000});
  const endpointHashes=await page.evaluate(()=>roomReview.hashes());assert.deepEqual(endpointHashes,hashes);
  for(const view of profile==='FIXED140'?['curtain','full']:['curtain']){
    await page.evaluate(view=>roomReview.setView(view),view);await snap(view+'-closed');
    await page.evaluate(()=>roomReview.setProgress(.5));await snap(view+'-half');
    await page.evaluate(()=>roomReview.setProgress(1));await snap(view+'-open');
    await page.evaluate(()=>roomReview.setProgress(0));
  }
  await page.evaluate(()=>roomReview.setView('room'));
  let prototypeChecks=null;
  if(mode==='prototype'){
    await page.locator('[data-ambience="evening"]').click();await page.waitForTimeout(900);await snap('evening-off');
    await page.locator('[data-toggle="fire"]').click();await page.waitForTimeout(900);await snap('evening-fire');
    await page.locator('[data-toggle="lamps"]').click();await page.waitForTimeout(900);await snap('evening-fire-lamps');
    await page.evaluate(()=>roomReview.startMotion(1));await page.waitForFunction(()=>roomProof.motion?.done,null,{timeout:15000});
    await page.evaluate(()=>roomReview.setProgress(.5));
    await page.locator('[data-ambience="inspection"]').click();await page.waitForTimeout(900);await snap('inspection');
    const before=await page.evaluate(()=>roomReview.hashes());
    await page.evaluate(()=>roomReview.setColour('WALL_MATERIAL',2));
    await page.evaluate(()=>roomReview.setRoom('bedroom'));await page.evaluate(()=>roomReview.setRoom('living'));
    assert.equal(await page.evaluate(()=>roomProof.colours.WALL_MATERIAL),2);
    assert.deepEqual(await page.evaluate(()=>roomReview.hashes()),before);
    assert.deepEqual(await page.evaluate(()=>roomAmbience.get()),{mode:'inspection',lamps:true,fire:true});
    const swap=async fabric=>page.evaluate(async fabric=>{const response=await fetch('/apps/curtainsuk-decision/catalog?view=retail&visualiser=1&fabric='+fabric);const {fabric:record}=await response.json();await visualiserCustomer.selectRecord(record);},fabric);
    await swap(profile==='STANDARD'?'sdg-ddvc237020':'sdg-f1239-30');
    assert.equal(await page.evaluate(()=>roomProof.colours.WALL_MATERIAL),2);
    assert.equal(await page.evaluate(()=>roomProof.motion.progress),.5);
    await snap('plain-profile-switch');
    await swap(id);assert.equal(await page.evaluate(()=>roomProof.colours.WALL_MATERIAL),2);
    prototypeChecks={paletteRetained:true,ambienceRetained:true,profileSwitchPositionRetained:true,hashesRetained:true};
    await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>{roomAmbience.set('mode','evening');roomReview.startMotion(0)});
    assert.equal(await page.evaluate(()=>roomProof.motion.done),true);await page.emulateMedia({reducedMotion:'no-preference'});
    await page.screenshot({path:resolve(out,`${name}-ui.png`),fullPage:false});
  }
  const final=await page.evaluate(()=>structuredClone(roomProof));
  const result={name,mode,profile,mobile,physicalDevice:false,wallReadyMs,initial,final,hashes,prototypeChecks,errors,bad};results.push(result);
  await writeFile(resolve(out,'qa-results.json'),JSON.stringify(results,null,2));
  console.log(JSON.stringify({name,wallReadyMs,viewerMs:initial.firstRenderMs,gpu:initial.gpu,errors:errors.length,bad:bad.length,draw:initial.draw,motion:final.motionRuns.map(r=>r.meanFps)}));
  assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);await context.close();
}
}finally{await browser.close();}
