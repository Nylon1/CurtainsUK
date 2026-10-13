import {AdvisoryError,fail} from './contracts.mjs';
import {deploymentGate,limitedBody} from './http.mjs';
import {hostedTestConfig,createHostedMockTrial} from './hosted-test.mjs';
import {verifyTrialGrant,MIGRATION_SHA256} from './trial-grant.mjs';
import {createServerAuth} from './auth-session.mjs';
import {verifyCloudPrincipal,CloudSessionStore} from './cloud-store.mjs';
import {createPgTransaction} from './pg-transaction.mjs';
import {createPrivateAdvisoryRpc,createPrivateAdvisoryKnowledgeSearch} from './private-rpc.mjs';
import {createCatalogue} from './catalogue.mjs';
import {BoundedLimiter} from './security.mjs';
import {createHostedModelTrial} from './hosted-model.mjs';

const headers={'Cache-Control':'no-store','Content-Type':'application/json','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
const readAccessToken=request=>{
 const value=request.headers.get('authorization');
 if(!/^Bearer [A-Za-z0-9_.-]{1,8192}$/.test(value??''))fail('UNAUTHORISED',401);
 return value.slice(7);
};
function resources(env,approval){
 if(approval.mode==='synthetic-openai-only'&&(!/^sb_secret_[A-Za-z0-9_-]{8,200}$/.test(env.ADVISORY_CATALOGUE_READ_KEY??'')||env.ADVISORY_CATALOGUE_PROJECT_REF!==env.ADVISORY_TEST_PROJECT_REF))fail('CATALOGUE_READ_CONFIGURATION_REQUIRED',503);
 const auth=createServerAuth({projectRef:env.ADVISORY_TEST_PROJECT_REF,publishableKey:env.ADVISORY_AUTH_PUBLISHABLE_KEY});
 const database=createPgTransaction({env});
 const rpc=createPrivateAdvisoryRpc({...database,projectRef:env.ADVISORY_TEST_PROJECT_REF});
 // Mock trials make no catalogue or model calls. A model trial requires an
 // explicitly configured, server-only fabric read credential for the existing
 // project. No fallback to a broad production service credential is allowed.
 if(approval.mode!=='synthetic-openai-only')return {auth,rpc,catalogue:createCatalogue(),close:database.close};
 const searchIndex=createPrivateAdvisoryKnowledgeSearch({...database,projectRef:env.ADVISORY_TEST_PROJECT_REF});
 const catalogue=createCatalogue({url:'https://'+env.ADVISORY_TEST_PROJECT_REF+'.supabase.co',key:env.ADVISORY_CATALOGUE_READ_KEY,searchIndex});
 return {auth,rpc,catalogue,close:database.close};
}

export function createHostedRuntime({env,createResources=resources}={}){
 let clients,activeMode;
 const admission=new BoundedLimiter({limit:60,capacity:1});
 const handle=async request=>{
  const blocked=deploymentGate(request,env);if(blocked)return blocked;
  try{
   if(request.method!=='POST')fail('METHOD_NOT_ALLOWED',405);
   const approval=verifyTrialGrant(request.headers.get('x-advisory-trial-grant'),env);
   if(activeMode&&activeMode!==approval.mode)fail('TRIAL_MODE_MISMATCH',403);
   const trialEnv={...env,ADVISORY_TEST_ORIGIN:approval.previewOrigin,ADVISORY_TEST_DEPLOYMENT_ID:approval.deploymentId};
   const config=hostedTestConfig(trialEnv,{approval,bundleHash:MIGRATION_SHA256,mode:approval.mode});
   if(request.headers.get('origin')!==config.origin)fail('UNAUTHORISED',403);
   const body=await limitedBody(request);
   admission.take('protected-preview');
   if(!clients){clients=createResources(env,approval);activeMode=approval.mode;}
   if(body?.action==='bootstrap'){
    if(Object.keys(body).length!==1)fail('INVALID_INPUT');
    const principal=await verifyCloudPrincipal({token:readAccessToken(request),auth:clients.auth,issuer:'https://'+config.ref+'.supabase.co/auth/v1'});
    if(!config.principalAllowed(principal))fail('TEST_ACCOUNT_REQUIRED',403);
    // Shares the durable owner budget with every instance. No conversation row.
    await new CloudSessionStore({rpc:clients.rpc,cipher:config.cipher,ownerId:principal.owner}).take();
    return Response.json({csrf:await config.csrfForSession(principal),mode:approval.mode,expiresAt:approval.expiresAt},{headers});
   }
   const handler=(approval.mode==='synthetic-openai-only'?createHostedModelTrial:createHostedMockTrial)({env:trialEnv,approval,bundleHash:MIGRATION_SHA256,...clients,readAccessToken});
   return handler(new Request(request.url,{method:'POST',headers:request.headers,body:JSON.stringify(body)}));
  }catch(error){
   return Response.json({error:error instanceof AdvisoryError?error.code:'SERVICE_UNAVAILABLE'},{status:error instanceof AdvisoryError?error.status:503,headers});
  }
 };
 return {handle,close:async()=>{await clients?.close?.();clients=undefined;activeMode=undefined;}};
}
