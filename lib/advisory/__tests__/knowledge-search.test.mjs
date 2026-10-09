import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {createKnowledgeIndex,indexTerms,refreshKnowledgeBatch} from '../knowledge-search.mjs';
import {createCatalogue,safeKnowledge,createToolExecutor} from '../catalogue.mjs';
test('indexed descriptive search: every requested dimension, governance, partial coverage and incremental updates',async()=>{
  const db=new PGlite();
  try{
    await db.exec('create schema advisory;create role anon;create role authenticated;create role service_role;');
    await db.exec(await readFile(new URL('../search.review.sql',import.meta.url),'utf8'));
    const index=createKnowledgeIndex({query:db.query.bind(db)});
    const rows=[{id:'test-unpublished',brand:'Test fixture only',design:'Woven',colour:'Muted olive',composition:[{material:'cotton'}],description:'Quiet botanical foliage for a traditional room',visual:{patternClass:'botanical',visualSurface:['linen texture'],sheenAppearance:'matte'},supplierCost:'secret-marker'},
      {id:'test-blue',design:'Test fixture only',colour:'Blue',composition:[{material:'polyester'}],description:'Low contrast geometric motif',visual:{patternClass:'geometric',visualSurface:['velvet']}}];
    assert.equal((await index.updateBatch(rows)).changed,2);
    assert.equal((await index.updateBatch(rows)).changed,0);
    assert.deepEqual((await db.query("select * from advisory.search_knowledge($1,$2,$3,$4,$5)",['woven','olive','botanical','matte','cotton'])).rows.map(r=>r.fabric_id),['test-unpublished']);
    for(const [query,filter] of [['olive',{}],['botanical',{}],['linen',{}],['cotton',{}],['foliage',{}],['woven',{colour:'olive',pattern:'botanical',texture:'matte',composition:'cotton'}]]){
      const r=await index.search({query,colour:'',pattern:'',texture:'',composition:'',...filter});assert.deepEqual(r.ids,['test-unpublished']);assert.equal(r.coverage.complete,false);
    }
    assert.equal((await index.search({query:'secret-marker',colour:'',pattern:'',texture:'',composition:''})).ids.length,0);
    assert.doesNotMatch(JSON.stringify(indexTerms(rows[0])),/secret-marker|supplierCost/);
    const unapproved=safeKnowledge({fabric_id:'test-draft'},{},{description:'secret-unapproved',description_validated:false});
    assert.equal(unapproved.description,null);
    await assert.rejects(index.updateBatch(Array(7).fill(rows[0])),/INDEX_BATCH_LIMIT/);
    await assert.rejects(index.search({query:'olive',colour:'',pattern:'',texture:'',composition:'',sql:'drop table'}),/INVALID_INPUT/);
    const args={query:'olive',colour:'',pattern:'',texture:'',composition:''};
    // Verify actual GIN plan availability without scanning any production data.
    await db.exec('set enable_seqscan=off');
    const plan=await db.query("explain select fabric_id from advisory.knowledge_search where document @@ plainto_tsquery('english','olive') limit 6");
    assert.match(JSON.stringify(plan.rows),/advisory_knowledge_terms/);
    const catalogue=createCatalogue({searchIndex:index,url:'https://hqysjumypgeapgmqkcrx.supabase.co',key:'fake',fetchImpl:async url=>Response.json(url.includes('fabric_colourways')?[{fabric_id:'test-unpublished',colour_name:'Muted olive'}]:[])});
    const result=await createToolExecutor(catalogue).execute('search_fabric_knowledge',args);
    assert.equal(result.data.fabrics[0].purchasable,false);
    await assert.rejects(createCatalogue().descriptive(args),/KNOWLEDGE_INDEX_NOT_ACTIVATED/);
    await refreshKnowledgeBatch({ids:['test-unpublished'],catalogue:{lookup:async()=>[]},index});
    assert.equal((await index.search(args)).ids.length,0);
    assert.equal((await index.search({query:'velvet',colour:'',pattern:'',texture:'',composition:''})).ids[0],'test-blue');
    await db.exec('set role authenticated');await assert.rejects(db.query('select * from advisory.knowledge_search'),/permission denied/);
  }finally{await db.close();}
});
