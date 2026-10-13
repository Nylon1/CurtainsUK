import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {verifyEligibleResult} from 'file:///C:/Users/hamza/curtainsuk-specialist-advisory-phase1/lib/advisory/eligible-plan.mjs';
const root='C:/Users/hamza/curtainsuk-specialist-advisory-phase1',tmp='C:/Users/hamza/.codex/tmp',out=root+'/artifacts/jane-deadline-20261012';
const read=async p=>JSON.parse((await readFile(p,'utf8')).replace(/^\uFEFF/,''));
const sha=s=>createHash('sha256').update(s).digest('hex');
const hosted=await read(tmp+'/jane-final-aggregate.json'),lastHosted=await read(tmp+'/jane-final-exact-readback.json'),n=hosted.job.processed;
if(!Number.isInteger(n)||n<2412||n>11517||hosted.receipts!==n||hosted.matchedHashes!==n||hosted.totalKnowledge!==n+1||hosted.newEligibleRows!==n-5||hosted.historicalNoops!==5||!hosted.permissionRestored||hosted.migrationCount!==81||hosted.latestMigration!=='20261011180354')throw Error('FINAL_HOSTED_MISMATCH');
const manifest=await read(root+'/artifacts/jane-eligible-scope-20261011/eligible-manifest.json');
const journalText=await readFile(tmp+'/jane-eligible-live-20261012-0124/journal/journal.jsonl','utf8');
if(!journalText.endsWith('\n'))throw Error('INCOMPLETE_JOURNAL_LINE');
const entries=journalText.trim().split('\n').map(JSON.parse),plans=[],receipts=[];let pending=null,offset=0;
for(const entry of entries){
 if(entry.kind==='prepared'){if(pending)throw Error('UNRECONCILED_PREPARATION');pending=entry.plan;}
 else if(entry.kind==='verified'){if(!pending||pending.sqlSha256!==entry.sqlSha256||sha(pending.sql)!==pending.sqlSha256||pending.fromOffset!==offset||entry.receipt.processed!==pending.cursor.offset)throw Error('JOURNAL_SEQUENCE_MISMATCH');plans.push(pending);receipts.push(entry);offset=entry.receipt.processed;pending=null;}
 else throw Error('UNKNOWN_JOURNAL_RECORD');
}
if(pending||offset!==n)throw Error('PENDING_OR_OFFSET_MISMATCH');
const ids=plans.flatMap(p=>p.ids),items=plans.flatMap(p=>p.items);
if(new Set(ids).size!==n||JSON.stringify(ids)!==JSON.stringify(manifest.ids.slice(0,n)))throw Error('MANIFEST_PREFIX_MISMATCH');
if(sha([...ids].sort().join('\n'))!==hosted.receiptIdentityHash||sha([...items].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0).map(i=>i.id+':'+i.hash).join('\n'))!==hosted.receiptContentHash)throw Error('HOSTED_SEQUENCE_HASH_MISMATCH');
const lastReceipt=verifyEligibleResult(plans.at(-1),lastHosted);
const evidenceText=await readFile(tmp+'/jane-eligible-identity-repair-20261012-0839/operator-evidence.jsonl','utf8');
const events=evidenceText.trim().split('\n').map(JSON.parse),batches=events.filter(e=>e.kind==='verified-batch'),times=batches.map(e=>e.value.elapsedSinceSourceStartMs),resources=events.filter(e=>e.kind==='resource-gate').map(e=>e.value);
if(batches.length!==(n-1866)/6||batches.at(-1).value.processed!==n)throw Error('REPAIRED_BATCH_COUNT_MISMATCH');
const summary={verifiedAt:new Date().toISOString(),processed:n,remaining:11517-n,expectedCount:11517,complete:n===11517,planHashesVerified:plans.length,verifiedReceipts:receipts.length,exactManifestPrefix:true,receiptIdentityHash:hosted.receiptIdentityHash,receiptContentHash:hosted.receiptContentHash,lastReceipt,historicalPreserved:true,permissionRestored:true,pendingWrite:false,newEligibleRows:n-5,totalKnowledge:n+1,postLookupRepair:{batches:batches.length,minimumSourceThroughReceiptMs:Math.min(...times),maximumSourceThroughReceiptMs:Math.max(...times),admittedPeakCpuPercent:Math.max(...resources.map(x=>x.cpuPercent)),admittedPeakIoPercent:Math.max(...resources.map(x=>x.ioPercent)),admittedPeakMemoryPercent:Math.max(...resources.map(x=>x.memoryPercent)),throughReceiptAt:batches.at(-1).at},stop:events.filter(e=>e.kind==='stop').at(-1),migrationCount:hosted.migrationCount,latestMigration:hosted.latestMigration,databaseBytes:hosted.databaseBytes,advisoryBytes:hosted.advisoryBytes,executionCode:'242a2fd3',dependencySha256:'a56b1959734589ad5c4c95879149c7de89636deb0abb3afaa433acb55c7df87c',deadline:'2026-10-12T10:00:00Z'};
await mkdir(out,{recursive:true});
await writeFile(out+'/hosted-readback.json',JSON.stringify(hosted,null,2)+'\n');
await writeFile(out+'/verification.json',JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify(summary));
