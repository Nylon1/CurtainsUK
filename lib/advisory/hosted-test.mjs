import {createHmac} from 'node:crypto';
import {fail,UUID} from './contracts.mjs';
import {createSessionCipher} from './session-cipher.mjs';
import {createCloudConsultationHandler} from './cloud-handler.mjs';
import {createMockProvider} from './mock-provider.mjs';
export const EXISTING_PROJECT_REF='hqysjumypgeapgmqkcrx';
export const EXISTING_VERCEL_PROJECT='prj_vl2GLLlSf0AJAKqjs1Nk26ipKHBA';
// Approval is a trusted, operator-reviewed server configuration, never request
// data. No migration, credentials, new project or model activation is automatic.
export function hostedTestConfig(env,{approval,bundleHash,now=Date.now(),mode='synthetic-mock-only'}={}){
  const ref=env.ADVISORY_TEST_PROJECT_REF;
  if(env.VERCEL_ENV!=='preview'||env.CURTAINSUK_ADVISORY_PREVIEW!=='true'||ref!==EXISTING_PROJECT_REF||env.ADVISORY_TEST_SCHEMA!=='advisory')fail('HOSTED_TEST_NOT_APPROVED',503);
  if(!['synthetic-mock-only','synthetic-openai-only'].includes(mode)||!/^[a-f0-9]{64}$/.test(bundleHash??'')||approval?.bundleHash!==bundleHash||approval.projectRef!==ref||approval.schema!=='advisory'||approval.mode!==mode||approval.migrationVerified!==true||typeof approval.ownerApprovalReference!=='string'||!approval.ownerApprovalReference.trim()||!Number.isFinite(Date.parse(approval.expiresAt))||Date.parse(approval.expiresAt)<=now||Date.parse(approval.expiresAt)>now+86400000)fail('EXISTING_PROJECT_MIGRATION_APPROVAL_REQUIRED',503);
  const owners=approval.syntheticOwnerIds;
  if(!Array.isArray(owners)||owners.length<1||owners.length>10||owners.some(id=>!new RegExp(UUID).test(id))||new Set(owners).size!==owners.length)fail('SYNTHETIC_ACCOUNT_ALLOWLIST_REQUIRED',503);
  const origin=env.ADVISORY_TEST_ORIGIN;if(!/^https:\/\/[a-z0-9.-]+(?::\d+)?$/.test(origin??''))fail('INVALID_TEST_ORIGIN',503);
  // A dated operator read-back must verify actual protection on this exact
  // preview. A production project name or a secret URL alone is not protection.
  if(approval.deploymentProtectionVerified!==true||approval.vercelProjectId!==EXISTING_VERCEL_PROJECT||!/^dpl_[A-Za-z0-9]+$/.test(approval.deploymentId??'')||approval.deploymentId!==env.ADVISORY_TEST_DEPLOYMENT_ID||approval.previewOrigin!==origin)fail('PROTECTED_DEPLOYMENT_VERIFICATION_REQUIRED',503);
  const decode=value=>{if(typeof value!=='string'||!/^[A-Za-z0-9+/]{43}=$/.test(value))fail('STORAGE_KEY_REQUIRED',503);return Buffer.from(value,'base64');};
  let encoded;try{encoded=JSON.parse(env.ADVISORY_DATA_KEYS_JSON);}catch{fail('STORAGE_KEY_REQUIRED',503);}
  if(!encoded||Array.isArray(encoded)||typeof encoded!=='object')fail('STORAGE_KEY_REQUIRED',503);
  const cipher=createSessionCipher({activeKeyId:env.ADVISORY_ACTIVE_DATA_KEY_ID,keys:Object.fromEntries(Object.entries(encoded).map(([id,key])=>[id,decode(key)]))}),csrfKey=decode(env.ADVISORY_CSRF_KEY);
  return {ref,origin,cipher,principalAllowed:({owner})=>owners.includes(owner),csrfForSession:async({owner,sessionId})=>createHmac('sha256',csrfKey).update(owner+':'+sessionId).digest('base64url')};
}
export function createHostedMockTrial({env,approval,bundleHash,auth,readAccessToken,rpc,catalogue}){
  const config=hostedTestConfig(env,{approval,bundleHash});
  // Private pooled adapter, not service_role or a browser Data API client.
  if(auth.projectRef!==config.ref||auth.verification!=='supabase-auth-api-v1'||rpc.projectRef!==config.ref||rpc.schema!=='advisory'||rpc.role!=='advisory_runtime')fail('HOSTED_CLIENT_MISMATCH',503);
  return createCloudConsultationHandler({...config,env,auth,readAccessToken,rpc,issuer:'https://'+config.ref+'.supabase.co/auth/v1',catalogue,providerForSession:async()=>createMockProvider()});
}
