import {calculateWave, cm} from './wave-measurements.js';

const $ = s => document.querySelector(s);
const key = 'curtainsuk.plan.wave.v1';
const clips = [['measure','Check your measurements',7],['hooks','Place the hooks',3],
  ['carriers','Check the carriers',5.3],['connect','Hang in sequence',5.8],
  ['dress','Dress the waves',4.7],['finish','Check the finish',2.4]];
let data = {}, plan = null, step = 0, done = Array(6).fill(false), mode = 'edit', tie = null;
const save = () => {try { localStorage.setItem(key, JSON.stringify({data, step, done, mode, tie})); } catch {}};
const pause = () => document.querySelectorAll('video').forEach(v => v.pause());
const total = () => `${plan.totalHooks} hooks + ${plan.totalCarriers} linked carriers`;

function diagram() {
  const n = Number($('#measureForm').elements.width.value);
  const label = Number.isFinite(n) && n > 0 && n <= 2000 ? cm(n) : 'Your track width';
  const single = $('#measureForm').elements.panels.value === 'single';
  return `<svg viewBox="0 0 680 420" role="img" aria-label="Measure the fitted carrier run. Wave curtains use 8 cm carriers and 16 cm hook spacing."><defs><linearGradient id="waveFold"><stop stop-color="#a0a58d"/><stop offset=".5" stop-color="#f1efdf"/><stop offset="1" stop-color="#aeb59e"/></linearGradient></defs><rect width="680" height="420" fill="#eeeee5"/><rect x="125" y="115" width="430" height="260" fill="#fbfcf5"/><path d="M340 115V375M125 240H555" stroke="#dce4d6" stroke-width="5"/><path d="M60 66H620M60 58V74M620 58V74" stroke="#647167"/><text x="340" y="46" text-anchor="middle" font-size="20">${label}</text><rect x="58" y="94" width="564" height="11" rx="4" fill="#53634f"/>${[80,116,152,188,...(single?[224,260,296,332,368,404]:[468,504,540,576])].map(x=>`<rect x="${x}" y="110" width="38" height="270" rx="15" fill="url(#waveFold)"/><path d="M${x+19} 103v13" stroke="#718064" stroke-width="3"/>`).join('')}<text x="340" y="408" text-anchor="middle" font-size="13">${single?'One curtain across the track':'A pair meeting in the centre'}</text></svg>`;
}

function fitNote(p) {
  if (!p.fits) return `<div class="wave-check"><strong>${p.name}: check the measurements first</strong><p>${p.hooks} hooks at 16 cm span ${cm(p.hookSpan)}. Your ${cm(p.flat)} flat heading does not leave room at both ends. Check the width, supplied carrier count and workroom pattern before fitting.</p></div>`;
  if (p.needsCheck) return `<p class="note">Your ${cm(p.flat)} flat width differs from the Evans planning reference of ${cm(p.referenceFlat)}. Confirm the supplied first and last pockets. Keep the 16 cm intervals.</p>`;
  return '';
}

function hookTable(p) {
  const from = p.first === null ? 'first hook' : 'outside fabric edge';
  return `<div class="hook-table-wrap"><table class="hook-table"><caption>${p.name} · measured from the ${from}, towards the closing edge</caption><thead><tr><th scope="col">Hook</th><th scope="col">Position</th><th scope="col">Gap from previous</th></tr></thead><tbody>${p.positions.map((n,i)=>`<tr><th scope="row">${i+1}</th><td>${cm(n)}</td><td>${i?'16 cm':'Start'}</td></tr>`).join('')}</tbody></table></div>`;
}

