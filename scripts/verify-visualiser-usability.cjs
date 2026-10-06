// Read-only UI regression on the real Shopify page (or a same-origin local host).
const {execFileSync}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const binary=path.join(process.env.APPDATA,'npm/node_modules/agent-browser/bin/agent-browser-win32-x64.exe');
const url=process.argv[2]||'https://www.curtainsuk.com/pages/room-visualiser';
const out=path.resolve(process.env.VISUALISER_EVIDENCE_DIR||'artifacts/room-visualiser-v1/usability');fs.mkdirSync(out,{recursive:true});
const report={url,at:new Date().toISOString(),device:'Chromium desktop/narrow viewport, not physical iPhone Safari',runs:[]};
for(const [label,width,height] of [['desktop',1440,1050],['mobile',390,844]]){
 const session=`cuk-usability-${label}-${process.pid}`;
 function run(args,input){let output;try{output=execFileSync(binary,['--session',session,'--json',...args],{encoding:'utf8',input,timeout:20000,maxBuffer:8e6});}catch(e){if(!e.stdout?.trim().startsWith('{'))throw e;output=e.stdout;}const value=JSON.parse(output);assert.ok(value.success,value.error);return value.data;}
 const raw=code=>run(['eval','--stdin'],code).result;
 const ev=code=>raw(`document.querySelector('[data-room-frame]').contentWindow.eval(${JSON.stringify(code)})`);
 const until=condition=>{const end=Date.now()+45000;while(Date.now()<end){if(raw(condition))return;Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,100);}throw Error('Timeout: '+condition);};
 const shot=name=>run(['screenshot',path.join(out,`${label}-${name}.png`)]);
 function scrollToControl(selector){
  raw(`(()=>{const f=document.querySelector('[data-room-frame]'),d=f.contentDocument,v=d.querySelector('.scene-viewport'),el=d.querySelector(${JSON.stringify(selector)});const top=document.querySelector('.section-header')?.getBoundingClientRect().bottom||0;scrollBy({top:f.getBoundingClientRect().top+el.getBoundingClientRect().top-top-${label==='mobile'?'v.offsetHeight':'0'}-24,behavior:'instant'});})()`);
  until(`(()=>{const f=document.querySelector('[data-room-frame]');return Math.abs(parseFloat(f.contentDocument.documentElement.style.getPropertyValue('--room-sticky-top'))-Math.max(0,(document.querySelector('.section-header')?.getBoundingClientRect().bottom||0)-f.getBoundingClientRect().top))<2})()`);
 }
 function tappable(selector){return raw(`(()=>{const f=document.querySelector('[data-room-frame]'),el=f.contentDocument.querySelector(${JSON.stringify(selector)}),r=el.getBoundingClientRect(),fr=f.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;return {visible:fr.top+y>0&&fr.top+y<innerHeight&&document.elementFromPoint(fr.left+x,fr.top+y)===f,hit:el.contains(f.contentDocument.elementFromPoint(x,y))};})()`);}
 try{
  run(['set','viewport',String(width),String(height)]);run(['open',url]);
  raw(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Decline')?.click()`);
  until(`document.querySelector('[data-room-frame]')?.contentWindow.roomProof?.ready&&document.querySelector('[data-room-frame]').contentWindow.visualiserCustomer?.proof.ready`);
  const before=ev('(async()=>({hashes:await roomReview.hashes(),geometry:roomProof.curtain.geometryId,firstRenderMs:roomProof.loading.initial.navigationToReadyMs,gpu:roomProof.gpuObjects,camera:roomProof.camera}))()');
  const expected=ev(`(async()=>{const {ROOMS,PALETTES}=await import('./catalog.mjs');const expected={};for(const [i,r] of ROOMS.entries()){await roomReview.setRoom(r.id);for(const [key,z] of Object.entries(r.zones))roomReview.setColour(key,(i+z.initial+2)%PALETTES[z.palette].length);expected[r.id]=structuredClone(roomProof.colours);}return expected;})()`);
  ev('roomReview.setView("curtain");roomReview.setProgress(.37)');
  for(let round=0;round<3;round++)for(const id of ['bedroom','living','office','lounge']){
   const state=ev(`(async()=>{await roomReview.setRoom('${id}');return {room:roomProof.room,colours:roomProof.colours,view:roomProof.view,progress:roomProof.curtain.progress,materials:roomProof.roomMaterials};})()`);
   assert.equal(state.room,id);assert.deepEqual(state.colours,expected[id]);assert.equal(state.view,'curtain');assert.equal(state.progress,.37);
   assert.equal(ev(`(async()=>{const {colourFor}=await import('./catalog.mjs');return Object.entries(roomProof.colours).every(([key,index])=>roomProof.roomMaterials[key]===colourFor(roomProof.room,key,index).slice(1));})()`),true);
  }
  for(const id of ['sdg-f1239-30','sdg-f1541-01']){
   ev(`(async()=>{const {resolveFabric}=await import('./catalogue-client.mjs');await visualiserCustomer.selectRecord(await resolveFabric('${id}'));})()`);
   assert.deepEqual(ev('roomProof.colours'),expected.lounge);
  }
  ev('roomReview.setView("room");roomReview.setProgress(0);roomReview.startMotion(1)');
  until(`!document.querySelector('[data-room-frame]').contentWindow.roomProof.motion.running`);
  ev('roomReview.startMotion(0)');until(`!document.querySelector('[data-room-frame]').contentWindow.roomProof.motion.running`);
  assert.deepEqual(ev('roomProof.colours'),expected.lounge);
  assert.deepEqual(ev('roomReview.hashes()'),before.hashes);assert.equal(ev('roomProof.curtain.geometryId'),before.geometry);
  for(const selector of ['#change-fabric','#selected-sample','#selected-make','[data-zone="CUSHION_UPHOLSTERY"] button','#reset']){
   scrollToControl(selector);assert.deepEqual(tappable(selector),{visible:true,hit:true},selector);
   if(selector==='#change-fabric'){
    ev('document.querySelector("#change-fabric").click()');until(`document.querySelector('[data-room-frame]').contentDocument.querySelector('dialog').open`);
    until(`(()=>{const f=document.querySelector('[data-room-frame]'),r=f.contentDocument.querySelector('dialog').getBoundingClientRect();return f.getBoundingClientRect().top+r.top>=0&&f.getBoundingClientRect().top+r.bottom<=innerHeight+2})()`);
    shot('fabric-drawer');ev('document.querySelector("#close-fabric-dialog").click()');
   }
  }
  scrollToControl('[data-zone="CUSHION_UPHOLSTERY"] button');
  if(label==='mobile')for(const pose of ['1','0']){
   assert.deepEqual(tappable(`[data-pose="${pose}"]`),{visible:true,hit:true},'Sticky curtain action');
   ev(`document.querySelector('[data-pose="${pose}"]').click()`);
   until(`!document.querySelector('[data-room-frame]').contentWindow.roomProof.motion.running`);
   assert.deepEqual(ev('roomProof.colours'),expected.lounge);
  }
  shot('sticky-palette');
  const renders=ev('roomProof.renders.length');raw('scrollBy({top:40,behavior:"instant"})');
  assert.equal(ev('roomProof.renders.length'),renders,'Scrolling alone must not render/rebuild the scene');
  const aspect=ev('(()=>{const r=document.querySelector("canvas").getBoundingClientRect();return r.width/r.height})()');assert.ok(Math.abs(aspect-1.6)<.002);
  // Reset one room only, then revisit all rooms to verify the others survived.
  ev('document.querySelector("#reset").click()');
  for(const id of ['living','bedroom','office']){ev(`roomReview.setRoom('${id}')`);assert.deepEqual(ev('roomProof.colours'),expected[id]);}
  scrollToControl('#reset');shot('office-retained');
  raw(`(()=>{const f=document.querySelector('[data-room-frame]'),r=f.contentDocument.querySelector('#colour-guide').getBoundingClientRect();scrollBy({top:f.getBoundingClientRect().top+r.top-150,behavior:'instant'});})()`);
  until(`(()=>{const f=document.querySelector('[data-room-frame]'),r=f.contentDocument.querySelector('.stage').getBoundingClientRect();return f.getBoundingClientRect().top+r.bottom<160;})()`);shot('sticky-released');
  assert.equal(ev('document.documentElement.scrollWidth>innerWidth'),false);assert.deepEqual(ev('roomProof.errors'),[]);
  const result=ev('({firstRenderMs:roomProof.loading.initial.navigationToReadyMs,switches:roomProof.switches,motion:roomProof.motionRuns,gpu:roomProof.gpuObjects,errors:roomProof.errors})');
  report.runs.push({label,before,result,status:'PASS'});fs.writeFileSync(path.join(out,'usability.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({label,status:'PASS',firstRenderMs:result.firstRenderMs,motion:result.motion}));
 }catch(error){shot('failure');throw error;}finally{run(['close']);}
}
