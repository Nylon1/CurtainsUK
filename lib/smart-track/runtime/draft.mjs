export function installTrackDraft({document,storage,context,revision}){
 const params=new URLSearchParams(context);
 const identity=['order_item','room_id','linked_curtain'].map(key=>params.get(key)||'').join(':');
 const key='curtainsuk-track-draft-v1:'+identity;
 const controls=[...document.querySelectorAll('#track-form input[id],#track-form select[id],#weight-helper input[id],#weight-helper select[id]')].filter(el=>!el.id.endsWith('-confirm')&&!['curtain-source','linked-curtain'].includes(el.id)&&el.type!=='hidden');
 try{
  const draft=JSON.parse(storage.getItem(key)||'null');
  if(draft?.revision===revision&&Date.now()-draft.savedAt<86400000){
   for(const el of controls){
    const value=draft.values?.[el.id];
    if(el.type==='checkbox'){if(typeof value==='boolean')el.checked=value;}
    else if(typeof value==='string'&&value.length<=200&&(el.tagName!=='SELECT'||[...el.options].some(option=>option.value===value)))el.value=value;
   }
   for(const el of controls)el.dispatchEvent(new Event('input',{bubbles:true}));
   for(const el of document.querySelectorAll('input[id$="-confirm"]'))el.checked=false;
   document.getElementById('track-form').dispatchEvent(new Event('input',{bubbles:true}));
  }
 }catch{}
 const save=()=>{try{storage.setItem(key,JSON.stringify({revision,savedAt:Date.now(),values:Object.fromEntries(controls.map(el=>[el.id,el.type==='checkbox'?el.checked:el.value]))}));}catch{}};
 for(const id of ['track-form','weight-helper'])for(const event of ['input','change'])document.getElementById(id).addEventListener(event,save);
}
