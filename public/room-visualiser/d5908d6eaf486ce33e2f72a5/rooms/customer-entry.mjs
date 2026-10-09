import {mountStickyViewport} from './sticky-viewport.mjs';
import {resolveFabric,previewPlan,fabricActions,DEFAULT_FABRIC} from './catalogue-client.mjs';
import {readPreselectedFabric} from './integration/links.mjs';

const params=new URLSearchParams(location.search),roomId=['living','bedroom','lounge','office'].includes(params.get('room'))?params.get('room'):'living';
const defaultId=typeof DEFAULT_FABRIC==='string'?DEFAULT_FABRIC:DEFAULT_FABRIC.id;
let requestedId=null,preselectionError=null,currentRecord=null,api=null,proof=null,selectionSerial=0,thumbnailSerial=0,browser=null,browserScript=null;
try{requestedId=readPreselectedFabric(location.search)??defaultId;}catch(error){preselectionError=error;}
const dialog=document.querySelector('#fabric-dialog'),browserRoot=dialog.querySelector('[data-cuk-fabric-browser]'),changeButton=document.querySelector('#change-fabric'),previewMessage=document.querySelector('#fabric-preview-message'),retryFabric=document.querySelector('#selected-fabric-retry');
browserRoot.querySelector('form').addEventListener('submit',event=>event.preventDefault());
const customerProof={ready:false,selectedId:null,previewState:'loading',selectionChanges:[],browserOpened:0,errors:[]};