function hookMap(p, index) {
  if (!p.fits) return `<article class="hook-map"><h3>${p.name}</h3>${fitNote(p)}<button data-edit>Edit measurements</button></article>`;
  const from = p.first === null ? 'first hook' : 'outside fabric edge';
  return `<article class="hook-map" data-panel="${index}"><p class="eyebrow">${p.name.toUpperCase()}</p><h3>${p.hooks} hooks. Every 16 cm.</h3><p>${p.first === null ? 'Start at the first pocket specified for your curtain. Positions below are measured from that hook.' : `First hook: ${cm(p.first)} from the outside fabric edge. Work towards the closing edge.`}</p><div class="hook-track" aria-label="${p.name} hook positions">${p.positions.map((n,i)=>`<button class="hook-point" data-hook="${i}" data-panel="${index}" aria-pressed="${i===0}" aria-label="Hook ${i+1}, ${cm(n)} from the ${from}"><b>${i+1}</b><span>${cm(n)}</span></button>`).join('')}</div><p class="hook-readout" aria-live="polite">Hook 1 · ${cm(p.positions[0])} from the ${from}.</p><div class="end-readings">${p.first === null ? `<div><span>First to last hook</span><strong>${cm(p.hookSpan)}</strong></div><div><span>Fabric shared between both ends</span><strong>${cm(p.endFabric)}</strong></div>` : `<div><span>Outside edge to first hook</span><strong>${cm(p.first)}</strong></div><div><span>Last hook to closing edge</span><strong>${cm(p.lastAllowance)}</strong></div>`}</div>${p.first === null ? '<p class="small">Add the supplied first-hook position to see exact edge measurements. End allowances are not assumed.</p><button data-first class="text-button">Add my first-hook position</button>' : '<p class="small">Use the supplied end fittings. Check these edge allowances at the window.</p>'}<details><summary>Every hook position</summary>${hookTable(p)}</details><div class="print-only">${hookTable(p)}</div></article>`;
}

function statCards(kind) {
  return `<div class="compact-summary">${plan.panels.map(p=>{
    const values = {
      measure: [cm(p.flat), `flat heading · ${cm(p.span)} track coverage`],
      hooks: [`${p.hooks} hooks`, '16 cm between hook centres'],
      carriers: [`${p.carriers} carriers`, '80 mm between linked carrier centres'],
      connect: [`${p.hooks} connections`, 'one hook into each carrier eye'],
      dress: [cm(p.span), `closed coverage · ${p.fullness.toFixed(2)}× fabric fullness`],
      finish: [cm(p.span), `closed coverage${plan.drop ? ' · '+cm(plan.drop)+' drop' : ''}`]
    }[kind];
    return `<div><span>${p.name}</span><strong>${values[0]}</strong><span>${values[1]}</span></div>`;
  }).join('')}</div>`;
}

function instructions() {
  return [
    {title:'Check the flat heading.', lead:'Keep the tape flat. There are no gathering cords to pull.', actions:[
      'Lay each curtain on a clean surface, with the heading tape facing you.',
      `Check your ${cm(plan.width)} track and the flat widths below.`,
      'Match the recommended hook count to your supplied carrier set and workroom pattern before fitting.'
    ], check:'Your widths, carrier set and supplied hook pattern agree.', extra:plan.panels.map(fitNote).join('')},
    {title:'Place the hooks, 16 cm apart.',lead:'Use the same woven pocket row along the tape.',actions:[
      'Start at the first pocket specified for your curtain. Keep correctly pre-fitted hooks in place.',
      'Slide each hook into its pocket. Measure 16 cm from hook centre to hook centre.',
      'Follow your numbered hook map. Check the fabric left at the outside and closing edges.'
    ],check:'Every hook is seated securely, in sequence, at 16 cm intervals.',extra:'<details><summary>See every hook position</summary>'+plan.panels.map(hookMap).join('')+'</details>'},
    {title:'Check the 80 mm carriers.',lead:'The carriers are connected by a cord that sets their spacing.',actions:[
      `Your planning count is ${plan.totalCarriers} carriers in total. Check each curtain's count below.`,
      'Gently extend the linking cord. Adjacent carrier centres should be 8 cm apart.',
      'Keep the carrier cord and supplied end fittings intact. If your fitted count differs, confirm the matched specification before proceeding.'
    ],check:'The carrier count matches the hooks and the linked spacing is 80 mm.',extra:'<p class="note">Wave curtains use linked carriers, not loose rings. Do not shorten the carrier cord to change the spacing.</p>'},
    {title:'Hook into each carrier.',lead:'Support the curtain as you work along the track.',actions:[
      'Start at the outside end and follow the supplied end-fitting arrangement.',
      'Place the first hook into its carrier eye. Attach every next hook to the next carrier.',
      'Keep the face fabric towards the room. Check the outer and leading hooks are connected as specified.'
    ],check:'One hook is attached to every intended carrier, with none skipped.',extra:plan.panels.map(p=>p.first!==null?`<p class="input-reading"><span>${p.name} · end allowances</span><strong>${cm(p.first)} outside / ${cm(p.lastAllowance)} closing edge</strong></p>`:'').join('')},
    {title:'Dress the waves.',lead:'One fold forwards. The next fold backwards.',actions:[
      'Alternate the heading folds along the track. Keep the same rhythm from end to end.',
      'Guide each fold down the length of the curtain with your hands.',
      'Close to the coverage shown below, then open and close gently to check the waves settle evenly.'
    ],check:'The folds alternate smoothly and the curtains meet neatly.',extra:'<p class="note">Keep the 16 cm hook pattern and 80 mm carrier cord unchanged while dressing.</p>'},
    {title:'Check the finish.',lead:'Make the final adjustments at your window.',actions:[
      'Check the hem, closing edges and free movement along the track.',
      'Steam only if the care label permits. Follow the steamer instructions and let the fabric cool and dry.',
      'If using tiebacks, hold them in place first and check the drape before fixing.'
    ],check:'The curtains move freely, close neatly and hang at the intended height.',extra:plan.drop?`<div class="metric"><span>Tieback styling starting point</span><strong>${cm(tie??plan.drop/3)} above the hem</strong><small>${cm(plan.drop-(tie??plan.drop/3))} below the top of your ${cm(plan.drop)} curtain. Adjust by eye before fixing.</small></div>`:'<p class="small">Add the actual curtain drop for a measured tieback starting point.</p>'}
  ][step];
}

