import 'server-only';
import { createSupplierServiceClient } from '@/lib/supabase/supplier-service';
import { mapVisualKnowledgeRow, type VisualRow, type FabricVisualIntelligence } from './visual-knowledge';
let cached: {until:number;value:Promise<[string,FabricVisualIntelligence][]>}|undefined;
/** Existing server-to-server HCI transport only; never sent to the storefront. */
export function hciVisualKnowledge() {
  if(cached && cached.until>Date.now()) return cached.value;
  const value=(async()=>{
    const db=createSupplierServiceClient();
    const pages=await Promise.all(Array.from({length:10},(_,index)=>db.from('fabric_visual_knowledge_read_cache')
      .select('fabric_id,knowledge_state,visual_fields').in('knowledge_state',['COMPLETE','PARTIAL_GOVERNED'])
      .order('fabric_id').range(index*1000,index*1000+999)));
    if(pages.some(p=>p.error)) throw Error('FABRIC_VISUAL_KNOWLEDGE_UNAVAILABLE');
    return pages.flatMap(p=>(p.data as VisualRow[]??[]).map(row=>[row.fabric_id,mapVisualKnowledgeRow(row)] as [string,FabricVisualIntelligence]));
  })();
  cached={until:Date.now()+60000,value};
  value.catch(()=>{if(cached?.value===value)cached=undefined;});
  return value;
}