function message(text){previewMessage.textContent=text;previewMessage.hidden=!text;}
function setLink(selector,url,enabled=true){
  const element=document.querySelector(selector);
  if(url&&enabled){element.href=url;element.target='_blank';element.rel='noopener';element.removeAttribute('aria-disabled');element.removeAttribute('tabindex');}
  else{element.removeAttribute('href');element.setAttribute('aria-disabled','true');element.setAttribute('tabindex','-1');}
}
async function presentFabricThumbnail(thumbnail,image,fabricId){
  const request=++thumbnailSerial;
  // Clear the previous fabric immediately, while keeping the thumbnail's layout
  // space. Only decoded artwork belonging to the current selection may appear.
  thumbnail.style.visibility='hidden';thumbnail.hidden=!image;thumbnail.removeAttribute('src');
  thumbnail.dataset.fabricId=fabricId;thumbnail.dataset.imageState=image?'loading':'unavailable';
  if(!image)return;
  try{
    const source=new URL(image,location.href);
    if(source.protocol==='https:'&&source.hostname==='cdn.shopify.com')source.searchParams.set('width','160');
    const candidate=new Image();candidate.decoding='async';candidate.src=source.href;
    await candidate.decode();
    if(request!==thumbnailSerial||currentRecord?.id!==fabricId)return;
    thumbnail.src=source.href;thumbnail.style.visibility='visible';thumbnail.dataset.imageState='ready';
  }catch{
    if(request!==thumbnailSerial||currentRecord?.id!==fabricId)return;
    thumbnail.removeAttribute('src');thumbnail.style.visibility='hidden';thumbnail.dataset.imageState='unavailable';
  }
}
function showRecord(record,plan=previewPlan(record)){
  const actions=fabricActions(record),image=record.images?.find(item=>item.imageType==='MAIN')?.url||record.imageReferences?.[0],thumbnail=document.querySelector('#selected-fabric-image');
  presentFabricThumbnail(thumbnail,image,record.id);
  document.querySelector('#selected-fabric-brand').textContent=record.brand||record.supplier||'';
  document.querySelector('#selected-fabric-name').textContent=`${record.design} — ${record.colour}`;
  document.querySelector('#selected-fabric-availability').textContent=record.availability||'';
  setLink('#selected-sample',actions.sample,actions.sampleAvailable);
  setLink('#selected-make',actions.make,actions.orderReady);
  document.querySelector('#selected-sample').setAttribute('aria-label',actions.sampleAvailable?`Order a sample of ${record.design} in ${record.colour} (opens CurtainsUK in a new tab)`:`Sample ordering unavailable for ${record.design} in ${record.colour}`);
  document.querySelector('#selected-make').setAttribute('aria-label',actions.orderReady?`Make curtains with ${record.design} in ${record.colour} (opens CurtainsUK in a new tab)`:`Made-to-measure ordering unavailable for ${record.design} in ${record.colour}`);
  const actionNote=document.querySelector('#fabric-action-note');
  actionNote.textContent=!actions.profile?'Ordering links are unavailable here. Explore the fabric library for current options.':!actions.sampleAvailable&&!actions.orderReady?'Sample and made-to-measure ordering are not currently available here. Check the fabric details for current options.':!actions.sampleAvailable?'Sample ordering is not currently available here. Check the fabric details for current options.':!actions.orderReady?'Made-to-measure ordering is not currently available here. You can still order a sample.':'';
  actionNote.hidden=!actionNote.textContent;
  setLink('#selected-profile',actions.profile,Boolean(actions.profile));document.querySelector('#selected-profile').hidden=!actions.profile;
  if(actions.sample&&actions.sampleAvailable){setLink('#current-sample-cta',actions.sample);document.querySelector('#current-sample-cta').innerHTML='Explore this fabric sample <span aria-hidden="true">↗</span><span class="sr-only"> (opens CurtainsUK in a new tab)</span>';}
  else{setLink('#current-sample-cta',actions.profile||'https://www.curtainsuk.com/pages/fabric-library');document.querySelector('#current-sample-cta').innerHTML='Explore fabric samples <span aria-hidden="true">↗</span><span class="sr-only"> (opens CurtainsUK in a new tab)</span>';}
  message(plan.state==='ready'?'':'Room preview not available for this fabric yet. The curtain is shown in a neutral finish; view the fabric photograph and use a physical sample to explore its colour.');
  retryFabric.hidden=true;customerProof.selectedId=record.id;customerProof.previewState=plan.state;
}
function metadataFailure(error,{invalidLink=false}={}){
  customerProof.errors.push(String(error));customerProof.previewState=invalidLink?'invalid-link':'metadata-unavailable';
  document.querySelector('#selected-fabric-name').textContent='Fabric details unavailable';
  message(invalidLink?'This fabric link is incomplete or ambiguous. Choose a fabric from the library to continue.':'We could not load this fabric’s details. Try again, or explore the fabric library.');retryFabric.hidden=invalidLink;
}
async function initialResolve(){
  if(preselectionError){metadataFailure(preselectionError,{invalidLink:true});return null;}
  try{const record=await resolveFabric(requestedId);currentRecord=record;showRecord(record);return record;}
  catch(error){metadataFailure(error);return null;}
}
const initialRecord=initialResolve();
window.visualiserInitial=initialRecord.then(record=>({roomId,fabricId:record?previewPlan(record).engineId:null,record}));
window.visualiserInitialRoom=roomId;

