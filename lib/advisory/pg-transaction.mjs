import pg from 'pg';
import {fail} from './contracts.mjs';
import {EXISTING_PROJECT_REF} from './hosted-test.mjs';

// Dedicated LOGIN role only. Neither postgres nor service_role is accepted.
// No connection URI: TLS options cannot be overridden through query parameters.
export function databaseConfig(env){
 const host=env.ADVISORY_DB_HOST,port=Number(env.ADVISORY_DB_PORT),login=env.ADVISORY_DB_LOGIN;
 const direct=host==='db.'+EXISTING_PROJECT_REF+'.supabase.co'&&port===5432;
 const pooled=/^aws-[0-9]+-eu-central-1\.pooler\.supabase\.com$/.test(host??'')&&[5432,6543].includes(port);
 if(env.ADVISORY_TEST_PROJECT_REF!==EXISTING_PROJECT_REF||(!direct&&!pooled)||!/^advisory_trial_[a-z0-9]{8,24}$/.test(login??'')||typeof env.ADVISORY_DB_PASSWORD!=='string'||env.ADVISORY_DB_PASSWORD.length<32)fail('DATABASE_CONFIGURATION_REQUIRED',503);
 return {host,port,database:'postgres',user:login+(pooled?'.'+EXISTING_PROJECT_REF:''),password:env.ADVISORY_DB_PASSWORD,
  ssl:{rejectUnauthorized:true,servername:host,...(env.ADVISORY_DB_CA_PEM?{ca:env.ADVISORY_DB_CA_PEM}:{})},
  max:2,min:0,connectionTimeoutMillis:4000,idleTimeoutMillis:10000,maxLifetimeSeconds:60,
  application_name:'curtainsuk-jane-synthetic-trial',query_timeout:5000};
}

export function createPgTransaction({env,Pool=pg.Pool}){
 const config=databaseConfig(env),login=env.ADVISORY_DB_LOGIN,pool=new Pool(config);
 // Idle socket errors must not crash the process or log credentials.
 pool.on('error',()=>{});
 const transaction=async fn=>{
  let client,discard=false;
  try{
   client=await pool.connect();
   await client.query('begin');
   const identity=(await client.query("select session_user as login,current_user as role,nullif(current_setting('advisory.owner',true),'') as owner")).rows[0];
   if(identity?.login!==login||identity.role!==login||identity.owner!==null){discard=true;fail('UNSCOPED_DATABASE_ROLE',503);}
   await client.query('set local role advisory_runtime');
   await client.query("select set_config('statement_timeout','3000',true),set_config('lock_timeout','500',true),set_config('idle_in_transaction_session_timeout','5000',true)");
   const result=await fn(client);
   // A lost COMMIT response is ambiguous. Do not replay it automatically.
   await client.query('commit');
   return result;
  }catch{
   discard=true;
   if(client)await client.query('rollback').catch(()=>{});
   fail('STORAGE_UNAVAILABLE',503);
  }finally{client?.release(discard);}
 };
 return {transaction,close:()=>pool.end()};
}
