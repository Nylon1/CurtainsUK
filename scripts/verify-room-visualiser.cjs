// Read-only customer browser verification; never submits an order or edits catalogue data.
const {execFileSync}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const binary=path.join(process.env.APPDATA,'npm/node_modules/agent-browser/bin/agent-browser-win32-x64.exe');
const base=process.argv.find(a=>/^https?:/.test(a))||'http://127.0.0.1:4380/pages/room-visualiser';
const out=path.resolve(process.env.VISUALISER_EVIDENCE_DIR||'artifacts/room-visualiser-v1');fs.mkdirSync(out,{recursive:true});
const report={base,at:new Date().toISOString(),device:'Chromium desktop and narrow viewport; not physical Safari',runs:[]};
for(const [label,width,height] of [['desktop',1440,1050],['mobile',390,844]]){
 const session=`cuk-release-${label}-${process.pid}`;
 function run(args,input){let output;try{output=execFileSync(binary,['--session',session,'--json',...args],{encoding:'utf8',input,timeout:15000,maxBuffer:8e6});}catch(e){if(!e.stdout?.trim().startsWith('{'))throw e;output=e.stdout;}const data=JSON.parse(output);assert.ok(data.success,data.error);return data.data;}
 let framed=false; const rawEv=code=>run(['eval','--stdin'],code).result; const ev=code=>rawEv(framed ? `document.querySelector('iframe[id^=CurtainsUKVisualiser]').contentWindow.eval(${JSON.stringify(code)})` : code);
 const until=(condition)=>{const end=Date.now()+35000;while(Date.now()<end){if(ev(`Boolean(${condition})`))return;Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,150);}throw Error('Timed out: '+condition);};
 const shot=name=>run(['screenshot',path.join(out,`${label}-${name}.png`)]);
 try{
  run(['set','viewport',String(width),String(height)]);run(['open',base]);
  // The live Shopify customer page hosts the exact same scene in a same-origin frame.
  rawEv(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Decline')?.click()`); if(rawEv('!!document.querySelector("iframe[id^=CurtainsUKVisualiser]")')){run(['frame','iframe[id^=CurtainsUKVisualiser]']);framed=true;}
  until('window.visualiserCustomer?.proof.ready&&roomProof.ready');
  const state=ev('({initial:roomProof.loading.initial,geometry:roomProof.curtain.geometryId,bytes:roomProof.curtain.textureBytes,errors:roomProof.errors})');
  assert.equal(ev('roomProof.curtain.fabric'),'bergamot');assert.deepEqual(state.errors,[]);
  assert.equal(ev('document.documentElement.scrollWidth>innerWidth'),false);
  ev('document.querySelector("#visualiser").scrollIntoView({block:"start"})');shot('room');
  ev('roomReview.setColour("WALL_MATERIAL",2);roomReview.setColour("CUSHION_UPHOLSTERY",6);roomReview.setView("curtain");roomReview.setProgress(.37)');shot('curtain');
  const frozen=ev('(async()=>({hashes:await roomReview.hashes(),colours:structuredClone(roomProof.colours),progress:roomProof.curtain.progress}))()');
  const switches=[];
  for(const [query,id] of [['Shambala','pt-3697-770'],['Amalfi','sdg-f1239-30'],['Sabu Stripe','sdg-dstr237715'],['Bergamot','sdg-f1541-01']]){
   run(['click','#change-fabric']);until('!!window.CurtainsUKFabricBrowser');run(['fill','#visualiser-fabric-search',query]);run(['press','Enter']);
   until(`document.querySelector('[data-cuk-fabric-grid]').getAttribute('aria-busy')!=='true'&&!document.querySelector('[data-cuk-fabric-grid]').inert`);
   for(let page=0;page<4;page++){
    if(ev(`[...document.querySelectorAll('[data-cuk-view-fabric]')].some(a=>a.href.includes(${JSON.stringify(id)}))`))break;
    run(['click','[data-cuk-next]']);until(`document.querySelector('[data-cuk-fabric-grid]').getAttribute('aria-busy')!=='true'&&!document.querySelector('[data-cuk-fabric-grid]').inert`);
   }
   ev(`for(const c of document.querySelectorAll('.cuk-fabric')){const link=c.querySelector('[data-cuk-view-fabric]');if(link?.href.includes(${JSON.stringify(id)}))c.querySelector('[data-cuk-see-in-room]')?.setAttribute('data-test-select','true');}`);
   if(label==='mobile'&&query==='Shambala')shot('change-fabric');
   run(['click','[data-test-select]']);until(`visualiserCustomer.proof.selectedId===${JSON.stringify(id)}&&!document.querySelector('#fabric-dialog').open&&roomProof.ready`);
   assert.deepEqual(ev('(async()=>({hashes:await roomReview.hashes(),colours:structuredClone(roomProof.colours),progress:roomProof.curtain.progress}))()'),frozen);
   assert.equal(ev('roomProof.curtain.geometryId'),state.geometry);
   switches.push(ev('({id:roomProof.selectedFabric,ms:roomProof.lastFabricMs,gpu:roomProof.gpuObjects,textureBytes:roomProof.curtain.textureBytes})'));
  }
  const rooms=[];for(const room of ['bedroom','lounge','office','living']){ev(`roomReview.setRoom('${room}')`);rooms.push(ev('roomProof.switches.at(-1)'));assert.equal(ev('roomProof.curtain.geometryId'),state.geometry);}
  ev('roomReview.setView("room");roomReview.setProgress(0);roomReview.startMotion(1)');until('!roomProof.motion.running');shot('open');
  ev('roomReview.startMotion(0)');until('!roomProof.motion.running');
  ev('roomReview.startMotion(1)');until('roomProof.curtain.progress>.1');ev('roomReview.startMotion(0)');until('!roomProof.motion.running');assert.equal(ev('roomProof.curtain.progress'),0);
  const motion=ev('roomProof.motionRuns');
  const record=ev('visualiserCustomer.selectedRecord');assert.ok(record.fabricProfileUrl.includes('/pages/fabric/sdg-f1541-01-'));
  // Unsupported selection has no old texture and retains all purchasing metadata/palette.
  ev(`(async()=>{const r=await fetch(new URL('/apps/curtainsuk-decision/catalog?view=retail&visualiser=1&fabric=pt-4270-147',location.origin)).then(r=>r.json());await visualiserCustomer.selectRecord(r.fabric)})()`);
  assert.equal(ev('visualiserCustomer.proof.previewState'),'unavailable');assert.equal(ev('roomProof.curtain.textureBytes'),0);assert.match(ev('document.querySelector("#fabric-preview-message").textContent'),/Room preview not available for this fabric yet/);shot('unsupported');
  assert.equal(ev('document.documentElement.scrollWidth>innerWidth'),false);assert.deepEqual(ev('roomProof.errors'),[]);
  const requests=ev('performance.getEntriesByType("resource").map(r=>r.name)');assert.ok(!requests.some(url=>/naila|hci-command|premium-command|jigsaw|flat-clean\.png/.test(url)));
  const finalGpu=ev('roomProof.gpuObjects'),errors=run(['errors']);
  let browseAction=null;
  if(new URL(base).hostname==='www.curtainsuk.com'){
   run(['frame','main']);framed=false;run(['open','https://www.curtainsuk.com/pages/fabric-library?view=browse-fabrics&query=Bergamot']);
   until('document.querySelectorAll(".cuk-fabric").length===4');
   browseAction=ev(`[...document.querySelectorAll('.cuk-fabric a[href*="room-visualiser?fabric="]')].map(a=>a.getAttribute('href'))`);
   assert.deepEqual(browseAction,['/pages/room-visualiser?fabric=sdg-f1541-01']);
   assert.equal(ev('document.querySelectorAll(".cuk-fabric [data-sample]").length'),4);
  }
  report.runs.push({label,state,switches,rooms,motion,finalGpu,errors,requests,browseAction});
  fs.writeFileSync(path.join(out,'browser.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({label,firstRenderMs:state.initial.navigationToReadyMs,switches:switches.map(s=>({id:s.id,ms:s.ms,bytes:s.textureBytes})),motion:motion.map(m=>({ms:m.elapsedMs,fps:m.meanFps})),checks:'PASS'}));
 }catch(error){shot('failure');console.error(ev('({url:location.href,text:document.querySelector("#fabric-dialog")?.innerText?.slice(-1200),requests:performance.getEntriesByType("resource").filter(r=>r.name.includes("catalog?")).map(r=>r.name).slice(-6)})'));throw error;}finally{run(['close']);}
}
