const identity=/^[a-zA-Z0-9][a-zA-Z0-9-]{0,149}$/;
// The private harness lives on loopback; the existing renderer supplies a
// storefront-relative URL. Only the verified, exact-ID supported destination
// may cross to the real visualiser. No local visualiser or arbitrary redirect.
export function roomPreviewDestination(id,relative){
  return typeof id==='string'&&identity.test(id)&&relative===`/pages/room-visualiser?fabric=${encodeURIComponent(id)}`
    ?'https://www.curtainsuk.com'+relative:null;
}
export function selectedFabric(search){
  const p=new URLSearchParams(search);
  if(!p.has('fabric'))return null;
  if(p.getAll('fabric').length!==1||p.getAll('entry').length!==1||p.get('entry')!=='fabric-detail'||!identity.test(p.get('fabric')))throw Error('This fabric link is invalid. Return to its detail page and try again.');
  return p.get('fabric');
}
export function fabricContext(id,consent){
  if(!identity.test(id)||consent!==true)throw Error('Please confirm that you want to share this fabric with Jane.');
  return {version:'1',source:'customer-notes',consent:true,room:null,fabricIds:[id],colours:[],heading:null,lighting:null,curtainPosition:null,preferences:[],references:['fabric-detail:v1'],feedback:'I selected this exact fabric on its detail page and would like to discuss it.'};
}
export function sharedFabric(session){
  return session?.contexts?.filter(c=>c.value?.references?.includes('fabric-detail:v1')).at(-1)?.value.fabricIds?.[0]??null;
}
export async function readFabric(id){
  const r=await fetch('/api/fabric-reference?fabric='+encodeURIComponent(id),{cache:'no-store'});
  if(!r.ok)throw Error(r.status===404?'This fabric is not currently available to share. Your consultation is still here.':'The fabric could not be verified. Please retry; your consultation is still here.');
  const {fabric}=await r.json();
  if(fabric?.id!==id)throw Error('The returned fabric did not match your selection. Nothing was shared.');
  return fabric;
}
export function renderFabric(host,fabric){
  host.replaceChildren();
  const image=document.createElement('img');image.src=fabric.imageUrl;image.alt=fabric.design+' · '+fabric.colour;image.width=104;image.height=104;
  const body=document.createElement('div'),title=document.createElement('strong'),id=document.createElement('small'),description=document.createElement('p'),link=document.createElement('a');
  title.textContent=[fabric.brand,fabric.design,fabric.colour].filter(Boolean).join(' · ');id.textContent='Fabric ID: '+fabric.id;description.textContent=fabric.description??'Description not available.';
  link.href=fabric.url;link.textContent='View fabric details';link.target='_blank';link.rel='noopener noreferrer';
  body.append(title,id,description,link);host.append(image,body);
}

export function mountFabricReference({share}){
  const $=id=>document.getElementById(id);let session=null,pending=null,fabric=null,loading=false,sequence=0,invalid=false;
  const panel=$('fabric-reference'),status=$('fabric-reference-status'),consent=$('fabric-share-consent'),button=$('fabric-share');
  try{pending=selectedFabric(location.search);}catch(e){invalid=true;panel.hidden=false;status.textContent=e.message;}
  function controls(){
    const shared=!!fabric&&sharedFabric(session)===fabric.id;
    $('fabric-share-fields').hidden=shared||invalid;
    button.disabled=loading||!fabric||!session||!consent.checked;
    $('fabric-retry').hidden=invalid||!!fabric||!pending&&!sharedFabric(session);
    if(fabric)status.textContent=shared?'Shared with this consultation. Price and availability still need checking on the fabric page.':session?'Review this fabric, then choose whether to share it with Jane.':'Selected fabric verified. Enter the preview to share it with Jane.';
  }
  async function load(id){
    const run=++sequence;fabric=null;loading=true;panel.hidden=false;$('fabric-reference-card').replaceChildren();status.textContent='Checking your selected fabric…';controls();
    try{const value=await readFabric(id);if(run!==sequence)return;fabric=value;renderFabric($('fabric-reference-card'),fabric);}
    catch(e){if(run===sequence)status.textContent=e.message;}
    finally{if(run===sequence){loading=false;controls();}}
  }
  consent.addEventListener('change',controls);
  $('fabric-retry').addEventListener('click',()=>{const id=pending??sharedFabric(session);if(id&&!loading)void load(id);});
  button.addEventListener('click',async()=>{
    if(loading||!fabric||!session||!consent.checked)return;
    loading=true;controls();
    let failure=null;
    try{await share(fabricContext(fabric.id,true));pending=null;consent.checked=false;}
    catch(e){failure=e.message;}
    finally{loading=false;controls();if(failure)status.textContent=failure;}
  });
  return {
    setSession(value){const changed=session?.id!==value?.id;session=value;if(changed)consent.checked=false;const id=pending??sharedFabric(session);if(id&&!invalid){panel.hidden=false;if(fabric?.id!==id&&!loading)void load(id);else controls();}else if(!invalid)panel.hidden=true;},
    reset(){sequence++;session=null;pending=null;fabric=null;loading=false;invalid=false;consent.checked=false;panel.hidden=true;$('fabric-reference-card').replaceChildren();}
  };
}
