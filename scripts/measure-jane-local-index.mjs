// Synthetic local PostgreSQL only. No hosted credentials or real catalogue.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {createKnowledgeIndex,indexTerms} from '../lib/advisory/knowledge-search.mjs';
import {knowledgeReceiptFields} from '../lib/advisory/index-worker.mjs';
import {knowledgeSearchSql,knowledgeSearchParameters} from '../lib/advisory/knowledge-query.mjs';
const dir=process.argv[2]??'artifacts/jane-knowledge-integration-20261011';await mkdir(dir,{recursive:true});
const db=new PGlite(),id=randomUUID(),timings=[],snapshots=[];
try{
 await db.exec('create role anon;create role authenticated;create role service_role;');
 await db.exec(await readFile('supabase/migrations/20261011142747_jane_isolated_advisory.sql','utf8'));
 await db.query('insert into advisory.index_jobs(id,source_snapshot,expected_count) values($1,$2,600)',[id,'LOCAL SYNTHETIC ONLY']);
 for(let offset=0;offset<600;offset+=6){
  const records=Array.from({length:6},(_,j)=>{const n=offset+j;return {id:'synthetic-'+n,brand:'LOCAL TEST ONLY',design:'Design '+n,collection:'Collection '+n%13,colour:n%4?'Olive green':'Warm ivory',composition:[{material:'cotton',percentage:40},{material:'linen',percentage:60}],description:('Softly woven natural character with muted tonal threads, quiet pattern and tactile surface. '+Array.from({length:20},(_,k)=>'fixture'+n+'x'+k).join(' ')).slice(0,900),fullWidthMm:1400,weightGsm:240,verticalRepeatMm:n%3?0:350,horizontalRepeatMm:120,careInstructions:['Professional clean'],applications:['curtains'],visual:{colourTemperature:'warm',lightness:'medium',patternClass:'geometric',patternScale:'small',visualSurface:['woven','matte'],character:['subtle texture']}};});
  const start=performance.now();
  await db.transaction(async tx=>{
   await createKnowledgeIndex({query:tx.query.bind(tx)}).updateBatch(records);
   for(const r of records)await tx.query('insert into advisory.index_job_items(job_id,fabric_id,before_row,after_hash,fields) values($1,$2,null,$3,$4)',[id,r.id,indexTerms(r).hash,knowledgeReceiptFields(r)]);
  });timings.push(performance.now()-start);
  if([6,126,600].includes(offset+6))snapshots.push({rows:offset+6,...(await db.query("select pg_total_relation_size('advisory.knowledge_search')::int as search_bytes,pg_total_relation_size('advisory.index_job_items')::int as receipt_bytes")).rows[0]});
 }
 await db.exec('analyze advisory.knowledge_search');
 const args={query:'olive',colour:'',pattern:'geometric',texture:'matte',composition:'linen'};
 const plan=(await db.query('explain(analyze,buffers,format json) '+knowledgeSearchSql(),knowledgeSearchParameters(args))).rows[0]['QUERY PLAN'];
 timings.sort((a,b)=>a-b);const slope=(snapshots.at(-1).search_bytes+snapshots.at(-1).receipt_bytes-snapshots[1].search_bytes-snapshots[1].receipt_bytes)/(600-126);
 await writeFile(dir+'/local-capacity.json',JSON.stringify({classification:'SYNTHETIC_LOCAL_POSTGRES_NOT_HOSTED_BENCHMARK',rows:600,snapshots,batchMs:{p50:timings[50],p95:timings[95],maximum:timings.at(-1)},observedBytesPerAdditionalIdentity:slope,linearProjection16883Bytes:Math.ceil(slope*16883),planningReserveBytes:128*1024*1024,limitations:['Synthetic vocabulary, not representative Fabric Master samples','Includes search table/GIN indexes and initial receipts; excludes WAL, replication, backups, future refresh before-images and bloat','128 MiB is an initial monitoring allowance, not measured hosted impact; stop and review if exceeded','No throughput or full coverage claim follows from this local benchmark'],searchPlan:plan},null,2)+'\n');
 console.log(JSON.stringify({rows:600,snapshots,estimatedMiB:slope*16883/1048576}));
}finally{await db.close();}