function summary() {
  return `<div class="summary-title"><div><p class="eyebrow">YOUR MEASUREMENTS → YOUR PLAN</p><h2>Your wave hanging plan.</h2><p>${cm(plan.width)} track · ${plan.pair?'a pair':'one curtain'} · Evans EasiWave</p></div><div class="summary-actions"><button data-edit>Edit measurements</button><button id="print">Print / save PDF</button></div></div><div class="wave-metrics"><article><span>Recommended hooks</span><strong>${plan.totalHooks}</strong><small>One per carrier</small></article><article><span>Hook spacing on flat tape</span><strong>16 cm</strong><small>Centre to centre</small></article><article><span>Linked carrier spacing</span><strong>80 mm</strong><small>8 cm at full extension</small></article></div><div class="summary-grid">${plan.panels.map(p=>`<article class="plan-panel"><span class="status-tag">${p.needsCheck?'Measurements to check':'Planning count'}</span><p class="eyebrow">${p.name}</p><strong class="count-number">${p.hooks}</strong><span class="count-label">hooks + ${p.carriers} linked carriers</span><dl><div><dt>Closed track coverage</dt><dd>${cm(p.span)}</dd></div><div><dt>Your flat width</dt><dd>${cm(p.flat)}</dd></div><div><dt>First to last hook</dt><dd>${cm(p.hookSpan)}</dd></div><div><dt>Evans reference flat width</dt><dd>${cm(p.referenceFlat)}</dd></div></dl>${fitNote(p)}</article>`).join('')}</div><p class="wave-planning-note">Counts follow Evans' planning calculator. Check them against your supplied carrier set and end fittings before adding or moving hooks.</p><section class="hardware-summary"><p class="eyebrow">WHAT TO PREPARE</p><h3>${total()}</h3><p>Standard curtain hooks and the matching EasiWave carrier set. Keep any specified stop carrier or draw-rod fitting.</p></section><section class="hook-maps"><p class="eyebrow">YOUR NUMBERED HOOK MAP</p><h2>Know where every hook goes.</h2><p class="small">Tap a hook to see its measurement. Scroll along the tape for the remaining hooks.</p>${plan.panels.map(hookMap).join('')}</section><div class="guide-start"><div><p class="eyebrow">FOLLOW AT YOUR WINDOW</p><h2>Easy steps. Your own numbers.</h2><p>${done.filter(Boolean).length} of 6 steps done.</p></div><button id="startGuide" class="primary">${done.every(Boolean)?'Review my guide':'Start / continue my guide'} →</button></div><div class="plan-steps">${clips.map((c,i)=>`<button data-step="${i}"><span class="step-number">${done[i]?'✓':i+1}</span><span><b>${c[1]}</b><small>${c[2]} sec clip</small></span><span>→</span></button>`).join('')}</div><section class="finishing"><p class="eyebrow">AFTER HANGING</p><h2>Finish with care.</h2><div class="finish-grid"><article><h3>Steam if suitable</h3><p>Follow the fabric care label and steamer instructions. Let the curtain cool and dry before handling the folds again.</p></article><article><h3>Tieback position</h3>${plan.drop?`<label class="field">Height above the hem · cm<input id="tieHeight" type="number" step="0.1" min="0.1" value="${Number((tie??plan.drop/3).toFixed(1))}"></label><p id="tieResult" aria-live="polite">${cm(tie??plan.drop/3)} above the hem · ${cm(plan.drop-(tie??plan.drop/3))} below the top.</p><p class="small">One-third of your ${cm(plan.drop)} drop is a styling starting point. Check the drape before fixing.</p>`:'<p>Add the curtain drop for a measured tieback starting point.</p><button data-edit>Add drop</button>'}</article></div></section>`;
}

