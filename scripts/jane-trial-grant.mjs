// Operator-only. Approval JSON contains public metadata and synthetic UUIDs.
// Read-back of deployment protection and migration identity precedes signing.
// Keep private key and output outside Git, in an OS-protected directory.
import {readFile,writeFile} from 'node:fs/promises';
import {createPrivateKey,sign} from 'node:crypto';
import {verifyTrialGrant} from '../lib/advisory/trial-grant.mjs';
import {hostedTestConfig} from '../lib/advisory/hosted-test.mjs';
const [approvalPath,outputPath]=process.argv.slice(2);
try{
 if(!approvalPath||!outputPath||!process.env.ADVISORY_TRIAL_SIGNING_KEY_PATH)throw Error();
 const approval=JSON.parse(await readFile(approvalPath,'utf8'));
 const key=createPrivateKey(await readFile(process.env.ADVISORY_TRIAL_SIGNING_KEY_PATH));
 if(key.asymmetricKeyType!=='ed25519')throw Error();
 const payload=Buffer.from(JSON.stringify(approval)).toString('base64url');
 const token=payload+'.'+sign(null,Buffer.from(payload),key).toString('base64url');
 verifyTrialGrant(token,process.env);
 hostedTestConfig({...process.env,ADVISORY_TEST_ORIGIN:approval.previewOrigin,ADVISORY_TEST_DEPLOYMENT_ID:approval.deploymentId},{approval,bundleHash:approval.bundleHash});
 await writeFile(outputPath,token,{flag:'wx',mode:0o600});
 console.log(JSON.stringify({result:'SIGNED',deploymentId:approval.deploymentId,expiresAt:approval.expiresAt,mode:approval.mode}));
}catch{console.error('TRIAL_GRANT_NOT_WRITTEN: check reviewed metadata, key paths and private output permissions.');process.exitCode=1;}
