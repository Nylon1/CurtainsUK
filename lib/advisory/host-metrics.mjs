import {fail} from './contracts.mjs';
import {EXISTING_PROJECT_REF} from './hosted-test.mjs';

// Read-only operator adapter. Raw exporter labels/query text must not be logged.
const names = new Set(['node_time_seconds','node_boot_time_seconds','node_cpu_seconds_total',
  'node_memory_MemTotal_bytes','node_memory_MemAvailable_bytes','node_scrape_collector_success',
  'node_filesystem_size_bytes','node_filesystem_avail_bytes','node_filesystem_device_error','node_filesystem_readonly',
  'node_disk_io_time_seconds_total','node_disk_reads_completed_total','node_disk_writes_completed_total',
  'node_disk_read_bytes_total','node_disk_written_bytes_total']);
const modes=['idle','iowait','irq','nice','softirq','steal','system','user'];
const bad=()=>fail('INVALID_HOST_METRICS',503);
const one=items=>{if(items.length!==1)bad();return items[0].value;};
const sameKeys=(a,b)=>JSON.stringify(Object.keys(a).sort())===JSON.stringify(Object.keys(b).sort());
const delta=(a,b)=>{if(!Number.isFinite(a)||!Number.isFinite(b)||b<a)fail('HOST_COUNTER_RESET',503);return b-a;};
const percent=v=>{if(!Number.isFinite(v)||v<0||v>100)bad();return v;};

