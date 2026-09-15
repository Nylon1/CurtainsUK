import 'server-only';
import { createSupplierServiceClient } from '../supabase/supplier-service';
import type { PublicSupplierAvailability } from '../supplier-intelligence/types';
import type { FabricMasterRecord } from './types';
import { fabricReadiness } from './readiness';

/** One bounded query per retail page. No supplier calls or prices in the public result. */
export async function commercialReadiness(records: FabricMasterRecord[]) {
  if(records.length>48) throw Error('RETAIL_PAGE_TOO_LARGE');
  if(!records.length) return new Map<string,ReturnType<typeof fabricReadiness>>();
  const {data,error}=await createSupplierServiceClient().rpc('fabric_commercial_evidence',{p_ids:records.map(r=>r.fabric_id)});
  if(error) throw Error('FABRIC_READINESS_UNAVAILABLE');
  const evidence=new Map(((data??[]) as {fabric_id:string;stock:PublicSupplierAvailability;stale:boolean;price_confirmed:boolean}[]).map(e=>[e.fabric_id,e]));
  return new Map(records.map(r=>{const e=evidence.get(r.fabric_id);return [r.fabric_id,fabricReadiness(r,{stock:e?.stock,stale:e?.stale,priceConfirmed:e?.price_confirmed})];}));
}
