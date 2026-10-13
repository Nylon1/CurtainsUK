import {fail,UUID} from './contracts.mjs';
import {createCloudConsultationHandler} from './cloud-handler.mjs';
import {createOpenAIProvider} from './openai-provider.mjs';
import {hostedTestConfig} from './hosted-test.mjs';

// Protected synthetic-owner model trial. A signed grant selects the exact
// deployment and durable evaluation run. No browser can choose the spend run.
export function createHostedModelTrial({env,approval,bundleHash,auth,readAccessToken,rpc,catalogue,providerFactory=createOpenAIProvider}){
  const config=hostedTestConfig(env,{approval,bundleHash,mode:'synthetic-openai-only'});
  if(env.ADVISORY_MODEL_PREVIEW!=='true'||!new RegExp(UUID).test(approval.evaluationRunId??'')||typeof approval.paidTestingApprovalReference!=='string'||!approval.paidTestingApprovalReference.trim()||typeof env.ADVISORY_OPENAI_API_KEY!=='string'||!env.ADVISORY_OPENAI_API_KEY.startsWith('sk-'))fail('MODEL_NOT_ACTIVATED',503);
  if(auth.projectRef!==config.ref||auth.verification!=='supabase-auth-api-v1'||rpc.projectRef!==config.ref||rpc.schema!=='advisory'||rpc.role!=='advisory_runtime'||!catalogue?.descriptive||!catalogue?.lookup||!catalogue?.retail)fail('HOSTED_CLIENT_MISMATCH',503);
  return createCloudConsultationHandler({...config,env,auth,readAccessToken,rpc,issuer:'https://'+config.ref+'.supabase.co/auth/v1',catalogue,providerKind:'openai',providerForSession:async({store,sessionId})=>providerFactory({apiKey:env.ADVISORY_OPENAI_API_KEY,allowPaidTest:true,budget:store.budget(approval.evaluationRunId,sessionId)})});
}
