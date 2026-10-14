import {createShopifySpecialistGateway,specialistGatewayEnabled,specialistPublicEnabled} from '@/lib/advisory/specialist-gateway';
import {createPgTransaction} from '@/lib/advisory/pg-transaction.mjs';
import {createPrivateAdvisoryRpc,createPrivateSpecialistDailyRun} from '@/lib/advisory/private-rpc.mjs';
import {createSessionCipher} from '@/lib/advisory/session-cipher.mjs';
import {CloudSessionStore} from '@/lib/advisory/cloud-store.mjs';
import {createSpecialistService} from '@/lib/advisory/specialist-service.mjs';
import {createSpecialistOpenAI,createSpecialistMock} from '@/lib/advisory/specialist-provider.mjs';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=120;

const ref='hqysjumypgeapgmqkcrx';
const compiledCommit=process.env.VERCEL_GIT_COMMIT_SHA||process.env.ADVISORY_SPECIALISTS_COMPILED_COMMIT;
let resources:ReturnType<typeof buildResources>|undefined;

function buildResources(){
  const env=process.env;
  if(!specialistGatewayEnabled(env,compiledCommit)||env.ADVISORY_TEST_PROJECT_REF!==ref||env.ADVISORY_TEST_SCHEMA!=='advisory')throw Error('SPECIALIST_NOT_CONFIGURED');
  const encoded=JSON.parse(env.ADVISORY_DATA_KEYS_JSON??'{}');
  if(!encoded||typeof encoded!=='object'||Array.isArray(encoded)||!env.ADVISORY_ACTIVE_DATA_KEY_ID)throw Error('SPECIALIST_KEY_REQUIRED');
  const keys=Object.fromEntries(Object.entries(encoded).map(([id,value])=>{
    if(typeof value!=='string'||!/^[A-Za-z0-9+/]{43}=$/.test(value))throw Error('SPECIALIST_KEY_REQUIRED');
    return [id,Buffer.from(value,'base64')];
  }));
  const cipher=createSessionCipher({activeKeyId:env.ADVISORY_ACTIVE_DATA_KEY_ID,keys});
  const database=createPgTransaction({env});
  const rpc=createPrivateAdvisoryRpc({...database,projectRef:ref});
  const publicMode=specialistPublicEnabled(env,compiledCommit);
  const dailyRun=publicMode?createPrivateSpecialistDailyRun({...database,projectRef:ref}):null;
  const mode=env.ADVISORY_SPECIALISTS_PROVIDER;
  if(!['mock','openai'].includes(mode??''))throw Error('SPECIALIST_PROVIDER_REQUIRED');
  if(mode==='openai'&&(!env.ADVISORY_OPENAI_API_KEY?.startsWith('sk-')||(!publicMode&&(!env.ADVISORY_SPECIALISTS_PAID_APPROVAL_REFERENCE||!env.ADVISORY_SPECIALISTS_EVALUATION_RUN_ID))))throw Error('SPECIALIST_MODEL_NOT_APPROVED');
  return {rpc,cipher,mode,env,publicMode,dailyRun};
}

async function handle(request:Request){
  if(!specialistGatewayEnabled(process.env,compiledCommit))return new Response(null,{status:404,headers:{'Cache-Control':'no-store'}});
  try{
    resources??=buildResources();
    const {rpc,cipher,mode,env,publicMode,dailyRun}=resources;
    return createShopifySpecialistGateway({env,compiledCommit,
      take:owner=>new CloudSessionStore({rpc,cipher,ownerId:owner}).take(),
      execute:(owner,command)=>{
        const store=new CloudSessionStore({rpc,cipher,ownerId:owner});
        return createSpecialistService({store,publicMode,providerForSession:async({sessionId}: {sessionId:string})=>
          mode==='mock'?createSpecialistMock():createSpecialistOpenAI({apiKey:env.ADVISORY_OPENAI_API_KEY,enabled:true,budget:store.budget(publicMode?await dailyRun!():env.ADVISORY_SPECIALISTS_EVALUATION_RUN_ID!,sessionId)})
        }).execute(owner,command);
      }
    })(request);
  }catch{return Response.json({error:'SPECIALIST_TEMPORARILY_UNAVAILABLE'},{status:503,headers:{'Cache-Control':'no-store'}});}
}

export {handle as GET,handle as POST};
