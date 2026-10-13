import test from 'node:test';
import assert from 'node:assert/strict';
import {EXTENDED_HOST_APPROVAL as host,EXTENDED_BATCH_APPROVAL as batch,hostSampleMaxAge,eligibleBatchMaxMs} from '../eligible-limit-policy.mjs';
import {OVERNIGHT_HOST_APPROVAL,hostWindowLimit} from '../host-window-policy.mjs';
test('host freshness exception requires exact scope and leaves the 120-second counter window unchanged',()=>{
 assert.equal(hostSampleMaxAge(),60000);assert.equal(hostSampleMaxAge(OVERNIGHT_HOST_APPROVAL),60000);
 assert.equal(hostSampleMaxAge(host),180000);assert.equal(hostWindowLimit(host),120000);
 for(const a of [{...host,sourceSnapshot:'other'},{...host,reference:'other'},{...host,latestSampleApprovalReference:'other'}])assert.throws(()=>hostSampleMaxAge(a));
});
test('20-second latency exception is bound to the existing job, project and exact population',()=>{
 const a={projectRef:'hqysjumypgeapgmqkcrx',jobId:batch.jobId,sourceSnapshot:batch.sourceSnapshot,expectedCount:11517,batchLatencyApproval:batch};
 assert.equal(eligibleBatchMaxMs({}),10000);assert.equal(eligibleBatchMaxMs(a),20000);
 for(const changed of [{projectRef:'other'},{jobId:'other'},{sourceSnapshot:'other'},{expectedCount:16883},{batchLatencyApproval:{...batch,reference:'other'}}])assert.throws(()=>eligibleBatchMaxMs({...a,...changed}));
});
