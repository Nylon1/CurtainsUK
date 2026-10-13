import test from 'node:test';
import assert from 'node:assert/strict';
import {requireRetailResponse,retailNetworkError,settleReadPorts} from '../retail-read-recovery.mjs';
import {runWithReadOnlyRecovery} from '../operator-recovery.mjs';
test('only timeouts, reset, rate limits and server failures permit fresh read recovery',()=>{
 requireRetailResponse({status:200});
 for(const status of [429,500,502,503,504])assert.throws(()=>requireRetailResponse({status}),/TRANSIENT_RETAIL_READ/);
 for(const status of [301,400,401,403,404,410])assert.throws(()=>requireRetailResponse({status}),/LIVE_RETAIL_OR_PUBLICATION_UNAVAILABLE/);
 assert.equal(retailNetworkError({name:'TimeoutError'}).message,'TRANSIENT_RETAIL_READ');
 assert.equal(retailNetworkError({cause:{code:'ECONNRESET'}}).message,'TRANSIENT_RETAIL_READ');
 const fatal=Error('Changed identity');assert.equal(retailNetworkError(fatal),fatal);
});
test('all read ports settle before reconciliation can start',async()=>{
 let sourceFinished=false;await assert.rejects(settleReadPorts([new Promise(r=>setTimeout(()=>{sourceFinished=true;r({});},20)),Promise.reject(Error('TRANSIENT_RETAIL_READ'))]),/TRANSIENT_RETAIL_READ/);assert.equal(sourceFinished,true);
});
test('Retry-After is honoured through short waits and remains bounded by deadline',async()=>{
 for(const deadline of [100000,30000]){let time=0,calls=0;const waits=[];
 const run=runWithReadOnlyRecovery({deadline,now:()=>time,run:async()=>{if(++calls===1)requireRetailResponse({status:429,retryAfter:'60'},time);return 'fresh200';},reconcile:async()=>{},wait:async ms=>{waits.push(ms);time+=ms;}});
 if(deadline===100000){assert.equal(await run,'fresh200');assert.equal(time,60000);}else{await assert.rejects(run,/OVERNIGHT_DEADLINE/);assert.equal(time,30000);}assert.ok(waits.every(ms=>ms<=15000));}
});
