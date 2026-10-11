// Offline verification of the saved hosted receipt. No network or database writes.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {safeKnowledge} from '../../lib/advisory/catalogue.mjs';
import {indexTerms} from '../../lib/advisory/knowledge-search.mjs';
const root=new URL('./',import.meta.url);
const read=async name=>JSON.parse(await readFile(new URL(name,root),'utf8'));
const [input,plan,before,after,actual,search,explain,receipt]=await Promise.all(['input.json','approved-batch.sql.json','preflight.json','postflight.json','verification.json','search-results.json','search-plan.json','execution-receipt.json'].map(read));
const checks=[];const check=(name,fn)=>{fn();checks.push({name,passed:true});};
const records=input.source.records.map(r=>safeKnowledge(r,r.visual,r.profile));
const sql=await readFile(new URL('approved-batch.sql',root));
check('Exact saved SQL checksum',()=>assert.equal(createHash('sha256').update(sql).digest('hex'),plan.sqlSha256));
check('Explicit one-batch and temporary-role approvals',()=>{assert.equal(input.approval.maxBatches,1);assert.equal(input.approval.approved,true);assert.equal(input.approval.temporaryRoleUse.approved,true);});
check('Attested full identity denominator and hash',()=>{assert.equal(input.attestation.identity_count,16883);assert.equal(input.attestation.inventory_complete,true);assert.equal(input.attestation.identity_sha256,input.manifest.identity_sha256);});
check('Only six approved exact IDs retained',()=>{assert.deepEqual(actual.items.map(i=>i.id),plan.ids);assert.equal(after.indexed,6);assert.equal(after.jobs,1);assert.equal(before.indexed,0);assert.equal(before.jobs,0);});
check('Safe source terms and all six hosted hashes match',()=>{assert.deepEqual(actual.items.map(i=>({id:i.id,hash:i.hash})),records.map(r=>({id:r.id,hash:indexTerms(r).hash})));for(const item of actual.items){assert.equal(item.hash,item.receiptHash);assert.equal(item.beforeRow,null);}});
check('Atomic resumable checkpoint stays incomplete',()=>{assert.equal(actual.job.id,plan.jobId);assert.deepEqual(actual.job.cursor,plan.cursor);assert.equal(actual.job.processed,6);assert.equal(actual.job.indexed,6);assert.equal(actual.job.batches,1);assert.equal(actual.job.complete,false);assert.equal(actual.job.expected_count,16883);assert.equal(actual.job.status,'ready');assert.equal(actual.job.failures,0);});
check('Server execution inside attestation deadline',()=>assert.ok(Date.parse(actual.job.updated_at)<Date.parse(plan.deadline)));
check('Original permissions restored with no persistent SET grant',()=>{assert.deepEqual(after.indexer_memberships,before.indexer_memberships);assert.equal(after.can_set_indexer,false);});
check('Migration checksum and all 81 history entries unchanged',()=>{assert.equal(after.migration_count,81);assert.equal(after.migration_count,before.migration_count);assert.equal(after.migration_hash,input.bundleHash);});
check('Browser, Auth and consultation separation retained',()=>{assert.deepEqual(actual.public_schema_access,{anon:false,authenticated:false,service_role:false});assert.equal(actual.indexer_auth_access,false);assert.equal(actual.indexer_session_access,false);assert.equal(actual.runtime_index_write,false);assert.equal(search.consultation_rows,0);assert.equal(search.usage_rows,0);assert.equal(search.spend_rows,0);});
check('Shared gate released and no new deadlocks or lock waiters',()=>{assert.equal(actual.gate.token,null);assert.equal(actual.gate.lease_until,null);assert.equal(after.lock_waiters,0);assert.equal(after.stats.deadlocks,before.stats.deadlocks);});
check('Four descriptive searches and missing-result case',()=>{assert.deepEqual(search.warm_geometric,['pt-1224-002']);assert.deepEqual(search.cotton_stripe,['pt-1223-374']);assert.deepEqual(search.blush_woven_linen,['pt-1204-212']);assert.deepEqual(search.smoke_name,['pt-1200-907']);assert.deepEqual(search.missing_record,[]);});
check('Hosted read plan uses GIN without physical or temporary reads',()=>{assert.match(JSON.stringify(explain),/advisory_knowledge_terms/);assert.equal(explain.Plan['Shared Read Blocks'],0);assert.equal(explain.Plan['Temp Read Blocks'],0);});
check('Records remain knowledge-only with no purchase claim',()=>{for(const r of records){assert.equal(r.purchasable,false);assert.equal(r.availability,'KNOWLEDGE_ONLY_NOT_A_PURCHASE_OFFER');assert.equal(r.description,null);}});
// Historical worker receipts report non-empty fields, so a literal "unknown"
// is present but does NOT establish known tone or pattern scale. Preserve those
// receipts; report meaningful values separately without modifying hosted data.
const known=v=>typeof v==='string'&&v.trim()!==''&&v.trim().toLowerCase()!=='unknown';
const count=f=>records.filter(f).length;
const coverage={indexed:6,expected:16883,percent:600/16883,complete:false,scope:'First six identities only; not a representative sample or full-catalogue quality assessment',knownFields:{identity:6,colour:count(r=>known(r.colour)),tone:count(r=>[r.visual.colourTemperature,r.visual.lightness,r.visual.saturation].some(known)),pattern:count(r=>known(r.visual.patternClass)),patternScale:count(r=>known(r.visual.patternScale)),texture:count(r=>[...(r.visual.visualSurface??[]),...(r.visual.character??[])].some(known)),description:count(r=>known(r.description)),composition:count(r=>r.composition.some(p=>known(p.material))),width:count(r=>Number.isFinite(r.fullWidthMm)),weight:count(r=>Number.isFinite(r.weightGsm)),care:count(r=>r.careInstructions.some(known))},receiptCaveat:'Existing presence flags include unknown sentinel strings. Before wider population, separate known-value coverage from raw field presence. No hosted receipt was silently rewritten.'};
const output={checkedAt:new Date().toISOString(),allPassed:true,checks,coverage,sqlSha256:plan.sqlSha256,operatorRoundTripMs:Date.parse(receipt.finishedAt)-Date.parse(receipt.startedAt),searchExecutionMs:explain['Execution Time'],searchPlanningMs:explain['Planning Time'],databaseDeltaBytes:after.database_bytes-before.database_bytes,ioCaveat:'Global PostgreSQL counter deltas include unrelated activity and are not attributable solely to the six-record batch.'};
await writeFile(new URL('verification-summary.json',root),JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify(output,null,2));
