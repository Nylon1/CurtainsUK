import {welcomeRemaining} from '/welcome-clock.mjs';
const $=id=>document.getElementById(id);
let session=null,csrf='',busy=false,deadline=null,timer=null,pendingMessage=null;
const savedKey='curtainsuk-jane-local-preview-id';
const readSaved=()=>{try{return sessionStorage.getItem(savedKey)??localStorage.getItem(savedKey);}catch{return null;}};
const remember=id=>{try{if(id)localStorage.setItem(savedKey,id);else{localStorage.removeItem(savedKey);sessionStorage.removeItem(savedKey);}}catch{}};
function notice(text){$('status').textContent=text;}
function error(text,target='error'){$(target).textContent=text;$(target).hidden=!text;}
function lock(value){busy=value;document.querySelectorAll('button').forEach(b=>{if(!b.dataset.close)b.disabled=value;});}
async function command(action,extra={}){
  if(busy)throw Error('Please wait for the current request.');
  const request={requestId:crypto.randomUUID(),sessionId:session?.id??null,revision:session?.revision??null,action,text:null,context:null,consent:false,recoveryToken:null,...extra};
  // Retrying the same unedited draft reuses its request ID after an uncertain response.
  if(action==='message'){if(pendingMessage?.text===request.text&&pendingMessage.sessionId===request.sessionId)request.requestId=pendingMessage.requestId;else pendingMessage={...request};}
  lock(true);error('');notice(action==='message'||action==='summary'?'Preparing a scripted demonstration reply…':'');
  try{
    const response=await fetch('/api/consultation',{method:'POST',headers:{'Content-Type':'application/json','X-Advisory-CSRF':csrf,Accept:['message','summary'].includes(action)?'text/event-stream':'application/json'},body:JSON.stringify(request)});
    if(!response.ok){const data=await response.json();throw Error(data.message??'Please try again.');}
    let result;
    if(response.headers.get('content-type')?.startsWith('text/event-stream')){
      const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='';
      try{for(;;){const {done,value}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});let split;while((split=buffer.indexOf('\n\n'))!==-1){const event=buffer.slice(0,split);buffer=buffer.slice(split+2);if(event.startsWith('event: complete\n'))result=JSON.parse(event.split('\ndata: ')[1]);}}}finally{reader.releaseLock();}
      if(!result)throw Error('The reply was interrupted. Your draft is still here; retry it to recover the saved result.');
    }else result=await response.json();
    if(result.session){session=result.session;try{sessionStorage.setItem(savedKey,session.id);}catch{}render();}
    if(action==='message')pendingMessage=null;
    notice('');return result;
  }finally{lock(false);}
}
function bubble(role,text){const article=document.createElement('article');article.className='bubble'+(role==='user'?' customer':'');const label=document.createElement('strong');label.textContent=role==='user'?'You':'Jane · scripted AI preview';article.append(label,document.createTextNode(text));return article;}
function render(){
  const log=$('transcript');
  const existing=[...log.children].slice(1);
  if(log.dataset.session!==session.id||existing.some((node,i)=>node.dataset.message!==session.messages[i]?.id)){
    log.replaceChildren(bubble('assistant','Welcome to the studio. What would you like your room to feel like, and what isn’t quite working at the moment?'));log.dataset.session=session.id;
  }
  // Keep existing log nodes so assistive technology announces only new replies.
  for(const m of session.messages.slice(Math.max(0,log.children.length-1))){
    const node=bubble(m.role,m.text);node.dataset.message=m.id;
    if(m.fabrics?.length){const cards=document.createElement('div');cards.className='verified-fabrics';
      for(const fabric of m.fabrics){
        const a=document.createElement('a');a.href=fabric.url;a.target='_blank';a.rel='noopener noreferrer';a.setAttribute('aria-label','View '+fabric.design+' in '+fabric.colour+', fabric '+fabric.id);
        const img=document.createElement('img');img.src=fabric.imageUrl;img.alt=fabric.design+' · '+fabric.colour;img.loading='lazy';img.width=120;img.height=120;
        const label=document.createElement('span');label.textContent=fabric.design+' · '+fabric.colour;
        const identity=document.createElement('small');identity.textContent=fabric.id;a.append(img,label,identity);cards.append(a);
      }node.append(cards);
    }log.append(node);
  }
  log.scrollTop=log.scrollHeight;
  const summary=session.summary;if(summary){$('palette').replaceChildren(...summary.palette.map(colour=>{const span=document.createElement('span');span.textContent=colour;return span;}));$('pattern').textContent=summary.patternDirection;$('texture').textContent=summary.textureDirection;$('alternatives').textContent=summary.alternatives.length?'Another direction: '+summary.alternatives.join(' · '):'';$('next-steps').textContent=summary.nextSteps.join(' · ');}
}
function openChat(){clearInterval(timer);deadline=null;$('welcome').hidden=true;$('waiting').hidden=true;$('chat').hidden=false;$('transcript').scrollTop=$('transcript').scrollHeight;$('message').focus();}
function tick(){if(deadline===null)return;const remaining=welcomeRemaining(deadline,Date.now());$('seconds').textContent=String(remaining);$('progress').value=30-remaining;if(!remaining)openChat();}
document.addEventListener('visibilitychange',tick);
$('start').addEventListener('click',async()=>{try{await command('start',{sessionId:null,revision:null});$('welcome').hidden=true;$('waiting').hidden=false;deadline=Date.now()+30000;timer=setInterval(tick,250);$('skip-wait').focus();tick();}catch(e){error(e.message);notice('');}});
$('skip-wait').addEventListener('click',openChat);
$('message-form').addEventListener('submit',async e=>{e.preventDefault();const text=$('message').value.trim();if(!text)return;try{await command('message',{text});$('message').value='';$('message').focus();}catch(e){error(e.message);notice('');}});
document.querySelectorAll('[data-prompt]').forEach(button=>button.addEventListener('click',()=>{$('message').value=button.dataset.prompt;$('message').focus();}));
$('summary').addEventListener('click',async()=>{try{await command('summary');$('summary-card').hidden=false;$('summary-card').scrollIntoView({block:'nearest'});}catch(e){error(e.message);notice('');}});
$('handoff-open').addEventListener('click',()=>{$('handoff').showModal();error('','handoff-error');});
document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>{$(button.dataset.close).close();if(button.dataset.close==='save'){$('saved-code').value='';$('saved-result').hidden=true;}}));
$('save').addEventListener('close',()=>{$('saved-code').value='';$('saved-result').hidden=true;});
$('handoff-form').addEventListener('submit',async e=>{e.preventDefault();try{const context={version:'1',source:$('source').value,consent:$('context-consent').checked,room:$('room').value,fabricIds:$('fabric-id').value?[$('fabric-id').value]:[],colours:$('colours').value.split(',').map(s=>s.trim()).filter(Boolean),heading:null,lighting:$('source').value==='room-visualiser'?$('lighting').value:null,curtainPosition:null,preferences:[],references:[],feedback:$('result-feedback').value};await command('context',{context});$('handoff').close();notice('Your chosen design details were shared with this consultation.');$('message').value='I have shared my results. '+context.feedback;$('message').focus();}catch(e){error(e.message,'handoff-error');notice('');}});
$('save-open').addEventListener('click',()=>{$('save-consent').checked=false;$('save').showModal();error('','save-error');});
$('save-confirm').addEventListener('click',async()=>{if(!$('save-consent').checked){error('Please confirm that you want to save this review conversation.','save-error');return;}try{const result=await command('save',{consent:true});remember(session.id);$('saved-code').value=result.recoveryToken;$('saved-result').hidden=false;notice('The consultation was saved successfully on this computer.');}catch(e){error(e.message,'save-error');notice('');}});
$('delete').addEventListener('click',async()=>{try{await command('delete');remember(null);session=null;pendingMessage=null;clearInterval(timer);deadline=null;$('save').close();$('welcome').hidden=false;$('chat').hidden=true;$('waiting').hidden=true;$('summary-card').hidden=true;$('resume').hidden=true;$('message').value='';notice('The consultation and saved recovery access were deleted.');$('start').focus();}catch(e){error(e.message,'save-error');notice('');}});
$('resume').addEventListener('click',async()=>{try{await command('resume',{sessionId:readSaved(),revision:0});openChat();notice('Your saved consultation is ready to continue.');}catch(e){error(e.message);notice('');}});
$('recover-form').addEventListener('submit',async e=>{e.preventDefault();try{await command('recover',{sessionId:null,revision:null,recoveryToken:$('recovery-code').value.trim(),consent:$('recover-consent').checked});$('recovery-code').value='';remember(session.id);openChat();notice('Recovered successfully. The one-time code has been consumed; save again for a new code.');}catch(e){error(e.message);notice('');}});
try{const response=await fetch('/bootstrap',{cache:'no-store'});if(!response.ok)throw Error();csrf=(await response.json()).csrf;$('resume').hidden=!readSaved();}catch{error('The local preview could not connect. Restart the preview server, then reload this page.');lock(true);}
