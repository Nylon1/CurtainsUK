import assert from 'node:assert/strict';
import { loadEnvFile } from 'node:process';
import { createServerClient } from '@supabase/ssr';
import { writeFileSync } from 'node:fs';
loadEnvFile('.env.local'); loadEnvFile('.env.phase5e-staff');
const base = 'https://curtainsuk-staging-gateway.vercel.app';
assert.equal(process.env.NEXT_PUBLIC_SUPABASE_URL,'https://hqysjumypgeapgmqkcrx.supabase.co');
const jar = new Map();
const auth = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:values=>values.forEach(({name,value})=>jar.set(name,value))}});
const signed = await auth.auth.signInWithPassword({email:process.env.PHASE5E_STAFF_EMAIL,password:process.env.PHASE5E_STAFF_PASSWORD});
assert.equal(signed.error,null);
const cookie = [...jar].map(([name,value])=>`${name}=${value}`).join('; ');
const checks = [];
for (const [path,authenticated,expected] of [['/api/admin/reviews',false,401],['/api/admin/reviews',true,200],['/api/admin/shipping-rates',true,403],['/api/admin/prestigious-stock',true,403],['/api/admin/review-evidence/maintenance',true,403]]) {
  const response=await fetch(base+path,{headers:authenticated?{Cookie:cookie}:{},redirect:'manual'});
  await response.body?.cancel();
  assert.equal(response.status,expected,path);
  checks.push({path,authenticated,status:response.status,noStore:response.headers.get('cache-control')?.includes('no-store')===true});
}
await auth.auth.signOut();
writeFileSync('artifacts/phase5e/deployed-auth.json',JSON.stringify({checkedAt:new Date().toISOString(),base,checks},null,2)+'\n');
console.log(JSON.stringify({base,checks},null,2));
