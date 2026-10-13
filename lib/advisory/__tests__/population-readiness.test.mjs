import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {createManifestSource,validateSourceManifest} from '../source-manifest.mjs';
import {checkPopulationResources,runMonitoredPopulationSlice} from '../population-resources.mjs';
const manifest=JSON.parse(await readFile(new URL('../../../artifacts/jane-pro-readiness-20261011/source-manifest.json',import.meta.url),'utf8'));
const summary=validateSourceManifest(manifest),at=Date.now(),hash='a'.repeat(64);
const current={projectRef:manifest.projectRef,...manifest,observed_at:new Date(at).toISOString()};
const source=()=>createManifestSource({manifest,attest:async()=>current});
const resources=()=>({projectRef:manifest.projectRef,source:'trusted-operator-telemetry',observedAt:at,cpuPercent:6,ioPercent:1,memoryPercent:63,diskPercent:50,connections:16,maxConnections:60,lockWaits:0,newDeadlocks:0,newDatabaseErrors:0,supplierRefreshActive:false});
const approval=()=>({approved:true,projectRef:manifest.projectRef,schema:'advisory',purpose:'bounded-advisory-index-only',ownerApprovalReference:'LOCAL_SYNTHETIC_ONLY',jobId:randomUUID(),sourceAttestationReference:'LOCAL_SYNTHETIC_ONLY',sourceSnapshot:summary.snapshot,expectedCount:summary.count,bundleHash:hash,maxBatches:20,expiresAt:new Date(at+600000).toISOString()});

test('all 16883 recorded identities traverse once in 2814 bounded pages; this is not knowledge population',async()=>{
 const adapter=source(),seen=[];let cursor=null,pages=0,done=false;
 while(!done){const p=await adapter.page({cursor,snapshot:summary.snapshot});assert.ok(p.ids.length<=6);seen.push(...p.ids);cursor=p.cursor;done=p.done;pages++;}
 assert.equal(pages,2814);assert.deepEqual(seen,manifest.ids);assert.equal(new Set(seen).size,16883);
 assert.equal(await adapter.verifySnapshot(summary.snapshot),true);
 assert.equal((await adapter.page({cursor,snapshot:summary.snapshot})).ids.length,0);
 // A process restart uses the same bound cursor, not an offset into changing DB rows.
 const p=await source().page({cursor:{offset:120,manifestHash:summary.hash},snapshot:summary.snapshot});assert.deepEqual(p.ids,manifest.ids.slice(120,126));
});
test('manifest rejects duplicates, tampering, wrong project, truncation and crossed checkpoints',async()=>{
 for(const change of [{projectRef:'foreign'},{inventory_complete:false},{identity_count:5},{ids:[...manifest.ids.slice(0,-1),manifest.ids[0]]},{identity_sha256:'f'.repeat(64)}])assert.throws(()=>validateSourceManifest({...manifest,...change}));
 for(const cursor of [{offset:1,manifestHash:summary.hash},{offset:6,manifestHash:'wrong'},{offset:-6,manifestHash:summary.hash},{offset:99999,manifestHash:summary.hash},{offset:6,manifestHash:summary.hash,extra:'untrusted'}])await assert.rejects(source().page({cursor,snapshot:summary.snapshot}),/INVALID_INDEX_CURSOR/);
 await assert.rejects(source().page({snapshot:summary.snapshot,limit:1000}));
 const changed=createManifestSource({manifest,attest:async()=>({...current,identity_count:16884})});assert.equal(await changed.verifySnapshot(summary.snapshot),false);
 const stale=createManifestSource({manifest,attest:async()=>manifest});assert.equal(await stale.verifySnapshot(summary.snapshot),false);
 const abort=AbortSignal.abort();await assert.rejects(source().page({snapshot:summary.snapshot,signal:abort}));
});
test('resource admission refuses stale/missing telemetry, load spikes and concurrent supplier work',()=>{
 assert.equal(checkPopulationResources(resources(),at).accepted,true);
 for(const change of [{observedAt:at-60001},{observedAt:at+1},{ioPercent:null},{maxConnections:0},{source:'customer'},{projectRef:'foreign'}])assert.throws(()=>checkPopulationResources({...resources(),...change},at),/FRESH_RESOURCE_MEASUREMENTS_REQUIRED/);
 for(const change of [{cpuPercent:60},{ioPercent:50},{memoryPercent:80},{diskPercent:85},{connections:42},{lockWaits:1},{newDeadlocks:1},{newDatabaseErrors:1},{supplierRefreshActive:true}])assert.throws(()=>checkPopulationResources({...resources(),...change},at),/INDEX_RESOURCE_STOP/);
});
test('monitored population requires approval, bounds invocations and stops before next write on pressure',async()=>{
 let calls=0,measurements=0,waits=0;const worker={step:async()=>({elapsedMs:2,processed:++calls*6})};
 const options={approval:approval(),bundleHash:hash,worker,source:source(),measure:async()=>{measurements++;return resources();},wait:async ms=>{assert.equal(ms,5000);waits++;},now:()=>at};
 const result=await runMonitoredPopulationSlice(options);assert.equal(calls,20);assert.equal(waits,19);assert.equal(result.telemetry.length,20);assert.equal(measurements,21);
 calls=0;measurements=0;await assert.rejects(runMonitoredPopulationSlice({...options,measure:async()=>({...resources(),cpuPercent:++measurements>2?80:6})}),/INDEX_RESOURCE_STOP/);assert.equal(calls,1);
 calls=0;await assert.rejects(runMonitoredPopulationSlice({...options,approval:{...approval(),approved:false}}),/APPROVAL_REQUIRED/);assert.equal(calls,0);
 await assert.rejects(runMonitoredPopulationSlice({...options,source:{...source(),verifySnapshot:async()=>false}}),/SOURCE_COVERAGE_CHANGED/);assert.equal(calls,0);
 await assert.rejects(runMonitoredPopulationSlice({...options,worker:{step:async()=>{calls++;return {elapsedMs:10000};}}}),/INDEX_BATCH_LATENCY_STOP/);assert.equal(calls,1);
});
