import {readDesign,saveDesign} from './journey.mjs';
import {finishedPlan} from './measure-plan.mjs';
const $=id=>document.getElementById(id),money=new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:0});
const saved=readDesign();let selectionVersion=0,fabric=null,page=1,pages=1,query='',guidePrice='',colours=new Set(),patterns=new Set(),listToken=0,priceToken=0,quote=null,priceTimer,priceAbort;
const palette={white:'#f6f3e9',cream:'#eae1cb',beige:'#c7b79c',taupe:'#a79888',grey:'#92928c',black:'#333733',blue:'#587887',green:'#718367',pink:'#c99caa',red:'#9c4a4a',orange:'#bc8055',gold:'#b49a55',yellow:'#d4bd65',purple:'#86728d',brown:'#795c49',neutral:'#d1c7b6',multicolour:'linear-gradient(120deg,#738c87,#c99caa,#c3ac65)','white/cream':'linear-gradient(120deg,#f6f3e9 50%,#eae1cb 50%)','beige/taupe':'linear-gradient(120deg,#c7b79c 50%,#a79888 50%)','yellow/gold':'linear-gradient(120deg,#d4bd65 50%,#b49a55 50%)'};
const readable=value=>String(value).replaceAll('-', ' ').replace(/\b\w/g,letter=>letter.toUpperCase());
for(const id of ['width','drop'])if(typeof saved[id]==='number'&&saved[id]>=30&&saved[id]<=500)$(id).value=saved[id];
for(const name of ['lining','fold']){const allowed=name==='lining'?['STANDARD','BLACKOUT']:['stacked','cascade'];if(allowed.includes(saved[name]))document.querySelector(`input[name="${name}"][value="${saved[name]}"]`).checked=true;}
function config(){return {width:Number($('width').value)||null,drop:Number($('drop').value)||null,lining:document.querySelector('[name=lining]:checked').value,fold:document.querySelector('[name=fold]:checked').value,fabricId:fabric?.id||null};}
function validSize(value,max=500){return typeof value==='number'&&value>=30&&value<=max&&Math.abs(value*10-Math.round(value*10))<1e-7;}
function imageUrl(url){try{const u=new URL(url,location.href);return u.origin===location.origin||u.protocol==='https:'&&u.hostname==='cdn.shopify.com'?u.href:'';}catch{return '';}}
function persist(){const okay=saveDesign({...config(),fabric});$('save-status').textContent=okay?'Your choices stay in this browser.':'Browser storage is unavailable. Keep this tab open to retain your design.';return okay;}
function collapseFabric(){
 if(!fabric)return;
 $('fabric-browser').hidden=true;$('fabric-selection').hidden=false;
 $('selected-thumbnail').src=imageUrl(fabric.image);$('selected-label').textContent=fabric.name;$('selected-detail').textContent=`${fabric.colour} · ${fabric.brand}`;
}
$('change-fabric').addEventListener('click',()=>{$('fabric-browser').hidden=false;$('fabric-selection').hidden=true;$('fabric-search').focus();});
function update(){
 const c=config();quote=null;priceToken++;priceAbort?.abort();clearTimeout(priceTimer);
 $('summary-size').textContent=validSize(c.width,300)&&validSize(c.drop)?`${c.width} × ${c.drop} cm`:'Add your measurements';
 $('summary-availability').textContent=fabric?'Checking availability…':'Choose a fabric';
 $('summary-lining').textContent=c.lining==='BLACKOUT'?'Blackout':'Standard ivory';$('summary-fold').textContent=c.fold==='cascade'?'Cascade':'Stacked';
 $('chosen-name').textContent=fabric?.name||'The start of something beautiful.';$('chosen-colour').textContent=fabric?`${fabric.colour} · ${fabric.brand}`:'Choose a fabric to begin.';
 $('chosen-image').src=fabric?imageUrl(fabric.image)||'assets/roman-lounge.jpg':'assets/roman-lounge.jpg';$('chosen-image').alt=fabric?`${fabric.name}, ${fabric.colour} fabric`:'Roman blind inspiration';$('image-caption').textContent=fabric?'YOUR SELECTED FABRIC':'YOUR ROMAN BLIND';
 $('preview-design').href=`index.html?style=${c.fold}${fabric?`&fabric=${encodeURIComponent(fabric.id)}`:''}`;
 const valid=validSize(c.width,300)&&validSize(c.drop);$('save-design').disabled=!valid||!fabric;
 for(const id of ['width','drop'])$(id).setAttribute('aria-invalid',String($(id).value!==''&&!validSize(c[id],id==='width'?300:500)));
 $('size-message').textContent=$('width').value!==''&&!validSize(c.width,300)?'Width must be between 30 and 300 cm, to one decimal place.':$('drop').value!==''&&!validSize(c.drop)?'Drop must be between 30 and 500 cm, to one decimal place.':c.drop>250?'Drops over 250 cm need a custom quote. You can still save your design.':'Standard size: up to 300 cm wide and 250 cm drop. No further deduction is applied.';
 $('price').textContent=valid&&fabric?'Calculating…':'Add size & fabric';$('price-message').textContent='Your estimate will include VAT.';persist();
 document.querySelectorAll('[data-fabric]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.fabric===fabric?.id)));
 if(fabric&&!valid)$('summary-availability').textContent='Add size to check required quantity';
 if(valid&&fabric){const token=priceToken;priceTimer=setTimeout(()=>loadPrice(c,token),300);}
}
async function loadPrice(c,token){priceAbort=new AbortController();try{const res=await fetch('/roman-api/price',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(c),signal:priceAbort.signal});if(!res.ok)throw new Error();const result=await res.json();if(token!==priceToken)return;quote=result;$('summary-availability').textContent=result.availability||'Check availability';$('price').textContent=result.status==='estimate'?money.format(result.totalMinor/100):'Price to confirm';$('price-message').textContent=result.status==='estimate'?`Including VAT. ${result.message}`:result.message;}catch(error){if(error.name==='AbortError'||token!==priceToken)return;$('summary-availability').textContent='Check availability';$('price').textContent='Estimate unavailable';$('price-message').textContent='Please try again. Your design can still be saved.';}}
function filterQuery(){const params=new URLSearchParams({page:String(page)});if(query)params.set('query',query);if(guidePrice)params.set('guidePrice',guidePrice);if(colours.size)params.set('colour',[...colours].join(','));if(patterns.size)params.set('pattern',[...patterns].join(','));return params;}
function renderFilters(facets){
 const host=$('fabric-filters'),open=new Set([...host.querySelectorAll('details[open]')].map(item=>item.dataset.key));
 const focused=document.activeElement?.dataset?.filterChoice;
 const discovery=Object.fromEntries((facets?.discovery||[]).filter(item=>['colour','pattern'].includes(item.key)).map(item=>[item.key,item.options||[]]));
 host.replaceChildren();
 const groups=[['guidePrice','Fabric price per metre',facets?.guidePrices||[]],['colour','Colour',discovery.colour||[]],['pattern','Pattern',discovery.pattern||[]]];
 for(const [key,title,choices] of groups){
  const details=document.createElement('details');details.dataset.key=key;details.className='roman-filter-group';details.open=open.has(key);
  const selected=key==='guidePrice'?(guidePrice?[guidePrice]:[]):[...(key==='colour'?colours:patterns)];
  const summary=document.createElement('summary');summary.textContent=selected.length?`${title} · ${selected.length}`:title;details.append(summary);
  const row=document.createElement('div');row.className='roman-filter-choices';
  const options=[...choices];for(const value of selected)if(!options.some(option=>option.value===value))options.push({value,label:value});
  for(const choice of options){if(!choice?.value)continue;const button=document.createElement('button');button.type='button';button.className='roman-filter-choice';button.dataset.filterChoice=`${key}:${choice.value}`;button.setAttribute('aria-pressed',String(selected.includes(choice.value)));
   if(key==='colour'&&palette[choice.value]){const swatch=document.createElement('i');swatch.style.background=palette[choice.value];swatch.setAttribute('aria-hidden','true');button.append(swatch);}
   const name=document.createElement('span');name.textContent=key==='guidePrice'?(choice.label||choice.value):readable(choice.label||choice.value);button.append(name);
   button.addEventListener('click',()=>{if(key==='guidePrice')guidePrice=guidePrice===choice.value?'':choice.value;else{const values=key==='colour'?colours:patterns;values.has(choice.value)?values.delete(choice.value):values.add(choice.value);}page=1;loadList();});row.append(button);
  }
  details.append(row);host.append(details);
 }
 $('clear-filters').hidden=!(guidePrice||colours.size||patterns.size);
 if(focused)[...host.querySelectorAll('[data-filter-choice]')].find(item=>item.dataset.filterChoice===focused)?.focus({preventScroll:true});
}
async function loadList(){const token=++listToken;$('catalogue-count').textContent='Loading fabrics…';$('fabric-grid').setAttribute('aria-busy','true');$('previous').disabled=$('more').disabled=true;try{const res=await fetch(`/roman-api/catalog?${filterQuery()}`);if(!res.ok)throw new Error();const data=await res.json();if(token!==listToken)return;pages=data.pages;page=data.page;renderFilters(data.facets);$('fabric-grid').replaceChildren();$('catalogue-count').textContent=`${data.total.toLocaleString('en-GB')} ${data.total===1?'fabric':'fabrics'}${query||guidePrice||colours.size||patterns.size?' found':' in the collection'}`;$('page-label').textContent=data.total?`${page} / ${pages}`:'';
 for(const f of data.fabrics){const button=document.createElement('button');button.className='fabric-card';button.dataset.fabric=f.id;button.setAttribute('aria-pressed',String(f.id===fabric?.id));button.setAttribute('aria-label',`${f.name}, ${f.colour}, ${f.brand}`);const img=document.createElement('img');img.src=imageUrl(f.image);img.alt='';img.loading='lazy';img.width=240;img.height=240;img.addEventListener('error',()=>{img.removeAttribute('src');img.alt='Image unavailable';},{once:true});const name=document.createElement('strong');name.textContent=f.name;const desc=document.createElement('small');desc.textContent=`${f.colour} · ${f.brand}`;button.append(img,name,desc);button.addEventListener('click',()=>{selectionVersion++;fabric=f;update();collapseFabric();$('change-fabric').focus({preventScroll:true});});$('fabric-grid').append(button);}
 if(!data.fabrics.length){const p=document.createElement('p');p.className='catalogue-error';p.textContent='No matching fabrics. Try another price, colour or pattern.';$('fabric-grid').append(p);}
 $('previous').disabled=page<=1;$('more').disabled=page>=pages;$('clear-search').hidden=!query;
 }catch{if(token!==listToken)return;$('catalogue-count').textContent='The catalogue could not load.';$('fabric-grid').innerHTML='<div class="catalogue-error">Your choices are safe. Please try loading the collection again.<br><button class="roman-button outline" id="retry">Try again</button></div>';$('retry').addEventListener('click',loadList);}finally{if(token===listToken)$('fabric-grid').removeAttribute('aria-busy');}}