async function selectRecord(record,{close=false,writeUrl=true}={}){
  if(!api){message('Your room is still loading. Please try your fabric again in a moment.');return false;}
  const serial=++selectionSerial,start=performance.now();browserRoot.setAttribute('aria-busy','true');
  try{
    const state=await api.setCatalogueFabric(record);if(serial!==selectionSerial)return false;
    if(state?.applied===false){browserRoot.querySelector('[data-cuk-browse-status]').textContent='This fabric change was replaced. Choose a fabric to try again.';return false;}
    currentRecord=record;requestedId=record.id;showRecord(record);
    if(writeUrl){const address=new URL(location.href);address.searchParams.set('fabric',record.id);if(proof?.room)address.searchParams.set('room',proof.room);history.replaceState(history.state,'',address);}
    customerProof.selectionChanges.push({id:record.id,ms:performance.now()-start,state:previewPlan(record).state});
    if(close)dialog.close();return state??true;
  }catch(error){
    if(serial===selectionSerial){customerProof.errors.push(String(error));browserRoot.querySelector('[data-cuk-error-message]').textContent='This fabric could not be shown just now. Your previous selection is unchanged. Please try again.';browserRoot.querySelector('[data-cuk-error]').hidden=false;}
    return false;
  }finally{if(serial===selectionSerial)browserRoot.removeAttribute('aria-busy');}
}
window.visualiserCustomer={
  initialRecord,proof:customerProof,
  async onReady(roomReview,roomProof){
    api=roomReview;proof=roomProof;const record=await initialRecord;
    if(record)await selectRecord(record,{writeUrl:false});
    changeButton.disabled=false;customerProof.ready=true;
  },
  selectRecord,
  get selectedRecord(){return currentRecord;},
};

function loadBrowserScript(){
  if(window.CurtainsUKFabricBrowser)return Promise.resolve();
  if(browserScript)return browserScript;
  browserScript=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=new URL('./shared/curtainsuk-storefront.js',import.meta.url).href;script.onload=()=>resolve();script.onerror=()=>{script.remove();browserScript=null;reject(Error('FABRIC_BROWSER_LOAD_FAILED'));};document.head.append(script);});
  return browserScript;
}
async function ensureBrowser(){
  if(browser)return browser.ready;
  const status=browserRoot.querySelector('[data-cuk-browse-status]'),retry=document.querySelector('#browser-script-retry');retry.hidden=true;
  try{status.textContent='Loading the fabric library…';await loadBrowserScript();if(!browser)browser=window.CurtainsUKFabricBrowser.mount(browserRoot);await browser.ready;}
  catch(error){customerProof.errors.push(String(error));status.textContent='';browserRoot.querySelector('[data-cuk-error-message]').textContent='The fabric library could not load. Please try again.';browserRoot.querySelector('[data-cuk-error]').hidden=false;browserRoot.querySelector('[data-cuk-retry]').hidden=true;retry.hidden=false;}
}
changeButton.addEventListener('click',async()=>{customerProof.browserOpened++;dialog.showModal();document.querySelector('#visualiser-fabric-search').focus();await ensureBrowser();});
document.querySelector('#close-fabric-dialog').addEventListener('click',()=>dialog.close());
dialog.addEventListener('close',()=>changeButton.focus({preventScroll:true}));
document.querySelector('#browser-script-retry').addEventListener('click',()=>{browserRoot.querySelector('[data-cuk-retry]').hidden=false;ensureBrowser();});
browserRoot.addEventListener('curtainsuk:visualiser-select',event=>{event.preventDefault();selectRecord(event.detail.fabric,{close:true});});
retryFabric.addEventListener('click',async()=>{
  retryFabric.disabled=true;message('Checking your fabric details…');
  try{const record=await resolveFabric(requestedId);if(api)await selectRecord(record);else{currentRecord=record;showRecord(record);}}
  catch(error){metadataFailure(error);}finally{retryFabric.disabled=false;}
});
document.addEventListener('click',event=>{const menu=document.querySelector('.fabric-menu');if(menu.open&&!menu.contains(event.target))menu.open=false;});
// A real curtain scene is imported once. The customer shell only supplies selection
// and navigation; rendering, cameras, materials and travel remain in the viewer.
import('./viewer.mjs').catch(error=>{customerProof.errors.push(String(error));document.querySelector('#loading-status').textContent='Your room could not load. Please try again.';const retry=document.querySelector('#loading-retry');retry.hidden=false;retry.onclick=()=>location.reload();});

if(window.parent!==window){
 document.querySelector('.customer-header').hidden=true;

}

for(const a of document.querySelectorAll('a[href^="/pages/"]'))a.href=new URL(a.getAttribute('href'),location.origin).href;

mountStickyViewport();
