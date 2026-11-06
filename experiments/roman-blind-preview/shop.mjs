import {readDesign,saveDesign} from './journey.mjs';
import {finishedPlan} from './measure-plan.mjs';
const $=id=>document.getElementById(id),money=new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:0});
const saved=readDesign();let selectionVersion=0,fabric=null,page=1,pages=1,query='',listToken=0,priceToken=0,quote=null,priceTimer,priceAbort;
for(const id of ['width','drop'])if(typeof saved[id]==='number'&&saved[id]>=30&&saved[id]<=500)$(id).value=saved[id];
for(const name of ['lining','fold']){const allowed=name==='lining'?['STANDARD','BLACKOUT']:['stacked','cascade'];if(allowed.includes(saved[name]))document.querySelector(`input[name="${name}"][value="${saved[name]}"]`).checked=true;}
function config(){return {width:Number($('width').value)||null,drop:Number($('drop').value)||null,lining:document.querySelector('[name=lining]:checked').value,fold:document.querySelector('[name=fold]:checked').value,fabricId:fabric?.id||null};}
function validSize(value){return typeof value==='number'&&value>=30&&value<=500&&Math.abs(value*10-Math.round(value*10))<1e-7;}
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
 $('summary-size').textContent=validSize(c.width)&&validSize(c.drop)?`${c.width} × ${c.drop} cm`:'Add your measurements';
 $('summary-availability').textContent=fabric?'Checking availability…':'Choose a fabric';
 $('summary-lining').textContent=c.lining==='BLACKOUT'?'Blackout':'Standard ivory';$('summary-fold').textContent=c.fold==='cascade'?'Cascade':'Stacked';
 $('chosen-name').textContent=fabric?.name||'The start of something beautiful.';$('chosen-colour').textContent=fabric?`${fabric.colour} · ${fabric.brand}`:'Choose a fabric to begin.';
 $('chosen-image').src=fabric?imageUrl(fabric.image)||'assets/roman-lounge.jpg':'assets/roman-lounge.jpg';$('chosen-image').alt=fabric?`${fabric.name}, ${fabric.colour} fabric`:'Roman blind inspiration';$('image-caption').textContent=fabric?'YOUR SELECTED FABRIC':'YOUR ROMAN BLIND';
 $('preview-design').href=`index.html?style=${c.fold}${fabric?`&fabric=${encodeURIComponent(fabric.id)}`:''}`;
 const valid=validSize(c.width)&&validSize(c.drop);$('save-design').disabled=!valid||!fabric;
 for(const id of ['width','drop'])$(id).setAttribute('aria-invalid',String($(id).value!==''&&!validSize(c[id])));
 $('size-message').textContent=['width','drop'].some(id=>$(id).value!==''&&!validSize(c[id]))?'Use centimetres from 30 to 500, with no more than one decimal place.':'Finished sizes only. No further deduction is applied.';
 $('price').textContent=valid&&fabric?'Calculating…':'Add size & fabric';$('price-message').textContent='Your estimate will include VAT.';persist();
 document.querySelectorAll('[data-fabric]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.fabric===fabric?.id)));
 if(fabric&&!valid)$('summary-availability').textContent='Add size to check required quantity';
 if(valid&&fabric){const token=priceToken;priceTimer=setTimeout(()=>loadPrice(c,token),300);}
}
async function loadPrice(c,token){priceAbort=new AbortController();try{const res=await fetch('/roman-api/price',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(c),signal:priceAbort.signal});if(!res.ok)throw new Error();const result=await res.json();if(token!==priceToken)return;quote=result;$('summary-availability').textContent=result.availability||'Check availability';$('price').textContent=result.status==='estimate'?money.format(result.totalMinor/100):'Price to confirm';$('price-message').textContent=result.status==='estimate'?`Including VAT. ${result.message}`:result.message;}catch(error){if(error.name==='AbortError'||token!==priceToken)return;$('summary-availability').textContent='Check availability';$('price').textContent='Estimate unavailable';$('price-message').textContent='Please try again. Your design can still be saved.';}}
async function loadList(){const token=++listToken;$('catalogue-count').textContent='Loading fabrics…';$('fabric-grid').setAttribute('aria-busy','true');$('previous').disabled=$('more').disabled=true;try{const res=await fetch(`/roman-api/catalog?page=${page}&query=${encodeURIComponent(query)}`);if(!res.ok)throw new Error();const data=await res.json();if(token!==listToken)return;pages=data.pages;page=data.page;$('fabric-grid').replaceChildren();$('catalogue-count').textContent=`${data.total.toLocaleString('en-GB')} ${data.total===1?'fabric':'fabrics'}${query?' found':' in the collection'}`;$('page-label').textContent=data.total?`${page} / ${pages}`:'';
 for(const f of data.fabrics){const button=document.createElement('button');button.className='fabric-card';button.dataset.fabric=f.id;button.setAttribute('aria-pressed',String(f.id===fabric?.id));button.setAttribute('aria-label',`${f.name}, ${f.colour}, ${f.brand}`);const img=document.createElement('img');img.src=imageUrl(f.image);img.alt='';img.loading='lazy';img.width=240;img.height=240;img.addEventListener('error',()=>{img.removeAttribute('src');img.alt='Image unavailable';},{once:true});const name=document.createElement('strong');name.textContent=f.name;const desc=document.createElement('small');desc.textContent=`${f.colour} · ${f.brand}`;button.append(img,name,desc);button.addEventListener('click',()=>{selectionVersion++;fabric=f;update();collapseFabric();$('change-fabric').focus({preventScroll:true});});$('fabric-grid').append(button);}
 if(!data.fabrics.length){const p=document.createElement('p');p.className='catalogue-error';p.textContent='No matching fabrics. Try a different design, colour or brand.';$('fabric-grid').append(p);}
 $('previous').disabled=page<=1;$('more').disabled=page>=pages;$('clear-search').hidden=!query;
 }catch{if(token!==listToken)return;$('catalogue-count').textContent='The catalogue could not load.';$('fabric-grid').innerHTML='<div class="catalogue-error">Your choices are safe. Please try loading the collection again.<br><button class="roman-button outline" id="retry">Try again</button></div>';$('retry').addEventListener('click',loadList);}finally{if(token===listToken)$('fabric-grid').removeAttribute('aria-busy');}}
