import {SCENES,PURPOSES,LAYOUTS,MATERIALS,readState,normaliseState,stateQuery,designUrl,makeRoute,routePoints,panelSpans,projectBrief,commercePolicy,useExamples} from './model.mjs';
import {fabricActions} from 'room-runtime/rooms/catalogue-contract.mjs';
const config=JSON.parse(document.querySelector('#beyond-config').textContent),$=id=>document.getElementById(id);
let parsed=readState(location.search),state=parsed.state,record=null,viewer=null,selectionSerial=0,browser=null,browserPromise=null;
const proof={ready:false,state:{...state},fabricState:'loading',imageState:'loading',errors:[],metrics:{},renderInputOnly:true};
const debug=$('debug');debug.hidden=!(config.preview&&new URLSearchParams(location.search).get('debug')==='1');
function writeProof(){proof.state={...state};if(!debug.hidden)$('proof').textContent=JSON.stringify(proof,null,2);}
function urlFor(s=state){return designUrl(config.destination,s);}
function save(){const u=new URL(location.href);for(const key of Object.keys(state))u.searchParams.set(key,String(state[key]));history.replaceState(null,'',u);if(window.parent!==window)window.parent.postMessage({type:'curtainsuk:beyond-state',search:stateQuery(state).toString()},location.origin);writeProof();}
function change(patch,{animate=true}={}){state=normaliseState({...state,...patch});save();updateControls();viewer?.setState(state,{animate});}
function setLink(id,url){const a=$(id);if(url){a.href=url;a.removeAttribute('aria-disabled');a.removeAttribute('tabindex');}else{a.removeAttribute('href');a.setAttribute('aria-disabled','true');a.tabIndex=-1;}}
function purchases(){const actions=fabricActions(record),policy=commercePolicy(state,record,actions);setLink('fabric-details',policy.profile);setLink('fabric-sample',policy.sample);setLink('make',policy.make);const applied=['fabric','layered'].includes(state.material);$('fabric-sample').textContent=applied?'Order a fabric sample ↗':'Sample saved decorative fabric ↗';proof.commerce={...policy};}
function plan(){
  const ns='http://www.w3.org/2000/svg',svg=$('plan');svg.replaceChildren();
  const add=(tag,attrs,text)=>{const el=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs))el.setAttribute(k,String(v));if(text)el.textContent=text;svg.append(el);return el;};
  add('rect',{x:-375,y:-330,width:750,height:660,fill:'#ece9de',stroke:'#c9c9bc','stroke-width':4});
  const furniture=state.scene==='hide'?[[-175,-245,150,65,'Desk'],[-280,-263,60,100,'Shelf'],[85,-263,105,70,'Storage'],[-275,70,85,205,'Sofa'],[175,130,90,90,'Chair'],[-50,85,130,130,'Table']]:state.scene==='divide'?[[-170,-263,150,65,'Desk'],[-270,-305,80,80,'Shelf'],[-265,-70,75,75,'Chair'],[-235,185,220,90,'Sofa'],[130,110,110,110,'Dining']]:[[-290,-273,405,80,'Lounge seating'],[-245,-175,80,80,'Table'],[-190,115,80,80,'Chair'],[110,115,80,80,'Chair']];
  for(const[x,y,w,h,label]of furniture){add('rect',{x,y,width:w,height:h,rx:8,fill:'#c5c7b7'});add('text',{x:x+w/2,y:y+h/2+5,'font-size':18,'text-anchor':'middle',fill:'#566453'},label);}
  const route=makeRoute(routePoints(state));add('polyline',{points:route.points.map(p=>p.join(',')).join(' '),fill:'none',stroke:'#244a3e','stroke-width':5});
  const fixed=['ball','linked'].includes(state.material),pose=fixed?0:state.open;
  for(const s of panelSpans(route.length,state.draw,pose)){const points=Array.from({length:80},(_,i)=>{const p=route.at(s.start+s.span*i/79);return`${p.x},${p.z}`;}).join(' ');add('polyline',{points,fill:'none',stroke:'#a88454','stroke-width':17,'stroke-linecap':'round'});}
  if(!fixed){for(const s of panelSpans(route.length,state.draw,1)){const p=route.at(s.start+s.span/2);add('circle',{cx:p.x,cy:p.z,r:24,fill:'none',stroke:'#a88454','stroke-width':3,'stroke-dasharray':'6 4'});}}
  add('path',{d:'M 290 290 L 290 -260',stroke:'#6b806a','stroke-width':5,'stroke-dasharray':'13 10',fill:'none'});add('path',{d:'M 278 -240 L 290 -260 L 302 -240',stroke:'#6b806a','stroke-width':5,fill:'none'});
  add('text',{x:260,y:315,'font-size':18,'text-anchor':'middle',fill:'#455d47'},'Clear route');
  $('parking-note').textContent=fixed?'Fixed hanging screen concept. No track parking or retractable mechanism is assumed.':`${Math.round(route.length)} cm illustrative track route. Open fabric gathers ${state.draw==='pair'?'at both ends':`to the ${state.draw}`}. Parking is shown with dotted circles; verify stack space and access for your room.`;
  if(state.material==='mixed')$('parking-note').textContent+=' The chain layer stays fixed across its route.';
}
const materialNotes={fabric:'Decorative face with a neutral lining on the reverse. Turn the view to see it.',voile:'A generic unlined voile concept: translucent rather than opaque. Exact fabric, privacy and supply to be specified.',ball:'Individual metal beads with connecting stems and visible gaps. Fixed hanging concept; finish, suspension and supply need a project quote.',linked:'Individual alternating aluminium-link forms, with open gaps. A separate construction from ball chain; density and finish are illustrative.',layered:'Two independent fabric tracks: decorative lined fabric and generic unlined voile. Move each layer separately.',mixed:'A movable voile layer in front of a fixed ball-chain screen. Chain remains fixed; its supporting assembly requires specification.'};
function updateControls(){
  document.querySelector('.preview-pane').classList.toggle('has-layer',state.material==='layered');
  for(const b of document.querySelectorAll('[data-material]'))b.setAttribute('aria-pressed',String(b.dataset.material===state.material));
  const examples=useExamples(state);$('uses-title').textContent=examples.title;
  $('use-examples').replaceChildren(...examples.items.map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));
  $('draw-note').textContent=state.draw==='pair'?'Open from the middle, with fabric gathering at both ends.':'Clear the opening from one side, with all the fabric gathering at the '+state.draw+'.';

  $('scene-title').textContent=SCENES[state.scene].title;$('scene-eyebrow').textContent=SCENES[state.scene].eyebrow;$('scene-description').textContent=SCENES[state.scene].description;
  for(const key of['layout','material','draw','construction','light','wall','density'])$(key).value=state[key];
  $('layout-control').hidden=state.scene!=='divide';$('material-control').hidden=state.scene!=='screens';$('airport-reference').hidden=state.scene!=='screens';
  const doubleFaced=state.construction==='double'&&['fabric','layered'].includes(state.material);
  const constructionNote=doubleFaced?'The selected decorative fabric finishes both sides, instead of lining. Fabric quantity, combined weight and track suitability are confirmed in your project quote.':materialNotes[state.material];
  $('construction-control').hidden=!['fabric','layered'].includes(state.material);
  $('material-note').textContent=constructionNote;$('density-control').hidden=!['ball','linked','mixed'].includes(state.material);
  $('edge-source').hidden=!['ball','mixed'].includes(state.material);
  const fixed=['ball','linked'].includes(state.material);$('draw-control').hidden=fixed;$('layer-controls').hidden=state.material!=='layered';
  $('opening').disabled=fixed;$('opening').value=Math.round(state.open*100);$('layer-opening').value=Math.round(state.layer*100);
  $('open-value').textContent=fixed?'Fixed screen':`${Math.round(state.open*100)}% open`;$('layer-value').textContent=`${Math.round(state.layer*100)}% open`;
  $('motion-title').textContent=state.material==='mixed'?'Move the voile layer':state.scene==='hide'?'Hide the workday':state.scene==='divide'?'Change the way the room works':'Compare the layers of your lounge';
  $('movement-note').textContent=fixed?'This metallic screen has no confirmed retractable assembly. Switch to fabric or a layered option to explore movement.':'Drag to any position, or choose open, partly open or closed. The same furnishings stay in place.';
  $('fabric-context').textContent=['fabric','layered'].includes(state.material)?(doubleFaced?'Applied to both decorative faces. No lining is shown.':'Applied to the decorative fabric face. The lining stays neutral.'):'Saved decorative fabric. This photograph is not applied to voile or metal; those are separate material concepts.';
  $('construction-title').textContent=fixed?'Gaps are part of the screen.':doubleFaced?'A finished fabric screen, both sides.':'A fabric face. An honest reverse.';
  $('construction-note').textContent=constructionNote+(state.view==='reverse'&&['fabric','layered'].includes(state.material)?(doubleFaced?' You are viewing the second decorative face.':' You are viewing the neutral lining side.'):'');
  $('view-note').textContent=state.view==='reverse'?(doubleFaced?'Reverse side · decorative fabric':state.material==='fabric'||state.material==='layered'?'Reverse side · lining visible':'Reverse side · screen construction'):state.view==='curtain'?'Detail · same fabric scale':'Visual concept · measurements to follow';
  for(const b of document.querySelectorAll('[data-scene]'))b.setAttribute('aria-pressed',String(b.dataset.scene===state.scene));
  for(const b of document.querySelectorAll('[data-view]'))b.setAttribute('aria-pressed',String(b.dataset.view===state.view));
  for(const b of document.querySelectorAll('[data-open]')){b.disabled=fixed;b.setAttribute('aria-pressed',String(Number(b.dataset.open)===state.open));}
  for(const [i,b]of [...$('purposes').children].entries()){const p=PURPOSES[i];b.setAttribute('aria-pressed',String(state.scene===p.scene&&state.layout===p.layout));}
  plan();purchases();
}
for(const [i,p]of PURPOSES.entries()){const b=document.createElement('button');b.type='button';b.append(document.createTextNode(p.name));const mark=document.createElement('span');mark.textContent=['◫','↔','◡','▥'][i];mark.setAttribute('aria-hidden','true');b.append(mark);b.addEventListener('click',()=>change({...p,view:'room',open:1,layer:1}));$('purposes').append(b);}
for(const b of document.querySelectorAll('[data-scene]'))b.addEventListener('click',()=>change({scene:b.dataset.scene,layout:'straight',material:'fabric',view:'room',open:1,layer:1}));
for(const b of document.querySelectorAll('[data-view]'))b.addEventListener('click',()=>change({view:b.dataset.view}));
for(const b of document.querySelectorAll('[data-material]'))b.addEventListener('click',()=>change({material:b.dataset.material}));
for(const b of document.querySelectorAll('[data-open]'))b.addEventListener('click',()=>change({open:Number(b.dataset.open)}));
for(const key of['layout','material','draw','construction','light','wall','density'])$(key).addEventListener('change',()=>change({[key]:$(key).value}));
for(const[id,key]of[['opening','open'],['layer-opening','layer']])$(id).addEventListener('input',()=>change({[key]:Number($(id).value)/100},{animate:false}));
async function resolve(id){const u=new URL(config.catalogueUrl,location.origin);u.search=new URLSearchParams({view:'retail',visualiser:'1',fabric:id});const r=await fetch(u,{signal:AbortSignal.timeout(25000)});if(!r.ok){const error=new Error(r.status===422?'This fabric is not available in Beyond Windows. Choose an approved plain or complete-repeat fabric.':'Fabric details could not load.');error.restricted=r.status===422;throw error;}const data=await r.json();if(data.fabric?.id!==id)throw Error('This fabric is not available.');return data.fabric;}
async function selectFabric(id,{invalid=false}={}){
  const serial=++selectionSerial;state.fabric=id;save();viewer?.clearFabric();proof.fabricState='loading';$('fabric-error').hidden=true;$('retry-fabric').hidden=true;record=null;purchases();
  $('fabric-name').textContent='Loading your fabric…';$('fabric-brand').textContent='';$('fabric-image').hidden=true;$('scale-note').textContent='Checking fabric imagery and scale…';
  try{
    if(invalid)throw Error('This fabric link is ambiguous or invalid. Choose a fabric to continue.');
    const next=await resolve(id);if(serial!==selectionSerial)return;
    record=next;proof.fabricState='ready';$('fabric-name').textContent=`${record.design} — ${record.colour}`;$('fabric-brand').textContent=record.brand||record.supplier||'';
    const photo=record.images?.find(i=>i.imageType==='MAIN')?.url||record.imageReferences?.[0];
    $('fabric-image').onerror=()=>{$('fabric-image').hidden=true;};if(photo){$('fabric-image').src=photo;$('fabric-image').hidden=false;}
    purchases();proof.imageState='loading';
    try{const spec=await viewer?.setFabric(record);if(serial!==selectionSerial)return;if(spec){$('scale-note').textContent=spec.label;proof.scale=spec;proof.imageState='ready';}}
    catch(error){if(serial!==selectionSerial)return;proof.imageState='error';$('scale-note').textContent='Neutral preview · selected fabric image unavailable';$('fabric-error').textContent='Your fabric image could not load. The room remains interactive with a neutral curtain. Retry keeps this layout and position.';$('fabric-error').hidden=false;$('retry-fabric').hidden=false;proof.errors.push(String(error));}
  }catch(error){if(serial!==selectionSerial)return;proof.fabricState='error';proof.imageState='unavailable';$('fabric-name').textContent='Choose a fabric';$('scale-note').textContent='Neutral preview · fabric details unavailable';$('fabric-error').textContent=String(error.message);$('fabric-error').hidden=false;$('retry-fabric').hidden=invalid||Boolean(error.restricted);proof.errors.push(String(error));}
  writeProof();
}
$('retry-fabric').addEventListener('click',()=>selectFabric(state.fabric));
const dialog=$('fabric-dialog'),browserRoot=dialog.querySelector('[data-cuk-fabric-browser]');browserRoot.dataset.engineBase=config.assetBase.replace(/\/$/,'');browserRoot.querySelector('form').addEventListener('submit',e=>e.preventDefault());
async function ensureBrowser(){
  if(browser)return browser.ready;
  if(!browserPromise)browserPromise=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=config.rendererBase+'rooms/shared/curtainsuk-storefront.js';s.onload=resolve;s.onerror=()=>{s.remove();browserPromise=null;reject(Error('Fabric library unavailable.'));};document.head.append(s);});
  await browserPromise;browser=window.CurtainsUKFabricBrowser.mount(browserRoot);await browser.ready;
}
$('change-fabric').addEventListener('click',async()=>{dialog.showModal();$('visualiser-fabric-search').focus();try{await ensureBrowser();}catch{browserRoot.querySelector('[data-cuk-error]').hidden=false;browserRoot.querySelector('[data-cuk-error-message]').textContent='The fabric library could not load. Try again.';$('browser-script-retry').hidden=false;}});
$('browser-script-retry').addEventListener('click',async()=>{try{await ensureBrowser();$('browser-script-retry').hidden=true;}catch{}});
$('close-fabric-dialog').addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>$('change-fabric').focus({preventScroll:true}));
browserRoot.addEventListener('curtainsuk:visualiser-select',e=>{e.preventDefault();selectFabric(e.detail.fabric.id);dialog.close();});
$('quote').addEventListener('click',()=>{const brief=projectBrief(state,record)+'\nReview link: '+urlFor();$('brief').value=brief;$('quote-email').href='mailto:enquiries@curtainsuk.com?'+new URLSearchParams({subject:'Curtains Beyond Windows — project enquiry',body:brief});$('quote-dialog').showModal();$('close-quote').focus();});
$('close-quote').addEventListener('click',()=>$('quote-dialog').close());$('quote-dialog').addEventListener('close',()=>$('quote').focus());
$('download-brief').addEventListener('click',()=>{const u=URL.createObjectURL(new Blob([$('brief').value],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=u;a.download='curtainsuk-space-brief.txt';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);});
$('share').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(urlFor().href);$('share-status').textContent='Design link copied. Your layout, fabric and opening positions are included.';}catch{$('share-status').textContent='Copy the address in your browser to share this configuration.';}});
$('retry-graphics').addEventListener('click',()=>{save();location.reload();});
window.addEventListener('popstate',()=>{parsed=readState(location.search);state=parsed.state;updateControls();viewer?.setState(state,{animate:false});selectFabric(state.fabric,{invalid:parsed.invalidFabric});});
updateControls();writeProof();
try{
  const {createViewer}=await import('./renderer.mjs');viewer=createViewer($('beyond-canvas'),config,metrics=>{
    proof.metrics=metrics;proof.ready=metrics.ready;$('loading').hidden=metrics.ready;
    if(metrics.error){$('graphics-error').hidden=false;$('graphics-error').querySelector('p').textContent=metrics.error;$('loading').hidden=true;}
    const p=metrics.pose?.[0]??state.open,fixed=['ball','linked'].includes(state.material);$('pose-label').textContent=fixed?'Fixed decorative screen':p>.995?'Space open':p<.005?'Curtain closed':`${Math.round(p*100)}% open`;writeProof();
  });viewer.setState(state,{animate:false});await selectFabric(state.fabric,{invalid:parsed.invalidFabric});
}catch(error){$('loading').hidden=true;$('graphics-error').hidden=false;$('graphics-error').querySelector('p').textContent='This device could not start the interactive preview. Retry keeps your selected configuration.';proof.errors.push(String(error));writeProof();}
