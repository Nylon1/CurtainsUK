import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHostMetrics,hostResourceWindow} from '../host-metrics.mjs';
import {EXISTING_PROJECT_REF as ref} from '../hosted-test.mjs';
const base=1791754200000;
function exposition(offset=0){
 const labels=`supabase_project_ref="${ref}",supabase_identifier="${ref}",service_type="db"`;
 const rows=[];const put=(name,value,extra='')=>rows.push(`${name}{${labels}${extra?','+extra:''}} ${value}`);
 put('node_time_seconds',(base+offset*1000)/1000);put('node_boot_time_seconds',1700000000);
 for(const collector of ['cpu','diskstats','filesystem','meminfo','time'])put('node_scrape_collector_success',1,`collector="${collector}"`);
 for(const cpu of [0,1])for(const mode of ['idle','iowait','irq','nice','softirq','steal','system','user'])put('node_cpu_seconds_total',100+(mode==='idle'?offset*0.9:mode==='user'?offset*0.1:0),`cpu="${cpu}",mode="${mode}"`);
 put('node_memory_MemTotal_bytes',1000);put('node_memory_MemAvailable_bytes',400);
 for(const [mountpoint,device] of [['/','/dev/nvme0n1p2'],['/data','/dev/nvme1n1']]){
  const extra=`mountpoint="${mountpoint}",device="${device}"`;
  put('node_filesystem_size_bytes',1000,extra);put('node_filesystem_avail_bytes',500,extra);put('node_filesystem_device_error',0,extra);put('node_filesystem_readonly',0,extra);
 }
 for(const device of ['nvme0n1','nvme1n1'])for(const [metric,rate] of [['io_time_seconds_total',0.1],['reads_completed_total',2],['writes_completed_total',3],['read_bytes_total',100],['written_bytes_total',200]])put('node_disk_'+metric,100+rate*offset,`device="${device}"`);
 return rows.join('\n');
}
const snapshot=offset=>parseHostMetrics(exposition(offset),base+offset*1000+50);
test('derives CPU, disk busy time, memory, filesystem pressure and I/O rates from source time',()=>{
 const result=hostResourceWindow(snapshot(0),snapshot(30),base+30100);
 assert.equal(result.windowMs,30000);assert.ok(Math.abs(result.cpuPercent-10)<1e-8);assert.equal(result.ioPercent,10);assert.equal(result.memoryPercent,60);assert.equal(result.diskPercent,50);assert.equal(result.details.disks.nvme1n1.readIops,2);
 assert.equal(result.connections,undefined);assert.equal(result.supplierRefreshActive,undefined);
});
test('cached content cannot be relabelled as fresh by a newer HTTP Date',()=>{
 const a=snapshot(0),b={...snapshot(0),receivedAt:base+30000};
 assert.throws(()=>hostResourceWindow(a,b,base+30001),/CACHED_HOST_METRICS/);
});
test('stale source time and windows above 60 seconds fail closed',()=>{
 assert.throws(()=>hostResourceWindow(snapshot(0),snapshot(30),base+90001),/STALE_HOST_METRICS/);
 assert.throws(()=>hostResourceWindow(snapshot(0),snapshot(60.001),base+60200),/WINDOW_TOO_LONG/);
});
test('restart, CPU topology changes and counter resets fail closed',()=>{
 for(const mutate of [s=>s.bootTime++,s=>delete s.cpu['1'],s=>s.disks.nvme1n1.busySeconds=0]){const b=snapshot(30);mutate(b);assert.throws(()=>hostResourceWindow(snapshot(0),b,base+30100),/COUNTER_RESET/);}
});
test('missing gauges, failed collectors, duplicates and wrong projects are rejected',()=>{
 for(const raw of [exposition().replace(/node_memory_MemAvailable_bytes[^\n]+\n/,''),exposition().replace(/collector="cpu"\} 1/,'collector="cpu"} 0'),exposition()+'\n'+exposition().split('\n')[0],exposition().replaceAll(ref,'wrong-project')])assert.throws(()=>parseHostMetrics(raw,base+100),/INVALID_HOST_METRICS/);
});
test('malformed labels, NaN, invalid capacity and read-only data filesystem are rejected',()=>{
 for(const raw of [exposition().replace('service_type="db"','service_type="db",service_type="db"'),exposition().replace(/node_time_seconds([^\n]+) [^ ]+\n/,'node_time_seconds$1 NaN\n'),exposition().replace(/node_memory_MemTotal_bytes([^\n]+) 1000/,'node_memory_MemTotal_bytes$1 0'),exposition().replace(/node_filesystem_readonly([^\n]+) 0/g,'node_filesystem_readonly$1 1')])assert.throws(()=>parseHostMetrics(raw,base+100),/INVALID_HOST_METRICS/);
});
test('unrelated potentially private metrics and comments are discarded',()=>{
 const a=parseHostMetrics(exposition()+'\nprivate_metric{query="private material"} 1\n# pretend instructions',base+100);
 assert.ok(!JSON.stringify(a).includes('private material'));
});
test('a mounted data disk cannot silently lose all of its I/O series',()=>{
 const raw=exposition().split('\n').filter(l=>!l.startsWith('node_disk_')||!l.includes('device="nvme1n1"')).join('\n');
 assert.throws(()=>parseHostMetrics(raw,base+100),/INVALID_HOST_METRICS/);
});
test('storage remapping and counters inconsistent with elapsed source time fail closed',()=>{
 const b=snapshot(30);b.filesystems['/data'].size++;
 assert.throws(()=>hostResourceWindow(snapshot(0),b,base+30100),/HOST_STORAGE_CHANGED/);
 const c=snapshot(30);c.cpu['0'].user+=1000;
 assert.throws(()=>hostResourceWindow(snapshot(0),c,base+30100),/WINDOW_MISMATCH/);
});