for(const id of ['width','drop'])$(id).addEventListener('input',update);
document.querySelectorAll('[name=lining],[name=fold]').forEach(input=>input.addEventListener('change',update));
$('search-form').addEventListener('submit',event=>{event.preventDefault();query=$('fabric-search').value.trim().slice(0,100);page=1;loadList();});
$('clear-search').addEventListener('click',()=>{query='';$('fabric-search').value='';page=1;loadList();});
$('clear-filters').addEventListener('click',()=>{guidePrice='';colours.clear();patterns.clear();$('fabric-filters').querySelectorAll('details').forEach(item=>{item.open=false;});page=1;loadList();});
for(const [id,direction] of [['previous',-1],['more',1]])$(id).addEventListener('click',()=>{page+=direction;loadList();$('fabrics').scrollIntoView({block:'start',behavior:'instant'});});
$('save-design').addEventListener('click',()=>{if(persist()){$('save-status').textContent='Design saved in this browser. You can return and continue any time.';saveDesign({savedAt:new Date().toISOString()});}});
try{const m=JSON.parse(localStorage.getItem('curtainsuk-roman-measure-v1')||'null');if(m&&['inside','outside'].includes(m.fit)){const plan=finishedPlan(m.fit,m[m.fit]||{},m.clearance);if(plan.complete){const panel=$('measure-import');panel.hidden=false;const text=document.createElement('span');text.textContent=`From your guide: ${plan.width} × ${plan.drop} cm finished size${m.fit==='inside'?` (${plan.deductionMm} mm width allowance already applied)`:''}.`;const button=document.createElement('button');button.className='text-button';button.textContent='Use these measurements →';button.addEventListener('click',()=>{$('width').value=plan.width;$('drop').value=plan.drop;update();});panel.append(text,button);}}}catch{}
await loadList();
if(typeof saved.fabricId==='string'){try{const res=await fetch(`/roman-api/fabric?id=${encodeURIComponent(saved.fabricId)}`);if(res.ok){const restored=await res.json();if(selectionVersion===0){fabric=restored;collapseFabric();}}}catch{}}
update();
