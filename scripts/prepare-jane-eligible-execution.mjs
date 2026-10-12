// Review package only. No network, database connection, job or credential use.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {validateEligibleManifest} from '../lib/advisory/eligible-manifest.mjs';
import {evidenceHash} from '../lib/advisory/eligible-plan.mjs';
import {OVERNIGHT_HOST_APPROVAL} from '../lib/advisory/host-window-policy.mjs';
const dir=process.env.ADVISORY_EVIDENCE_DIR??'artifacts/jane-eligible-execution-20261011';
await mkdir(dir,{recursive:true});
const sha=v=>createHash('sha256').update(v).digest('hex'),hashes={};
async function visit(file){
 if(hashes[file])return;
 const source=(await readFile(file,'utf8')).replaceAll('\r\n','\n');hashes[file]=sha(source);
 for(const m of source.matchAll(/from\s+['"](\.[^'"]+\.mjs)['"]/g))await visit(path.posix.normalize(path.posix.join(path.posix.dirname(file),m[1])));
}
await visit('lib/advisory/eligible-runner.mjs');await visit('lib/advisory/index-journal.mjs');await visit('lib/advisory/host-metrics.mjs');
await visit('lib/advisory/eligible-transport.mjs');
await visit('lib/advisory/host-admission-pacing.mjs');
await visit('lib/advisory/active-client-gate.mjs');
await visit('lib/advisory/operator-recovery.mjs');
await visit('lib/advisory/retail-read-recovery.mjs');
const codeManifest=Object.fromEntries(Object.entries(hashes).sort(([a],[b])=>a.localeCompare(b)));
const manifest=JSON.parse(await readFile('artifacts/jane-eligible-scope-20261011/eligible-manifest.json','utf8'));
const historical=JSON.parse(await readFile(dir+'/historical-baseline.json','utf8')),summary=validateEligibleManifest(manifest);
const unchangedIds=manifest.ids.filter(id=>historical.rows.some(r=>r.fabric_id===id));
const review={classification:'LOCAL_ELIGIBLE_EXECUTION_REVIEW_NOT_HOSTED_CLEARANCE',
 conditionalOwnerApprovalReference:OVERNIGHT_HOST_APPROVAL.reference,
 previousPopulationApprovalReference:'https://github.com/Nylon1/CurtainsUK/pull/169#issuecomment-6113454744',
 hostMonitoringApproval:OVERNIGHT_HOST_APPROVAL,maximumHostWindowMs:120000,maximumSourceAgeMs:60000,
 projectRef:manifest.projectRef,manifest:summary,identitySha256:manifest.identity_sha256,
 bundleHash:'eeaf8c9da085277783a263c8caf28ac3e1e46dac472ad508d3cb18f584948a50',
 implementationSha256:sha(JSON.stringify(codeManifest)),codeManifest,
 eligiblePopulation:{startOffset:0,endOffset:summary.count,canaryEnd:120,historicalJobId:historical.job.id,historicalSha256:evidenceHash(historical),unchangedIds},
 newJobCreated:false,initialNewRows:120-unchangedIds.length,totalNewRows:summary.count-unchangedIds.length,
 maximumBatchesPerInvocation:20,identitiesPerBatch:6,minimumPacingMs:5000,
 batchCount:Math.ceil(summary.count/6),invocationCount:Math.ceil(summary.count/120),
 implemented:'Separate bootstrap, unchanged rows, SQL fences, grant restoration, exact readback, canary boundary and single-approval bounded continuation',
 executionReady:false,blockers:['Verified completed recoverable backup after 18:55:39 UTC advisory writes','Fresh complete admission evidence at actual write time'],
 nextAction:'Resume the bounded overnight Codex operator follow-up described in JANE_OVERNIGHT_RUN.md. Owner recovery and 24-hour RPO are settled; monitoring access and a genuine 120-second-or-shorter host window are verified. Recheck every gate and bind fresh project/publication/resource/backup ports before writing. Do not reuse captured admission evidence.',
 hostedExecution:'NOT STARTED',paidApiCostUsd:0};
await writeFile(dir+'/execution-review.json',JSON.stringify(review,null,2)+'\n');
console.log(JSON.stringify({implementationSha256:review.implementationSha256,eligible:summary.count,initialNewRows:review.initialNewRows,totalNewRows:review.totalNewRows,executionReady:false}));