for(const id of ['width','drop'])$(id).addEventListener('input',update);
document.querySelectorAll('[name=lining],[name=fold]').forEach(input=>input.addEventListener('change',update));
$('search-form').addEventListener('submit',event=>{event.preventDefault();query=$('fabric-search').value.trim().slice(0,100);page=1;loadList();});
$('clear-search').addEventListener('click',()=>{query='';$('fabric-search').value='';page=1;loadList();});
for(const [id,direction] of [['previous',-1],['more',1]])$(id).addEventListener('click',()=>{page+=direction;loadList();$('fabrics').scrollIntoView({block:'start',behavior:'instant'});});
$('save-design').addEventListener('click',()=>{if(persist()){$('save-status').textContent='Design saved in this browser. You can return and continue any time.';saveDesign({savedAt:new Date().toISOString()});}});
try{const m=JSON.parse(localStorage.getItem('curtainsuk-roman-measure-v1')||'null');if(m&&['inside','outside'].includes(m.fit)){const plan=finishedPlan(m.fit,m[m.fit]||{},m.clearance);if(plan.complete){const panel=$('measure-import');panel.hidden=false;const text=document.createElement('span');text.textContent=`From your guide: ${plan.width} × ${plan.drop} cm finished size${m.fit==='inside'?` (${plan.deductionMm} mm width allowance already applied)`:''}.`;const button=document.createElement('button');button.className='text-button';button.textContent='Use these measurements →';button.addEventListener('click',()=>{$('width').value=plan.width;$('drop').value=plan.drop;update();});panel.append(text,button);}}}catch{}
await loadList();
if(typeof saved.fabricId==='string'){try{const res=await fetch(`/roman-api/fabric?id=${encodeURIComponent(saved.fabricId)}`);if(res.ok){const restored=await res.json();if(selectionVersion===0){fabric=restored;collapseFabric();}}}catch{}}
update();
