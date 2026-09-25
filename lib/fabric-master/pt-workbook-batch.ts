import { stableSlug } from './catalogue-normalization';
import type { FabricMasterRecord } from './types';

export const PT_WORKBOOK_FACT_FIELDS = ['Qual','Description','Status','Composition','Wash Care 1','Wash Care 2','EAN Code','HS Code','Weight/LM','Width','Horizontal Ptn/Rpt','Vertical Ptn/Rpt'] as const;
export type PtPreparedRecord = {
  supplier_id:string; supplier_sku:string; fabric_id:string; action:string;
  supplier_design_code:string; colourway_code:string; design_name:string; colour_name:string;
  official_collection_label:string; source_collection_codes:string[]; source_rows:number[];
  manufacturer:Record<string,unknown>; exclusion_checked:boolean; workbook_commercial_fields_used:unknown[];
  selected_image:{ source_path:string; local_file:string; sha256:string; bytes:number };
};

function mm(raw:unknown) {
  if(raw===null || raw===undefined || raw==='') return null;
  if(typeof raw!=='number' || !Number.isFinite(raw) || raw<0 || !Number.isSafeInteger(Math.round(raw*10))) throw Error('PT_DIMENSION_INVALID');
  return Math.round(raw*10);
}

/** Preserve supplier material spellings; do not expand unfamiliar abbreviations or invent percentages. */
export function ptComposition(raw:unknown) {
  if(raw===null || raw===undefined || raw==='') return [];
  if(typeof raw!=='string') throw Error('PT_COMPOSITION_INVALID');
  const matches=[...raw.matchAll(/(\d+(?:\.\d+)?)\s*%\s*([^\d%]+)/g)];
  if(!matches.length) return [];
  const reconstructed=matches.map(m=>m[0]).join('').replace(/[\s/,]+/g,'');
  if(reconstructed!==raw.replace(/[\s/,]+/g,'')) throw Error('PT_COMPOSITION_UNPARSED_TEXT');
  return matches.map(m=>({percentage:Number(m[1]),material:m[2].replace(/^[\s/,]+|[\s/,]+$/g,'').toLowerCase()}));
}

/** Initial missing-SKU batch only. Existing/shared designs require a separate fill-missing merge. */
export function preparePtWorkbookRecords(rows:PtPreparedRecord[], source:{name:string;reference:string;sha256:string}) {
  if(rows.length!==50 || new Set(rows.map(r=>r.supplier_sku)).size!==50) throw Error('PT_EXACT_FIRST_50_REQUIRED');
  return rows.map(row=>{
    const [design,colour]=row.supplier_sku.split('/');
    if(!/^\d{4}\/\d{3}$/.test(row.supplier_sku) || row.supplier_id!=='prestigious-textiles' ||
      row.action!=='CREATE_GOVERNED_MASTER' || row.fabric_id!==`pt-${design}-${colour}` ||
      row.supplier_design_code!==design || row.colourway_code!==colour || String(row.manufacturer.Qual)!==design) throw Error('PT_IDENTITY_INVALID');
    if(!row.exclusion_checked || /NOVELTY|PT CONTRACT/i.test(row.selected_image.source_path) ||
      row.source_collection_codes.some(x=>/NOVELTY|CONTRACT/i.test(x))) throw Error('PT_EXCLUDED_CATEGORY');
    if(!row.design_name?.trim() || !row.colour_name?.trim() || !row.official_collection_label?.trim() || row.source_collection_codes.length!==1) throw Error('PT_DISPLAY_IDENTITY_REQUIRED');
    if(row.workbook_commercial_fields_used.length || Object.keys(row.manufacturer).some(k=>!PT_WORKBOOK_FACT_FIELDS.includes(k as typeof PT_WORKBOOK_FACT_FIELDS[number]))) throw Error('PT_NONFACTUAL_WORKBOOK_FIELD');
    if(!row.source_rows.length || !row.source_rows.every(n=>Number.isInteger(n)&&n>=2)) throw Error('PT_SOURCE_ROW_REQUIRED');
    const facts=Object.fromEntries(PT_WORKBOOK_FACT_FIELDS.map(k=>[k,row.manufacturer[k]??null]));
    const record:Omit<FabricMasterRecord,'supplier_name'> & {source_row_number:number;manufacturer_specification:unknown} = {
      fabric_id:row.fabric_id,supplier_id:row.supplier_id,brand_id:'prestigious-textiles',brand_name:'Prestigious Textiles',
      collection_id:`pt-collection-${stableSlug(row.official_collection_label)}`,collection_name:row.official_collection_label,
      supplier_collection_code:row.source_collection_codes[0],design_id:`pt-design-${design}`,supplier_design_code:design,
      design_name:row.design_name,supplier_sku:row.supplier_sku,colourway_code:colour,colour_name:row.colour_name,
      full_width_mm:mm(facts.Width),usable_width_mm:null,vertical_repeat_mm:mm(facts['Vertical Ptn/Rpt']),horizontal_repeat_mm:mm(facts['Horizontal Ptn/Rpt']),
      composition:ptComposition(facts.Composition),pattern_match_type:null,weight_gsm:null,
      care_instructions:[facts['Wash Care 1'],facts['Wash Care 2']].filter((x):x is string=>typeof x==='string'&&!!x.trim()),
      usage_suitability:[],imagery:[],sample_available:null,lifecycle_state:'UNKNOWN',
      price_verification_status:'PRICE_REQUIRES_VERIFICATION',storefront_selectable:false,staging_catalog_visible:false,
      source_type:'AUTHORISED_XLSX_CATALOGUE',source_name:source.name,source_reference:source.reference,source_effective_date:null,
      source_row_number:row.source_rows[0],
      manufacturer_specification:{source_sha256:source.sha256,source_sheet:'SBCLIENT',source_rows:row.source_rows,
        source_collection_codes:row.source_collection_codes,fields:facts,dimension_unit:'cm',
        dimension_unit_basis:'PT published fabric specification convention; August 2026 price list important information gives full and usable widths in cm; table repeats labelled Cms',
        weight_basis:'Weight/LM retained verbatim; not grams per square metre',status_basis:'Source status retained verbatim; not mapped to lifecycle'}
    };
    return record;
  });
}
