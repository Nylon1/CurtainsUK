import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {createClient} from '@supabase/supabase-js';
import {readPrivateFile} from './jane-private-file.mjs';
import {createPgTransaction} from '../lib/advisory/pg-transaction.mjs';
import {createServerAuth} from '../lib/advisory/auth-session.mjs';
import {verifyCloudPrincipal} from '../lib/advisory/cloud-store.mjs';
const c=await readPrivateFile(process.env.ADVISORY_PRIVATE_TRIAL_PATH),pool=createPgTransaction({env:c.env});
try{
 await assert.rejects(pool.transaction(tx=>tx.query('select 1')),/STORAGE_UNAVAILABLE/);
 const account=c.accounts[0],issuer='https://'+c.projectRef+'.supabase.co/auth/v1';
 const client=createClient('https://'+c.projectRef+'.supabase.co',c.env.ADVISORY_AUTH_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 const set=await client.auth.setSession({access_token:account.accessToken,refresh_token:account.refreshToken});assert.equal(set.error,null);
 assert.equal((await client.auth.signOut({scope:'local'})).error,null);
 const auth=createServerAuth({projectRef:c.projectRef,publishableKey:c.env.ADVISORY_AUTH_PUBLISHABLE_KEY});
 for(const a of c.accounts)await assert.rejects(verifyCloudPrincipal({token:a.accessToken,auth,issuer}),/UNAUTHORISED/);
 const receipt={checkedAt:new Date().toISOString(),result:'PASS',databaseAccessAfterClosure:'DENIED',bothTrialAuthSessions:'SIGNED_OUT_AND_REJECTED',application:'PUBLICLY_INACTIVE',scope:'Only trial sessions and temporary runtime membership closed; test accounts retained'};
 await writeFile(process.argv[2],JSON.stringify(receipt,null,2),{flag:'wx'});console.log(JSON.stringify(receipt));
}finally{await pool.close();}
