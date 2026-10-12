import test from 'node:test';
import assert from 'node:assert/strict';
import {waitForHostAdmission,HOST_PACING} from '../host-admission-pacing.mjs';
import {OVERNIGHT_HOST_APPROVAL} from '../host-window-policy.mjs';
import {EXTENDED_HOST_APPROVAL} from '../eligible-limit-policy.mjs';
const ref='hqysjumypgeapgmqkcrx',base=1791780000000;
function sample(seconds){
 const cpu={};for(const mode of ['idle','iowait','irq','nice','softirq','steal','system','user'])cpu[mode]=100+(mode==='idle'?seconds*0.9:mode==='user'?seconds*0.1:0);
 return {projectRef:ref,sampledAt:base+seconds*1000,receivedAt:base+seconds*1000,bootTime:1,cpu:{0:cpu},disks:{sda:{busySeconds:seconds*0.01,reads:seconds,writes:seconds,readBytes:seconds*100,writtenBytes:seconds*100}},filesystems:{'/':{device:'sda',size:1000,available:500},'/data':{device:'sda',size:1000,available:500}},memory:{total:1000,available:500}};
}
function fixture(ageMs=35000){
 let time=base+75000+ageMs,reads=0;const waits=[],notes=[];
 const pair={previous:sample(0),current:sample(75)};
 const options={readHost:async()=>{reads++;return structuredClone(pair);},wait:async ms=>{assert.ok(ms>0&&ms<=5000);waits.push(ms);time+=ms;},deadline:time+3600000,approval:OVERNIGHT_HOST_APPROVAL,now:()=>time,onWait:async e=>notes.push(e)};
 return {options,pair,waits,notes,time:()=>time,reads:()=>reads};
}
test('accepts sufficient genuine headroom without sleeping or changing timestamps',async()=>{
 const f=fixture(30000),r=await waitForHostAdmission(f.options);assert.equal(r.sampledAt,base+75000);assert.equal(r.ageMs,30000);assert.equal(r.waitedMs,0);assert.equal(f.waits.length,0);
});

test('explicit 180-second exception retains thirty seconds of pre-admission headroom',async()=>{
 for(const age of [60313,120000,150000]){
  const f=fixture(age);f.options.approval=EXTENDED_HOST_APPROVAL;
  const result=await waitForHostAdmission(f.options);assert.equal(result.ageMs,age);assert.equal(result.waitedMs,0);assert.equal(result.sampledAt,base+75000);
 }
});
test('cached samples are read-only waiting, then a genuine new sample permits admission',async()=>{
 const f=fixture(),read=f.options.readHost;
 f.options.readHost=async()=>{if(f.time()>=base+150000){f.pair.previous=sample(75);f.pair.current=sample(150);}return read();};
 const r=await waitForHostAdmission(f.options);assert.equal(r.sampledAt,base+150000);assert.equal(r.ageMs,0);assert.equal(r.waitedMs,40000);assert.equal(f.waits.length,8);
 assert.ok(f.notes.some(n=>n.ageMs>60000));assert.ok(f.notes.every(n=>n.sampledAt===base+75000));
});
test('unchanging exporter has a bounded wait, with no synthetic fresh measurement',async()=>{
 const f=fixture(61000);await assert.rejects(waitForHostAdmission(f.options),/WAIT_EXHAUSTED/);assert.equal(f.waits.reduce((a,b)=>a+b,0),HOST_PACING.maxWaitMs);assert.equal(f.reads(),19);
});
test('hard deadline and access failure terminate pacing without retries',async()=>{
 const f=fixture();f.options.deadline=f.time()+6000;await assert.rejects(waitForHostAdmission(f.options),/OVERNIGHT_DEADLINE/);assert.equal(f.waits.reduce((a,b)=>a+b,0),6000);
 const g=fixture();let calls=0;g.options.readHost=async()=>{calls++;throw Error('monitor denied');};await assert.rejects(waitForHostAdmission(g.options),/monitor denied/);assert.equal(calls,1);assert.equal(g.waits.length,0);
});
test('fresh unsafe, invalid, reset or overlong-window samples cannot be admitted',async()=>{
 for(const change of [p=>{p.current.memory.available=100;},p=>{p.current.sampledAt=base+200000;},p=>{p.current.bootTime=2;},p=>{p.previous=sample(-60);},p=>{p.current.projectRef='other';}]){
  const f=fixture(1000);change(f.pair);await assert.rejects(waitForHostAdmission(f.options));assert.equal(f.waits.length,0);
 }
});
