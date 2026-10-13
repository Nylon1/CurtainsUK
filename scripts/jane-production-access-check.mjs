// Read-only role checks plus a rolled-back retention function rehearsal.
// Reads passwords only from the Windows-protected operator file.
import {readFile} from 'node:fs/promises';
import pg from 'pg';
import {readPrivateFile} from './jane-private-file.mjs';
import {JANE_RUNTIME_LOGIN,JANE_RETENTION_LOGIN} from '../lib/advisory/production-access.mjs';

const ref='hqysjumypgeapgmqkcrx';
const receiptPath=process.argv[2],caPath=process.argv[3];
if(!receiptPath||!caPath)throw Error('PRIVATE_PATHS_REQUIRED');
let stage='private-config';
try{
 const receipt=JSON.parse(await readFile(receiptPath,'utf8'));
 const privateData=await readPrivateFile(receipt.privatePath);
 if(receipt.projectRef!==ref||privateData.projectRef!==ref
   ||privateData.runtime.login!==JANE_RUNTIME_LOGIN||privateData.retention.login!==JANE_RETENTION_LOGIN)throw Error('PRODUCTION_ACCESS_IDENTITY_MISMATCH');
 const ca=await readFile(caPath,'utf8');
 const connect=async ({login,password})=>{
  const client=new pg.Client({host:'aws-0-eu-central-1.pooler.supabase.com',port:6543,database:'postgres',user:login+'.'+ref,password,
   ssl:{rejectUnauthorized:true,servername:'aws-0-eu-central-1.pooler.supabase.com',ca},connectionTimeoutMillis:5000,query_timeout:5000});
  await client.connect();return client;
 };
 const report={projectRef:ref,observedAt:new Date().toISOString(),runtime:false,retention:false,runtimeRoleVerified:false,retentionRehearsal:null};
 stage='runtime-connect';
 const runtime=await connect(privateData.runtime);
 try{
  stage='runtime-check';
  const before=(await runtime.query("select session_user as login,current_user as active,has_schema_privilege(current_user,'advisory','USAGE') as inherited,has_schema_privilege(current_user,'auth','USAGE') as auth_usage,has_schema_privilege(current_user,'curtainsuk_private','USAGE') as catalogue_usage")).rows[0];
  if(before.login!==JANE_RUNTIME_LOGIN||before.active!==JANE_RUNTIME_LOGIN||before.inherited||before.auth_usage||before.catalogue_usage)throw Error('RUNTIME_ROLE_TOO_BROAD');
  await runtime.query('begin');await runtime.query('set local role advisory_runtime');
  const role=(await runtime.query('select current_user as active')).rows[0].active;
  await runtime.query('select fabric_id from advisory.knowledge_search limit 1');
  await runtime.query('rollback');
  if(role!=='advisory_runtime')throw Error('RUNTIME_ROLE_NOT_GRANTED');
  report.runtime=true;report.runtimeRoleVerified=true;
 }finally{await runtime.end();}
 stage='retention-connect';
 const retention=await connect(privateData.retention);
 try{
  stage='retention-privileges';
  const before=(await retention.query("select session_user as login,current_user as active,has_schema_privilege(current_user,'advisory','USAGE') as inherited,has_schema_privilege(current_user,'auth','USAGE') as auth_usage,has_function_privilege(current_user,'advisory.purge_expired()','EXECUTE') as purge_execute,pg_has_role(current_user,'advisory_runtime','MEMBER') as runtime_membership,pg_has_role(current_user,'advisory_indexer','MEMBER') as indexer_membership")).rows[0];
  if(before.login!==JANE_RETENTION_LOGIN||before.active!==JANE_RETENTION_LOGIN||!before.inherited||before.auth_usage||!before.purge_execute||before.runtime_membership||before.indexer_membership)throw Error('RETENTION_ROLE_TOO_BROAD');
  stage='retention-begin';
  await retention.query('begin');
  stage='retention-purge-rehearsal';
  const result=(await retention.query('select advisory.purge_expired() as result')).rows[0].result;
  await retention.query('rollback');
  report.retention=true;report.retentionRehearsal=result;
 }finally{await retention.end();}
 console.log(JSON.stringify(report));
}catch(error){console.error(JSON.stringify({result:'PRODUCTION_ACCESS_CHECK_FAILED',stage,code:error.code??'CHECK_FAILED'}));process.exitCode=1;}