export function parseHostMetrics(body,receivedAt) {
  if(typeof body!=='string'||body.length>2*1024*1024||!Number.isFinite(receivedAt))bad();
  const rows=[];
  for(const line of body.split(/\r?\n/)) {
    const name=line.match(/^([a-zA-Z_:][a-zA-Z0-9_:]*)/)?.[1];
    if(!names.has(name))continue;
    const match=line.match(/^([a-zA-Z_:][a-zA-Z0-9_:]*)\{(.*)\} ([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)$/);
    if(!match)bad();
    const labels=Object.create(null),matcher=/([a-zA-Z_][a-zA-Z0-9_]*)="((?:[^"\\]|\\[\\"n])*)"(?:,|$)/gy;
    let consumed=0,m;
    while((m=matcher.exec(match[2]))) {
      if(Object.hasOwn(labels,m[1]))bad();
      labels[m[1]]=m[2].replace(/\\([\\"n])/g,(_,c)=>c==='n'?'\n':c);consumed=matcher.lastIndex;
    }
    if(consumed!==match[2].length||labels.supabase_project_ref!==EXISTING_PROJECT_REF||labels.supabase_identifier!==EXISTING_PROJECT_REF||labels.service_type!=='db')bad();
    const value=Number(match[3]);if(!Number.isFinite(value)||value<0)bad();
    rows.push({name,labels,value});
  }
  const get=(name,predicate=()=>true)=>rows.filter(r=>r.name===name&&predicate(r.labels));
  for(const collector of ['cpu','diskstats','filesystem','meminfo','time'])if(one(get('node_scrape_collector_success',l=>l.collector===collector))!==1)bad();
  const cpu=Object.create(null);
  for(const row of get('node_cpu_seconds_total')){
    if(!/^\d+$/.test(row.labels.cpu)||!modes.includes(row.labels.mode))bad();
    const core=cpu[row.labels.cpu]??=Object.create(null);
    if(Object.hasOwn(core,row.labels.mode))bad();core[row.labels.mode]=row.value;
  }
  if(!Object.keys(cpu).length||Object.values(cpu).some(core=>Object.keys(core).length!==modes.length))bad();
  const disks=Object.create(null);
  for(const row of get('node_disk_io_time_seconds_total')){
    const device=row.labels.device;if(!/^[a-zA-Z0-9_-]{1,80}$/.test(device)||Object.hasOwn(disks,device))bad();
    const forDevice=l=>l.device===device;
    disks[device]={busySeconds:row.value,reads:one(get('node_disk_reads_completed_total',forDevice)),writes:one(get('node_disk_writes_completed_total',forDevice)),readBytes:one(get('node_disk_read_bytes_total',forDevice)),writtenBytes:one(get('node_disk_written_bytes_total',forDevice))};
  }
  if(!Object.keys(disks).length)bad();
  const filesystems={};
  for(const mountpoint of ['/','/data']){
    const at=l=>l.mountpoint===mountpoint;
    const sizes=get('node_filesystem_size_bytes',at);
    const size=one(sizes),device=sizes[0].labels.device;
    const backingDevice=device?.match(/^\/dev\/(nvme\d+n\d+)(?:p\d+)?$/)?.[1]??device?.replace(/^\/dev\//,'');
    if(!Object.hasOwn(disks,backingDevice))bad();
    const exact=l=>at(l)&&l.device===device;
    const available=one(get('node_filesystem_avail_bytes',exact));
    if(size<=0||available>size||one(get('node_filesystem_device_error',exact))!==0||one(get('node_filesystem_readonly',exact))!==0)bad();
    filesystems[mountpoint]={device,size,available};
  }
  const total=one(get('node_memory_MemTotal_bytes')),available=one(get('node_memory_MemAvailable_bytes'));
  if(total<=0||available>total)bad();
  return {projectRef:EXISTING_PROJECT_REF,receivedAt,sampledAt:one(get('node_time_seconds'))*1000,bootTime:one(get('node_boot_time_seconds')),cpu,disks,filesystems,memory:{total,available}};
}

export function hostResourceWindow(previous,current,now=Date.now()) {
  const windowMs=current.sampledAt-previous.sampledAt;
  if(previous.projectRef!==EXISTING_PROJECT_REF||current.projectRef!==EXISTING_PROJECT_REF||![previous,current].every(s=>Number.isFinite(s.receivedAt)&&Number.isFinite(s.sampledAt)&&s.sampledAt<=s.receivedAt&&s.receivedAt<=now)||now-current.sampledAt>60000)fail('STALE_HOST_METRICS',503);
  if(windowMs<=0)fail('CACHED_HOST_METRICS',503);
  if(windowMs>60000)fail('HOST_METRICS_WINDOW_TOO_LONG',503);
  if(previous.bootTime!==current.bootTime||!sameKeys(previous.cpu,current.cpu)||!sameKeys(previous.disks,current.disks))fail('HOST_COUNTER_RESET',503);
  let total=0,idle=0;
  for(const core of Object.keys(current.cpu))for(const mode of modes){const d=delta(previous.cpu[core][mode],current.cpu[core][mode]);total+=d;if(mode==='idle')idle+=d;}
  const seconds=windowMs/1000,expected=seconds*Object.keys(current.cpu).length;
  if(total<expected*0.9||total>expected*1.1)fail('HOST_COUNTER_WINDOW_MISMATCH',503);
  const disks={};
  for(const device of Object.keys(current.disks)){
    const a=previous.disks[device],b=current.disks[device];
    disks[device]={busyPercent:percent(100*delta(a.busySeconds,b.busySeconds)/seconds),readIops:delta(a.reads,b.reads)/seconds,writeIops:delta(a.writes,b.writes)/seconds,readBytesPerSecond:delta(a.readBytes,b.readBytes)/seconds,writtenBytesPerSecond:delta(a.writtenBytes,b.writtenBytes)/seconds};
  }
  const filesystems={};
  for(const mountpoint of ['/','/data']){
    const a=previous.filesystems[mountpoint],b=current.filesystems[mountpoint];
    if(a.device!==b.device||a.size!==b.size)fail('HOST_STORAGE_CHANGED',503);
    filesystems[mountpoint]={sizeBytes:b.size,availableBytes:b.available,usedPercent:percent(100*(1-b.available/b.size))};
  }
  return {projectRef:EXISTING_PROJECT_REF,source:'trusted-operator-telemetry',observedAt:current.sampledAt,windowMs,
    cpuPercent:percent(100*(total-idle)/total),ioPercent:Math.max(...Object.values(disks).map(d=>d.busyPercent)),
    memoryPercent:percent(100*(1-current.memory.available/current.memory.total)),diskPercent:Math.max(...Object.values(filesystems).map(f=>f.usedPercent)),
    details:{cpuCores:Object.keys(current.cpu).length,memoryBytes:current.memory,disks,filesystems,ioDefinition:'Maximum observed disk busy-time fraction, not provisioned IOPS capacity'}};
}
