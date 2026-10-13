import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {createKnowledgeIndex} from './knowledge-search.mjs';
import {fail,validate,tools,FABRIC_ID} from './contracts.mjs';

// A small, read-only evidence fixture for paid evaluation. This is deliberately
// not represented as full Fabric Master coverage or current retail eligibility.
export async function createEvaluationFixtureCatalogue(evidencePath){
  const source=JSON.parse(await readFile(evidencePath,'utf8'));
  if(source.classification!=='HOSTED_READ_ONLY_RANKING_DIAGNOSTIC_UNAPPLIED_SQL_NOT_LAUNCH_APPROVAL'||source.project!=='hqysjumypgeapgmqkcrx'||source.indexSnapshot?.processed!==11517||!Array.isArray(source.cases)||source.cases.length!==6)fail('INVALID_EVALUATION_FIXTURE');
  const facts=new Map();
  for(const review of source.cases){
    if(!Array.isArray(review.facts)||review.facts.length>6)fail('INVALID_EVALUATION_FIXTURE');
    for(const row of review.facts){
      if(!new RegExp(FABRIC_ID).test(row.fabric_id??'')||!review.rows?.some(r=>r.fabric_id===row.fabric_id)||typeof row.colour_name!=='string'||typeof row.design!=='string'||!Array.isArray(row.composition))fail('INVALID_EVALUATION_FIXTURE');
      facts.set(row.fabric_id,{id:row.fabric_id,brand:row.brand??null,design:row.design,colour:row.colour_name,composition:row.composition.map(p=>({material:String(p.material).slice(0,80),percentage:Number.isFinite(Number(p.percentage))?Number(p.percentage):null})),weightGsm:row.weight_gsm===null?null:Number(row.weight_gsm),description:null,visual:{},availability:'KNOWLEDGE_ONLY_NOT_A_PURCHASE_OFFER',purchasable:false,provenance:{id:'fabric:'+row.fabric_id,source:'Verified read-only 36-identity evaluation fixture; full index coverage not tested in this run',retrievedAt:new Date().toISOString()}});
    }
  }
  if(facts.size!==36)fail('INVALID_EVALUATION_FIXTURE');
  const db=new PGlite();
  try{
    await db.exec('create schema advisory;create role anon;create role authenticated;create role service_role;');
    await db.exec(await readFile(new URL('./search.review.sql',import.meta.url),'utf8'));
    await db.exec(await readFile(new URL('./search-ranking.review.sql',import.meta.url),'utf8'));
    const index=createKnowledgeIndex({query:db.query.bind(db)});
    const values=[...facts.values()];for(let i=0;i<values.length;i+=6)await index.updateBatch(values.slice(i,i+6));
    const catalogue={
      async lookup(ids){validate(tools.find(t=>t.name==='lookup_fabric_knowledge').parameters,{ids});return ids.filter(id=>facts.has(id)).map(id=>structuredClone(facts.get(id)));},
      async descriptive(args){const match=await index.search(args);return {fabrics:match.ids.map(id=>structuredClone(facts.get(id))),coverage:{state:'36-identity-evaluation-fixture',complete:false,source:'six verified read-only hosted searches'}};},
      async identities(prefix){validate(tools.find(t=>t.name==='find_fabric_identities').parameters,{prefix});return [...facts.keys()].filter(id=>id.startsWith(prefix)).slice(0,6);},
      async retail(args){validate(tools.find(t=>t.name==='search_retail_fabrics').parameters,args);return [];}
    };
    return {catalogue,close:()=>db.close(),identities:facts.size};
  }catch(error){await db.close();throw error;}
}