function render() {
  pause();
  $('.workspace').hidden = mode === 'summary';
  $('#setup').hidden = mode !== 'edit'; $('#lesson').hidden = mode !== 'step';
  $('#planSummary').hidden = mode !== 'summary'; $('#cancelEdit').hidden = !plan;
  if (mode === 'summary') $('#planSummary').innerHTML = summary();
  else if (mode === 'edit') {
    $('#sceneLabel').textContent = 'Your track and heading'; $('#scene').innerHTML = diagram();
    $('#visualControls').innerHTML = '<div class="spacing-key"><span>On the flat tape<b>16 cm</b>between hooks</span><span>On the extended cord<b>8 cm</b>between carriers</span></div>';
  } else {
    const c = clips[step], t = instructions();
    const blocked = [1,3].includes(step) && plan.panels.some(p=>!p.fits);
    $('#sceneLabel').textContent = `STEP ${step+1} · ${c[1]}`;
    $('#scene').innerHTML = `<div class="instruction-film wave-film"><video id="stepVideo" controls playsinline preload="metadata" poster="wave-media/${c[0]}.jpg"><source src="wave-media/${c[0]}.mp4" type="video/mp4"></video><p id="clipError" class="warning" hidden>Clip unavailable. Try Replay or watch the full video above.</p><div class="clip-caption"><span>${c[1]}</span><span>${c[2]} sec</span></div></div>`;
    $('#visualControls').innerHTML = '<button id="replay" class="primary full">▶ Play this short clip <span>↻ Replay anytime</span></button>';
    $('#stepVideo').addEventListener('error',()=>$('#clipError').hidden=false);
    $('#lesson').innerHTML = `<div class="step-meta"><p class="eyebrow">STEP ${step+1} OF 6</p><button id="overview" class="text-button">My plan & measurements</button></div><progress class="guide-progress" value="${step+1}" max="6" aria-label="Guide position"></progress><h2 id="stepTitle" tabindex="-1">${t.title}</h2><p class="lead">${t.lead}</p><ol>${t.actions.map(a=>`<li>${a}</li>`).join('')}</ol><p class="eyebrow">YOUR NUMBERS</p>${statCards(c[0])}${t.extra}${blocked?'<p class="wave-check">Correct the width or confirm your supplied specification before fitting hooks.</p>':''}<div class="before-next"><b>Before moving on</b><p>${t.check}</p></div><div class="navigation"><button id="back" ${step===0?'disabled':''}>← Back</button><button id="next" class="primary" ${blocked?'disabled':''}>${step===5?'Done, finish guide ✓':'Done, next step →'}</button></div><button data-edit class="text-button">Edit my measurements</button>`;
  }
  save();
}

