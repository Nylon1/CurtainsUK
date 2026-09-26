(() => {
  const KEY = 'curtainsuk_customer_hci_session_v2';
  const stage = document.querySelector('#stage');
  const notice = document.querySelector('#notice');
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const calibrationLabels = { LOVE:'Love it', LIKE:'I like it', NOT_SURE:'Not sure', DISLIKE:'Not for me' };
  const fabricLabels = { LOVE:'Love this', MORE_LIKE_THIS:'Show me more like this', NOT_QUITE:'Not quite', NOT_FOR_ME:'Not for me' };
  const families = ['white','cream','beige','taupe','brown','grey','black','blue','green','pink','red','orange','yellow','gold','purple'];
  let view = null, locked = false, pending = null;
  let entry = new URLSearchParams(location.search).get('entry') === 'guided' ? 'guided' : 'match';
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(KEY)); } catch {}
  const resumeId = new URLSearchParams(location.search).get('session');
  if (resumeId && /^[a-f0-9-]{36}$/i.test(resumeId)) saved = { sessionId: resumeId };
  let windowSlug = new URLSearchParams(location.search).get('window') || saved?.windowSlug || null;
  const offeredKey = () => 'hci-image-offered:' + view.sessionId;
  const offered = () => view && sessionStorage.getItem(offeredKey()) === 'true';
  const markOffered = () => view && sessionStorage.setItem(offeredKey(), 'true');

  function status(text) {
    notice.hidden = !text;
    notice.innerHTML = text ? `<span class="status-orb" aria-hidden="true"></span><span>${esc(text)}</span>` : '';
  }
  async function act(action) {
    if (locked) return false;
    locked = true;
    status(action?.type === 'image' ? 'Reading the colour relationships in your room…' : action?.type === 'recommend' ? 'Building five directions around your room and taste…' : action?.type === 'finish-learning' ? 'Refining your edit from what you told us…' : 'Saving your choices…');
    stage.setAttribute('aria-busy','true');
    pending ??= { requestId: crypto.randomUUID(), sessionId: view?.sessionId || saved?.sessionId, revision: view?.revision, action };
    try {
      const r = await fetch('/api/curtain-consultation', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(pending) });
      const data = await r.json();
      if (!r.ok) throw Error(data.error || 'Please retry.');
      view = data;
      if (view.windowSlug) windowSlug = view.windowSlug;
      if (view.palette) markOffered();
      pending = null;
      localStorage.setItem(KEY, JSON.stringify({sessionId:view.sessionId,windowSlug}));
      status('');
      await render();
      return true;
    } catch (e) {
      status(e.message || 'The consultation is paused.');
      const retry = document.createElement('button'); retry.className='secondary'; retry.textContent='Try again'; retry.onclick=()=>act(); notice.append(retry);
      return false;
    } finally { locked=false; stage.removeAttribute('aria-busy'); }
  }

  function offerImage() {
    stage.innerHTML = `<div class="intelligence-hero"><p class="eyebrow">FABRIC INTELLIGENCE · YOUR ROOM</p><h1>Show us the room.<br><em>We’ll read the relationships.</em></h1><p class="lead">One photograph gives us a useful starting point. We look for visible colour relationships, then you confirm what matters before any fabric is recommended.</p></div><div class="upload-studio"><div class="upload-visual"><div class="scan-frame"><span></span><span></span><span></span><span></span><div class="scan-line"></div><p>ROOM IMAGE</p></div><div class="intelligence-points"><span>Colour relationships</span><span>Customer confirmed</span><span>Private analysis</span></div></div><div class="upload-controls"><label class="select-label">What are you showing us?<select id="reference-type"><option value="room">My room</option><option value="paint">Paint colour</option><option value="sofa-upholstery">Sofa / upholstery</option><option value="wallpaper">Wallpaper</option><option value="rug">Rug</option><option value="flooring">Flooring</option><option value="existing-fabric">Existing fabric</option><option value="moodboard">Moodboard</option></select></label><label class="file-drop" for="reference-file"><strong>Add your photograph</strong><span>JPG, PNG or WebP · up to 2 MB</span><input id="reference-file" type="file" accept="image/jpeg,image/png,image/webp"></label><button class="primary" id="upload">Read my room</button><button class="quiet" id="skip">Continue without a photograph</button><p class="fine">Your image is processed privately to derive room evidence. <a href="/curtainsuk-image-privacy" target="_blank" rel="noopener">How image analysis works</a>.</p></div></div>`;
    stage.querySelector('#skip').onclick=()=>{ markOffered(); view.phase==='complete'?act({type:'recommend'}):render(); };
    stage.querySelector('#upload').onclick=async()=>{
      const f=stage.querySelector('#reference-file').files?.[0];
      if(!f || !['image/jpeg','image/png','image/webp'].includes(f.type) || f.size>2*1024*1024){status('Choose one JPG, PNG or WebP image no larger than 2 MB.');return;}
      const bytes=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.onerror=reject;r.readAsDataURL(f);});
      await act({type:'image',mime:f.type,bytes,referenceType:stage.querySelector('#reference-type').value});
    };
  }

  function palette() {
    const p=view.palette;
    const swatches=Object.entries(p.colours).flatMap(([role,colours])=>colours.map(colour=>({role,colour})));
    stage.innerHTML=`<p class="eyebrow">ROOM PALETTE · CONFIRM THE EVIDENCE</p><h1>We found these colour cues.<br><em>Tell us what feels true.</em></h1><p class="lead">This is your palette, not an automatic verdict. Keep, move or remove what we found, and add anything the photograph missed.</p><div class="palette-board">${swatches.map(({role,colour})=>`<article class="palette-card"><div class="swatch swatch-${esc(colour)}"></div><div><span class="palette-role">${esc(role)}</span><strong>${esc(colour)}</strong></div><div class="palette-actions"><button data-remove="${esc(colour)}">Ignore</button><label>Role<select data-move="${esc(colour)}"><option value="">${esc(role)}</option>${['primary','secondary','accent'].filter(x=>x!==role).map(x=>`<option>${x}</option>`).join('')}</select></label></div></article>`).join('')}</div><div class="palette-add"><strong>Add a colour we missed</strong><div>${['primary','secondary','accent'].map(role=>`<label>${role}<select data-add="${role}"><option value="">Choose colour</option>${families.filter(c=>!swatches.some(s=>s.colour===c)).map(c=>`<option>${c}</option>`).join('')}</select></label>`).join('')}</div></div><button class="primary" id="confirm">Confirm my room palette</button>`;
    const edit=(change)=>act({type:'palette',edit:{id:crypto.randomUUID(),revision:p.revision,...change}});
    stage.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>edit({type:'remove',colour:b.dataset.remove}));
    stage.querySelectorAll('[data-move]').forEach(s=>s.onchange=()=>s.value&&edit({type:'move',colour:s.dataset.move,category:s.value}));
    stage.querySelectorAll('[data-add]').forEach(s=>s.onchange=()=>s.value&&edit({type:'add',colour:s.value,category:s.dataset.add}));
    stage.querySelector('#confirm').onclick=()=>edit({type:'confirm'});
  }

  function commerceLink(fabric,item,direction,sample){
    const url=new URL(`https://www.curtainsuk.com/pages/${sample?'fabric-library':'curtain-visualiser'}`);
    url.searchParams.set('fabric',fabric.id); if(sample)url.searchParams.set('intent','sample'); if(windowSlug)url.searchParams.set('window',windowSlug);
    url.hash='cuk_hci='+encodeURIComponent(JSON.stringify({sessionId:view.sessionId,profileSummary:view.profileSummary,fabricMasterId:fabric.id,supplierSku:item.supplierSku,strategyId:direction.id,refinementDigest:view.refinementDigest,commerceToken:item.commerceToken,returnOrigin:location.origin,windowSlug}));
    return url.href;
  }

  function openFeedback(direction,item,reaction){
    const options=reaction==='MORE_LIKE_THIS'?direction.feedback.keep:reaction==='NOT_QUITE'||reaction==='NOT_FOR_ME'?direction.feedback.change:[];
    if(reaction==='LOVE') return act({type:'learn',command:{id:crypto.randomUUID(),strategyId:direction.id,fabricId:item.reactionId,fabricReaction:'LOVE',directionReaction:'LOVE',optionIds:[]}});
    const dialog=document.createElement('dialog'); dialog.className='feedback-dialog';
    dialog.innerHTML=`<form method="dialog"><button class="dialog-close" value="cancel" aria-label="Close">×</button><p class="eyebrow">${esc(fabricLabels[reaction])}</p><h2>${reaction==='MORE_LIKE_THIS'?'What should we keep?':'What would you change?'}</h2><p>Choose what matters. These options come from evidence we actually have for this fabric and the available alternatives.</p>${options.length?`<div class="feedback-options">${options.map(o=>`<label><input type="checkbox" value="${esc(o.id)}"><span><small>${esc(o.group)}</small>${esc(o.label)}</span></label>`).join('')}</div>`:'<p class="fine">There are no evidence-backed detail choices for this direction. You can still send the overall reaction.</p>'}<label class="direction-like"><input type="checkbox" id="keep-direction"><span>I like this direction, just not this fabric</span></label><button type="button" class="primary" id="save-feedback">Use this feedback</button></form>`;
    document.body.append(dialog); dialog.showModal();
    dialog.addEventListener('close',()=>dialog.remove());
    dialog.querySelector('#save-feedback').onclick=async()=>{
      const optionIds=[...dialog.querySelectorAll('.feedback-options input:checked')].map(x=>x.value);
      const directionReaction=dialog.querySelector('#keep-direction').checked?'LIKE':reaction==='NOT_FOR_ME'?'DISLIKE':null;
      if(await act({type:'learn',command:{id:crypto.randomUUID(),strategyId:direction.id,fabricId:item.reactionId,fabricReaction:reaction,directionReaction,optionIds}}))dialog.close();
    };
  }

  async function directions(){
    const final=view.phase==='final';
    stage.innerHTML=`<p class="eyebrow">${final?'YOUR REFINED EDIT':'FIVE DESIGN DIRECTIONS'}</p><h1>${final?'A shortlist shaped by you.':'Five ways your room could go.'}</h1><p class="lead">${final?'Your reactions changed the edit. Supplier facts stay fixed; your preferences shape what comes next.':'Each direction is grounded in your room, calibration and real CurtainsUK fabrics. Tell us what to keep and what to change.'}</p><div class="cards"><div class="direction-loading">Loading your exact fabrics…</div></div>`;
    const parts=await Promise.all(view.directions.map(async d=>{
      if(!d.cards.length)return `<article class="direction-card unavailable"><span class="direction-number">${esc(d.label)}</span><h2>${esc(d.label)}</h2><p>${esc(d.purpose)}</p><p>No exact fabric is currently available for this direction.</p></article>`;
      const item=d.cards[0];
      try{
        const r=await fetch(`/api/curtain-consultation?fabric=${encodeURIComponent(item.fabricMasterId)}`); if(!r.ok)throw Error(); const {fabric:f}=await r.json(); if(!f?.browseReady||f.id!==item.fabricMasterId)throw Error();
        return `<article class="direction-card" data-direction="${esc(d.id)}"><div class="fabric-image-wrap"><img loading="lazy" src="${esc(f.images[0].url)}?width=900" alt="${esc(f.design+' '+f.colour+' fabric')}"><span>${esc(d.label)}</span></div><div class="direction-copy"><p class="eyebrow">${esc(f.brand)}</p><h2>${esc(f.design)} <em>${esc(f.colour)}</em></h2><p class="direction-purpose">${esc(d.purpose)}</p><div class="why"><strong>Why this direction</strong><p>${esc(item.explanation.join(' '))}</p></div>${final?'':`<div class="reaction-row">${Object.entries(fabricLabels).map(([id,label])=>`<button data-reaction="${id}" data-direction="${esc(d.id)}">${esc(label)}</button>`).join('')}</div>`}<div class="actions">${f.sampleAvailable===true?`<a class="secondary" data-outcome="SAMPLE_INTENT" href="${esc(commerceLink(f,item,d,true))}">Order sample</a>`:''}<a class="primary" data-outcome="FABRIC_SELECTED" href="${esc(commerceLink(f,item,d,false))}">Make curtains</a></div></div></article>`;
      }catch{return `<article class="direction-card unavailable"><h2>${esc(d.label)}</h2><p>This exact fabric cannot currently be loaded. We have not substituted another fabric.</p></article>`;}
    }));
    stage.querySelector('.cards').innerHTML=parts.join('');
    if(!final){
      stage.querySelectorAll('[data-reaction]').forEach(b=>b.onclick=()=>{const d=view.directions.find(x=>x.id===b.dataset.direction);if(d?.cards[0])openFeedback(d,d.cards[0],b.dataset.reaction);});
      const finish=document.createElement('button'); finish.className='primary finish-edit'; finish.textContent='Refine my five directions