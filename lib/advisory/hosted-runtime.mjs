import {AdvisoryError,fail} from './contracts.mjs';
import {deploymentGate,limitedBody} from './http.mjs';
import {hostedTestConfig,createHostedMockTrial} from './hosted-test.mjs';
import {verifyTrialGrant,MIGRATION_SHA256} from './trial-grant.mjs';
import {createServerAuth} from './auth-session.mjs';
import {verifyCloudPrincipal,CloudSessionStore} from './cloud-store.mjs';
import {createPgTransaction} from './pg-transaction.mjs';
import {createPrivateAdvisoryRpc} from './private-rpc.mjs';
import {createCatalogue} from './catalogue.mjs';
import {BoundedLimiter} from './security.mjs';

const headers={'Cache-Control':'no-store','Content-Type':'application/json','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
const readAccessToken=request=>{
 const value=request.headers.get('authorization');
 if(!/^Bearer [A-Za-z0-9_.-]{1,8192}$/.test(value??''))fail('UNAUTHORISED',401);
 return value.slice(7);
};
function resources(env){
 const auth=createServerAuth({projectRef:env.ADVISORY_TEST_PROJECT_REF,publishableKey:env.ADVISORY_AUTH_PUBLISHABLE_KEY});
 const database=createPgTransaction({env});
 const rpc=createPrivateAdvisoryRpc({...database,projectRef:env.ADVISORY_TEST_PROJECT_REF});
 // This infrastructure trial deliberately has no catalogue or model credential.
 return {auth,rpc,catalogue:createCatalogue(),close:database.close};
}

export function createHostedRuntime({env,createResources=resources}={}){
 let clients;
 const admission=new BoundedLimiter({limit:60,capacity:1});
 const handle=async request=>{
  const blocked=deploymentGate(request,env);if(blocked)return blocked;
  try{
   if(request.method!=='POST')fail('METHOD_NOT_ALLOWED',405);
   const approval=verifyTrialGrant(request.headers.get('x-advisory-trial-grant'),env);
   const trialEnv={...env,ADVISORY_TEST_ORIGIN:approval.previewOrigin,ADVISORY_TEST_DEPLOYMENT_ID:approval.deploymentId};
   const config=hostedTestConfig(trialEnv,{approval,bundleHash:MIGRATION_SHA256});
   if(request.headers.get('origin')!==config.origin)fail('UNAUTHORISED',403);
   const body=await limitedBody(request);
   admission.take('protected-preview');
   clients??=createResources(env);
   if(body?.action==='bootstrap'){
    if(Object.keys(body).length!==1)fail('INVALID_INPUT');
    const principal=await verifyCloudPrincipal({token:readAccessToken(request),auth:clients.auth,issuer:'https://'+config.ref+'.supabase.co/auth/v1'});
    if(!config.principalAllowed(principal))fail('TEST_ACCOUNT_REQUIRED',403);
    // Shares the durable owner budget with every instance. No conversation row.
    await new CloudSessionStore({rpc:clients.rpc,cipher:config.cipher,ownerId:principal.owner}).take();
    return Response.json({csrf:await config.csrfForSession(principal),mode:'synthetic-mock-only',expiresAt:approval.expiresAt},{headers});
   }
   const handler=createHostedMockTrial({env:trialEnv,approval,bundleHash:MIGRATION_SHA256,...clients,readAccessToken});
   return handler(new Request(request.url,{method:'POST',headers:request.headers,body:JSON.stringify(body)}));
  }catch(error){
   return Response.json({error:error instanceof AdvisoryError?error.code:'SERVICE_UNAVAILABLE'},{status:error instanceof AdvisoryError?error.status:503,headers});
  }
 };
 return {handle,close:async()=>{await clients?.close?.();clients=undefined;}};
}
