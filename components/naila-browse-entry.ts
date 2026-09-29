import { premiumProxyCapability } from './curtainsuk-premium-proxy-transport';
import { premiumSessionStorageKey, savedPremiumSession } from './curtainsuk-premium-transport';
import { nailaPersona } from '../lib/storefront/naila/persona';
import { acknowledgeNaila, nailaAnswer, nailaEnvelope, type NailaCommand } from '../lib/storefront/naila/transport';
import { colourPresentation } from '../lib/storefront/naila/colours';
import { selectionAcknowledgement } from '../lib/storefront/naila/acknowledgement';
import { customerFailure, responseFailure } from '../lib/storefront/naila/customer-status';
import { NailaSpeech } from '../lib/storefront/naila/speech';
import { shopifyConsultationHandoff } from '../lib/storefront/consultation-navigation';
import { GUIDE_PRICE_LEVELS } from '../lib/fabric-master/guide-price-level';
import { projectConsultationState } from '../lib/storefront/naila/memory';
import { initialPresentationPhase, reconcileConsultation, recommendationSignature } from '../lib/storefront/naila/presentation';
import type { ConsultationPhase, NailaView } from '../lib/storefront/naila/types';

type Fabric = { id: string; brand: string; design: string; colour: string; description?: string;
  imageReferences?: string[]; images?: {url:string}[]; sampleAvailable: boolean; orderReady: boolean;
  priceReady: boolean; currentStockConfirmed: boolean;
  intelligence?: { dimensions: { key:string; label:string; values:string[] }[]; advice: {label:string;text:string}[] } };
type Catalog = { fabrics: Fabric[]; total: number; pages: number; page: number; facets: { discovery?: {key:string;active:boolean;options:{value:string;label:string}[]}[] } };
type Experience = { enhanceCard: (card: HTMLElement, fabric: Fabric, windowSlug: string, saveSample: unknown) => void;
  renderDetail: (root: HTMLElement, fabric: Fabric, windowSlug: string, saveSample: unknown) => void;
  renderDiscovery: (root: HTMLElement, catalog: Catalog, form: HTMLFormElement) => void };
declare global { interface Window { CurtainsUKFabricExperience?: Experience } }
declare global { interface HTMLElement { cukNailaBrowseProof?: (url: string) => Promise<Record<string, string>> } }

const portraitUrl = new URL('curtainsuk-naila-portrait.webp', (document.currentScript as HTMLScriptElement).src).href;
const cacheKey = 'cuk-naila-presentation-v1', pendingKey = 'cuk-naila-pending-v1';
const read = (key: string) => { try { return sessionStorage.getItem(key); } catch { return null; } };
const write = (key: string, value: unknown) => { try { if(value === null) sessionStorage.removeItem(key); else sessionStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value)); } catch { /* Session remains usable without storage. */ } };
function element<K extends keyof HTMLElementTagNameMap>(tag: K, text = '', className = '') {
  const node = document.createElement(tag); node.textContent = text; node.className = className; return node;
}
function button(label: string, action: () => void, className = '') {
  const node = element('button', label, className); node.type = 'button'; node.addEventListener('click', action); return node;
}
async function json(url: string, init?: RequestInit, timeoutMs=28_000) {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const data = await response.json();
    if (!response.ok) throw responseFailure(response.status,data.error);
    return data;
  } finally { clearTimeout(timer); }
}
async function capability() {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([premiumProxyCapability(),new Promise<never>((_,reject)=>{
      timer=setTimeout(()=>reject(Error('Your consultation connection is taking longer than expected. Please retry.')),10_000);
    })]);
  } finally {clearTimeout(timer);}
}

