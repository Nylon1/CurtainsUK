(() => {
  const RULES = 'cuk-fitted-hardware-v1-2026-09-20';
  const STORE = 'curtainsuk.guided-measure.v1';
  const escape = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const positive = value => typeof value === 'string' && /^(?:\d+(?:\.\d+)?|\.\d+)$/.test(value) && Number.isFinite(Number(value)) && Number(value) > 0;
  const uid = () => globalThis.crypto && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const fresh = () => ({ version: RULES, id: uid(), step:'hardware', hardware:'', opening:'', heading:'', finish:'', width:'', drop:'', checkedWidth:'', checkedDrop:'', history:[], briefs:[] });
  const validStoredBrief = brief => {
    if (!brief || typeof brief !== 'object' || typeof brief.id !== 'string' || !Number.isInteger(brief.revision) || brief.revision < 1 || brief.measurementRuleVersion !== RULES || brief.customerConfirmation !== true || typeof brief.confirmedAt !== 'string' || !Number.isFinite(Date.parse(brief.confirmedAt))) return false;
    if (!['track','pole'].includes(brief.hardwareType) || !['standard','doors','wide','wall','bay'].includes(brief.openingType) || !['short','floor'].includes(brief.designIntent?.desiredFinish)) return false;
    if (brief.hardwareType === 'track' && !['wave','double_pinch','pencil'].includes(brief.designIntent?.heading)) return false;
    if (brief.openingType === 'bay' && (brief.hardwareType !== 'track' || brief.designIntent?.heading === 'wave')) return false;
    return ['width','drop'].every(key => positive(brief.rawMeasurements?.[key]?.value) && brief.rawMeasurements[key].unit === 'cm') && brief.workshopDerived === null && brief.confirmedProductionSpecification === null;
  };
  function init(root) {
    if (root.dataset.measureReady) return;
    root.dataset.measureReady = 'true';
    const copy = JSON.parse(root.querySelector('[data-measure-copy]').textContent);
    const t = key => copy[key] || key;
    const app = root.querySelector('[data-measure-app]');
    const inputId = `gm-value-${root.dataset.sectionId}`;
    let state = fresh(), storageOK = true, help = false;
    try {
      const saved = JSON.parse(localStorage.getItem(STORE) || 'null');
      if (saved && saved.version === RULES) {
        ['id','step','hardware','opening','heading','finish','width','drop','checkedWidth','checkedDrop'].forEach(k => { if (typeof saved[k] === 'string' && saved[k].length < 300) state[k] = saved[k]; });
        if (Array.isArray(saved.history)) state.history = saved.history;
        if (Array.isArray(saved.briefs)) state.briefs = saved.briefs.filter(validStoredBrief);
        if (!['hardware','opening','heading','width','finish','drop','check','brief'].includes(state.step)) state.step = 'hardware';
      }
    } catch (_) { storageOK = false; }
    const save = () => { try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (_) { storageOK = false; } };
    const isBay = () => state.opening === 'bay';
    const isWave = () => state.hardware === 'track' && state.heading === 'wave';
    const widthKey = () => JSON.stringify([RULES,state.hardware,state.opening]);
    const dropKey = () => JSON.stringify([RULES,state.hardware,state.opening,state.heading,state.finish]);
    const anchor = () => state.hardware === 'pole' ? 'bottom_pole' : isWave() ? 'bottom_track' : 'top_track';
    const rawAnchor = () => ({ width: state.hardware === 'pole' ? ['inner_left_finial_boundary','inner_right_finial_boundary'] : isBay() ? ['fitted_bay_track_start','fitted_bay_track_finish_along_complete_route'] : ['fitted_track_start','fitted_track_end'], drop: [anchor(), state.finish === 'floor' ? 'chosen_floor_point' : 'chosen_short_physical_endpoint'] });
    const validSetup = () => ['track','pole'].includes(state.hardware) && ['standard','doors','wide','wall','bay'].includes(state.opening) && (!isBay() || state.hardware === 'track') && (state.hardware !== 'track' || ['wave','double_pinch','pencil'].includes(state.heading)) && !(isBay() && isWave());
    const ready = () => validSetup() && ['short','floor'].includes(state.finish) && positive(state.width) && positive(state.drop) && state.checkedWidth === widthKey() && state.checkedDrop === dropKey();
    function restoreStep() {
      if (state.step === 'hardware') return;
      if (!['track','pole','none'].includes(state.hardware)) { state.step='hardware';return; }
      if (state.hardware === 'none') { state.step='opening';return; }
      if (state.step === 'opening') return;
      if (!['standard','doors','wide','wall','bay'].includes(state.opening)) { state.step='opening';return; }
      if (isBay() && state.hardware === 'pole') { state.step='width';return; }
      if (state.hardware === 'track' && !['wave','double_pinch','pencil','unknown'].includes(state.heading)) { state.step='heading';return; }
      if (state.step === 'heading') { if(state.hardware==='pole')state.step='width';return; }
      if (isBay() && isWave() || state.hardware==='track' && state.heading==='unknown') { state.step='width';return; }
      if (state.step === 'width') return;
      if (!positive(state.width) || state.checkedWidth !== widthKey()) { state.step='width';return; }
      if (state.step === 'finish') return;
      if (!['short','floor','soft_break','puddle'].includes(state.finish)) { state.step='finish';return; }
      if (['soft_break','puddle'].includes(state.finish)) { state.step='drop';return; }
      if (state.step === 'drop') return;
      if (!positive(state.drop) || state.checkedDrop !== dropKey()) { state.step='drop';return; }
      if (state.step === 'brief') {
        const brief=state.briefs[state.briefs.length-1];
        if (!brief || brief.hardwareType!==state.hardware || brief.openingType!==state.opening || brief.rawMeasurements.width.value!==state.width || brief.rawMeasurements.drop.value!==state.drop || brief.designIntent.desiredFinish!==state.finish || brief.designIntent.heading!==(state.hardware==='track'?state.heading:null)) state.step='check';
      }
    }
    function preserve(reason) {
      if (state.width || state.drop) state.history.push({ timestamp:new Date().toISOString(), reason, hardware:state.hardware, opening:state.opening, heading:state.heading, finish:state.finish, width:state.width, drop:state.drop, unit:'cm', checkedWidth:state.checkedWidth, checkedDrop:state.checkedDrop });
    }
    function change(key, value) {
      if (state[key] === value) return;
      preserve(`${key}_changed`);
      state[key] = value;
      if (['hardware','opening'].includes(key)) state.checkedWidth = '';
      if (['hardware','opening','heading','finish'].includes(key)) state.checkedDrop = '';
      save();
    }
    function go(step) { state.step = step; help = false; save(); render(true); }
    const button = (action, key, quiet = false) => `<button type="button" class="gmeasure__button${quiet ? ' gmeasure__button--quiet' : ''}" data-action="${action}">${escape(t(key))}</button>`;
    const link = (action,key) => `<button type="button" class="gmeasure__link" data-action="${action}">${escape(t(key))}</button>`;
    const contact = `<a class="gmeasure__button" href="mailto:enquiries@curtainsuk.com">${escape(t('contact'))}</a>`;
    const caption = `<figcaption>${escape(t('illustration'))}</figcaption>`;
    const text = (x,y,value,size=16,extra='') => `<text x="${x}" y="${y}" fill="#173e35" font-family="sans-serif" font-size="${size}" ${extra}>${escape(value)}</text>`;
    const tape = (x1,y1,x2,y2) => `<path class="gmeasure__tape" d="M${x1} ${y1}L${x2} ${y2}" fill="none" stroke="#173e35" stroke-width="3"/><circle cx="${x1}" cy="${y1}" r="5" fill="#173e35"/><circle cx="${x2}" cy="${y2}" r="5" fill="#173e35"/>`;
    function miniature(type) {
      let mark = '<path d="M8 14H92" stroke="currentColor" stroke-width="7"/>';
      if (type === 'pole') mark = '<path d="M13 16H87" stroke="currentColor" stroke-width="5"/><circle cx="8" cy="16" r="7" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="92" cy="16" r="7" fill="none" stroke="currentColor" stroke-width="2"/>';
      if (type === 'none') mark = '<path d="M10 25V5H90V25M2 30H98" fill="none" stroke="currentColor" stroke-width="2"/>';
      if (type === 'bay') mark = '<path d="M4 28L24 7H76L96 28" fill="none" stroke="currentColor" stroke-width="4"/>';
      if (['standard','doors','wide','wall'].includes(type)) mark = `<path d="M${type==='wide'?8:24} 29V3H${type==='wide'?92:76}V29ZM50 3V29" fill="none" stroke="currentColor" stroke-width="2"/>`;
      if (['wave','double_pinch','pencil'].includes(type)) mark = type==='wave' ? '<path d="M4 15Q12 0 20 15T36 15T52 15T68 15T84 15T100 15" fill="none" stroke="currentColor" stroke-width="3"/>' : type==='double_pinch' ? '<path d="M8 3L15 15L22 3M15 15L10 31M15 15L20 31M43 3L50 15L57 3M50 15L45 31M50 15L55 31M78 3L85 15L92 3M85 15L80 31M85 15L90 31" fill="none" stroke="currentColor" stroke-width="2"/>' : '<path d="M5 29L8 3L11 29L14 3L17 29L20 3L23 29L26 3L29 29L32 3L35 29L38 3L41 29L44 3L47 29L50 3L53 29L56 3L59 29L62 3L65 29L68 3L71 29L74 3L77 29L80 3L83 29L86 3L89 29L92 3L95 29" fill="none" stroke="currentColor" stroke-width="1.5"/>';
      if (['short','floor','soft_break','puddle'].includes(type)) { const lower = type==='short' ? 21 : 28; mark = `<path d="M10 31H95M28 0V${lower}H${type==='puddle'?79:type==='soft_break'?68:62}M62 0V${type==='floor'||type==='short'?lower:23}${type==='soft_break'?'L68 28':type==='puddle'?'Q65 32 70 28Q75 25 79 28':''}" fill="none" stroke="currentColor" stroke-width="2"/>`; }
      return `<svg viewBox="0 0 100 34" aria-hidden="true">${mark}</svg>`;
    }
    function diagram(mode, values = false, closeup = false) {
      const pole = state.hardware === 'pole', bay = isBay();
      const width = mode === 'width', drop = mode === 'drop', review = mode === 'review';
      const startY = pole ? 91 : isWave() ? 92 : 74;
      const finishY = state.finish === 'short' ? 238 : 314;
      if (closeup && drop) {
        const datumY=pole||isWave()?130:70;
        const endpoints=rawAnchor().drop;
        const shape=`<rect x="60" y="70" width="440" height="60" rx="${pole?24:5}" fill="#c6cdbf" stroke="#8a998d" stroke-width="2"/>`;
        const edge=`<path d="M85 ${datumY}H475" stroke="#173e35" stroke-width="4"/>`;
        const zoom='<rect width="560" height="270" fill="#efece3"/>'+shape+edge+`<path class="gmeasure__tape" d="M115 ${datumY}V222" stroke="#173e35" stroke-width="3" fill="none"/><circle cx="115" cy="${datumY}" r="7" fill="#173e35"/><circle cx="115" cy="${datumY}" r="17" fill="none" stroke="#a98955" stroke-width="2"/><path d="M108 216L115 225L122 216" fill="none" stroke="#173e35" stroke-width="3"/>`+text(280,40,t(anchor()),23,'text-anchor="middle"')+text(143,225,t('finish_point'),18);
        return `<figure class="gmeasure__visual"><svg data-visual="${pole?'pole':isWave()?'wave_track':'track'}-drop-anchor-detail" data-start-anchor="${escape(endpoints[0])}" data-end-anchor="${escape(endpoints[1])}" viewBox="0 0 560 270" role="img" aria-label="${escape(t(anchor()))}">${zoom}</svg>${caption}</figure>`;
      }
      const track = '<rect x="76" y="74" width="388" height="18" rx="3" fill="#b9c3b5" stroke="#173e35" stroke-width="2"/>';
      const hardware = pole ? '<path d="M81 83H459" stroke="#7e8e81" stroke-width="16"/><circle cx="65" cy="83" r="16" fill="#dedace" stroke="#8a998d" stroke-width="2"/><circle cx="475" cy="83" r="16" fill="#dedace" stroke="#8a998d" stroke-width="2"/>' : bay ? '<path d="M76 109L166 74H394L484 109V127L394 92H166L76 127Z" fill="#b9c3b5" stroke="#173e35" stroke-width="2"/>' : track;
      let content = '<rect width="560" height="350" fill="#efece3"/><path d="M35 314H530M126 294V113H414V294ZM270 113V294M126 205H414" stroke="#d0d2c8" fill="none" stroke-width="2"/>';
      if (bay && (width || review)) {
        content = '<rect width="560" height="350" fill="#efece3"/><path d="M57 250L157 88H403L503 250" stroke="#d6d8cf" stroke-width="20" fill="none"/><path d="M75 243L166 106H394L485 243" stroke="#829780" stroke-width="12" stroke-linejoin="round" fill="none"/><path class="gmeasure__tape" d="M75 243L166 106H394L485 243" stroke="#173e35" stroke-width="3" stroke-linejoin="round" fill="none"/><circle cx="75" cy="243" r="6" fill="#173e35"/><circle cx="485" cy="243" r="6" fill="#173e35"/>' + text(62,273,t('start'),16) + text(466,273,t('end'),16) + text(280,58,values ? `${t('width')}: ${state.width} ${t('cm')}` : t('full_route'),18,'text-anchor="middle"');
        if (review) content += text(280,310,`${t('drop')}: ${state.drop} ${t('cm')} · ${t('top_track')}`,16,'text-anchor="middle"');
      } else {
        content += hardware;
        if (width || review) {
          const left = pole ? 81 : 76, right = pole ? 459 : 464;
          content += `<path d="M${left} 50V${pole?83:74}M${right} 50V${pole?83:74}" stroke="#8a998d" stroke-width="1"/>` + tape(left,49,right,49) + text(280,32,values ? `${state.width} ${t('cm')}` : pole ? t('between_finials') : t('width'),18,'text-anchor="middle"');
        }
        if (drop || review) {
          const dropX = bay ? 180 : 100;
          content += `<path d="M60 ${finishY}H454" stroke="#a98955" stroke-width="1.5" stroke-dasharray="4 5"/>` + tape(dropX,startY,dropX,finishY) + text(dropX+20,startY+29,t(anchor()),17) + text(dropX+20,finishY-10,state.finish==='floor'?t('floor_point'):t('finish_point'),16);
          if (values) content += text(dropX+13,(startY+finishY)/2,`${state.drop} ${t('cm')}`,21);
          if (closeup) content += `<circle cx="${dropX}" cy="${startY}" r="13" fill="none" stroke="#a98955" stroke-width="3"/>`;
        }
      }
      const desc = width ? t(bay?'bay_width_copy':pole?'pole_width_copy':'track_width_copy') : t(pole?'pole_drop_copy':isWave()?'wave_drop_copy':'track_drop_copy');
      const anchors = rawAnchor()[width || (review && bay) ? 'width' : 'drop'];
      return `<figure class="gmeasure__visual"><svg data-visual="${bay?'bay':pole?'pole':isWave()?'wave_track':'track'}-${mode}" data-start-anchor="${escape(anchors[0])}" data-end-anchor="${escape(anchors[1])}" viewBox="${closeup && drop ? '45 45 465 285':'0 0 560 350'}" role="img" aria-label="${escape(desc)}">${content}</svg>${caption}</figure>`;
    }
    function scene() { return `<figure class="gmeasure__visual"><svg viewBox="0 0 560 260" role="img" aria-label="${escape(t('hardware_title'))}"><rect width="560" height="260" fill="#efece3"/><path d="M130 230V66H430V230ZM280 66V230M130 145H430M40 230H520" fill="none" stroke="#c2c9bc" stroke-width="2"/><path d="M91 44H469" stroke="#173e35" stroke-width="10"/><path d="M105 52V221M116 52V221M444 52V221M455 52V221" stroke="#c6c5b5" stroke-width="8"/></svg>${caption}</figure>`; }
    function choices(key, options) { return `<div class="gmeasure__choices" role="group" aria-labelledby="gm-title-${escape(root.dataset.sectionId)}">${options.map(value=>`<button type="button" class="gmeasure__choice" data-choice="${key}" data-value="${value}" aria-pressed="${state[key]===value}">${miniature(value)}<span>${escape(t(value))}${key==='finish'?`<small>${escape(t(value+'_detail'))}</small>`:''}</span></button>`).join('')}</div>`; }
    const actions = (back = true, confirm = false) => `<div class="gmeasure__actions">${back?button('back','back',true):'<span></span>'}${button(confirm?'confirm':'next',confirm?'confirm':'continue')}</div>`;
    function title(key, instruction) { return `<h2 id="gm-title-${escape(root.dataset.sectionId)}" tabindex="-1">${escape(t(key))}</h2>${instruction?`<p class="gmeasure__instruction">${escape(t(instruction))}</p>`:''}`; }
    function helpBlock(step) {
      let key='general_help';
      if (step==='width') key=isBay()?'bay_help':state.hardware==='pole'?'pole_help':'track_help';
      if (step==='drop') key=state.hardware==='pole'?'pole_drop_help':isWave()?'wave_help':'top_help';
      if (step==='finish') key='finish_help';
      return `${link('help',help?'close_help':'unsure')}<aside class="gmeasure__help" ${help?'':'hidden'}>${['width','drop'].includes(step)?diagram(step,false,true):''}<p>${escape(t(key))}</p><p>${escape(t('still_unsure'))}</p>${contact}</aside>`;
    }
    function stop(kind) {
      const keys = {none:['stop_title','stop_copy'],bayPole:['bay_pole_title','bay_pole_copy'],bayWave:['bay_wave_title','bay_wave_copy'],unknown:['heading_title','unknown_heading'],finish:['finish_review_title','finish_review_copy']}[kind];
      return `<div data-stop="${kind}">` + title(...keys) + (kind==='none'?scene():'') + `<div class="gmeasure__stop-actions">${contact}${kind==='none'||kind==='bayPole'?`<a class="gmeasure__button gmeasure__button--quiet" href="/pages/how-to-fit">${escape(t('fitting'))}</a>`:''}</div>` + (kind==='bayWave'?button('change-heading','change_heading',true):kind==='finish'?button('choose-finish','choose_finish',true):button('back','back',true)) + '</div>';
    }
    function row(key,value,edit) { return `<div class="gmeasure__row"><span>${escape(t(key))}</span><span><strong>${escape(value)}</strong>${edit?link('edit-'+edit,'edit'):''}</span></div>`; }
    function summary(edit = false) {
      return `<h3>${escape(t('raw'))}</h3><div class="gmeasure__details">${row('width',`${state.width} ${t('cm')}`,edit?'width':'')}${row('drop',`${state.drop} ${t('cm')}`,edit?'drop':'')}</div><h3>${escape(t('intent'))}</h3><div class="gmeasure__details">${row('hardware',t(state.hardware))}${row('opening',t(state.opening))}${row('heading',state.hardware==='track'?t(state.heading):t('not_selected'))}${row('finish',t(state.finish),edit?'finish':'')}</div>`;
    }
    function render(focus = false) {
      let step=state.step, body='';
      if (step!=='hardware' && state.hardware==='none') body=stop('none');
      else if (!['hardware','opening'].includes(step) && isBay() && state.hardware==='pole') body=stop('bayPole');
      else if (!['hardware','opening','heading'].includes(step) && isBay() && isWave()) body=stop('bayWave');
      else if (!['hardware','opening','heading'].includes(step) && state.hardware==='track' && state.heading==='unknown') body=stop('unknown');
      else if (['drop','check','brief'].includes(step) && ['soft_break','puddle'].includes(state.finish)) body=stop('finish');
      else if (step==='hardware') body=title('hardware_title','hardware_copy')+scene()+choices('hardware',['track','pole','none'])+actions(false)+helpBlock(step);
      else if (step==='opening') body=title('opening_title','opening_copy')+choices('opening',['standard','doors','wide','wall','bay'])+actions()+helpBlock(step);
      else if (step==='heading') body=title('heading_title','heading_copy')+choices('heading',['wave','double_pinch','pencil','unknown'])+actions()+helpBlock(step);
      else if (step==='finish') body=title('finish_title','finish_copy')+choices('finish',['short','floor','soft_break','puddle'])+actions()+helpBlock(step);
      else if (step==='width'||step==='drop') {
        const key=step==='width'?(isBay()?'bay_width':state.hardware==='pole'?'pole_width':'track_width'):(isBay()?'bay_drop':state.hardware==='pole'?'pole_drop':isWave()?'wave_drop':'track_drop');
        const stale=state[step] && state[step==='width'?'checkedWidth':'checkedDrop'] !== (step==='width'?widthKey():dropKey());
        body=title(key+'_title',key+'_copy')+diagram(step)+(stale?`<p class="gmeasure__notice">${escape(t('recheck'))}</p>`:'')+`<form data-measure-form novalidate><label class="gmeasure__input-label" for="${escape(inputId)}">${escape(t(step+'_label'))}</label><div class="gmeasure__number"><input id="${escape(inputId)}" name="${step}" type="text" inputmode="decimal" autocomplete="off" maxlength="64" spellcheck="false" value="${escape(state[step])}" aria-describedby="gm-unit-${escape(root.dataset.sectionId)} gm-error-${escape(root.dataset.sectionId)}"><span id="gm-unit-${escape(root.dataset.sectionId)}">${escape(t('cm'))}</span></div>${actions()}</form>`+helpBlock(step);
      } else if (step==='check') body=title('check_title','check_copy')+diagram('review',true)+(isBay()?diagram('drop',true):'')+summary(true)+link('edit-hardware','edit_setup')+`<p class="gmeasure__notice">${escape(t(isBay()?'bay_review':'check_review'))}</p>`+actions(true,true)+helpBlock(step);
      else if (step==='brief' && state.briefs.length) {
        const brief=state.briefs[state.briefs.length-1];
        body=`<div data-brief>${title('brief_title','brief_copy')}${diagram('review',true)}${isBay()?diagram('drop',true):''}${summary()}<p class="gmeasure__notice">${escape(t('review_required'))}. ${escape(t('not_manufacturing'))}</p><div class="gmeasure__brief-meta">${escape(t('brief_id'))}: ${escape(brief.id)}<br>${escape(t('revision'))}: ${escape(brief.revision)}<br>${escape(t('recorded'))}: ${escape(brief.confirmedAt)}<br>${escape(t('rules'))}: ${escape(RULES)}</div><p class="gmeasure__note">${escape(t('brief_local'))}</p><div class="gmeasure__export">${button('download','download')}${button('print','print',true)}${button('copy','copy',true)}</div><p data-status role="status"></p>${link('edit-width','edit_brief')}</div>`;
      } else { state.step='hardware'; render(focus); return; }
      const active=['width'].includes(step)?1:['finish','drop'].includes(step)?2:['check','brief'].includes(step)?3:0;
      app.innerHTML=`<ol class="gmeasure__progress" aria-label="${escape(t('eyebrow'))}">${['setup','width','drop','check'].map((k,i)=>`<li ${i===active?'aria-current="step"':''}>${escape(t(k))}</li>`).join('')}</ol><div class="gmeasure__screen" data-step="${escape(step)}">${body}<p id="gm-error-${escape(root.dataset.sectionId)}" class="gmeasure__error" role="alert" hidden></p></div><p class="gmeasure__storage">${escape(t(storageOK?'storage':'storage_failed'))}</p>`;
      app.hidden=false;
      if (focus) { const heading=app.querySelector('h2');heading?.focus({preventScroll:true});heading?.scrollIntoView({block:'start',behavior:'auto'}); }
    }
    function error(key) { const el=app.querySelector('.gmeasure__error');el.textContent=t(key);el.hidden=false;app.querySelector('input')?.setAttribute('aria-invalid','true');el.scrollIntoView({block:'nearest',behavior:'auto'}); }
    function next() {
      const step=state.step;
      if (step==='hardware') { if(!['track','pole','none'].includes(state.hardware))return error('choose');go('opening'); }
      else if(step==='opening') { if(!['standard','doors','wide','wall','bay'].includes(state.opening))return error('choose');go(state.hardware==='track'?'heading':'width'); }
      else if(step==='heading') { if(!['wave','double_pinch','pencil','unknown'].includes(state.heading))return error('choose');go('width'); }
      else if(step==='width'||step==='drop') { if(!positive(state[step]))return error('invalid');state[step==='width'?'checkedWidth':'checkedDrop']=step==='width'?widthKey():dropKey();save();go(step==='width'?'finish':'check'); }
      else if(step==='finish') { if(!['short','floor','soft_break','puddle'].includes(state.finish))return error('choose');go('drop'); }
    }
    function back() {
      const paths={opening:'hardware',heading:'opening',width:state.hardware==='track'?'heading':'opening',finish:'width',drop:'finish',check:'drop',brief:'check'};
      go(paths[state.step]||'hardware');
    }
    function confirm() {
      if(!ready())return error('check_incomplete');
      const now=new Date().toISOString(), anchors=rawAnchor();
      const brief={ id:state.id,revision:state.briefs.length+1,measurementRuleVersion:RULES,confirmedAt:now,customerConfirmation:true,hardwareType:state.hardware,openingType:state.opening,rawMeasurements:{width:{value:state.width,unit:'cm',startAnchor:anchors.width[0],endAnchor:anchors.width[1],path:isBay()?'complete_fitted_track_route':'horizontal_fitted_hardware_span'},drop:{value:state.drop,unit:'cm',startAnchor:anchors.drop[0],endAnchor:anchors.drop[1],path:'vertical_to_chosen_physical_finish'},additionalReadings:[]},designIntent:{heading:state.hardware==='track'?state.heading:null,desiredFinish:state.finish},evidence:{photos:[],earlierRawReadings:JSON.parse(JSON.stringify(state.history))},reviewState:isBay()?'bay_workroom_review_required':'workroom_review_required_before_production',validationStatus:'raw_customer_fields_complete',workshopDerived:null,confirmedProductionSpecification:null,deliveryStatus:'saved_on_customer_browser_not_submitted'};
      state.briefs.push(JSON.parse(JSON.stringify(brief)));save();go('brief');
    }
    app.addEventListener('input',event=>{const input=event.target.closest('input[name]');if(!input)return;const key=input.name;if(!['width','drop'].includes(key))return;if(state[key]!==input.value){preserve(`${key}_edited`);state[key]=input.value;state[key==='width'?'checkedWidth':'checkedDrop']='';save();}input.removeAttribute('aria-invalid');const err=app.querySelector('.gmeasure__error');if(err)err.hidden=true;});
    app.addEventListener('submit',event=>{event.preventDefault();next();});
    app.addEventListener('click',async event=>{
      const choice=event.target.closest('[data-choice]');if(choice){const key=choice.dataset.choice,value=choice.dataset.value;change(key,value);render();app.querySelector(`[data-choice="${key}"][data-value="${value}"]`)?.focus({preventScroll:true});return;}
      const btn=event.target.closest('[data-action]');if(!btn)return;const action=btn.dataset.action;
      if(action==='next')next();else if(action==='back')back();else if(action==='help'){help=!help;render();app.querySelector('.gmeasure__help')?.scrollIntoView({block:'nearest',behavior:'auto'});}
      else if(action==='change-heading')go('heading');else if(action==='choose-finish')go('finish');else if(action.startsWith('edit-'))go(action.slice(5));else if(action==='confirm')confirm();
      else if(action==='download'){const brief=state.briefs[state.briefs.length-1];if(!brief)return;const url=URL.createObjectURL(new Blob([JSON.stringify(brief,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`CurtainsUK-measurement-${brief.id}-r${brief.revision}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
      else if(action==='print')window.print();else if(action==='copy'){const brief=state.briefs[state.briefs.length-1];if(!brief)return;try{await navigator.clipboard.writeText(JSON.stringify(brief,null,2));app.querySelector('[data-status]').textContent=t('copied');}catch(_){app.querySelector('[data-status]').textContent=t('copy_failed');}}
    });
    restoreStep();
    render();
  }
  document.querySelectorAll('[data-guided-measure]').forEach(init);
  document.addEventListener('shopify:section:load',event=>{event.target.querySelectorAll('[data-guided-measure]').forEach(init);});
})();
