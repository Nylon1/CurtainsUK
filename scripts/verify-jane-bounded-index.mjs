// Reads the already captured five-identity receipt. Creates only a local index.
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {safeKnowledge,createCatalogue} from '../lib/advisory/catalogue.mjs';
import {createKnowledgeIndex} from '../lib/advisory/knowledge-search.mjs';
const source=JSON.parse(await readFile('artifacts/jane-completion/bounded-master-source.json','utf8'));
const records=source.rows.map(r=>safeKnowledge(r,r.visual,r.profile));
assert.equal(records.length,5);assert.ok(records.every(r=>r.purchasable===false));
const db=new PGlite();
try{
 await db.exec('create schema advisory;create role anon;create role authenticated;create role service_role;');
 await db.exec(await readFile('lib/advisory/search.review.sql','utf8'));
 const index=createKnowledgeIndex({query:db.query.bind(db)}),write=await index.updateBatch(records),repeat=await index.updateBatch(records);
 assert.equal(write.changed,5);assert.equal(repeat.changed,0);
 const searches=[];
 for(const args of [{query:'geometric',colour:'',pattern:'',texture:'',composition:'cotton'},{query:'amber OR lagoon',colour:'',pattern:'',texture:'',composition:''},{query:'1450',colour:'',pattern:'',texture:'',composition:''}]){
  const at=performance.now(),result=await index.search(args);assert.ok(result.ids.length>0);assert.equal(result.coverage.complete,false);searches.push({args,...result,elapsedMs:performance.now()-at});
 }
 const retail=await createCatalogue().retail({query:'Shambala',colour:'',pattern:''});assert.equal(retail.length,3);assert.ok(retail.every(r=>r.id!=='pt-3697-575'));
 const report={checkedAt:new Date().toISOString(),classification:'FIVE_LIVE_IDENTITIES_IN_LOCAL_INDEX_NOT_FULL_MASTER_COVERAGE',sourceReadAt:source.checkedAt,indexed:records.length,masterDenominator:null,complete:false,secondBatchWrites:repeat.changed,searches,unknownWeightCount:records.filter(r=>r.weightGsm===null).length,retailIds:retail.map(r=>r.id),retailCommercialFilter:'PASS',productionWrites:0};
 await writeFile('artifacts/jane-completion/bounded-index-verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await db.close();}
