// Local preparation only. No credentials, SQL execution, remote calls or jobs.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {prepareEligibleManifest,validateEligibleManifest} from '../lib/advisory/eligible-manifest.mjs';
const dir=process.env.ADVISORY_EVIDENCE_DIR??'artifacts/jane-eligible-scope-20261011';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const files=['lib/advisory/eligible-manifest.mjs','lib/advisory/eligible-plan.mjs','lib/advisory/eligible-runner.mjs','lib/advisory/eligible-admission.mjs','lib/advisory/index-worker.mjs','lib/advisory/index-journal.mjs','lib/advisory/knowledge-search.mjs','lib/advisory/knowledge-query.mjs','lib/advisory/catalogue.mjs','lib/advisory/contracts.mjs','lib/advisory/hosted-test.mjs','lib/advisory/population-resources.mjs','lib/advisory/index-population.mjs','scripts/reconcile-jane-publication.mjs','scripts/prepare-jane-eligible-review.mjs',dir+'/candidate-query.sql'];
const codeManifest=Object.fromEntries(await Promise.all(files.map(async f=>[f,sha((await readFile(f,'utf8')).replaceAll('\r\n','\n'))])));
const policySources=['lib/fabric-master/retail-repository.ts','lib/fabric-master/retail.ts','lib/fabric-master/readiness.ts','lib/fabric-master/fabric-profile-links.ts'];
const policyManifest=Object.fromEntries(policySources.map(f=>[f,sha(execFileSync('git',['show','800f42a27a0a6e9beb1abd92821145bf4a4b98c4:'+f],{maxBuffer:1e6}))]));
const candidates=JSON.parse(await readFile(dir+'/candidates.json','utf8')),publication=JSON.parse(await readFile(dir+'/publication-reconciliation.json','utf8'));
const manifest=prepareEligibleManifest({candidates,publication,policySha256:sha(JSON.stringify({policyManifest,candidateQuery:codeManifest[dir+'/candidate-query.sql']}))});
await writeFile(dir+'/eligible-manifest.json',JSON.stringify(manifest,null,2)+'\n');
const summary=validateEligibleManifest(manifest),initialIds=manifest.ids.slice(0,120);
const review={classification:'LOCAL_ELIGIBLE_SCOPE_REVIEW_NOT_HOSTED_EXECUTION',sourceHead:execFileSync('git',['rev-parse','HEAD']).toString().trim(),
 ownerInstruction:'https://github.com/Nylon1/CurtainsUK/pull/169#issuecomment-6113025170',implementationSha256:sha(JSON.stringify(codeManifest)),codeManifest,policyManifest,
 manifest:summary,identitySha256:manifest.identity_sha256,initialCanaryIds:initialIds,
 originalJob:'a6c0d329-935e-4c31-b8ef-71a52f6d9149',newJobCreated:false,historicalJobMustRemainUnchanged:true,
 eligibleExisting:publication.originalSix.eligible,newUniqueKnowledgeRows:summary.count-publication.originalSix.eligible.length,
 populationBatches:Math.ceil(summary.count/6),maximumBatchesPerInvocation:20,invocations:Math.ceil(Math.ceil(summary.count/6)/20),
 excludedHistorical:['pt-1200-907'],excludedHistoricalAction:'Retain row and receipts. Governed retail lookup cannot make it purchasable; no deletion or rollback.',
 admission:{backupAfterPreviousWrites:false,currentShortWindowMetrics:false,credentialsRotationVerified:false,hostedEligibleConnectorReviewed:false,executionReady:false},
 permissionScope:'Existing approved transaction-local advisory_indexer SET/revoke only. No permanent role, login, schema or schedule.',
 blocker:'Eligible connector binding is implemented locally. Current post-write backup/recovery, short-window resource and secure operator-access evidence remain required. See JANE_ELIGIBLE_EXECUTION.md and the separate execution review; this scope script grants no live clearance.'};
await writeFile(dir+'/eligible-review.json',JSON.stringify(review,null,2)+'\n');
console.log(JSON.stringify({count:summary.count,existing:review.eligibleExisting.length,newRows:review.newUniqueKnowledgeRows,batches:review.populationBatches,invocations:review.invocations,identityHash:manifest.identity_sha256,implementationSha256:review.implementationSha256,executionReady:false}));
