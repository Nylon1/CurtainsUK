import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/hamza/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const sharp=require('C:/Users/hamza/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const compareOriginal=process.argv.includes('--original');
const out='C:/Users/hamza/curtainsuk-visualiser-2-fabric-efficiency-evidence-20261009'+(compareOriginal?'/original-comparison':'');
await mkdir(out,{recursive:true});
const source=await readFile('experiments/room-visualiser-2/fabric-detail.mjs','utf8');
await writeFile(out+'/fabric-detail-before.mjs',source);
const start=source.indexOf('        vec2 yarnPhase='),end=source.indexOf('\n      `);',start);
assert.ok(start>0&&end>start);
const code=source.slice(start,end);
const derivative='        vec3 surfaceDx=dFdx(-vViewPosition),surfaceDy=dFdy(-vViewPosition);';
assert.equal(code.split(derivative).length,2);
const candidate=source.slice(0,start)+derivative+'\n        if(yarnVisibility>0.0){\n'+code.replace(derivative+'\n','')+'\n        }else{\n          normal=normalize(normal);\n        }'+source.slice(end);
await writeFile(out+'/fabric-detail-candidate.mjs',candidate);
const results=[];
const median=values=>{const s=values.toSorted((a,b)=>a-b);return s.length%2?s[(s.length-1)/2]:(s[s.length/2-1]+s[s.length/2])/2;};
for(const mobile of [false,true])for(const profile of ['STANDARD','FIXED140']){
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--enable-webgl','--use-gl=angle','--use-angle=d3d11','--disable-gpu-shader-disk-cache']});
 try{for(const [repeat,order]of [['before','candidate'],['candidate','before'],['before','candidate']].entries())for(const version of order){
  const p=await browser.newPage({viewport:{width:mobile?390:1440,height:mobile?844:1000},deviceScaleFactor:mobile?2:1,isMobile:mobile,hasTouch:mobile,reducedMotion:'reduce'}),errors=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await p.route('**/experiment/fabric-detail.mjs',route=>route.fulfill({status:200,contentType:'text/javascript',body:version==='before'||compareOriginal?source:candidate}));
  await p.goto('http://127.0.0.1:4382/?room=living&fabric='+(profile==='STANDARD'?'sdg-f1541-01':'pt-1204-212')+(mobile?'&compareDpr=1.25':'')+(compareOriginal&&version==='before'?'&fabricDetail=previous':''));
  await p.waitForFunction(()=>window.roomProof?.ready,null,{timeout:120000});
  await p.evaluate(()=>{roomReview.setProgress(0);roomAmbience.set('mode','inspection');});
  const snapshots=[];
  if(repeat===0)for(const view of ['room','curtain']){
   await p.locator('[data-view="'+view+'"]').click();
   const filename=`${profile}-${mobile?'mobile':'desktop'}-${version}-${view}.png`;
   await p.locator('#room-canvas').screenshot({path:out+'/'+filename});
   snapshots.push(filename);
  }
  await p.locator('[data-view="room"]').click();await p.evaluate(()=>roomAmbience.set('mode','daylight'));await p.waitForTimeout(250);
  const measurements=await p.evaluate(async()=>{
   const {renderer,pipeline}=roomRefinement,gl=renderer.getContext(),ext=gl.getExtension('EXT_disjoint_timer_query_webgl2');
   if(!ext)throw Error('GPU timer unavailable');
   const canvas=document.querySelector('canvas'),w=canvas.clientWidth;
   const samples=[];
   // Timed batches avoid treating one idle frame as sustained rendering cost.
   for(let i=0;i<24;i++){
    const q=gl.createQuery();gl.beginQuery(ext.TIME_ELAPSED_EXT,q);
    for(let frame=0;frame<3;frame++){renderer.shadowMap.needsUpdate=true;pipeline.render(w,w/1.6);}
    gl.endQuery(ext.TIME_ELAPSED_EXT);gl.flush();
    let result;
    for(let n=0;n<100;n++){
     await new Promise(r=>setTimeout(r,5));
     if(gl.getQueryParameter(q,gl.QUERY_RESULT_AVAILABLE)){result={ms:gl.getQueryParameter(q,gl.QUERY_RESULT)/3e6,disjoint:gl.getParameter(ext.GPU_DISJOINT_EXT)};break;}
    }
    gl.deleteQuery(q);if(!result)throw Error('GPU timer timeout');if(i>=4&&!result.disjoint)samples.push(result.ms);
   }
   return{samples,programs:renderer.info.programs.length,draw:roomProof.draw,gpu:roomProof.gpu,dpr:renderer.getPixelRatio(),firstRenderMs:roomProof.firstRenderMs,navigationMs:roomProof.navigationToReadyMs};
  });
  assert.deepEqual(errors,[]);assert.equal(measurements.samples.length,20);
  results.push({comparison:compareOriginal?'original-vs-retained-detail':'retained-detail-vs-conditional-candidate',mobile,profile,repeat,version,...measurements,medianMs:median(measurements.samples),snapshots,errors});
  await writeFile(out+'/probe.json',JSON.stringify(results,null,2));
  console.log(JSON.stringify({mobile,profile,repeat,version,medianMs:median(measurements.samples)}));await p.close();
 }}finally{await browser.close();}
}
const comparisons=[];
for(const mobile of [false,true])for(const profile of ['STANDARD','FIXED140']){
 const performance={};for(const version of ['before','candidate'])performance[version]=median(results.filter(r=>r.mobile===mobile&&r.profile===profile&&r.version===version).map(r=>r.medianMs));
 for(const view of ['room','curtain']){
  const prefix=`${profile}-${mobile?'mobile':'desktop'}`;
  const a=await sharp(out+'/'+prefix+'-before-'+view+'.png').raw().toBuffer({resolveWithObject:true}),b=await sharp(out+'/'+prefix+'-candidate-'+view+'.png').raw().toBuffer({resolveWithObject:true});
  assert.deepEqual(a.info,b.info);let absolute=0,max=0,overOne=0;
  for(let i=0;i<a.data.length;i++){const d=Math.abs(a.data[i]-b.data[i]);absolute+=d;max=Math.max(max,d);if(d>1)overOne++;}
  comparisons.push({mobile,profile,view,performance,pixelDifference:{meanChannel:absolute/a.data.length,maxChannel:max,overOneFraction:overOne/a.data.length}});
 }
}
await writeFile(out+'/probe-summary.json',JSON.stringify(comparisons,null,2));console.log(JSON.stringify(comparisons));
