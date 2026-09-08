import test from "node:test";
import assert from "node:assert/strict";
import {forEachMediaRecord,mediaOperationLocks,retryMediaCheckpointRename} from "../media-batch-work";

test("bounded workers process every record exactly once",async()=>{
  let active=0,peak=0;const seen:number[]=[];
  await forEachMediaRecord(Array.from({length:31},(_,i)=>i),8,async i=>{
    active++;peak=Math.max(peak,active);await new Promise(r=>setImmediate(r));seen.push(i);active--;
  });
  assert.equal(peak,8);assert.deepEqual(seen.sort((a,b)=>a-b),Array.from({length:31},(_,i)=>i));
  await assert.rejects(forEachMediaRecord([1],9,async()=>{}),/MEDIA_CONCURRENCY_INVALID/);
});
test("same-hash work remains serialized and locks recover after failure",async()=>{
  const lock=mediaOperationLocks();let uploads=0;let saved=false;
  await Promise.all(Array.from({length:8},()=>lock("same-hash",async()=>{
    if(!saved){await new Promise(r=>setImmediate(r));uploads++;saved=true;}
  })));
  assert.equal(uploads,1);
  await assert.rejects(lock("checkpoint",async()=>{throw new Error("disk");}));
  assert.equal(await lock("checkpoint",async()=>"recovered"),"recovered");
});
test("workers finish before the shared import lock can be released on failure",async()=>{
  let completed=false;
  await assert.rejects(forEachMediaRecord([0,1],2,async i=>{
    if(i===0)throw new Error("CHECKPOINT_FAILED");
    await new Promise(r=>setImmediate(r));completed=true;
  }),/CHECKPOINT_FAILED/);
  assert.equal(completed,true);
});

test("temporary Windows rename contention recovers without replaying an upload",async()=>{
  let attempts=0;const delays:number[]=[];
  await retryMediaCheckpointRename(async()=>{
    if(++attempts<3)throw Object.assign(new Error("busy"),{code:"EPERM"});
  },async ms=>{delays.push(ms);});
  assert.equal(attempts,3);assert.deepEqual(delays,[100,200]);
});

test("checkpoint retry remains bounded and does not hide other filesystem errors",async()=>{
  for(const [code,expected] of [["EBUSY",5],["ENOENT",1]] as const){
    let attempts=0;
    await assert.rejects(retryMediaCheckpointRename(async()=>{
      attempts++;throw Object.assign(new Error(code),{code});
    },async()=>{}),new RegExp(code));
    assert.equal(attempts,expected);
  }
});
