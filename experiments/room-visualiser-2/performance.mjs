// Recording-free comparison. Viewport emulation does not emulate a mobile GPU.
import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH,args:['--enable-webgl','--use-gl=angle','--use-angle=d3d11']});
const records=[];
try{
for(const mobile of [false,true])for(const [profile,id] of [['STANDARD','sdg-f1541-01'],['FIXED140','pt-1204-212']])for(const mode of ['baseline','prototype']){
  const context=await browser.newContext({viewport:{width:mobile?390:1440,height:mobile?844:1000},deviceScaleFactor:mobile?2:1,isMobile:mobile,hasTouch:mobile}),page=await context.newPage();
  await page.goto(`http://127.0.0.1:4382/?mode=${mode}&fabric=${id}`);await page.waitForFunction(()=>window.roomProof?.ready,null,{timeout:90000});
  const initial=await page.evaluate(()=>structuredClone(roomProof));
  for(const target of [1,0,1,0]){await page.evaluate(t=>roomReview.startMotion(t),target);await page.waitForFunction(()=>roomProof.motion?.done,null,{timeout:15000});}
  let stability=[];
  if(mode==='prototype'){
    await page.evaluate(()=>{roomAmbience.set('mode','evening');roomAmbience.set('fire',true);roomAmbience.set('lamps',true)});await page.waitForTimeout(800);
    for(const target of [1,0]){await page.evaluate(t=>roomReview.startMotion(t),target);await page.waitForFunction(()=>roomProof.motion?.done,null,{timeout:15000});}
    if(!mobile&&profile==='FIXED140')for(let i=0;i<6;i++){
      await page.evaluate(()=>roomReview.setRoom('bedroom'));await page.evaluate(()=>roomReview.setRoom('living'));
      stability.push(await page.evaluate(()=>({objects:roomProof.gpuObjects,errors:roomProof.errors,state:roomAmbience.get()})));
    }
  }
  records.push({mode,mobile,profile,initial,final:await page.evaluate(()=>structuredClone(roomProof)),stability});
  await writeFile(resolve(process.env.ROOM_V2_EVIDENCE,'performance.json'),JSON.stringify(records,null,2));
  console.log(JSON.stringify({mode,mobile,profile,firstRenderMs:initial.firstRenderMs,fps:records.at(-1).final.motionRuns.map(r=>r.meanFps)}));await context.close();
}
}finally{await browser.close();}
