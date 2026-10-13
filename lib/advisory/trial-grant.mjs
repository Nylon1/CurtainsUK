import {createPublicKey,verify} from 'node:crypto';
import {fail} from './contracts.mjs';
import {EXISTING_VERCEL_PROJECT} from './hosted-test.mjs';

export const MIGRATION_SHA256='eeaf8c9da085277783a263c8caf28ac3e1e46dac472ad508d3cb18f584948a50';

// Operator signs only after reading back protection on the completed deployment.
// The deployment receives only the public key. Request JSON is never approval
// until its signature and exact deployment/source bindings have been verified.
export function verifyTrialGrant(token,env,{now=Date.now()}={}){
 try{
  if(typeof token!=='string'||token.length>7000||env.VERCEL_ENV!=='preview'||env.VERCEL_PROJECT_ID!==EXISTING_VERCEL_PROJECT)throw Error();
  const parts=token.split('.');if(parts.length!==2||!parts.every(p=>/^[A-Za-z0-9_-]+$/.test(p)))throw Error();
  const key=createPublicKey(env.ADVISORY_TRIAL_PUBLIC_KEY);
  if(key.asymmetricKeyType!=='ed25519'||!verify(null,Buffer.from(parts[0]),key,Buffer.from(parts[1],'base64url')))throw Error();
  const approval=JSON.parse(Buffer.from(parts[0],'base64url').toString('utf8'));
  // Manually deployed projects have no Git integration system SHA. The reviewed
  // package supplies an immutable deployment-scoped SHA and matching metadata.
  const source=env.VERCEL_GIT_COMMIT_SHA||env.ADVISORY_SOURCE_COMMIT;
  if(!/^dpl_[A-Za-z0-9]+$/.test(env.VERCEL_DEPLOYMENT_ID??'')||!/^[a-f0-9]{40}$/.test(source??'')||!/^[-a-z0-9.]+\.vercel\.app$/.test(env.VERCEL_URL??''))throw Error();
  if(approval.version!==1||approval.bundleHash!==MIGRATION_SHA256||approval.deploymentId!==env.VERCEL_DEPLOYMENT_ID||approval.sourceCommit!==source||approval.previewOrigin!=='https://'+env.VERCEL_URL||approval.vercelProjectId!==EXISTING_VERCEL_PROJECT)throw Error();
  const issued=Date.parse(approval.issuedAt),expires=Date.parse(approval.expiresAt);
  if(!Number.isFinite(issued)||!Number.isFinite(expires)||issued>now+30000||expires<=now||expires-issued>3600000||expires<=issued)throw Error();
  return approval;
 }catch{fail('TRIAL_APPROVAL_REQUIRED',403);}
}
