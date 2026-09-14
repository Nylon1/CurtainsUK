import {loadEnvFile} from 'node:process';
import {readFileSync,writeFileSync} from 'node:fs';
import {randomUUID,createHash} from 'node:crypto';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {createServerClient} from '@supabase/ssr';
import {createClient} from '@supabase/supabase-js';
import assert from 'node:assert/strict';
loadEnvFile('.env.local'); loadEnvFile('.env.phase5e-staff');
const base='https://curtainsuk-staging-gateway.vercel.app';
const url=process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
assert.equal(url,'https://hqysjumypgeapgmqkcrx.supabase.co');
const db=createClient(url,process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY,{db:{schema:'curtainsuk_private'},auth:{persistSession:false}});
const {data:source,error}=await db.from('hci_staging_versions').select('private_state').eq('session_id','d8052224-4554-428c-9873-c94fefc665d4').order('revision',{ascending:false}).limit(1).single();
assert.equal(error,null);
const answers=new Map(source.private_state.commands.filter(c=>c.type==='answer-discovery').map(c=>[c.questionId,c.answerId]));
const jar=new Map();
const auth=createServerClient(url,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:values=>values.forEach(({name,value})=>jar.set(name,value))}});
const signed=await auth.auth.signInWithPassword({email:process.env.PHASE5E_STAFF_EMAIL,password:process.env.PHASE5E_STAFF_PASSWORD});
assert.equal(signed.error,null);
const rows=[],sessions=[];
const headers=()=>({'Content-Type':'application/json',Origin:base,Cookie:[...jar].map(([n,v])=>`${n}=${v}`).join('; ')});
try {
 for(let i=0;i<5;i++) {
  let view;
  const sessionId=randomUUID();
  async function act(action) {
   const started=performance.now();
   const response=await fetch(base+'/api/admin/curtain-consultation',{method:'POST',headers:headers(),body:JSON.stringify({sessionId,requestId:randomUUID(),revision:view?.revision,action}),signal:AbortSignal.timeout(35000)});
   const value=await response.json();
   rows.push({case:i,operation:action?.type ?? 'session-start',ms:Math.round(performance.now()-started),status:response.status});
   assert.equal(response.status,200,`Failed ${action?.type ?? 'start'}: HTTP ${response.status}`);
   view=value;
  }
  await act();
  await act({type:'image',referenceType:'room',mime:'image/jpeg',bytes:readFileSync(process.env.HCI_VALIDATION_IMAGE ?? join(homedir(),'hci-real-internal-pilot-v1/pilot-data/real-room-cohort/room-20.jpg')).toString('base64')});
  const edit=async change=>act({type:'palette',edit:{id:randomUUID(),revision:view.palette.revision,...change}});
  if(view.palette.colours.primary.includes('grey')) await edit({type:'remove',colour:'grey'});
  if(!Object.values(view.palette.colours).flat().includes('cream')) await edit({type:'add',colour:'cream',category:'primary'});
  await edit({type:'confirm'});
  for(let step=0;step<60 && view.phase!=='complete';step++) {
   if(view.phase==='discovery') { const answerId=answers.get(view.question.id); assert.ok(view.question.answers.some(a=>a.id===answerId),'Frozen answer missing'); await act({type:'answer',answerId}); }
   else if(view.phase==='calibration') await act({type:'calibrate',reaction:'LIKE'});
   else throw Error('Unexpected consultation phase');
  }
  assert.equal(view.phase,'complete');
  await act({type:'recommend'});
  const direction=view.directions.find(d=>d.cards.length);
  await act({type:'refine',feedback:[{strategyId:direction.id,fabricId:direction.cards[0].reactionId,strategyReaction:'LIKE',fabricReaction:'LIKE'}]});
  const final=view.directions.find(d=>d.cards.length), card=final.cards[0];
  const started=performance.now();
  const detail=await fetch(base+'/api/admin/curtain-consultation?fabric='+encodeURIComponent(card.fabricMasterId),{headers:headers()});
  const fabric=await detail.json(); assert.equal(fabric.fabric.id,card.fabricMasterId);
  rows.push({case:i,operation:'fabric-detail-hydration',ms:Math.round(performance.now()-started),status:detail.status});
  await act({type:'outcome',event:'SAMPLE_INTENT',fabricMasterId:card.fabricMasterId,strategyId:final.id});
  sessions.push({sessionId,digest:view.refinementDigest,selectionDigest:createHash('sha256').update(JSON.stringify(view.directions.map(d=>({id:d.id,cards:d.cards.map(c=>c.fabricMasterId)})))).digest('hex')});
  console.log(JSON.stringify({case:i,requests:rows.filter(r=>r.case===i).length,completed:true}));
 }
} finally {
 await auth.auth.signOut({scope:'local'});
 const summary={};
 for(const operation of [...new Set(rows.map(r=>r.operation))]) {const times=rows.filter(r=>r.operation===operation).map(r=>r.ms).sort((a,b)=>a-b);summary[operation]={n:times.length,p50:times[Math.ceil(times.length*.5)-1],p95:times[Math.ceil(times.length*.95)-1]};}
 writeFileSync('artifacts/phase6-discovery/hci-integrated-benchmark.json',JSON.stringify({recordedAt:new Date().toISOString(),baseline:'41a9f3f',base,summary,rows,sessions,limitations:'HTTP measurements include gateway persistence; exclude browser rendering and Shopify handoff. First request is cold-candidate, not a forced runtime cold start. Five repetitions use the same frozen answers and image, not five independent human reviews.'},null,2));
 console.log(JSON.stringify(summary));
}