function move(nextMode, nextStep = step) {
  mode = nextMode; step = nextStep; render();
  (mode==='summary'?$('#planSummary'):$('.workspace')).scrollIntoView?.({block:'start',behavior:'instant'});
  if (mode==='step') $('#stepTitle').focus({preventScroll:true});
}
function togglePair() {
  const single = $('#measureForm').elements.panels.value === 'single';
  document.querySelectorAll('.pairOnly').forEach(el=>el.hidden=single);
  $('#leftLabel').textContent=single?'Flat width · cm':'Left flat width · cm';
  $('#firstLeftLabel').textContent=single?'First hook · cm':'Left first hook · cm';
}
function populate() {
  $('#measureForm').reset();
  for (const [k,v] of Object.entries(data)) { const el=$('#measureForm').elements.namedItem(k); if(el)el.value=v; }
  togglePair(); $('#error').hidden=true;
}
$('#measureForm').addEventListener('input',()=>{togglePair();if(mode==='edit')$('#scene').innerHTML=diagram();});
$('#measureForm').addEventListener('submit',e=>{
  e.preventDefault();
  try {
    const next=Object.fromEntries(new FormData(e.target)), computed=calculateWave(next);
    if(JSON.stringify(next)!==JSON.stringify(data)){done=Array(6).fill(false);step=0;tie=null;}
    data=next;plan=computed;$('#error').hidden=true;move('summary');
  } catch(err) {$('#error').textContent=err.message;$('#error').hidden=false;$('#error').scrollIntoView?.({block:'nearest'});}
});
document.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.hasAttribute('data-full-film')) {
    pause();const v=$('#filmDialog video');
    const source=window.innerWidth<700?'wave-media/full-portrait-voice.mp4':'wave-media/full-voice.mp4';
    if(v.querySelector('source').getAttribute('src')!==source){v.querySelector('source').src=source;v.load();}
    $('#filmCaption').textContent='Wave curtains · 35 seconds · Narrated film';
    $('#filmDialog').showModal();v.currentTime=0;v.play().catch(()=>{});
  } else if(b.id==='closeFilm') $('#filmDialog').close();
  else if(b.hasAttribute('data-edit')||b.hasAttribute('data-first')) {
    populate();move('edit');
    if(b.hasAttribute('data-first')){$('#pocketDetails').open=true;$('#measureForm').elements.firstLeft.focus();}
  } else if(b.id==='cancelEdit'){populate();move('summary');}
  else if(b.dataset.hook!==undefined) {
    const p=plan.panels[Number(b.dataset.panel)],i=Number(b.dataset.hook),card=b.closest('.hook-map');
    card.querySelectorAll('.hook-point').forEach(button=>button.setAttribute('aria-pressed',String(button===b)));
    card.querySelector('.hook-readout').textContent=`Hook ${i+1} · ${cm(p.positions[i])} from the ${p.first===null?'first hook':'outside fabric edge'}${i?' · 16 cm after hook '+i:''}.`;
  } else if(b.dataset.step!==undefined)move('step',Number(b.dataset.step));
  else if(b.id==='startGuide')move('step',Math.max(0,done.findIndex(x=>!x)));
  else if(b.id==='overview')move('summary');
  else if(b.id==='back'&&step>0)move('step',step-1);
  else if(b.id==='next'&&!b.disabled){done[step]=true;step===5?move('summary'):move('step',step+1);}
  else if(b.id==='replay'){const v=$('#stepVideo');$('#clipError').hidden=true;v.currentTime=0;v.play().catch(()=>{});}
  else if(b.id==='print')window.print();
});
$('#filmDialog').addEventListener('close',()=>$('#filmDialog video').pause());
$('#filmDialog video').addEventListener('error',()=>$('#filmCaption').textContent='The film could not load. Reopen to retry, or use the individual step clips.');
document.addEventListener('ended',e=>{if(e.target.id==='stepVideo')$('#replay').textContent='↻ Replay this short clip';},true);
document.addEventListener('input',e=>{
  if(e.target.id!=='tieHeight')return;
  const n=Number(e.target.value);
  if(!Number.isFinite(n)||n<=0||n>=plan.drop){$('#tieResult').textContent='Enter a height between zero and the curtain drop.';return;}
  tie=n;$('#tieResult').textContent=`${cm(n)} above the hem · ${cm(plan.drop-n)} below the top.`;save();
});
try {
  const stored=JSON.parse(localStorage.getItem(key));
  if(stored?.data){plan=calculateWave(stored.data);data=stored.data;step=Number.isInteger(stored.step)&&stored.step>=0&&stored.step<6?stored.step:0;done=Array.from({length:6},(_,i)=>stored.done?.[i]===true);tie=Number.isFinite(stored.tie)&&stored.tie>0&&stored.tie<plan.drop?stored.tie:null;mode=['edit','summary','step'].includes(stored.mode)?stored.mode:'summary';populate();}
} catch {}
render();
window.addEventListener('beforeprint',()=>{if(plan)$('#planSummary').innerHTML=summary();});
