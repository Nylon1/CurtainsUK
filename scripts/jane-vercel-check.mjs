// A reviewed API read-back is required before minting this one-hour-or-less
// synthetic grant. No API keys or account passwords are passed on the command line.
import {readFile,writeFile} from 'node:fs/promises';
import {sign} from 'node:crypto';
import {readPrivateFile} from './jane-private-file.mjs';
import {runHostedChecks,curlRequest} from './jane-hosted-check.mjs';
import {verifyTrialGrant,MIGRATION_SHA256} from '../lib/advisory/trial-grant.mjs';
const c=await readPrivateFile(process.env.ADVISORY_PRIVATE_TRIAL_PATH);
const review=JSON.parse(await readFile(process.argv[2],'utf8'));
if(review.projectId!=='prj_vl2GLLlSf0AJAKqjs1Nk26ipKHBA'||review.target!=='preview'||review.state!=='READY'||review.protection!=='vercel-authentication-preview'||review.unauthenticatedStatus!==302||review.productionDeployment!=='dpl_CvvQKa2zCsFbQ7eZR9Lzi31w7BCD'||Date.now()-Date.parse(review.checkedAt)>600000)throw Error('FRESH_PROTECTION_READBACK_REQUIRED');
const env={VERCEL_ENV:'preview',VERCEL_PROJECT_ID:review.projectId,VERCEL_DEPLOYMENT_ID:review.deploymentId,VERCEL_URL:review.hostname,ADVISORY_SOURCE_COMMIT:review.sourceCommit,ADVISORY_TRIAL_PUBLIC_KEY:c.env.ADVISORY_TRIAL_PUBLIC_KEY};
const approval={version:1,projectRef:c.projectRef,vercelProjectId:review.projectId,deploymentId:review.deploymentId,sourceCommit:review.sourceCommit,previewOrigin:'https://'+review.hostname,schema:'advisory',bundleHash:MIGRATION_SHA256,mode:'synthetic-mock-only',migrationVerified:true,deploymentProtectionVerified:true,ownerApprovalReference:'Owner approved protected synthetic trial, 11 October 2026',syntheticOwnerIds:c.accounts.map(a=>a.owner),issuedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+1800000).toISOString()};
const payload=Buffer.from(JSON.stringify(approval)).toString('base64url'),grant=payload+'.'+sign(null,Buffer.from(payload),c.signingKey).toString('base64url');verifyTrialGrant(grant,env);
try{
 const result=await runHostedChecks({request:curlRequest,config:{cliPath:process.env.ADVISORY_VERCEL_CLI_PATH,origin:approval.previewOrigin,grant,previewKey:c.env.ADVISORY_PREVIEW_KEY,accounts:c.accounts}});
 await writeFile(process.argv[3],JSON.stringify({...result,checkedAt:new Date().toISOString(),deploymentId:review.deploymentId,sourceCommit:review.sourceCommit,previewOrigin:approval.previewOrigin},null,2),{flag:'wx'});
 console.log(JSON.stringify({result:'PASS',checks:result.checks.length,deploymentId:review.deploymentId}));
}catch(error){console.error(JSON.stringify({result:'HOSTED_CHECKS_INCOMPLETE',reason:/^[A-Z_]+$/.test(error.message)?error.message:'ASSERTION_FAILED',...(error.code==='ERR_ASSERTION'?{check:error.message.split('\n')[0],actual:error.actual,expected:error.expected}:{})}));process.exitCode=1;}
