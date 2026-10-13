'use client';
import {useEffect,useRef,useState} from 'react';
import {createClient} from '@supabase/supabase-js';
import Image from 'next/image';

const sessionKey='curtainsuk-jane-review-session';
const base={text:null,context:null,consent:false,recoveryToken:null};
const safeUrl=value=>{try{const url=new URL(value);return url.origin==='https://www.curtainsuk.com'&&url.pathname.startsWith('/pages/fabric/')?url.href:null;}catch{return null;}};
const roomUrl=fabric=>fabric.roomPreview===`/pages/room-visualiser?fabric=${encodeURIComponent(fabric.id)}`?'https://www.curtainsuk.com'+fabric.roomPreview:null;
const waitSeconds=deadline=>Math.max(0,Math.ceil((deadline-Date.now())/1000));

export default function JaneReviewChat({projectRef,publishableKey}){
  const auth=useRef(null),authClient=useRef(null),grant=useRef(''),csrf=useRef(''),pending=useRef(null);
  const [ready,setReady]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[status,setStatus]=useState('');
  const [session,setSession]=useState(null),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[grantText,setGrantText]=useState('');
  const [consent,setConsent]=useState(false),[draft,setDraft]=useState(''),[recovery,setRecovery]=useState(''),[newRecovery,setNewRecovery]=useState('');
  const [waitingUntil,setWaitingUntil]=useState(0),[remaining,setRemaining]=useState(30),[roomOpen,setRoomOpen]=useState(false);
  const [fabric,setFabric]=useState(null),[fabricError,setFabricError]=useState(''),[shareFabric,setShareFabric]=useState(false),[shared,setShared]=useState(false);
  const input=useRef(null),log=useRef(null);
  useEffect(()=>{
    const id=new URLSearchParams(location.search).get('fabric');
    if(!id)return;
    if(!/^[A-Za-z0-9][A-Za-z0-9-]{0,149}$/.test(id)){setFabricError('This fabric reference is invalid.');return;}
    fetch('/api/advisory/review-fabric?fabric='+encodeURIComponent(id),{cache:'no-store'}).then(async response=>{
      if(!response.ok)throw Error();const data=await response.json();if(data.fabric?.id!==id)throw Error();setFabric(data.fabric);
    }).catch(()=>setFabricError('We could not verify that fabric. You can still discuss your room without sharing it.'));
  },[]);
  useEffect(()=>{
    if(!waitingUntil||roomOpen)return;
    const tick=()=>{const left=waitSeconds(waitingUntil);setRemaining(left);if(!left){setRoomOpen(true);setWaitingUntil(0);}};
    tick();const timer=setInterval(tick,250);document.addEventListener('visibilitychange',tick);
    return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',tick);};
  },[waitingUntil,roomOpen]);
  useEffect(()=>{if(roomOpen&&session)input.current?.focus();},[roomOpen,session]);
  useEffect(()=>{log.current?.scrollTo({top:log.current.scrollHeight});},[session?.messages?.length]);

  async function request(action,extra={},requestId=crypto.randomUUID()){
    if(!auth.current||!grant.current)throw Error('Sign in to the protected review first.');
    const command={...base,action,requestId,sessionId:session?.id??null,revision:session?.revision??null,...extra};
    const response=await fetch('/api/advisory/review-chat',{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json','Accept':'application/json','Authorization':'Bearer '+auth.current,'X-Advisory-Trial-Grant':grant.current,'X-Advisory-CSRF':csrf.current},body:JSON.stringify(command)});
    const data=await response.json().catch(()=>({error:'SERVICE_UNAVAILABLE'}));
    if(!response.ok)throw Error(data.message??data.error??'The request could not be completed.');
    if(data.session){setSession(data.session);sessionStorage.setItem(sessionKey,data.session.id);}
    return data;
  }
  async function submit(action,extra={},id){
    if(busy)return null;
    setBusy(true);setError('');setStatus(action==='message'?'Jane is considering your room…':'');
    try{const result=await request(action,extra,id);setStatus('');return result;}
    catch(e){setError(e.message);setStatus('');return null;}
    finally{setBusy(false);}
  }
  async function login(event){
    event.preventDefault();setBusy(true);setError('');
    try{
      const client=createClient('https://'+projectRef+'.supabase.co',publishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
      const {data,error:authError}=await client.auth.signInWithPassword({email:email.trim(),password});
      setPassword('');if(authError||!data.session?.access_token)throw Error('The test account could not be signed in.');
      const response=await fetch('/api/advisory/review-chat',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+data.session.access_token,'X-Advisory-Trial-Grant':grantText.trim()},body:JSON.stringify({action:'bootstrap'})});
      const result=await response.json().catch(()=>({}));
      if(!response.ok||!result.csrf||!['synthetic-mock-only','synthetic-openai-only'].includes(result.mode))throw Error('The protected review is unavailable for this account or access grant.');
      auth.current=data.session.access_token;authClient.current=client;grant.current=grantText.trim();csrf.current=result.csrf;
      setGrantText('');setReady(true);setStatus(result.mode==='synthetic-openai-only'?'Protected AI review connected.':'Scripted review connected.');
      const saved=sessionStorage.getItem(sessionKey);
      if(saved&&/^[0-9a-f-]{36}$/.test(saved)){
        const command={...base,action:'resume',requestId:crypto.randomUUID(),sessionId:saved,revision:0};
        const resumed=await fetch('/api/advisory/review-chat',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+auth.current,'X-Advisory-Trial-Grant':grant.current,'X-Advisory-CSRF':csrf.current},body:JSON.stringify(command)});
        if(resumed.ok){const body=await resumed.json();setSession(body.session);setRoomOpen(true);}
        else sessionStorage.removeItem(sessionKey);
      }
    }catch(e){setError(e.message);auth.current=null;authClient.current=null;grant.current='';csrf.current='';setReady(false);}
    finally{setBusy(false);}
  }
  async function start(){
    if(!consent){setError('Please agree to save this test consultation before entering.');return;}
    const result=await submit('start',{sessionId:null,revision:null,consent:true});
    if(result){setRoomOpen(false);setRemaining(30);setWaitingUntil(Date.now()+30000);}
  }
  async function send(event){
    event.preventDefault();const text=draft.trim();if(!text||!session)return;
    const id=pending.current?.text===text&&pending.current?.sessionId===session.id?pending.current.id:crypto.randomUUID();
    pending.current={text,sessionId:session.id,id};
    const result=await submit('message',{text},id);
    if(result){pending.current=null;setDraft('');input.current?.focus();}
  }
  async function share(){
    if(!fabric||!shareFabric||!session)return;
    const context={version:'1',source:'customer-notes',consent:true,room:null,fabricIds:[fabric.id],colours:[],heading:null,lighting:null,curtainPosition:null,preferences:[],references:['fabric-detail:v1'],feedback:'I selected this exact fabric and would like to discuss it.'};
    const result=await submit('context',{context,consent:true});
    if(result){setShared(true);setStatus('The exact selected fabric is now in this consultation. Tell Jane what you would like to explore.');}
  }
  async function save(){const result=await submit('save',{consent:true});if(result?.recoveryToken)setNewRecovery(result.recoveryToken);}
  async function recover(event){event.preventDefault();const result=await submit('recover',{sessionId:null,revision:null,recoveryToken:recovery.trim(),consent:true});if(result){setRecovery('');setRoomOpen(true);setNewRecovery('');}}
  async function remove(){const result=await submit('delete');if(result?.deleted){setSession(null);setRoomOpen(false);setWaitingUntil(0);setShared(false);sessionStorage.removeItem(sessionKey);setStatus('The consultation has been deleted.');}}
  function signOut(){authClient.current?.auth.signOut().catch(()=>{});auth.current=null;authClient.current=null;grant.current='';csrf.current='';pending.current=null;setReady(false);setSession(null);setRoomOpen(false);setNewRecovery('');setPassword('');setError('');}

  return <main className="jane-review">
    <header><a href="https://www.curtainsuk.com/">CURTAINS<span>UK</span></a><strong>Jane · protected consultation review</strong></header>
    <p className="jane-review__notice">Private development test for approved synthetic accounts. Jane is an AI adviser. Use invented customer details only. The public service is not active.</p>
    <div className="jane-review__layout"><aside><Image unoptimized src="/jane-review-portrait" alt="Synthetic portrait representing Jane, AI interior design adviser" width={300} height={400}/><h1>Meet Jane</h1><p>Explore a room problem, weigh a few design directions, and tell Jane what feels right. She can refine the suggestion with you.</p><p>The consultation is designed for around ten minutes, with no abrupt cutoff.</p><nav aria-label="CurtainsUK design tools"><a href="https://www.curtainsuk.com/pages/fabric-library?view=browse-fabrics">Browse Fabrics</a><a href="https://www.curtainsuk.com/pages/room-visualiser">Room Visualiser</a><a href="https://www.curtainsuk.com/pages/fabric-library?view=curtain-style">Curtain Style</a></nav></aside>
    <section className="jane-review__panel" aria-label="Consultation with Jane">
      {!ready?<form className="jane-review__form" onSubmit={login}><h2>Enter the private review</h2><p>Use an approved synthetic Supabase Auth test account and the short-lived signed review grant. Credentials stay in this browser session.</p><label htmlFor="jane-email">Test account email</label><input id="jane-email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="username"/><label htmlFor="jane-password">Password</label><input id="jane-password" type="password" value={password} onChange={e=>setPassword(e.target.value)} required autoComplete="current-password"/><label htmlFor="jane-grant">Signed review grant</label><input id="jane-grant" type="password" value={grantText} onChange={e=>setGrantText(e.target.value)} required autoComplete="off"/><button disabled={busy}>Connect to Jane</button></form>:<>
        <div className="jane-review__bar"><span>Authenticated private review</span><button type="button" onClick={signOut}>Sign out</button></div>
        {fabric&&<section className="jane-review__fabric" aria-label="Selected fabric"><h2>Selected fabric</h2><p><strong>{fabric.design} · {fabric.colour}</strong> <small>{fabric.id}</small></p><p>This is a design reference. Check current price and availability on its fabric page.</p>{safeUrl(fabric.url)&&<a href={safeUrl(fabric.url)}>View fabric detail</a>}{roomUrl(fabric)&&<a href={roomUrl(fabric)}>View this fabric in Room Visualiser</a>}{session&&!shared&&<><label><input type="checkbox" checked={shareFabric} onChange={e=>setShareFabric(e.target.checked)}/> Share this exact fabric with Jane</label><button type="button" disabled={busy||!shareFabric} onClick={share}>Discuss this fabric</button></>}</section>}
        {fabricError&&<p role="status">{fabricError}</p>}
        {!session?<><div className="jane-review__welcome"><h2>Start with your room</h2><p>What are you hoping to change, and what is not quite working? Jane will listen before recommending a direction.</p><label><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/> I agree to save this invented review conversation in encrypted advisory storage. It can be retrieved for up to 90 days, and I can delete it here. Scheduled expiry cleanup is still a release check.</label><button type="button" disabled={busy||!consent} onClick={start}>Enter consultation</button></div><form onSubmit={recover} className="jane-review__recover"><label htmlFor="jane-recovery">Recover a saved consultation with a one-time code</label><input id="jane-recovery" type="password" value={recovery} onChange={e=>setRecovery(e.target.value)} autoComplete="off"/><button disabled={busy||!recovery.trim()}>Recover</button></form></>:!roomOpen?<div className="jane-review__waiting"><h2>A moment to settle in</h2><p>This is a welcome, not a queue. You can go straight in.</p><strong aria-live="off">{remaining} seconds</strong><progress max="30" value={30-remaining} aria-label="Welcome progress"/><button type="button" onClick={()=>{setRoomOpen(true);setWaitingUntil(0);}}>Start now</button></div>:<>
          <div className="jane-review__chat" ref={log} role="log" aria-label="Conversation with Jane" aria-live="polite" aria-relevant="additions"><article className="jane-review__message"><strong>Jane · AI adviser</strong><p>What would you like your room to feel like, and what is not quite working at the moment?</p></article>{session.messages.map(message=><article className={'jane-review__message '+(message.role==='user'?'jane-review__message--user':'')} key={message.id}><strong>{message.role==='user'?'You':'Jane · AI adviser'}</strong><p>{message.text}</p>{message.fabrics?.length>0&&<div className="jane-review__cards">{message.fabrics.map(item=>safeUrl(item.url)&&<div className="jane-review__card" key={item.id}><a href={safeUrl(item.url)}>{item.imageUrl&&<Image unoptimized src={item.imageUrl} alt={`${item.design} in ${item.colour}`} width={90} height={90}/>}<span>{item.design} · {item.colour}<small>{item.id}</small></span></a>{roomUrl(item)&&<a href={roomUrl(item)}>View in Room Visualiser</a>}</div>)}</div>}</article>)}</div>
          <form className="jane-review__composer" onSubmit={send}><label htmlFor="jane-message">Your message to Jane</label><textarea id="jane-message" ref={input} maxLength={2000} rows={3} required value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Tell Jane about your room or how a suggestion feels…"/><button disabled={busy||!draft.trim()}>Send message</button></form>
          <div className="jane-review__actions"><button type="button" disabled={busy} onClick={()=>submit('summary')}>Summarise direction</button><button type="button" disabled={busy} onClick={save}>Create return code</button><button type="button" disabled={busy} onClick={remove}>Delete consultation</button></div>
          {newRecovery&&<div className="jane-review__recovery"><label htmlFor="jane-new-code">One-time return code, keep it private</label><textarea id="jane-new-code" readOnly value={newRecovery} rows={2}/><p>Saving again replaces this code. Anyone with it can recover this test conversation.</p></div>}
        </>}
      </>}
      {status&&<p className="jane-review__status" role="status">{status}</p>}{error&&<p className="jane-review__error" role="alert">{error}</p>}
    </section></div>
  </main>;
}
