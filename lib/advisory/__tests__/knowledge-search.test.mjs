import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {createKnowledgeIndex,indexTerms,refreshKnowledgeBatch} from '../knowledge-search.mjs';
import {createCatalogue,safeKnowledge,createToolExecutor} from '../catalogue.mjs';
import {createEvaluationFixtureCatalogue} from '../evaluation-fixture.mjs';
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

test('descriptive search ranks a recorded colour above an incidental description and rejects unindexable input',async()=>{
  const db=new PGlite();
  try{
    await db.exec('create schema advisory;create role anon;create role authenticated;create role service_role;');
    await db.exec(await readFile(new URL('../search.review.sql',import.meta.url),'utf8'));
    await db.exec(await readFile(new URL('../search-ranking.review.sql',import.meta.url),'utf8'));
    const index=createKnowledgeIndex({query:db.query.bind(db)});
    await index.updateBatch([
      {id:'a-incidental',colour:'Blue',description:'A customer mentioned ivory in a design brief.'},
      {id:'z-ivory',colour:'Ivory',description:'A softly woven plain.'}
    ]);
    assert.deepEqual((await index.search({query:'ivory',colour:'',pattern:'',texture:'',composition:''})).ids,['z-ivory','a-incidental']);
    assert.deepEqual((await index.search({query:'the',colour:'',pattern:'',texture:'',composition:''})).ids,[]);
  }finally{await db.close();}
});

test('reviewed ranking upgrade preserves the read-only function boundary',async()=>{
  const db=new PGlite();
  try{
    await db.exec('create schema advisory;create role anon;create role authenticated;create role service_role;');
    await db.exec(await readFile(new URL('../search.review.sql',import.meta.url),'utf8'));
    await db.exec("create or replace function advisory.search_knowledge(p_query text,p_colour text,p_pattern text,p_texture text,p_composition text) returns table(fabric_id text) language sql stable security invoker set search_path='' set statement_timeout='2s' as $$ select k.fabric_id from advisory.knowledge_search k where k.document @@ websearch_to_tsquery('english',p_query) order by k.fabric_id limit 6 $$;");
    const index=createKnowledgeIndex({query:db.query.bind(db)});
    await index.updateBatch([{id:'a-incidental',colour:'Blue',description:'Ivory appears only in the description.'},{id:'z-colour',colour:'Ivory'}]);
    const args=['ivory','','','',''];
    const permissions=async()=>(await db.query("select proacl::text,prosecdef,proconfig from pg_proc where oid='advisory.search_knowledge(text,text,text,text,text)'::regprocedure")).rows[0];
    const before=await permissions();
    assert.deepEqual((await db.query('select * from advisory.search_knowledge($1,$2,$3,$4,$5)',args)).rows.map(r=>r.fabric_id),['a-incidental','z-colour']);
    await db.exec(await readFile(new URL('../search-ranking.review.sql',import.meta.url),'utf8'));
    assert.deepEqual(await permissions(),before);
    assert.deepEqual((await db.query('select * from advisory.search_knowledge($1,$2,$3,$4,$5)',args)).rows.map(r=>r.fabric_id),['z-colour','a-incidental']);
    await db.exec('set role authenticated');
    await assert.rejects(db.query('select * from advisory.search_knowledge($1,$2,$3,$4,$5)',args),/permission denied/);
    await assert.rejects(db.query('select * from advisory.knowledge_search'),/permission denied/);
  }finally{await db.close();}
});

test('paid evaluation fixture exposes bounded source facts without purchase authority',async()=>{
  const fixture=await createEvaluationFixtureCatalogue(new URL('../../../artifacts/jane-launch-review-20261013/ranked-read-only-diagnostic.json',import.meta.url));
  try{
    assert.equal(fixture.identities,36);
    const result=await fixture.catalogue.descriptive({query:'ivory',colour:'',pattern:'',texture:'',composition:''});
    assert.equal(result.coverage.complete,false);
    assert.ok(result.fabrics.length>0&&result.fabrics.length<=6);
    assert.ok(result.fabrics.every(f=>f.purchasable===false&&f.availability==='KNOWLEDGE_ONLY_NOT_A_PURCHASE_OFFER'));
    assert.equal((await fixture.catalogue.retail({query:'Ivory',colour:'',pattern:''})).length,0);
    assert.deepEqual(await fixture.catalogue.lookup(['fake-id']),[]);
  }finally{await fixture.close();}
});
