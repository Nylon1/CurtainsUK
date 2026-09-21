(function () {
  'use strict';
  const Store = window.CurtainsUKRooms;
  if (!Store) return;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  const money = value => new Intl.NumberFormat('en-GB', { style:'currency', currency:'GBP' }).format(value / 100);
  const names = { PENCIL_PLEAT:'Pencil Pleat', DOUBLE_PINCH:'Double Pinch Pleat', WAVE:'Wave', EYELET:'Eyelet', TRACK:'Track', POLE:'Pole', PAIR:'Pair', SINGLE:'Single', BLACKOUT:'Blackout', STANDARD:'Standard', UNLINED:'Unlined', THERMAL:'Thermal', BONDED:'Bonded', FLOOR:'Floor', SHORT:'Short', SOFT_BREAK:'Soft Break', PUDDLE:'Puddle' };
  const human = value => names[value] || String(value || '').replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const BROWSE = '/pages/fabric-library?view=browse-fabrics';
  const INTELLIGENCE = '/apps/curtainsuk-decision/consultation?experience=premium&entry=match';
  const page = '/pages/build-my-rooms';
  async function command(base, action, payload) {
    const response = await fetch(`${base.replace(/\/$/, '')}/rooms`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ action, payload }), cache:'no-store' });
    const result = await response.json();
    if (!response.ok) throw Error(result.error || 'We could not check your curtain just now. Your rooms remain saved. Please try again.');
    return result;
  }
  function imageUrl(value) { if(typeof value !== 'string' || !value) return ''; try { const url = new URL(value, location.origin); return url.protocol === 'https:' || (url.origin === location.origin && url.protocol === 'http:') ? url.href : ''; } catch { return ''; } }
  function spec(curtain) {
    const c = curtain.configuration;
    return [['Opening',human(c.windowSlug)],['Hardware',human(c.hardware)],['Heading',human(c.heading)],['Width × drop',`${c.widthCm} × ${c.dropCm} cm`],['Lining',human(c.lining)],['Pair / single',human(c.construction)],...(c.desiredFinish ? [['Finish',human(c.desiredFinish)]] : [])];
  }
  function reviewPayload(house, postcode) { return { house_id:house.house_id, revision:house.revision, postcode, rooms:house.rooms.map(room=>({ room_id:room.room_id, room_name:room.room_name, curtains:room.curtains.map(c=>({configuration_id:c.configuration_id, receipt:c.receipt, window_name:c.window_name})) })) }; }

  // A narrow integration hook: only an already server-priced configurator can call this.
  window.CurtainsUKRoomsFlow = {
    async add(evaluation, base, options) {
      const retained = await command(base, 'retain', { configuration:evaluation.configuration, configurationId:evaluation.calculation.configurationId, priceConfirmationToken:evaluation.calculation.reviewSubmissionToken });
      const saved = await Store.addCurtain(retained, options);
      localStorage.removeItem(Store.INTENT_KEY);
      location.assign(`${page}?added=${encodeURIComponent(saved.room.room_id)}`);
    },
    prepare(root) {
      const form = root.querySelector('[data-cuk-checkout-form]');
      if (!form || root.dataset.roomsEnabled !== 'true') return;
      const saved = Store.ensure();
      const intent = Store.readIntent();
      const selected = saved.rooms.find(room=>room.room_id===intent?.room_id);
      form.querySelectorAll('.cuk-field').forEach(el=>{ el.hidden=true; el.querySelectorAll('input,select').forEach(input=>input.required=false); });
      form.querySelector('h2').textContent = 'Make room for your curtains.';
      const box = document.createElement('div'); box.className='cukrooms-add';
      box.innerHTML = `<label for="RoomsChoice">Which room is this curtain for?</label><select id="RoomsChoice" name="roomId"><option value="">A new room</option>${saved.rooms.map(room=>`<option value="${escape(room.room_id)}">${escape(room.room_name)}</option>`).join('')}</select><div data-room-name><label for="RoomsName">Room name <small>(optional)</small></label><input id="RoomsName" name="roomName" maxlength="80" list="RoomsSuggestions" placeholder="Room ${saved.rooms.length+1}"><datalist id="RoomsSuggestions">${['Living Room','Dining Room','Main Bedroom','Bedroom','Kitchen','Home Office','Nursery / Child’s Room','Other'].map(name=>`<option value="${name}">`).join('')}</datalist></div><p>Your rooms save automatically on this device. Price and availability are checked again before checkout.</p>`;
      form.insertBefore(box, form.querySelector('button[type=submit]'));
      if(selected) form.elements.roomId.value=selected.room_id;
      const toggle = ()=>{box.querySelector('[data-room-name]').hidden=Boolean(form.elements.roomId.value);};
      form.elements.roomId.addEventListener('change',toggle); toggle();
      form.querySelector('button[type=submit]').textContent='Add to my rooms';
    }
  };

  document.querySelectorAll('[data-cuk-rooms]').forEach(root=>{
    let house, review=null, reviewing=false;
    let postcode='';
    const base=root.dataset.engineBase || '/apps/curtainsuk-decision';
    function error(message) { const box=root.querySelector('[data-rooms-error]'); if(box){box.textContent=message;box.hidden=false;box.focus();} }
    function sync(){try{house=Store.ensure();review=null;render();}catch(e){root.innerHTML=`<div class="cukrooms__empty"><h1>Build My Rooms</h1><p role="alert">${escape(e.message)}</p><a href="mailto:support@curtainsuk.com">Contact CurtainsUK</a></div>`;}}
    async function mutate(callback){try{house=await Store.change(house.revision,callback);review=null;render();return true;}catch(e){sync();error(e.message);return false;}}
    function card(curtain, room) {
      const headingKeys = { WAVE:'headingWave', DOUBLE_PINCH:'headingDoublePinch', PENCIL_PLEAT:'headingPencilPleat', EYELET:'headingEyelet' };
      const url=imageUrl(curtain.fabric.imageUrl), headingAsset=imageUrl(root.dataset[headingKeys[curtain.configuration.heading]]);
      return `<article class="cukrooms__card" data-curtain="${escape(curtain.configuration_id)}"><div class="cukrooms__visual"><span class="cukrooms__visual-label">Your chosen fabric</span>${url?`<img class="cukrooms__photo" src="${escape(url)}" alt="${escape(curtain.fabric.design)} — ${escape(curtain.fabric.colour)} fabric photograph" loading="lazy">`:`<div class="cukrooms__visual-empty">${escape(curtain.fabric.design)}<br>Fabric photograph unavailable.<br>Your curtain is still saved.</div>`}<figure><figcaption>Fabric photograph, not a finished-curtain preview. A sample helps you judge colour and texture.</figcaption></figure></div><div class="cukrooms__detail"><p class="cukrooms__eyebrow">${escape(curtain.window_name)}</p><h3>${escape(curtain.fabric.design)}</h3><p class="cukrooms__colour">${escape(curtain.fabric.colour)} · ${escape(curtain.fabric.brand || curtain.fabric.supplier)}</p><dl class="cukrooms__specs">${spec(curtain).map(([key,value])=>`<div><dt>${key}</dt><dd>${escape(value)}</dd></div>`).join('')}</dl>${headingAsset?`<div class="cukrooms__heading-study"><img src="${escape(headingAsset)}" alt="Neutral ${escape(human(curtain.configuration.heading))} heading study"><div><p>${escape(human(curtain.configuration.heading))}</p><p>Neutral form study. It does not depict this fabric or your dimensions.</p></div></div>`:''}<div class="cukrooms__price"><strong>${money(curtain.last_validated_price)}</strong><button class="cukrooms__remove" data-remove="${escape(curtain.configuration_id)}" data-room="${escape(room.room_id)}" aria-label="Remove curtain from ${escape(room.room_name)} — ${escape(curtain.window_name)}">Remove curtain</button></div><a class="cukrooms__reuse" href="/pages/curtain-visualiser?fabric=${encodeURIComponent(curtain.fabric_master_id)}&rooms_new=1" data-reuse>Use this fabric in another room ↗</a></div></article>`;
    }
    function renderReview() {
      if(!review) return '';
      return `<section class="cukrooms__review" id="rooms-review" tabindex="-1"><p class="cukrooms__eyebrow">One last look</p><h2>Review My Rooms</h2><p>${review.ready?'Your rooms are ready to review.':'Some curtains need your attention. All your rooms remain saved.'}</p>${review.lines.map(line=>`<div class="cukrooms__review-line"><strong>${escape(line.room_name)} — ${escape(line.window_name)}</strong>${line.configuration?`<p>${escape(line.fabric.design)} — ${escape(line.fabric.colour)}</p><p>${spec({configuration:line.configuration}).map(([key,value])=>`${escape(key)}: ${escape(value)}`).join(' · ')}</p>`:''}<p>${line.status==='PRICE_CHANGED'?`The price has changed from ${money(line.previousPrice)} to ${money(line.currentPrice)}.`:escape(line.message)}</p>${line.status==='PRICE_CHANGED'?`<label class="cukrooms__check"><input type="checkbox" data-price-ack="${escape(line.configuration_id)}">I accept this updated price.</label>`:''}</div>`).join('')}<p>${escape(review.deliveryMessage)}</p><label class="cukrooms__check"><input type="checkbox" data-confirm-measurements>I confirm the measurements and selections shown above are correct.</label><p class="cukrooms__notice">Made to your specification. Please check each curtain carefully. To change a curtain, remove it and configure it again.</p><p class="cukrooms__notice">After ordering, need to request a change? Email us within 2 hours at <a href="mailto:enquiries@curtainsuk.com">enquiries@curtainsuk.com</a>. We’ll review your request and get in touch. Changes are not guaranteed; statutory rights remain unaffected.</p><button class="cukrooms__primary" data-checkout disabled>Continue to secure checkout</button>${!review.checkoutEnabled?'<p class="cukrooms__notice">Unpublished preview: combined checkout is awaiting the multi-curtain order-review release. No payment can be taken here.</p>':''}</section>`;
    }
    function render(){
      const total=Store.totals(house);
      const added=house.rooms.find(room=>room.room_id===new URLSearchParams(location.search).get('added'));
      root.innerHTML=`<div class="cukrooms__wrap"><header class="cukrooms__intro"><div><p class="cukrooms__eyebrow">CurtainsUK · Your home, considered</p><h1>Build My Rooms</h1><p>Your curtains, room by room.<br>A home that comes together, one window at a time.</p></div><span class="cukrooms__saved" role="status">Your rooms are saved on this device</span></header><div class="cukrooms__message" role="alert" tabindex="-1" data-rooms-error hidden></div>${added?`<p class="cukrooms__message">${escape(added.room_name)} added to your home. Which room would you like to do next?</p>`:''}${total.curtains===0&&house.rooms.length===0?`<section class="cukrooms__empty"><p class="cukrooms__eyebrow">Every room begins with a fabric</p><h2>Start your first room</h2><p>Find a fabric you love, make it yours, then bring your curtains together here. Add a single window or work your way around your home.</p><a class="cukrooms__primary" href="${INTELLIGENCE}">Find my fabric →</a><a class="cukrooms__secondary" href="${BROWSE}">Browse fabrics</a></section>`:`<div class="cukrooms__layout"><div class="cukrooms__list">${house.rooms.map((room,index)=>`<section class="cukrooms__room"><header class="cukrooms__roomhead"><div><p class="cukrooms__eyebrow">Room ${String(index+1).padStart(2,'0')} · ${room.curtains.length} ${room.curtains.length===1?'window':'windows'}</p><h2>${escape(room.room_name)}</h2></div><button class="cukrooms__organise" data-organise="${escape(room.room_id)}" aria-label="Organise ${escape(room.room_name)}">Organise room</button></header>${room.curtains.map(c=>card(c,room)).join('')}<button class="cukrooms__add-window" data-add-window="${escape(room.room_id)}">+ Add another window to ${escape(room.room_name)}</button></section>`).join('')}<button class="cukrooms__add-room" data-add-room>+ Add another room</button><div class="cukrooms__discovery"><a href="${INTELLIGENCE}" data-new-room>Find fabric for another room ↗</a><a href="${BROWSE}" data-new-room>Browse fabrics ↗</a></div>${renderReview()}</div><aside class="cukrooms__summary" aria-label="Your house summary"><p class="cukrooms__eyebrow">Coming together</p><h2>Your home so far</h2><p>${total.rooms} ${total.rooms===1?'room':'rooms'} · ${total.curtains} curtain ${total.curtains===1?'configuration':'configurations'}</p><dl><div><dt>Curtains subtotal</dt><dd>${money(review?.goods ?? total.subtotal)}</dd></div><div><dt>Delivery</dt><dd>${review?.delivery!=null?money(review.delivery):'Confirmed at review'}</dd></div><div class="cukrooms__total"><dt>House total</dt><dd>${review?.total!=null?money(review.total):'Awaiting delivery'}</dd></div></dl><p>VAT included. Saved prices and availability are checked again before checkout.</p><form data-review-form><label class="cukrooms__postcode">UK Mainland postcode<input class="cukrooms__input" name="postcode" autocomplete="postal-code" maxlength="8" required value="${escape(postcode)}"></label><button class="cukrooms__primary" type="submit" ${reviewing||!total.curtains?'disabled':''}>${reviewing?'Checking your rooms…':'Review My Rooms →'}</button></form><p>To change a curtain, remove it and configure it again.</p><a href="${BROWSE}">Back to Browse Fabrics</a></aside></div>${total.curtains?`<div class="cukrooms__mobile-review"><span><small>Curtains subtotal · VAT included</small>${money(review?.goods ?? total.subtotal)}</span><a href="#rooms-summary">Review My Rooms →</a></div>`:''}`}</div>`;
      root.querySelector('.cukrooms__summary')?.setAttribute('id','rooms-summary');
      root.querySelectorAll('img').forEach(img=>img.addEventListener('error',()=>{const fallback=document.createElement('p');fallback.className='cukrooms__visual-empty';fallback.textContent='Photograph unavailable. Your curtain is still saved.';img.replaceWith(fallback);},{once:true}));
      root.querySelectorAll('[data-remove]').forEach(button=>button.onclick=()=>dialog('Remove this curtain?', 'Your other curtains will stay saved. To change this curtain, configure it again.', null, async()=>mutate(next=>{const room=Store.roomById(next,button.dataset.room);room.curtains=room.curtains.filter(c=>c.configuration_id!==button.dataset.remove);if(Store.totals(next).curtains===0)next.rooms=[];}),'Remove curtain'));
      root.querySelectorAll('[data-organise]').forEach(button=>button.onclick=()=>{const room=Store.roomById(house,button.dataset.organise);dialog('Organise your room','Room names help organise your home. Curtain specifications stay fixed.',room.room_name,async value=>mutate(next=>{Store.roomById(next,room.room_id).room_name=Store.name(value,room.room_name);}),'Rename room',async()=>{dialog('Remove this room?',`This removes ${room.curtains.length} saved curtains from ${room.room_name}. Other rooms stay saved.`,null,async()=>mutate(next=>{next.rooms=next.rooms.filter(r=>r.room_id!==room.room_id);if(Store.totals(next).curtains===0)next.rooms=[];}),'Remove room');});});
      root.querySelector('[data-add-room]')?.addEventListener('click',()=>dialog('Which room is next?','Give your next room a name, or leave it blank.', '',async value=>{let roomId;const saved=await mutate(next=>{roomId=Store.addRoom(next,value).room_id;});if(saved&&roomId)chooseFabric(roomId);},'Add room'));
      root.querySelectorAll('[data-add-window]').forEach(button=>button.onclick=()=>chooseFabric(button.dataset.addWindow));
      root.querySelectorAll('[data-reuse],[data-new-room]').forEach(link=>link.addEventListener('click',()=>Store.intent(null)));
      root.querySelector('[data-review-form]')?.addEventListener('submit',async event=>{
        event.preventDefault(); if(reviewing)return; postcode=event.target.elements.postcode.value;review=null;reviewing=true;render();
        const submittedRevision=house.revision;
        try{const result=await command(base,'review',reviewPayload(house,postcode)); if(Store.read().revision!==submittedRevision){sync();throw Error('Your rooms changed while we checked them. Please review again.');}review=result;}catch(e){error(e.message);}finally{reviewing=false;const message=root.querySelector('[data-rooms-error]')?.textContent;render();if(message)error(message);root.querySelector('#rooms-review')?.focus();}
      });
      const updateCheckout=()=>{const button=root.querySelector('[data-checkout]');if(button)button.disabled=!(review?.ready&&review.checkoutEnabled&&root.querySelector('[data-confirm-measurements]')?.checked&&[...root.querySelectorAll('[data-price-ack]')].every(input=>input.checked));};
      root.querySelectorAll('[data-confirm-measurements],[data-price-ack]').forEach(input=>input.addEventListener('change',updateCheckout));
      root.querySelector('[data-checkout]')?.addEventListener('click',()=>error('Combined checkout is not released in this preview. Your saved rooms are safe.'));
    }
    function dialog(title,copy,value,accept,label,remove){
      const d=document.createElement('dialog');d.className='cukrooms cukrooms__dialog';
      d.innerHTML=`<form method="dialog"><h2>${escape(title)}</h2><p>${escape(copy)}</p>${value!==null?`<label>Room name<input class="cukrooms__input" name="name" maxlength="80" value="${escape(value)}"></label>`:''}<div class="cukrooms__dialog-actions"><button class="cukrooms__primary" value="confirm">${escape(label)}</button><button class="cukrooms__secondary" value="cancel" formnovalidate>Cancel</button></div>${remove?'<button class="cukrooms__remove" value="remove" formnovalidate>Remove entire room</button>':''}</form>`;
      document.body.append(d);d.showModal();d.addEventListener('close',async()=>{const result=d.returnValue, entered=d.querySelector('input')?.value;d.remove();if(result==='confirm')await accept(entered);if(result==='remove')remove();});
    }
    function chooseFabric(roomId){Store.intent(roomId);const room=Store.roomById(house,roomId);const d=document.createElement('dialog');d.className='cukrooms cukrooms__dialog';d.innerHTML=`<h2>${escape(room.room_name)}</h2><p>Find a fabric for your next window.</p><a class="cukrooms__primary" href="${INTELLIGENCE}">Let Fabric Intelligence guide me</a><p><a class="cukrooms__secondary" href="${BROWSE}">Browse fabrics</a></p><form method="dialog"><button class="cukrooms__remove">Back to my rooms</button></form>`;document.body.append(d);d.showModal();d.addEventListener('close',()=>d.remove());}
    window.addEventListener('storage',event=>{if(event.key===Store.KEY)sync();});
    window.addEventListener('pageshow',event=>{if(event.persisted)sync();});
    sync();
  });
})();
