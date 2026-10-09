import {createHmac} from 'node:crypto';
import {fail} from './contracts.mjs';
import {createSessionCipher} from './session-cipher.mjs';
import {createCloudConsultationHandler} from './cloud-handler.mjs';
import {createMockProvider} from './mock-provider.mjs';
// No provisioning or credential discovery. Production reference is explicitly
// denied even if a copied environment accidentally enables the preview flag.
export function hostedTestConfig(env){
  const ref=env.ADVISORY_TEST_PROJECT_REF;
  if(env.VERCEL_ENV!=='preview'||env.CURTAINSUK_ADVISORY_PREVIEW!=='true'||!/^[a-z0-9]{20}$/.test(ref??'')||ref==='hqysjumypgeapgmqkcrx'||env.ADVISORY_APPROVED_TEST_PROJECT_REF!==ref)fail('HOSTED_TEST_NOT_APPROVED',503);
  const origin=env.ADVISORY_TEST_ORIGIN;if(!/^https:\/\/[a-z0-9.-]+(?::\d+)?$/.test(origin??''))fail('INVALID_TEST_ORIGIN',503);
  const decode=value=>{if(typeof value!=='string'||!/^[A-Za-z0-9+/]{43}=$/.test(value))fail('STORAGE_KEY_REQUIRED',503);return Buffer.from(value,'base64');};
  const cipher=createSessionCipher({activeKeyId:'test-v1',keys:{'test-v1':decode(env.ADVISORY_DATA_KEY)}}),csrfKey=decode(env.ADVISORY_CSRF_KEY);
  return {ref,origin,cipher,csrfForSession:async({owner,sessionId})=>createHmac('sha256',csrfKey).update(owner+':'+sessionId).digest('base64url')};
}
export function createHostedMockTrial({env,auth,sessionActive,readAccessToken,rpc,catalogue}){
  const config=hostedTestConfig(env);
  // Callers must construct auth/rpc clients for config.ref and verify their
  // origins. Session revocation hook requires the real hosted Auth session.
  if(auth.projectRef!==config.ref||rpc.projectRef!==config.ref)fail('HOSTED_CLIENT_MISMATCH',503);
  return createCloudConsultationHandler({...config,env,auth,sessionActive,readAccessToken,rpc,issuer:'https://'+config.ref+'.supabase.co/auth/v1',catalogue,providerForSession:async()=>createMockProvider()});
}
