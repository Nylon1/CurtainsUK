import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {ACTIVE_CLIENT_SQL,classifyActiveClients,requireSafeActivity} from '../active-client-gate.mjs';
import {runWithReadOnlyRecovery} from '../operator-recovery.mjs';
const read={pid:42,identity:'customer',state:'active',waitType:null,visible:true,queryMs:40,transactionMs:50,readLike:true,hasXid:false,writeLock:false,advisoryLock:false,blocked:false,blocking:false,jobIdentity:false};
test('short customer and exporter reads do not masquerade as supplier refresh',()=>{
 assert.equal(requireSafeActivity([read,{...read,pid:43,identity:'monitor'}]).routineReads,2);
 assert.equal(requireSafeActivity([]).decision,'admit');
 assert.equal(classifyActiveClients([{...read,identity:'unknown'}]).decision,'drain');
 assert.equal(classifyActiveClients([{...read,readLike:false}]).decision,'drain');
});
test('writer, supplier, advisory lock, contention and prolonged queries remain blocked',()=>{
 for(const key of ['hasXid','writeLock','advisoryLock','blocked','blocking','jobIdentity'])assert.throws(()=>requireSafeActivity([{...read,[key]:true}]),/INDEX_ACTIVITY_CONFLICT/);
 assert.throws(()=>requireSafeActivity([{...read,waitType:'Lock'}]),/CONFLICT/);
 for(const identity of ['customer','monitor','unknown'])for(const key of ['queryMs','transactionMs'])assert.throws(()=>requireSafeActivity([{...read,identity,[key]:3000}]),/PROLONGED/);
});
test('missing visibility, invalid metadata and excessive inventories fail closed',()=>{
 for(const c of [{...read,visible:false},{...read,queryMs:null},{...read,blocking:undefined}])assert.throws(()=>requireSafeActivity([c]),/ACTIVITY_EVIDENCE_INVALID/);
 assert.throws(()=>requireSafeActivity(Array(61).fill(read)),/ACTIVITY_EVIDENCE_INVALID/);
});
test('metadata SQL executes on local Postgres and excludes own observer without returning query text',async()=>{
 const db=new PGlite();try{const result=(await db.query('select '+ACTIVE_CLIENT_SQL+' as clients')).rows[0];assert.deepEqual(result.clients,[]);assert.ok(!ACTIVE_CLIENT_SQL.includes('a.query as'));}finally{await db.close();}
});
test('temporary safety hold revalidates exact checkpoint before bounded fresh admission',async()=>{
 let attempts=0,reconciled=0,time=0;const waits=[];
 const result=await runWithReadOnlyRecovery({deadline:60000,now:()=>time,run:async()=>{if(++attempts<3)throw Object.assign(Error('hold'),{code:'INDEX_ACTIVITY_DRAIN'});return 156;},reconcile:async()=>{reconciled++;},wait:async ms=>{waits.push(ms);time+=ms;}});
 assert.equal(result,156);assert.equal(reconciled,2);assert.deepEqual(waits,[5000,5000]);
});
test('ambiguity, access failures, invalid metadata and deadline never cause automatic resubmission',async()=>{
 for(const code of ['INDEX_COMMIT_OUTCOME_REQUIRES_REVIEW','CONNECTOR_ERROR','ACTIVITY_EVIDENCE_INVALID','INDEX_BATCH_LATENCY_STOP']){let calls=0;await assert.rejects(runWithReadOnlyRecovery({deadline:100,now:()=>0,run:async()=>{calls++;throw Error(code);},reconcile:async()=>assert.fail(),wait:async()=>assert.fail()}),new RegExp(code));assert.equal(calls,1);}
 let calls=0;await assert.rejects(runWithReadOnlyRecovery({deadline:100,now:()=>0,run:async()=>{calls++;throw Error('INDEX_RESOURCE_STOP');},reconcile:async()=>{throw Error('PENDING_WRITE');},wait:async()=>assert.fail()}),/PENDING_WRITE/);assert.equal(calls,1);
 let time=0;await assert.rejects(runWithReadOnlyRecovery({deadline:100,now:()=>time,run:async()=>{throw Error('INDEX_RESOURCE_STOP');},reconcile:async()=>{},wait:async ms=>{time+=ms;}}),/OVERNIGHT_DEADLINE/);assert.equal(time,100);
});
