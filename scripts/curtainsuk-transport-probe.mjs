// Read-only hosted probe. Authentication values remain in memory, never in output.
import {loadEnvFile} from 'node:process';
import {writeFileSync} from 'node:fs';
import {createServerClient} from '@supabase/ssr';
import assert from 'node:assert/strict';
loadEnvFile('.env.local');loadEnvFile('.env.phase5e-staff');
const base='https://curtainsuk-staging-gateway.vercel.app';
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
assert.equal(url,'https://hqysjumypgeapgmqkcrx.supabase.co');
const jar=new Map();
const auth=createServerClient(url,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:values=>values.forEach(({name,value})=>jar.set(name,value))}});
const signed=await auth.auth.signInWithPassword({email:process.env.PHASE5E_STAFF_EMAIL,password:process.env.PHASE5E_STAFF_PASSWORD});
assert.equal(signed.error,null);
const rows=[];
for(let i=0;i<60;i++){
 const start=performance.now();
 const response=await fetch(base+'/api/admin/curtain-consultation?fabric=pt-4262-770',{headers:{Cookie:[...jar].map(([n,v])=>`${n}=${v}`).join('; ')},signal:AbortSignal.timeout(35000)});
 await response.arrayBuffer();
 const row={index:i,status:response.status,ms:Math.round(performance.now()-start),requestId:response.headers.get('x-vercel-id')};rows.push(row);
 if(!response.ok) console.log(JSON.stringify(row));
}
const summary={recordedAt:new Date().toISOString(),requests:rows.length,failed:rows.filter(r=>r.status!==200).length,rows};
writeFileSync('artifacts/phase6-discovery/closure-transport-probe.json',JSON.stringify(summary,null,2));
console.log(JSON.stringify({requests:summary.requests,failed:summary.failed}));
