import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)('C:/Users/hamza/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out='C:/Users/hamza/curtainsuk-visualiser-2-window-evidence-20261009';
const b=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--enable-webgl','--use-gl=angle','--use-angle=d3d11']});
try{for(const profile of ['STANDARD','FIXED140']){
 const p=await b.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await p.goto('http://127.0.0.1:4382/?room=living&fabric='+(profile==='STANDARD'?'sdg-f1541-01':'pt-1204-212'));await p.waitForFunction(()=>window.roomProof?.ready,null,{timeout:120000});await p.evaluate(()=>roomReview.setProgress(1));
 for(const [mode,view]of [['daylight','room'],['daylight','curtain'],['evening','room'],['inspection','room']]){await p.evaluate(mode=>{roomAmbience.set('mode',mode);roomAmbience.set('lamps',mode!=='daylight');},mode);await p.locator('[data-view="'+view+'"]').click();await p.locator('#room-canvas').screenshot({path:out+'/preview-'+profile+'-'+mode+'-'+view+'.png'});}
 const data=await p.evaluate(()=>({ready:roomProof.ready,viewerMs:roomProof.firstRenderMs,navMs:roomProof.navigationToReadyMs,setup:roomProof.prototype.setupMs,preparation:roomProof.prototype.preparation,draw:roomProof.draw,window:roomRefinement.scene.getObjectByName('PVC window and garden').children.map(o=>({name:o.name,visible:o.visible,detail:o.userData}))}));console.log(JSON.stringify({profile,...data,errors}));await writeFile(out+'/preview-'+profile+'.json',JSON.stringify({...data,errors},null,2));await p.close();
}}finally{await b.close();}
