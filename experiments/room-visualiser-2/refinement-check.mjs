import {createRequire} from 'node:module';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)('C:/Users/hamza/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out='C:/Users/hamza/curtainsuk-visualiser-2-refinement-evidence-20261008';await mkdir(out,{recursive:true});
let records=[];try{records=JSON.parse(await readFile(out+'/measurements.json','utf8'));}catch{}
for(const mobile of [false,true])for(const profile of ['STANDARD','FIXED140'])for(const mode of ['baseline','before','prototype'])for(let repeat=0;repeat<(!mobile&&profile==='STANDARD'?3:1);repeat++){
 if(records.some(r=>r.mobile===mobile&&r.profile===profile&&r.mode===mode&&r.repeat===repeat))continue;
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--enable-webgl','--use-gl=angle','--use-angle=d3d11','--disable-gpu-shader-disk-cache']});
 try{
 const context=await browser.newContext({viewport:{width:mobile?390:1440,height:mobile?844:1000},deviceScaleFactor:mobile?2:1,isMobile:mobile,hasTouch:mobile});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url())});
 await page.goto('http://127.0.0.1:4382/?mode='+mode+'&fabric='+(profile==='STANDARD'?'sdg-f1541-01':'pt-1204-212')+(mobile?'&compareDpr=1.25':''));await page.waitForFunction(()=>window.roomProof?.ready,null,{timeout:120000});
 const metrics=await page.evaluate(()=>({dpr:roomProof.comparisonPixelRatio,viewerMs:roomProof.firstRenderMs,navigationMs:roomProof.navigationToReadyMs,compileMs:roomProof.explicitCompileMs,renders:roomProof.renders.slice(),gpu:roomProof.gpu,objects:roomProof.gpuObjects,postprocessBytes:roomProof.postprocessEstimatedBytes,curtainBytes:roomProof.curtain.textureBytes,parse:roomProof.switches,prototype:roomProof.prototype,resources:performance.getEntriesByType('resource').map(r=>({name:r.name,duration:r.duration,downloadMs:r.responseEnd-r.responseStart,transfer:r.transferSize,decoded:r.decodedBodySize}))}));
 const hashes=await page.evaluate(()=>roomReview.hashes());
 await page.evaluate(()=>roomReview.startMotion(1));await page.waitForFunction(()=>roomProof.motion.done);await page.evaluate(()=>roomReview.startMotion(0));await page.waitForFunction(()=>roomProof.motion.done);const afterHashes=await page.evaluate(()=>roomReview.hashes());
 if(repeat===0&&mode!=='baseline')for(const [name,lighting,fire] of [['daylight','daylight',false],['evening','evening',false],['fireplace','evening',true],['inspection','inspection',true]]){
 await page.evaluate(({lighting,fire})=>{roomAmbience.set('mode',lighting);roomAmbience.set('fire',fire);roomAmbience.set('lamps',lighting==='evening')},{lighting,fire});await page.waitForTimeout(1100);
 await page.locator('#room-canvas').screenshot({path:out+'/'+mode+'-'+(mobile?'mobile':'desktop')+'-'+profile+'-'+name+'.png'});
 if(name==='daylight'){await page.evaluate(()=>roomReview.startMotion(1));await page.waitForFunction(()=>roomProof.motion.done);await page.locator('#room-canvas').screenshot({path:out+'/'+mode+'-'+(mobile?'mobile':'desktop')+'-'+profile+'-daylight-open.png'});await page.evaluate(()=>roomReview.startMotion(0));await page.waitForFunction(()=>roomProof.motion.done);}
 }
 const motion=await page.evaluate(()=>roomProof.motionRuns);records.push({mobile,profile,mode,repeat,metrics,hashes,afterHashes,motion,errors});await writeFile(out+'/measurements.json',JSON.stringify(records,null,2));console.log(JSON.stringify({mode,mobile,profile,repeat,viewerMs:metrics.viewerMs,compileMs:metrics.compileMs,firstDraw:metrics.renders[0],errors}));
 }catch(e){console.log('FAILED',mode,profile,e.message);throw e;}finally{await browser.close();}
}
