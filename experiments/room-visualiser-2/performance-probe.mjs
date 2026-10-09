import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)('C:/Users/hamza/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const mode=process.argv[2]||'prototype',extra=process.argv[3]||'',name=process.argv[4]||mode,trace=process.argv.includes('--trace');
const out='C:/Users/hamza/curtainsuk-visualiser-2-performance-evidence-20261009';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--enable-webgl','--use-gl=angle','--use-angle=d3d11','--disable-gpu-shader-disk-cache']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 if(trace)await page.addInitScript(()=>{window.glTrace=[];window.glPrograms=[];const ids=new WeakMap();let id=0,active=0;
  const proto=WebGL2RenderingContext.prototype;
  for(const method of ['createProgram','attachShader','compileShader','linkProgram','getProgramParameter','useProgram','drawElements','drawArrays','drawElementsInstanced','finish']){const original=proto[method];proto[method]=function(...args){const t=performance.now(),r=original.apply(this,args);if(method==='createProgram')ids.set(r,++id);if(method==='useProgram')active=ids.get(args[0]);if(method==='linkProgram'){const shaders=this.getAttachedShaders(args[0]);window.glPrograms.push({id:ids.get(args[0]),source:shaders.map(s=>this.getShaderSource(s))});}const ms=performance.now()-t;if(ms>1)glTrace.push({method,id:ids.get(args[0])||active,ms,at:t});return r;};}
 });
 await page.goto('http://127.0.0.1:4382/?mode='+mode+'&fabric=sdg-f1541-01'+extra);await page.waitForFunction(()=>window.roomProof?.ready,null,{timeout:120000});
 const startup=await page.evaluate(()=>({viewerMs:roomProof.firstRenderMs,navMs:roomProof.navigationToReadyMs,renders:roomProof.renders.slice(),explicitCompileMs:roomProof.explicitCompileMs,prototype:roomProof.prototype,programs:roomRefinement.renderer.info.programs.length,gpu:roomProof.gpu,resources:performance.getEntriesByType('resource').map(r=>({name:r.name,duration:r.duration,download:r.responseEnd-r.responseStart,transfer:r.transferSize})),trace:window.glTrace,shaderSources:window.glPrograms}));
 const first={};for(const [label,key,value]of [['evening','mode','evening'],['lamps','lamps',true],['fire','fire',true]]){if(mode==='baseline')break;first[label]=await page.evaluate(({key,value})=>{if(window.glTrace)window.glTrace=[];const renderer=roomRefinement.renderer,before=renderer.info.programs.length,t=performance.now();roomAmbience.set(key,value);renderer.getContext().finish();return{ms:performance.now()-t,programsBefore:before,programsAfter:renderer.info.programs.length,trace:window.glTrace};},{key,value});}
 await page.waitForTimeout(900);await page.locator('#room-canvas').screenshot({path:out+'/'+name+'-fireplace.png'});
 if(mode!=='baseline'){await page.evaluate(()=>{roomAmbience.set('lamps',false);roomAmbience.set('fire',false);roomAmbience.set('mode','daylight');});await page.waitForTimeout(900);await page.locator('#room-canvas').screenshot({path:out+'/'+name+'-daylight.png'});}
 const result={mode,extra,startup,first,errors};await writeFile(out+'/'+name+'.json',JSON.stringify(result,null,2));console.log(JSON.stringify({mode,extra,viewerMs:startup.viewerMs,navMs:startup.navMs,draw:startup.renders[0],compile:startup.explicitCompileMs,programs:startup.programs,first,errors}));
}finally{await browser.close();}