function mount(root: HTMLElement) {
  const host = root.querySelector<HTMLElement>('[data-cuk-naila]');
  const form = root.querySelector<HTMLFormElement>('[data-cuk-fabric-filters]');
  const experience = window.CurtainsUKFabricExperience;
  if (!host || !form || !experience) return;
  const panel = element('aside', '', 'cuk-naila-panel');panel.setAttribute('aria-label', 'Naila consultation');
  const portrait=element('div','','cuk-naila-portrait'),portraitImage=element('img');
  portraitImage.src=portraitUrl;portraitImage.alt='Naila, your AI Fabric Interior Designer';portraitImage.width=720;portraitImage.height=900;
  portraitImage.addEventListener('error',()=>{portraitImage.hidden=true;portrait.classList.add('cuk-naila-portrait-unavailable');});
  portrait.append(portraitImage,element('span','A little guidance, at your pace','cuk-naila-portrait-note'));
  const title = element('div', '', 'cuk-naila-title');
  title.append(element('h2', 'Naila'), element('p', nailaPersona.title));
  const exitButton = button('Browse on my own',leave,'cuk-naila-close');
  const restartButton=button('Restart consultation',confirmRestart,'cuk-naila-restart');
  const footer=element('div','','cuk-naila-footer');footer.append(exitButton,restartButton);footer.hidden=true;
  const body = element('div', '', 'cuk-naila-body');
  const status = element('p', '', 'cuk-naila-status'); status.setAttribute('role','status');
  const speech = new NailaSpeech(window.speechSynthesis);
  const speechButton = button('Listen', () => { void speak(); }, 'cuk-naila-listen');
  const stopSpeech = button('Stop listening', () => speech.stop(), 'cuk-naila-listen'); stopSpeech.hidden = true;
  const tools=element('div','','cuk-naila-tools');tools.append(speechButton,stopSpeech);
  const header=element('div','','cuk-naila-header');header.append(portrait,title,tools);
  const scroll=element('div','','cuk-naila-scroll');scroll.tabIndex=0;scroll.setAttribute('aria-label','Consultation questions');scroll.append(status,body);
  const entry=button('Continue with Naila',()=>{void start();},'cuk-naila-continue');
  panel.append(header,scroll,footer,entry);
  host.hidden=true;
  root.querySelector('.cuk-wrap')!.insertBefore(panel,form);
  root.classList.add('cuk-naila-ready');
  const filtersRoute=element('div','','cuk-naila-browse-route');
  const filtersToggle=button('View all filters',()=>setFilters(!root.classList.contains('cuk-naila-filters-open')));
  filtersToggle.setAttribute('aria-controls',form.id);filtersToggle.setAttribute('aria-expanded','false');
  filtersRoute.append(element('span','Your fabric collection'),filtersToggle);
  form.before(filtersRoute);
  function setFilters(open:boolean) {
    root.classList.toggle('cuk-naila-filters-open',open);filtersToggle.setAttribute('aria-expanded',String(open));
    filtersToggle.textContent=open?'Hide filters':'View all filters';
  }
  let view: NailaView | null = null, pending: NailaCommand | null = null, busy = false, speaking = false, active = false;
  let catalog: Catalog | null = null, selected: Fabric | null = null, showingDirections = false;
  let acknowledgment: string | null = null;
  let caption = '', directionSignature = '', renderVersion = 0;
  let cachedState: unknown = null;
  let failure: ReturnType<typeof customerFailure> | null = null;
  let restarting = false;
  const cards = new Map<string, {fabric:Fabric;node:HTMLElement}>();
  const delivered = new Map<number, NailaView['directions'][number]>();
  const originalFields = new Map<string,string>();
  let resume = savedPremiumSession(read(premiumSessionStorageKey));
  try {
    const cached = JSON.parse(read(cacheKey) ?? 'null');
    if(cached?.consultation?.sessionId === resume) {
      cachedState = cached.consultation;

    }
    const saved = JSON.parse(read(pendingKey) ?? 'null');
    if(saved && typeof saved.requestId === 'string' && (saved.sessionId === resume || saved.sessionId === null)) pending = saved;
  } catch { /* Corrupt presentation cache never becomes evidence. */ }

  // Per-browser-root proof provider. Never publish the capability in DOM attributes.
  root.cukNailaBrowseProof = async (destination: string) => {
    const url = new URL(destination, location.origin);
    const sessionId = savedPremiumSession(view?.sessionId);
    if (!active || root.dataset.nailaEnabled !== 'true' || root.dataset.nailaActive !== 'true' || !sessionId ||
      url.protocol !== 'https:' || url.origin !== location.origin || url.username || url.password || url.hash ||
      url.pathname !== '/apps/curtainsuk-decision/catalog' || url.searchParams.getAll('naila').length !== 1 ||
      url.searchParams.get('naila') !== '1' || url.searchParams.getAll('view').length !== 1 ||
      url.searchParams.get('view') !== 'retail' || url.searchParams.has('fabric'))
      throw Error('Your consultation connection is not ready. Please continue with Naila and retry.');
    const proof = await capability();
    // Leaving/restarting while capability acquisition is pending must not leak stale proof.
    if (!active || root.dataset.nailaEnabled !== 'true' || root.dataset.nailaActive !== 'true' ||
      view?.sessionId !== sessionId || typeof proof !== 'string' || !proof || proof.length > 180)
      throw Error('Your consultation connection is not ready. Please continue with Naila and retry.');
    return { 'x-curtainsuk-naila-capability': proof, 'x-curtainsuk-naila-session': sessionId };
  };

  function setOpen(open: boolean) {
    panel.classList.toggle('cuk-naila-collapsed',!open);root.classList.toggle('cuk-naila-open',open);
    panel.dataset.started=String(active);entry.hidden=open;footer.hidden=!active&&!resume&&!pending&&!view;
    exitButton.hidden=!active;
    syncPageScroll();
    if(!open) speech.stop();
    else { body.focus({preventScroll:true}); }
  }
  function syncPageScroll() {
    document.documentElement.classList.toggle('cuk-naila-sheet-open',active && root.classList.contains('cuk-naila-open') && window.innerWidth<1200);
  }
  window.addEventListener('resize',syncPageScroll);
  function persist() {
    if(!view) return;
    write(premiumSessionStorageKey,view.sessionId);
    write(cacheKey,{active,consultation:view.naila});
  }
  function lock() {
    body.querySelectorAll<HTMLButtonElement>('button').forEach(node => {
      // An ambiguous response must be retried or resumed before accepting a
      // different answer. Keep the same idempotency key until it is settled.
      node.disabled = busy || speaking || (!!pending && body.dataset.nailaPhase!=='welcome' && !node.closest('[data-naila-retry],[data-naila-restart]'));
    });
    speechButton.disabled = busy || speaking;entry.disabled=busy||speaking;
    restartButton.hidden=(!resume&&!pending&&!view)||!!failure?.restart;
    restartButton.disabled=busy||speaking||restarting;
    footer.hidden=!active&&!resume&&!pending&&!view;exitButton.hidden=!active;
    stopSpeech.hidden = !speaking;
    body.setAttribute('aria-busy',String(busy));
  }
  async function speak() {
    if (busy || speaking) return;
    speaking = true; lock();
    try { await speech.speak(caption); } finally { speaking = false; lock(); }
  }
  async function start() {
    restarting=false;
    if(!active) {
      for(const [key,value] of new FormData(form!)) originalFields.set(key,String(value));
      active = true; root.dataset.nailaActive = 'true';setFilters(false);
      entry.textContent = 'Continue with Naila';
      cards.forEach(({fabric,node})=>decorate(node,fabric));
      (window.innerWidth<600?root.querySelector<HTMLElement>('[data-cuk-fabric-grid]')??root:root).scrollIntoView({block:'start'});
    }
    setOpen(true);tools.hidden=false;
    if(view) { if(selected)explain();else render(); if(failure){renderRetry();lock();} return; }
    caption = 'Let’s get comfortable. I’ll be with you in a moment.';body.replaceChildren(element('p',caption,'cuk-naila-caption'));
    await send(undefined,!!pending);
  }
  async function send(action?: Record<string,unknown>, retry = false) {
    if(busy || speaking) return false;
    failure=null;body.querySelector('[data-naila-retry]')?.remove();
    busy = true; status.textContent = action?.type === 'brief-confirm' || action?.type === 'direction-prepare' ? 'I’m bringing your recommendations together. You can keep browsing.' : 'Saving your place…';
    const command = retry && pending ? pending : { requestId:crypto.randomUUID(),sessionId:view?.sessionId ?? resume,revision:view?.revision ?? null,...(action?{action}:{}) };
    let reopenSecond = false;
    pending = command; write(pendingKey,command); lock();
    try {
      const result = acknowledgeNaila(command,await json('/apps/curtainsuk-decision/premium-command',{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(nailaEnvelope((await capability())!,command)),
      },['brief-confirm','direction-prepare','recommend'].includes(String(command.action?.type))?60_000:28_000));
      const kind = command.action?.type;
      if(kind!=='direction-hydrate')acknowledgment=selectionAcknowledgement(view,result,command.action);
      if (kind === 'direction-hydrate' || kind === 'direction-prepare') {
        const index = Number(command.action!.index);
        if(result.directions[0]) delivered.set(index,result.directions[0]);
        result.directions = [...delivered].sort(([a],[b])=>a-b).map(([,direction])=>direction);
      } else {
        delivered.clear(); result.directions.forEach((direction,index)=>delivered.set(index,direction));
      }
      const firstResponse = !view;
      result.naila = reconcileConsultation(result, result.naila ?? projectConsultationState({}, result), view?.naila ?? cachedState, typeof kind === 'string' ? kind : undefined);
      if(result.naila.currentPhase==='welcome')result.naila.currentPhase='understand';
      if(kind==='direction-prepare')result.naila.directionIndex=null;
      // The existing service deliberately returns later directions as summaries.
      // Reopen only the bounded saved direction needed for this workspace. Do
      // not replace the visible grid with an intermediate summary response.
      reopenSecond = kind !== 'direction-hydrate' && !!result.directions[1] && !result.directions[1].cards.length
        && (kind === 'direction-prepare' || (result.naila.workspace === 'recommendations' && result.naila.directionIndex !== 0));
      view = result; cachedState = null; resume = result.sessionId; pending = null; write(pendingKey,null); persist();
      selected = null; status.textContent = ''; render();
      // Answer, reaction and brief-edit clicks never re-filter Browse. Only a
      // recommendation membership change or an explicit workspace restore does.
      if(reopenSecond)status.textContent='I’m opening your saved fabrics. You can keep browsing.';
      else if(result.directions.some(d=>d.cards.length) && ['recommend','act'].includes(result.naila.currentPhase)) {
        void showDirections(result.naila.directionIndex ?? undefined).then(restoreSelected);
      } else {
        if(firstResponse && result.naila.workspace === 'exploration') explore(false);
        void restoreSelected();
      }
      return true;
    } catch(error) {
      failure=customerFailure(error,!!resume);status.textContent=failure.message;
      renderRetry(); return false;
    } finally {
      busy = false; lock();
      if(reopenSecond)queueMicrotask(()=>{void send({type:'direction-hydrate',index:1});});
    }
  }
  function renderRetry() {
    body.querySelector('[data-naila-retry]')?.remove();
    if(!failure)return;
    const retry = element('div'); retry.dataset.nailaRetry = '';
    if(failure.retry)retry.append(button('Try again',()=>{void send(undefined,true);}));
    if(view)retry.append(button('Return to saved choices',()=>{pending=null;write(pendingKey,null);void send();}));
    if(failure.restart)retry.append(button('Start a new consultation',confirmRestart));
    body.append(retry);
  }
  function welcome() {
    panel.dataset.started='false';entry.hidden=true;tools.hidden=true;
    body.dataset.nailaPhase='welcome';body.tabIndex=-1;
    caption=nailaPersona.introduction;
    body.replaceChildren(element('p',nailaPersona.introduction,'cuk-naila-welcome'),element('p',nailaPersona.reassurance,'cuk-naila-timing'),
      button(resume?'Continue with Naila':'Start my consultation',()=>{void start();},'cuk-naila-primary'));
    lock();
  }
  function confirmRestart() {
    if(busy||speaking||restarting)return;
    restarting=true;setOpen(true);scroll.scrollTop=0;status.textContent='';
    const confirmation=element('div');confirmation.dataset.nailaRestart='';
    confirmation.append(element('h3','Start again with Naila?'),
      element('p','This clears the saved answers, fabric reactions, recommendations and consultation shortlist from this browser. Your new consultation will begin with no previous choices.'),
      element('p','Your basket and any orders stay as they are.'),
      button('Keep my consultation',()=>{
        restarting=false;
        if(view){if(selected)explain();else render();}
        else if(failure)body.replaceChildren();else welcome();
        if(failure){status.textContent=failure.message;renderRetry();}
        lock();
      }),button('Clear and restart',restartConsultation,'cuk-naila-primary'));
    body.replaceChildren(confirmation);lock();
    confirmation.querySelector<HTMLButtonElement>('button')?.focus({preventScroll:true});
  }
  function restartConsultation() {
    if(busy||!restarting)return;
    speech.stop();speaking=false;restarting=false;
    // Remove this browser's active consultation only. The existing API has no
    // deletion operation; do not claim to erase historical server records.
    write(premiumSessionStorageKey,null);write(cacheKey,null);write(pendingKey,null);
    view=null;resume=null;cachedState=null;pending=null;failure=null;selected=null;acknowledgment=null;
    delivered.clear();cards.clear();showingDirections=false;directionSignature='';renderVersion++;
    root.removeAttribute('data-naila-price-level');
    if(active){
      root.dispatchEvent(new CustomEvent('cuk:naila:pause'));
      root.dispatchEvent(new CustomEvent('cuk:naila:render',{detail:{fabrics:[],total:0,page:1,pages:1}}));
      const detail=root.querySelector<HTMLElement>('[data-cuk-fabric-detail]');if(detail){detail.hidden=true;detail.replaceChildren();}
      for(const field of Array.from(form!.elements))if(field instanceof HTMLInputElement||field instanceof HTMLSelectElement)field.value=originalFields.get(field.name)??'';
      root.querySelector<HTMLElement>('[data-cuk-pagination]')!.hidden=false;
      root.dispatchEvent(new CustomEvent('cuk:naila:browse'));form!.dispatchEvent(new Event('input',{bubbles:true}));
    }
    setFilters(false);status.textContent='';scroll.scrollTop=0;
    void start();
  }
  function choose(label:string, action:Record<string,unknown>) { body.append(button(label,()=>{void send(action);})); }
  function colourChoices() {
    const group=element('div','','cuk-naila-colours');group.setAttribute('role','group');group.setAttribute('aria-label','Colour families');
    body.append(element('p','Choose one colour family. These swatches are a colour guide, not an exact fabric match.'));
    for(const answer of view!.question!.answers) {
      const look=colourPresentation(answer.id);
      const node=button('',()=>{void send(nailaAnswer(view!,answer.id));});
      node.dataset.colour=answer.id;
      if(look){const swatch=element('span','','cuk-naila-swatch');swatch.style.background=look.swatch;swatch.setAttribute('aria-hidden','true');node.append(swatch);}
      node.append(element('span',look?.label??answer.label));group.append(node);
    }
    body.append(group);

  }
  function present(phase: ConsultationPhase) {
    if(!view?.naila)return;
    view.naila.currentPhase=phase; view.naila.selectedFabricId=null;view.naila.returnPhase=null; selected=null;
    persist();render();
  }
  function render() {
    if(!view?.naila) return;
    tools.hidden=false;body.replaceChildren();
    const state=view.naila, phase=state.currentPhase;
    body.dataset.nailaPhase=phase;
    const moments:Record<ConsultationPhase,string>={welcome:'A little help choosing',understand:'Getting to know your room',explore:'Finding your starting point',react:'Discovering what feels right',refine:'Making it feel like you',recommend:'Your recommended directions',act:'Thinking about the finished curtain'};
    body.append(element('p',moments[phase],'cuk-naila-moment'));
    // Refer back at conversational transitions, rather than reciting every answer.
    caption=phase==='welcome'?`${nailaPersona.introduction} ${nailaPersona.reassurance}`
      :['explore','refine','recommend'].includes(phase)?state.summary.slice(0,2).join(' '):'';
    if(acknowledgment)appendAcknowledgment();
    else if(caption)body.append(element('p',caption,'cuk-naila-caption'));
    if(phase==='welcome') {
      body.append(element('h3','Let’s find fabrics that feel right in your room.'),button('Let’s begin',()=>present('understand')));
    } else if(phase==='understand' && view.question) {
      body.append(element('h3',view.question.prompt));caption+=` ${view.question.prompt}`;
      if(view.question.id==='colour-family')colourChoices();
      else view.question.answers.forEach(answer=>choose(answer.label,nailaAnswer(view!,answer.id)));
    } else if(phase==='understand' && view.phase==='price') {
      body.append(element('h3','Which price level feels comfortable?'),element('p','A guide to fabric price per metre. Final made-to-measure pricing depends on your measurements and options.'));
      GUIDE_PRICE_LEVELS.forEach(level=>choose(`${level.label} · ${level.detail}`,{type:'price-level',level:level.id}));
    } else if(phase==='explore') {
      body.append(element('h3','Let’s start looking together.'),element('p','We have a starting point. You can browse fabrics within your choices, then try a few fabric comparisons to see what feels right.'),
        button('Show fabrics within my choices',()=>{explore();setOpen(false);}),
        button('Fine-tune my choices',()=>present('refine')));
      choose('Compare a few fabrics',{type:'brief-confirm',id:crypto.randomUUID()});
    } else if(phase==='react') {
      body.append(element('h3','Would you enjoy this at your window?'),element('p','Think about this alongside the fabrics you’ve just seen. There’s no right answer — a quick reaction is enough.'));
      const fabric=view.calibrationFabric;
      if(fabric) {
        const image=element('img');image.src=fabric.imageUrl;image.alt=`${fabric.brand} ${fabric.design} ${fabric.colourway}`;image.width=320;image.height=240;image.className='cuk-naila-calibration';
        const comparison=element('div','','cuk-naila-comparison'),current=element('div');
        current.append(element('p','What about this one?'),image,element('p',`${fabric.design} · ${fabric.colourway}`));comparison.append(current);body.append(comparison);
        void comparePrevious(comparison,fabric.fabricMasterId);
        if(state.likedFabricIds.includes(fabric.fabricMasterId))body.append(element('p','You responded positively to this one earlier.'));
        [['LOVE','Love this'],['LIKE','Like this'],['NOT_SURE','Not sure'],['DISLIKE','Not for me']].forEach(([reaction,label])=>choose(label,{type:'calibrate',reaction}));
      } else {body.append(element('p','This fabric cannot currently be shown. Your choices are saved.'),button('Retry fabric',()=>{void send();}));}
    } else if(phase==='refine') {
      body.append(element('h3','Does this feel like your room?'),element('p','Keep what feels right, or change a choice. We’ll bring it together before changing the fabrics on screen.'));
      for(const section of view.interiorBrief?.sections??[]) {
        const details=element('details'),summary=element('summary',`${section.title}: ${section.options.find(o=>o.value===section.value)?.label??section.value}`);
        details.setAttribute('name','naila-refinement');details.append(summary);
        section.options.forEach(option=>details.append(button(option.label,()=>{void send({type:'brief-change',id:crypto.randomUUID(),choice:{dimension:section.dimension,value:option.value}});})));body.append(details);
      }
      if(view.phase==='brief' && !state.calibrationReactions.length)body.append(button('Back to exploring',()=>present('explore')));
      choose(view.phase==='brief' && !state.calibrationReactions.length?'Compare a few fabrics':'Show my recommended directions',view.interiorBrief?{type:'brief-confirm',id:crypto.randomUUID()}:{type:'recommend'});
    } else if(phase==='recommend'||phase==='act') {
      body.append(element('h3','Here’s where your choices have led.'),element('p','Explore the directions below. Ask me about a fabric, keep a shortlist, or see how it could work as a finished curtain.'));
      view.directions.forEach((direction,index)=>body.append(button(direction.cards.length?direction.label:`See ${direction.label.toLowerCase()}`,()=>{
        if(direction.cards.length){present('recommend');void showDirections(index,true);setOpen(false);}
        else void send({type:'direction-hydrate',index});
      })));
      if(view.directions.length<2 && view.directions.length)choose('See another direction',{type:'direction-prepare',index:1});
      if(view.interiorBrief)choose('Fine-tune my choices',{type:'brief-adjust',id:crypto.randomUUID()});
      if(state.currentShortlist.length)body.append(element('p',`${state.currentShortlist.length} ${state.currentShortlist.length===1?'fabric':'fabrics'} in your shortlist.`));
    }
    if(view.priceLevel?.selected && phase!=='explore')body.append(button('Explore fabrics with my choices',()=>{explore();setOpen(false);}));
    caption=body.querySelector('h3')?.textContent??caption;
    caption=`${acknowledgment??''} ${caption}`.trim();
    scroll.scrollTop=0;
    lock();
  }
  function appendAcknowledgment() {
    if(!acknowledgment)return;
    const note=element('p',acknowledgment,'cuk-naila-acknowledgment');note.setAttribute('role','status');body.append(note);
  }
  async function restoreSelected() {
    const id=view?.naila?.selectedFabricId;
    if(!id||!active)return;
    const revision=view!.revision;
    let fabric=cards.get(id)?.fabric;
    if(!fabric) {
      try {fabric=(await json(`/apps/curtainsuk-decision/catalog?view=retail&browseGuide=1&fabric=${encodeURIComponent(id)}`)).fabric;}catch{return;}
    }
    if(fabric?.id===id&&view?.revision===revision&&view.naila?.selectedFabricId===id){selected=fabric;explain();}
  }
  async function comparePrevious(container:HTMLElement,currentId:string) {
    // A single exact committed reaction supplies comparison context, not new evidence.
    const reaction=view?.naila?.calibrationReactions.at(-1);
    if(!reaction||reaction.fabricMasterId===currentId)return;
    const revision=view!.revision;
    try {
      const fabric:Fabric|undefined=cards.get(reaction.fabricMasterId)?.fabric ?? (await json(`/apps/curtainsuk-decision/catalog?view=retail&browseGuide=1&fabric=${encodeURIComponent(reaction.fabricMasterId)}`)).fabric;
      if(!container.isConnected||view?.revision!==revision||fabric?.id!==reaction.fabricMasterId||!fabric.images?.[0])return;
      const previous=element('div'),image=element('img');image.src=fabric.images[0].url;image.alt=`${fabric.design} ${fabric.colour}`;image.width=160;image.height=180;image.className='cuk-naila-calibration';
      const response:{[key:string]:string}={LOVE:'You loved this',LIKE:'You liked this',NOT_SURE:'You weren’t sure about this',DISLIKE:'This wasn’t for you'};
      previous.append(element('p',response[reaction.reaction]),image,element('p',`${fabric.design} · ${fabric.colour}`));container.prepend(previous);
    } catch { /* The current governed comparison remains usable without the earlier image. */ }
  }
  function leave() {
    restarting=false;
    speech.stop();active=false;root.removeAttribute('data-naila-active');root.removeAttribute('data-naila-price-level');
    showingDirections=false;renderVersion++;failure=null;status.textContent='';setFilters(false);setOpen(false);persist();
    for(const field of Array.from(form!.elements)) if(field instanceof HTMLInputElement || field instanceof HTMLSelectElement) field.value=originalFields.get(field.name)??'';
    root.querySelector<HTMLElement>('[data-cuk-pagination]')!.hidden=false;
    root.dispatchEvent(new CustomEvent('cuk:naila:browse'));form!.dispatchEvent(new Event('input',{bubbles:true}));
    cards.forEach(({node})=>node.querySelector('[data-naila-ask]')?.remove());
  }
  function explore(changePhase=true) {
    if(!view?.naila)return;
    view.naila.workspace='exploration';view.naila.directionIndex=null;
    if(changePhase && view.phase==='brief')view.naila.currentPhase=initialPresentationPhase(view);
    persist();
    showingDirections=false;directionSignature='';renderVersion++;
    root.dataset.nailaPriceLevel=view.naila?.currentPriceLevel ?? view.priceLevel?.selected ?? '';
    const filters=view.naila?.browseFilters ?? {};
    for(const key of ['colour','pattern','texture','finish','character','guidePrice']) {
      const field=form!.elements.namedItem(key);
      if(field instanceof HTMLInputElement||field instanceof HTMLSelectElement)field.value='';
    }
    let used=0;
    for(const [key,value] of Object.entries(filters)) {
      const facet=catalog?.facets.discovery?.find(f=>f.key===key&&f.active);
      if(!facet?.options.some(option=>option.value===value))continue;
      const field=form!.elements.namedItem(key);
      if(field instanceof HTMLInputElement||field instanceof HTMLSelectElement){field.value=value;used++;}
    }
    status.textContent=used?'I’m narrowing the collection using your selected fabric choices and price level.':'I’m exploring the collection within your chosen price level.';
    root.querySelector<HTMLElement>('[data-cuk-pagination]')!.hidden=false;
    root.dispatchEvent(new CustomEvent('cuk:naila:browse')); form!.dispatchEvent(new Event('input',{bubbles:true}));
  }
  async function showDirections(index?:number, force=false) {
    if(!view?.naila||!active)return;
    const signature=recommendationSignature(view,index??null);
    if(!force && showingDirections && signature===directionSignature) {
      cards.forEach(({fabric,node})=>decorate(node,fabric));return;
    }
    view.naila.workspace='recommendations';view.naila.directionIndex=index??null;persist();
    directionSignature=signature;
    const current=++renderVersion;showingDirections=true;
    root.dispatchEvent(new CustomEvent('cuk:naila:pause'));
    const directions=index===undefined?view.directions:view.directions.slice(index,index+1);
    const wanted=directions.flatMap(d=>d.cards).slice(0,14);
    const ready:Fabric[]=[];let failed=false;
    status.textContent='Checking your selected fabrics…';
    // Bounded, progressive groups. No full catalogue read or unbounded fan-out.
    for(let start=0;start<wanted.length;start+=4) {
      await Promise.all(wanted.slice(start,start+4).map(async card=>{
        try {
          const data=await json(`/apps/curtainsuk-decision/catalog?view=retail&browseGuide=1&fabric=${encodeURIComponent(card.fabricMasterId)}`);
          const fabric=data.fabric as Fabric|null;
          if(fabric?.id===card.fabricMasterId&&card.commerceToken&&fabric.orderReady&&fabric.priceReady&&fabric.currentStockConfirmed&&fabric.images?.length)ready.push(fabric);
        } catch {failed=true;}
      }));
      if(current!==renderVersion||!showingDirections)return;
      const ordered=wanted.flatMap(card=>ready.filter(f=>f.id===card.fabricMasterId));
      root.dispatchEvent(new CustomEvent('cuk:naila:render',{detail:{fabrics:ordered,total:ordered.length,page:1,pages:1}}));
    }
    if(current!==renderVersion)return;
    root.querySelector<HTMLElement>('[data-cuk-pagination]')!.hidden=true;
    const complete=directions.every(d=>d.cards.length>=5&&d.cards.length<=7&&d.cards.every(c=>ready.some(f=>f.id===c.fabricMasterId)));
    status.textContent=failed||!complete?'Some fabrics cannot currently be confirmed. Your directions are saved. Retry to recheck availability.':'Your recommended fabrics are ready to explore.';
    if(failed||!complete){directionSignature='';body.append(button('Recheck fabrics',()=>{void showDirections(index,true);}));}
  }
  function decorate(node:HTMLElement,fabric:Fabric) {
    cards.set(fabric.id,{fabric,node});
    if(!active)return;
    if(!node.querySelector('[data-naila-ask]')) {
    const ask=button('Ask Naila about this fabric',()=>{selected=fabric;setOpen(true);explain();},'cuk-naila-ask');ask.dataset.nailaAsk='';
    (node.querySelector('.cuk-fabric__body')??node).append(ask);
    }
    const direction=view?.directions.find(d=>d.cards.some(c=>c.fabricMasterId===fabric.id));
    const recommendation=direction?.cards.find(c=>c.fabricMasterId===fabric.id);
    if(showingDirections&&direction&&recommendation&&view) {
      if(!node.querySelector('.cuk-naila-direction-label'))node.querySelector('.cuk-fabric__body')?.prepend(element('p',direction.label,'cuk-naila-direction-label'));
      if(recommendation.commerceToken) {
        const href=(sample:boolean)=>shopifyConsultationHandoff({sample,sessionId:view!.sessionId,profileSummary:view!.profileSummary,fabricMasterId:fabric.id,supplierSku:recommendation.supplierSku,strategyId:direction.id,commerceToken:recommendation.commerceToken!});
        const sample=node.querySelector('[data-sample],a[href*="intent=sample"]');
        if(sample&&fabric.sampleAvailable) {const link=element('a','Order Sample','cuk-button cuk-button--secondary');link.href=href(true);sample.replaceWith(link);}
        const make=node.querySelector<HTMLAnchorElement>('a[href*="curtain-visualiser"]');if(make&&fabric.orderReady)make.href=href(false);
      }
    }
  }
  function explain() {
    if(!selected||!view?.naila)return;
    if(view.naila.currentPhase!=='act')view.naila.returnPhase=view.naila.currentPhase;
    view.naila.currentPhase='act';view.naila.selectedFabricId=selected.id;persist();
    body.dataset.nailaPhase='act';
    body.replaceChildren();scroll.scrollTop=0;const fabric=selected;
    appendAcknowledgment();
    body.append(button('Back to consultation',()=>{if(view)present(view.naila?.returnPhase??initialPresentationPhase(view));}),element('h3',`${fabric.design} · ${fabric.colour}`));
    const direction=view.directions.find(d=>d.cards.some(c=>c.fabricMasterId===fabric.id));
    const card=direction?.cards.find(c=>c.fabricMasterId===fabric.id);
    const liked=view.naila?.likedFabricIds.includes(fabric.id);
    caption=liked?'You responded positively to this exact fabric earlier.':view.naila?.dislikedFabricIds.includes(fabric.id)?'You marked this fabric as not for you earlier.':'';
    if(caption)body.append(element('p',caption));
    const facts=(fabric.intelligence?.dimensions??[]).slice(0,6).map(d=>`${d.label}: ${d.values.join(', ')}`);
    for(const fact of facts)body.append(element('p',fact));
    if(!facts.length&&!card)body.append(element('p','Let’s take a closer look at the fabric details and photograph. A sample can help you judge it in your own room.'));
    for(const line of card?.explanation??[])body.append(element('p',line));
    caption += ` ${facts.join('. ')} ${(card?.explanation??[]).join(' ')}`;
    if(card&&direction) {
      const feedback=(reaction:string,optionIds:string[]=[])=>{void send({type:'feedback',command:{id:crypto.randomUUID(),strategyId:direction.id,fabricId:card.reactionId,fabricReaction:reaction,directionReaction:null,optionIds}});};
      body.append(button('Love this',()=>feedback('LOVE')),button('Show me similar',()=>feedback('MORE_LIKE_THIS')),button('Not for me',()=>feedback('NOT_FOR_ME')));
      for(const option of card.feedback?.change??[])body.append(button(option.label,()=>feedback('NOT_QUITE',[option.id])));
      choose('Add to shortlist',{type:'outcome',event:'FABRIC_SELECTED',fabricMasterId:fabric.id,strategyId:direction.id});
    }
    const cardNode=cards.get(fabric.id)?.node;
    for(const [label,selector] of [['Order Sample','[data-sample],a[href*="intent=sample"]'],['Make Curtains','a[href*="curtain-visualiser"]']]) {
      const target=cardNode?.querySelector<HTMLElement>(selector);
      if(target&&!target.hasAttribute('disabled'))body.append(button(label,()=>target.click()));
    }
    if(view.naila.currentShortlist.length)body.append(element('p',`${view.naila.currentShortlist.length} ${view.naila.currentShortlist.length===1?'fabric':'fabrics'} in your shortlist.`));
    body.append(element('p','Compare a sample in your own daylight and evening light before deciding.'));
    lock();
  }
  const enhance=experience.enhanceCard, discovery=experience.renderDiscovery, detail=experience.renderDetail;
  experience.enhanceCard=(node,fabric,slug,save)=>{enhance(node,fabric,slug,save);decorate(node,fabric);};
  experience.renderDiscovery=(browser,data,filters)=>{discovery(browser,data,filters);if(browser===root){catalog=data;cards.clear();if(active)status.textContent='';}};
  experience.renderDetail=(browser,fabric,slug,save)=>{detail(browser,fabric,slug,save);if(browser===root){cards.set(fabric.id,{fabric,node:root.querySelector('[data-cuk-fabric-detail]')!});const ask=button('Ask Naila about this fabric',()=>{void start().then(()=>{selected=fabric;explain();});});root.querySelector('.cuk-material-intro')?.append(ask);}};
  form.addEventListener('input',()=>{
    showingDirections=false;renderVersion++;
    root.querySelector<HTMLElement>('[data-cuk-pagination]')!.hidden=false;
    // A manual Browse price band is a Browse filter, not new HCI evidence.
    const price=form.elements.namedItem('guidePrice');
    if((price instanceof HTMLInputElement||price instanceof HTMLSelectElement)&&price.value)root.removeAttribute('data-naila-price-level');
  });
  form.addEventListener('reset',()=>{
    showingDirections=false;renderVersion++;
    root.removeAttribute('data-naila-price-level');
    root.querySelector<HTMLElement>('[data-cuk-pagination]')!.hidden=false;
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden)speech.stop();});
  welcome();
}

document.querySelectorAll<HTMLElement>('[data-cuk-fabric-browser][data-naila-enabled="true"]').forEach(mount);
