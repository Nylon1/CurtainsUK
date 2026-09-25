import test from 'node:test';
import assert from 'node:assert/strict';
import {preparePtWorkbookRecords,ptComposition,type PtPreparedRecord} from '../pt-workbook-batch';
const source={name:'PT workbook',reference:'supplier.xlsx',sha256:'a'.repeat(64)};
const rows=():PtPreparedRecord[]=>Array.from({length:50},(_,i)=>({supplier_id:'prestigious-textiles',supplier_sku:`4324/${String(i).padStart(3,'0')}`,
 fabric_id:`pt-4324-${String(i).padStart(3,'0')}`,action:'CREATE_GOVERNED_MASTER',supplier_design_code:'4324',colourway_code:String(i).padStart(3,'0'),
 design_name:'JOEL',colour_name:`Colour ${i}`,official_collection_label:'REVIVAL',source_collection_codes:['REVIVALBK'],source_rows:[i+2],
 manufacturer:{Qual:4324,Description:'JOEL colour',Composition:'100%POLYESTER',Width:148,'Weight/LM':420,'EAN Code':5050599345582,'HS Code':58013600,'Wash Care 1':'COOL WASH','Vertical Ptn/Rpt':31,'Horizontal Ptn/Rpt':24,Status:'C'},
 exclusion_checked:true,workbook_commercial_fields_used:[],selected_image:{source_path:'/Images/2026/REVIVAL/image.jpg',local_file:'unused',sha256:'b'.repeat(64),bytes:1000}}));
test('manufacturer data retain raw extra facts while visibility, lifecycle and prices remain unasserted',()=>{
 const [r]=preparePtWorkbookRecords(rows(),source);
 assert.equal(r.full_width_mm,1480); assert.equal(r.vertical_repeat_mm,310); assert.equal(r.weight_gsm,null);
 assert.equal(r.lifecycle_state,'UNKNOWN'); assert.equal(r.storefront_selectable,false); assert.equal(r.staging_catalog_visible,false);
 const spec=r.manufacturer_specification as {fields:Record<string,unknown>};
 assert.equal(spec.fields['Weight/LM'],420);assert.equal(spec.fields['EAN Code'],5050599345582);assert.equal(spec.fields.Status,'C');
});
test('commercial workbook fields, excluded categories, existing updates and duplicated identities are rejected',()=>{
 const commercial=rows();commercial[0].manufacturer.Price=99;assert.throws(()=>preparePtWorkbookRecords(commercial,source),/NONFACTUAL/);
 const excluded=rows();excluded[0].source_collection_codes=['NOVELTYBK'];assert.throws(()=>preparePtWorkbookRecords(excluded,source),/EXCLUDED/);
 const existing=rows();existing[0].action='FILL_MISSING_FACTS_AND_MEDIA_ONLY';assert.throws(()=>preparePtWorkbookRecords(existing,source),/IDENTITY/);
 const duplicate=rows();duplicate[1]=duplicate[0];assert.throws(()=>preparePtWorkbookRecords(duplicate,source),/EXACT_FIRST_50/);
});
test('composition preserves supplied abbreviations and incomplete totals without manufacturing missing content',()=>{
 assert.deepEqual(ptComposition('76% POLY 14% COTT 8% LINEN 1% VISC'),[{percentage:76,material:'poly'},{percentage:14,material:'cott'},{percentage:8,material:'linen'},{percentage:1,material:'visc'}]);
 assert.deepEqual(ptComposition(null),[]);
 assert.throws(()=>ptComposition('unknown 50% POLY'),/UNPARSED/);
});
