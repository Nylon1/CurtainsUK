import {createHash} from 'node:crypto';
import {fail,validate,tools,FABRIC_ID} from './contracts.mjs';
const safeText=v=>typeof v==='string'?v.slice(0,900):'';
const words=v=>Array.isArray(v)?v.slice(0,12).map(safeText).join(' '):safeText(v);
// Input is ONLY the safeKnowledge projection, never canonical database rows.
// Even if injected with extra fields this allowlist cannot index costs/margins.
export function indexTerms(record){
  if(!new RegExp(FABRIC_ID).test(record.id??''))fail('INVALID_INPUT');
  const v=record.visual??{};
  const colour=[record.colour,v.primaryColour,words(v.secondaryColours),v.colourTemperature].map(safeText).join(' ');
  const pattern=[v.patternClass,words(v.motif)].map(safeText).join(' ');
  const texture=[words(v.visualSurface),v.sheenAppearance,words(v.character)].map(safeText).join(' ');
  const composition=(record.composition??[]).slice(0,12).map(p=>safeText(p.material)).join(' ');
  const text=[record.brand,record.design,record.collection,record.description,colour,pattern,texture,composition].map(safeText).join(' ');
  return {id:record.id,text,colour,pattern,texture,composition,hash:createHash('sha256').update(JSON.stringify({text,colour,pattern,texture,composition})).digest('hex')};
}
// Parameterised SQL port supports local PGlite and a separately reviewed pooled
// PostgreSQL connection. No model-supplied SQL, ordering, table or limit fields.
// No fallback to ILIKE or a full master scan when the index is unavailable.
export function createKnowledgeIndex({query,coverage=()=>({state:'partial',complete:false,source:'incremental advisory index'})}){
  return {
    async updateBatch(records){
      if(!Array.isArray(records)||records.length>6)fail('INDEX_BATCH_LIMIT',413);
      let changed=0;
      for(const record of records){const t=indexTerms(record);const result=await query(`insert into advisory.knowledge_search(fabric_id,document,colour,pattern,texture,composition,source_hash)
        values($1,to_tsvector('english',$2),to_tsvector('english',$3),to_tsvector('english',$4),to_tsvector('english',$5),to_tsvector('english',$6),$7)
        on conflict(fabric_id) do update set document=excluded.document,colour=excluded.colour,pattern=excluded.pattern,texture=excluded.texture,composition=excluded.composition,source_hash=excluded.source_hash,indexed_at=now()
        where advisory.knowledge_search.source_hash<>excluded.source_hash returning fabric_id`,[t.id,t.text,t.colour,t.pattern,t.texture,t.composition,t.hash]);changed+=result.rows.length;}
      return {changed};
    },
    async remove(ids){if(!Array.isArray(ids)||ids.length>6||ids.some(id=>!new RegExp(FABRIC_ID).test(id)))fail('INDEX_BATCH_LIMIT',413);await query('delete from advisory.knowledge_search where fabric_id=any($1::text[])',[ids]);},
    async search(args){
      validate(tools.find(t=>t.name==='search_fabric_knowledge').parameters,args);
      const fields=['document','colour','pattern','texture','composition'];
      const values=[args.query,args.colour,args.pattern,args.texture,args.composition];
      const parameters=[],predicates=[];
      for(let i=0;i<fields.length;i++)if(values[i].trim()){parameters.push(values[i]);predicates.push(`${fields[i]} @@ plainto_tsquery('english',$${parameters.length})`);}
      if(!predicates.length)fail('INVALID_INPUT');
      const result=await query('select fabric_id from advisory.knowledge_search where '+predicates.join(' and ')+' order by fabric_id limit 6',parameters);
      return {ids:result.rows.map(r=>r.fabric_id),coverage:await coverage()};
    }
  };
}
// One bounded caller-selected batch, no background loops or auto bulk refresh.
// A later approved scheduler consumes source change IDs/checkpoints, calls the
// existing indexed exact-ID projection, then updates only changed safe terms.
export async function refreshKnowledgeBatch({ids,catalogue,index}){
  if(!Array.isArray(ids)||ids.length>6||ids.some(id=>!new RegExp(FABRIC_ID).test(id)))fail('INDEX_BATCH_LIMIT',413);
  const records=await catalogue.lookup(ids);const seen=new Set(records.map(r=>r.id));
  if(records.some(r=>!ids.includes(r.id)))fail('INVALID_UPSTREAM_RESPONSE',503);
  const result=await index.updateBatch(records);await index.remove(ids.filter(id=>!seen.has(id)));
  return {...result,read:ids.length,missing:ids.filter(id=>!seen.has(id)).length};
}
// Read-only Supabase port for the model tool. The refresh/index writer is a
// separate operator component and is never installed in the tool executor.
export function createSupabaseKnowledgeSearch({client,coverage=()=>({state:'partial',complete:false})}){
  return {async search(args){
    validate(tools.find(t=>t.name==='search_fabric_knowledge').parameters,args);
    const {data,error}=await client.schema('advisory').rpc('search_knowledge',{p_query:args.query,p_colour:args.colour,p_pattern:args.pattern,p_texture:args.texture,p_composition:args.composition});
    if(error)fail('KNOWLEDGE_UNAVAILABLE',503);
    if(!Array.isArray(data)||data.length>6||data.some(r=>!new RegExp(FABRIC_ID).test(r.fabric_id??'')))fail('INVALID_UPSTREAM_RESPONSE',503);
    return {ids:data.map(r=>r.fabric_id),coverage:await coverage()};
  }};
}
