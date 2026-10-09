import { AdvisoryError, fail, validate, tools } from './contracts.mjs';
import { guidance } from './guidance.mjs';
const bounded = (v,n=160) => typeof v==='string'?v.slice(0,n):null;
const list = (v,n=12) => Array.isArray(v)?v.filter(x=>typeof x==='string').slice(0,n).map(x=>x.slice(0,100)):[];
const number = v => Number.isFinite(v)&&v>=0?v:null;
const fields=['primaryColour','secondaryColours','colourTemperature','lightness','saturation','contrast','patternClass','motif','visualActivity','visualSurface','sheenAppearance','character'];
export function safeKnowledge(row, visual) {
  const d=row.fabric_designs??{}, b=row.supplier_brands??{}, c=d.fabric_collections??{};
  return {id:bounded(row.fabric_id),brand:bounded(b.display_name),design:bounded(d.display_name),collection:bounded(c.display_name),colour:bounded(row.colour_name),
    composition:Array.isArray(d.composition)?d.composition.slice(0,12).map(p=>({material:bounded(p.material,80),percentage:number(p.percentage)})):[],
    fullWidthMm:number(d.full_width_mm),usableWidthMm:number(d.usable_width_mm),verticalRepeatMm:number(d.vertical_repeat_mm),horizontalRepeatMm:number(d.horizontal_repeat_mm),
    patternMatch:bounded(d.pattern_match_type),applications:list(d.usage_suitability),
    visual:visual&&['COMPLETE','PARTIAL_GOVERNED'].includes(visual.knowledge_state)?Object.fromEntries(fields.flatMap(k=>{const v=visual.visual_fields?.[k]?.value;return typeof v==='string'?[[k,v.slice(0,150)]]:Array.isArray(v)?[[k,list(v)]]:[];})):{},
    availability:'KNOWLEDGE_ONLY_NOT_A_PURCHASE_OFFER',purchasable:false,
    provenance:{id:'fabric:'+row.fabric_id,source:'Fabric Master, narrow read-only identity projection',retrievedAt:new Date().toISOString()}};
}
export function safeRetail(row) {
  if(!row || !/^[a-zA-Z0-9-]{1,150}$/.test(row.id??'') || row.browseReady!==true || row.launchReady!==true || row.orderReady!==true) return null;
  if(!/^https:\/\/www\.curtainsuk\.com\/pages\/fabric\/[a-z0-9-]+$/i.test(row.fabricProfileUrl??'')) return null;
  const image=(row.images??[]).find(i=>i.approved===true&&/^https:\/\/cdn\.shopify\.com\/[^?#]+$/i.test(i.url??''));
  if(!image) return null;
  return {id:row.id,brand:bounded(row.brand),design:bounded(row.design),colour:bounded(row.colour),description:bounded(row.description,900),
    imageUrl:image.url,url:row.fabricProfileUrl,availability:'Verify price and availability in the product journey',
    purchasable:row.orderReady===true,provenance:{id:'retail:'+row.id,source:'Existing governed customer catalogue',retrievedAt:new Date().toISOString()}};
}
export async function readJsonLimited(response, max=250000) {
  if(!response.ok) throw new AdvisoryError('KNOWLEDGE_UNAVAILABLE',503);
  let length=0;const chunks=[];const reader=response.body.getReader();
  try { for(;;){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>max)fail('RESPONSE_TOO_LARGE',503);chunks.push(value);} }
  finally {await reader.cancel().catch(()=>{});}
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{fail('INVALID_UPSTREAM_RESPONSE',503);}
}
export function createCatalogue({fetchImpl=fetch,url,key,readRetail=null,now=()=>Date.now()}={}) {
  if(url && !/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(url)) fail('INVALID_CATALOGUE_ORIGIN',500);
  const cache=new Map();
  const select='fabric_id,colour_name,fabric_designs(display_name,composition,full_width_mm,usable_width_mm,vertical_repeat_mm,horizontal_repeat_mm,pattern_match_type,usage_suitability,fabric_collections(display_name)),supplier_brands(display_name)';
  async function read(table,params) {
    if(!url||!key) fail('KNOWLEDGE_UNAVAILABLE',503);
    const response=await fetchImpl(url+'/rest/v1/'+table+'?'+params,{headers:{apikey:key,Authorization:'Bearer '+key,'Accept-Profile':'curtainsuk_private'},signal:AbortSignal.timeout(4500),redirect:'error'});
    const rows=await readJsonLimited(response);if(!Array.isArray(rows)||rows.length>6) fail('INVALID_UPSTREAM_RESPONSE',503);return rows;
  }
  async function lookup(ids) {
    validate(tools[1].parameters,{ids});
    if(!ids.length)return[];
    const key=ids.join(',');const previous=cache.get(key);if(previous&&previous.expires>now())return structuredClone(previous.value);
    const [rows,visual]=await Promise.all([read('fabric_colourways',new URLSearchParams({select,fabric_id:'in.('+key+')',limit:'6'})),read('fabric_visual_knowledge_read_cache',new URLSearchParams({select:'fabric_id,knowledge_state,visual_fields',fabric_id:'in.('+key+')',limit:'6'})).catch(()=>[])]);
    if(rows.some(r=>!ids.includes(r.fabric_id))) fail('INVALID_UPSTREAM_RESPONSE',503);
    const value=rows.map(r=>safeKnowledge(r,visual.find(v=>v.fabric_id===r.fabric_id)));
    if(cache.size>=64)cache.delete(cache.keys().next().value);cache.set(key,{value,expires:now()+60000});return structuredClone(value);
  }
  return {lookup,
    async identities(prefix){
      validate(tools[2].parameters,{prefix});
      // The live text collation sorts '~' before digits. Use an alphanumeric
      // upper bound plus an exact LIKE prefix filter, with the existing index.
      // Canonical IDs are bounded ASCII alphanumeric/hyphen, max 150 characters.
      const upper=prefix+'z'.repeat(150);
      const rows=await read('fabric_colourways',new URLSearchParams({select:'fabric_id',and:`(fabric_id.gte.${prefix},fabric_id.lt.${upper})`,fabric_id:'like.'+prefix+'*',order:'fabric_id.asc',limit:'6'}));
      return rows.map(r=>r.fabric_id).filter(id=>typeof id==='string'&&id.startsWith(prefix));
    },
    async retail(args){
      validate(tools[3].parameters,args);
      const params=new URLSearchParams({view:'retail',query:args.query,colour:args.colour,pattern:args.pattern,page:'1'});
      const result=readRetail?await readRetail(params):await readJsonLimited(await fetchImpl('https://www.curtainsuk.com/apps/curtainsuk-decision/catalog?'+params,{signal:AbortSignal.timeout(6000),redirect:'error'}),750000);
      if(!Array.isArray(result.fabrics)||result.fabrics.length>24)fail('INVALID_UPSTREAM_RESPONSE',503);
      return result.fabrics.slice(0,6).map(safeRetail).filter(Boolean);
    }
  };
}
export function createToolExecutor(catalogue) {
  const evidence=new Map(),retail=new Map();let count=0;
  return { evidence,retail,
    async execute(name,args){
      const contract=tools.find(t=>t.name===name);if(!contract)fail('TOOL_NOT_ALLOWED',400);
      const input=validate(contract.parameters,args);if(++count>6)fail('TOOL_BUDGET_EXCEEDED',429);
      let result;
      if(name==='get_tool_guidance')result=guidance[input.tool];
      else if(name==='lookup_fabric_knowledge')result=await catalogue.lookup(input.ids);
      else if(name==='find_fabric_identities')result=await catalogue.identities(input.prefix);
      else result=await catalogue.retail(input);
      for(const r of Array.isArray(result)?result:[result]){
        if(r?.provenance)evidence.set(r.provenance.id,r.provenance);
        else if(r?.id&&r.sources)evidence.set(r.id,{id:r.id,source:r.sources.join(', '),version:r.version});
        if(name==='search_retail_fabrics'&&r?.id)retail.set(r.id,r);
      }
      return {classification:'untrusted_customer_safe_reference',data:result};
    }
  };
}
