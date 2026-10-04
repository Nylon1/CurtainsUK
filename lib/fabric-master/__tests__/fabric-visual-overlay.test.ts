/* eslint-disable @typescript-eslint/no-explicit-any -- Snapshot and PGlite rows are intentionally dynamic JSON fixtures. */
import '../../../scripts/curtainsuk-server-script-loader.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { mapVisualKnowledgeRow, customerGuidance, customerIntelligence } from '../visual-knowledge';
import { mapHciFabricKnowledge } from '../hci-visual-knowledge';

const migration = readFileSync(resolve('supabase/migrations/20261002201534_fabric_visual_knowledge_overlay_empty.sql'), 'utf8');
const browseSourceMigration = readFileSync(resolve('supabase/migrations/20261002202411_fabric_visual_knowledge_overlay_browse_source.sql'), 'utf8');
const rollback = readFileSync(resolve('docs/fabric-visual-overlay/ROLLBACK.sql'), 'utf8');
const browseMigration = readFileSync(resolve('supabase/migrations/20260925085148_browse_governed_projection_sources.sql'), 'utf8');
const oldBrowseView = browseMigration.slice(browseMigration.indexOf('CREATE VIEW curtainsuk_private.browse_eligible_set_v1'));
const newBrowseView = browseSourceMigration.slice(browseSourceMigration.indexOf('CREATE OR REPLACE VIEW curtainsuk_private.browse_eligible_set_v1'));
const visualColumns = new Set(['visual_primary_colour','visual_secondary_colours','pattern_class','motif','visual_surface','sheen_appearance','visual_character']);
const snapshotDir = process.env.CURTAINSUK_OVERLAY_SNAPSHOT_DIR;
type Row = Record<string, any>;

function fields(primary = 'unknown', confidence = 'REVIEW'): Row {
  const observation = (value:unknown, level='REVIEW') => ({value,confidence:level});
  return {
    primaryColour:observation(primary,confidence),secondaryColours:observation([]),
    colourTemperature:observation('unknown'),lightness:observation('unknown'),
    saturation:observation('unknown'),contrast:observation('unknown'),
    colourComplexity:observation('unknown'),patternClass:observation('unknown'),
    motif:observation([]),patternScale:observation('unknown'),
    visualActivity:observation('unknown'),directionality:observation('unknown'),
    visualSurface:observation([]),sheenAppearance:observation('unknown'),
    visualWeight:observation('unknown'),character:observation([]),
  };
}
const synthetic = [
  {fabric_id:'pt-missing',knowledge_state:'PARTIAL_GOVERNED',visual_fields:fields()},
  {fabric_id:'pt-untouched',knowledge_state:'PARTIAL_GOVERNED',visual_fields:fields('blue','HIGH')},
  {fabric_id:'pt-reviewed',knowledge_state:'PARTIAL_GOVERNED',visual_fields:fields('red','REVIEW')},
  {fabric_id:'pt-malformed',knowledge_state:'PARTIAL_GOVERNED',visual_fields:{...fields(),primaryColour:{value:[],confidence:'REVIEW'}}},
  {fabric_id:'pt-absent',knowledge_state:'PARTIAL_GOVERNED',visual_fields:Object.fromEntries(
    Object.entries(fields()).filter(([field])=>field!=='primaryColour'))},
  {fabric_id:'pt-complete',knowledge_state:'COMPLETE',visual_fields:fields('green','HIGH')},
  {fabric_id:'sdg-pending',knowledge_state:'PENDING_EXTERNAL_RETRY',visual_fields:fields()},
].map((row,index)=>({
  ...row,supplier_id:row.fabric_id.startsWith('pt-')?'prestigious-textiles':'sanderson-design-group',
  supplier_sku:`sku-${index}`,provenance:Object.fromEntries(Object.keys(row.visual_fields).map(field=>[field,'design_inference'])),
  refreshed_at:'2026-10-02T08:00:00Z',
}));

function publicMapping(row:Row) {
  const visual=mapVisualKnowledgeRow(row as any);
  return {visual,hci:mapHciFabricKnowledge(row as any),
    guidance:customerGuidance(visual),intelligence:customerIntelligence(visual)};
}
async function batchInsert(pg:PGlite, table:string, columns:string, jsonRows:Row[], batchSize=300) {
  for(let from=0;from<jsonRows.length;from+=batchSize) {
    await pg.query(`INSERT INTO curtainsuk_private.${table} (${columns}) SELECT ${columns} FROM jsonb_to_recordset($1::jsonb) AS r(${columns.split(',').map(column=>`${column.trim()} ${
      column.trim()==='visual_fields'||column.trim()==='provenance'?'jsonb':
      column.trim()==='staging_catalog_visible'?'boolean':
      column.trim()==='width'||column.trim()==='height'?'integer':
      column.trim()==='refreshed_at'?'timestamptz':'text'}`).join(',')})`,
      [JSON.stringify(jsonRows.slice(from,from+batchSize))]);
  }
}

async function database() {
  const pg=await PGlite.create({extensions:{pgcrypto}});
  await pg.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA curtainsuk_private; CREATE SCHEMA extensions;
    CREATE EXTENSION pgcrypto WITH SCHEMA extensions;
    CREATE TABLE curtainsuk_private.fabric_colourways(
      fabric_id text PRIMARY KEY,supplier_id text,supplier_sku text,brand_id text,design_id text,
      colour_name text,staging_catalog_visible boolean,lifecycle_state text);
    CREATE TABLE curtainsuk_private.fabric_media_assets(
      content_hash text PRIMARY KEY,shopify_cdn_url text,width integer,height integer);
    CREATE TABLE curtainsuk_private.fabric_media_mappings(
      fabric_id text,supplier_id text,supplier_sku text,image_type text,content_hash text,
      rights_state text,mapping_state text);
    CREATE TABLE curtainsuk_private.fabric_visual_knowledge_seed(
      fabric_id text PRIMARY KEY,supplier_id text,supplier_sku text,knowledge_state text,
      visual_fields jsonb,provenance jsonb,refreshed_at timestamptz);
    CREATE TABLE curtainsuk_private.supplier_brands(brand_id text PRIMARY KEY,display_name text);
    CREATE TABLE curtainsuk_private.fabric_designs(design_id text PRIMARY KEY,collection_id text,display_name text);
    CREATE TABLE curtainsuk_private.fabric_collections(collection_id text PRIMARY KEY,display_name text);
    CREATE TABLE curtainsuk_private.fabric_retail_profiles(fabric_id text,window_types text[]);
    CREATE TABLE curtainsuk_private.daily_stock_snapshots(
      supplier_id text,supplier_sku text,snapshot_date date,checked_at timestamptz,
      lifecycle_state text,aggregate_metres numeric);
    CREATE TABLE curtainsuk_private.daily_stock_usage(
      supplier_id text,supplier_sku text,confirmed_at timestamptz,metres numeric);
    CREATE VIEW curtainsuk_private.browse_current_guide_prices_set_v1 AS
      SELECT NULL::text supplier_id,NULL::text supplier_sku,NULL::bigint guide_minor WHERE false;
    CREATE FUNCTION curtainsuk_private.manufacturer_colour_families(text)
      RETURNS text[] LANGUAGE sql IMMUTABLE AS $$ SELECT ARRAY[]::text[] $$;
    CREATE FUNCTION curtainsuk_private.stock_validity_window()
      RETURNS interval LANGUAGE sql IMMUTABLE AS $$ SELECT interval '4 days' $$;
    CREATE TABLE curtainsuk_private.browse_projection_dirty(fabric_id text PRIMARY KEY);
    CREATE FUNCTION curtainsuk_private.browse_projection_mark_global_dirty()
      RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
        INSERT INTO curtainsuk_private.browse_projection_dirty(fabric_id) VALUES ('*')
        ON CONFLICT(fabric_id) DO NOTHING; RETURN NULL;
      END $$;
  `);
  let cache:Row[];
  let masters:Row[];
  let mappings:Row[];
  let assets:Row[];
  if(snapshotDir) {
    const load=(name:string)=>JSON.parse(readFileSync(resolve(snapshotDir,name),'utf8'));
    cache=load('fabric_visual_knowledge_read_cache.json');
    const ids=new Set(cache.map((row:Row)=>row.fabric_id));
    masters=load('fabric_colourways.json').filter((row:Row)=>ids.has(row.fabric_id));
    const allAssets=load('fabric_media_assets.json');
    const assetByHash=new Map(allAssets.map((row:Row)=>[row.content_hash,row]));
    mappings=load('fabric_media_mappings.json').filter((row:Row)=>ids.has(row.fabric_id)
      && row.rights_state==='APPROVED' && row.mapping_state==='VERIFIED' && assetByHash.has(row.content_hash));
    const mappedHashes=new Set(mappings.map((mapping:Row)=>mapping.content_hash));
    assets=allAssets.filter((row:Row)=>mappedHashes.has(row.content_hash));
  } else {
    cache=synthetic;
    masters=cache.map((row,index)=>({fabric_id:row.fabric_id,supplier_id:row.supplier_id,
      supplier_sku:row.supplier_sku,brand_id:'brand-x',design_id:`design-${index}`,
      colour_name:'Sample',staging_catalog_visible:true,lifecycle_state:'CURRENT'}));
    assets=cache.map((_,index)=>({content_hash:String(index+1).repeat(64),
      shopify_cdn_url:`https://cdn.shopify.com/s/files/1/cuk-fabric-${String(index+1).repeat(64)}.jpg`,width:800,height:800}));
    mappings=cache.map((row,index)=>({fabric_id:row.fabric_id,supplier_id:row.supplier_id,
      supplier_sku:row.supplier_sku,image_type:'MAIN',content_hash:assets[index].content_hash,
      rights_state:'APPROVED',mapping_state:'VERIFIED'}));
  }
  assert.equal(masters.length,cache.length);
  await batchInsert(pg,'fabric_colourways','fabric_id,supplier_id,supplier_sku,brand_id,design_id,colour_name,staging_catalog_visible,lifecycle_state',masters);
  await batchInsert(pg,'fabric_media_assets','content_hash,shopify_cdn_url,width,height',assets);
  await batchInsert(pg,'fabric_media_mappings','fabric_id,supplier_id,supplier_sku,image_type,content_hash,rights_state,mapping_state',mappings);
  await batchInsert(pg,'fabric_visual_knowledge_seed','fabric_id,supplier_id,supplier_sku,knowledge_state,visual_fields,provenance,refreshed_at',cache);
  const brands=[...new Set(masters.map(row=>row.brand_id))].map(brand_id=>({brand_id,display_name:brand_id}));
  const designs=[...new Set(masters.map(row=>row.design_id))].map(design_id=>({design_id,collection_id:'collection-x',display_name:design_id}));
  await batchInsert(pg,'supplier_brands','brand_id,display_name',brands);
  await batchInsert(pg,'fabric_designs','design_id,collection_id,display_name',designs);
  await batchInsert(pg,'fabric_collections','collection_id,display_name',[{collection_id:'collection-x',display_name:'Collection'}]);
  await pg.exec(`CREATE MATERIALIZED VIEW curtainsuk_private.fabric_visual_knowledge_read_cache AS
    SELECT * FROM curtainsuk_private.fabric_visual_knowledge_seed;
    CREATE UNIQUE INDEX fabric_visual_knowledge_read_cache_id
      ON curtainsuk_private.fabric_visual_knowledge_read_cache(fabric_id);`);
  await pg.exec(oldBrowseView);
  return {pg,cache,masters,mappings,assets};
}

function sortedRows(rows:Row[]) {return [...rows].sort((a,b)=>String(a.fabric_id).localeCompare(String(b.fabric_id)));}
async function patchPayload(pg:PGlite, fabricId:string, overrides:Row={}) {
  const {rows:[base]}=await pg.query<Row>(`SELECT k.*,c.brand_id,c.design_id,
      encode(extensions.digest(k.visual_fields::text,'sha256'),'hex') field_hash,
      encode(extensions.digest(k.provenance::text,'sha256'),'hex') provenance_hash
    FROM curtainsuk_private.fabric_visual_knowledge_read_cache k
    JOIN curtainsuk_private.fabric_colourways c USING(fabric_id) WHERE k.fabric_id=$1`,[fabricId]);
  const {rows:[image]}=await pg.query<Row>(`SELECT m.image_type,m.content_hash,a.shopify_cdn_url
    FROM curtainsuk_private.fabric_media_mappings m
    JOIN curtainsuk_private.fabric_media_assets a ON a.content_hash=m.content_hash
    WHERE m.fabric_id=$1 ORDER BY CASE m.image_type WHEN 'MAIN' THEN 0 ELSE 1 END,m.content_hash LIMIT 1`,[fabricId]);
  return {fabric_id:fabricId,supplier_id:base.supplier_id,supplier_sku:base.supplier_sku,
    brand_id:base.brand_id,design_id:base.design_id,approved_image_type:image.image_type,
    approved_image_hash:image.content_hash,approved_image_url:image.shopify_cdn_url,
    base_visual_fields_hash:base.field_hash,base_provenance_hash:base.provenance_hash,
    requested_missing_fields:['primaryColour','secondaryColours'],
    new_values_only:{primaryColour:'pink',secondaryColours:['white']},
    confidence_per_new_field:{primaryColour:'HIGH',secondaryColours:'MEDIUM'},
    provenance_per_new_field:{primaryColour:'BOTH',secondaryColours:'IMAGE'},
    source_manifest_digest:'a'.repeat(64),source_artifact_reference:[{run_id:'test',artifact_id:'test'}],
    ...overrides};
}
async function insertPatch(pg:PGlite,payload:Row) {
  const keys=Object.keys(payload);
  const casts=keys.map((key,i)=>`$${i+1}${key==='requested_missing_fields'?'::text[]':
    ['new_values_only','confidence_per_new_field','provenance_per_new_field','source_artifact_reference'].includes(key)?'::jsonb':''}`);
  await pg.query(`INSERT INTO curtainsuk_private.fabric_visual_knowledge_patches(${keys.join(',')})
    VALUES(${casts.join(',')})`,keys.map(key=>typeof payload[key]==='object'&&key!=='requested_missing_fields'
      ?JSON.stringify(payload[key]):payload[key]));
}

test('empty overlay migration preserves the governed cache and Browse source',async(t)=>{
  assert.equal(newBrowseView.trim().replace(/\r\n/g,'\n'),oldBrowseView.trim().replace(/\r\n/g,'\n')
    .replace('CREATE VIEW curtainsuk_private.browse_eligible_set_v1',
      'CREATE OR REPLACE VIEW curtainsuk_private.browse_eligible_set_v1')
    .replace('LEFT JOIN curtainsuk_private.fabric_visual_knowledge_read_cache vk',
      'LEFT JOIN curtainsuk_private.fabric_visual_knowledge_enriched vk'));
  const retailReader=readFileSync(resolve('lib/fabric-master/visual-knowledge.ts'),'utf8');
  const hciReader=readFileSync(resolve('lib/fabric-master/hci-visual-knowledge.ts'),'utf8');
  assert.equal((retailReader.match(/queryVisualKnowledgeWithFallback/g)||[]).length,2);
  assert.equal((hciReader.match(/queryVisualKnowledgeWithFallback/g)||[]).length,3);
  assert.equal((retailReader.match(/\.from\(source\)/g)||[]).length,1);
  assert.equal((hciReader.match(/\.from\(source\)/g)||[]).length,2);
  assert.ok(retailReader.includes('fabric_visual_knowledge_read_cache'));
  assert.ok(hciReader.includes('fabric_visual_knowledge_read_cache'));
  const {pg,cache}=await database();
  t.after(async()=>pg.close());
  const browseBefore=sortedRows((await pg.query<Row>('SELECT * FROM curtainsuk_private.browse_eligible_set_v1')).rows);
  const mappedBefore=sortedRows(cache).map(publicMapping);
  await pg.exec(migration);
  const cacheAfter=sortedRows((await pg.query<Row>('SELECT * FROM curtainsuk_private.fabric_visual_knowledge_enriched')).rows);
  assert.equal((await pg.query<Row>('SELECT count(*)::integer n FROM curtainsuk_private.fabric_visual_knowledge_patches')).rows[0].n,0);
  assert.equal((await pg.query<Row>('SELECT count(*)::integer n FROM curtainsuk_private.browse_projection_dirty')).rows[0].n,0);
  await pg.exec(browseSourceMigration);
  const browseAfter=sortedRows((await pg.query<Row>('SELECT * FROM curtainsuk_private.browse_eligible_set_v1')).rows);
  assert.equal(cacheAfter.length,cache.length);
  assert.deepEqual(cacheAfter.map(row=>[row.fabric_id,row.knowledge_state,row.visual_fields,row.provenance]),
    sortedRows(cache).map(row=>[row.fabric_id,row.knowledge_state,row.visual_fields,row.provenance]));
  assert.deepEqual(cacheAfter.map(publicMapping),mappedBefore);
  assert.deepEqual(browseAfter,browseBefore);
  assert.equal((await pg.query<Row>('SELECT count(*)::integer n FROM curtainsuk_private.browse_projection_dirty')).rows[0].n,0);

  if(snapshotDir) {
    assert.equal(cacheAfter.length,11815);
    assert.equal(browseAfter.length,11815);
    const canaries:Row[]=JSON.parse(readFileSync(resolve('docs/fabric-visual-overlay/canary-insert-payloads.json'),'utf8'));
    assert.equal(canaries.length,3);
    const beforeById=new Map(cacheAfter.map(row=>[row.fabric_id,row]));
    for(const payload of canaries) {
      const base=beforeById.get(payload.fabric_id)!;
      assert.equal(base.knowledge_state,'PARTIAL_GOVERNED');
      for(const field of payload.requested_missing_fields) {
        assert.equal(base.visual_fields[field].confidence,'REVIEW');
        assert.ok(base.visual_fields[field].value==='unknown'||
          (Array.isArray(base.visual_fields[field].value)&&base.visual_fields[field].value.length===0));
      }
      await insertPatch(pg,payload);
      const enriched=(await pg.query<Row>(
        'SELECT * FROM curtainsuk_private.fabric_visual_knowledge_enriched WHERE fabric_id=$1',
        [payload.fabric_id])).rows[0];
      assert.equal(enriched.knowledge_state,base.knowledge_state);
      const changedFields=Object.keys(base.visual_fields).filter(field=>
        JSON.stringify(enriched.visual_fields[field])!==JSON.stringify(base.visual_fields[field]));
      assert.deepEqual(changedFields.sort(),[...payload.requested_missing_fields].sort());
      for(const field of Object.keys(base.visual_fields)) if(!payload.requested_missing_fields.includes(field)) {
        assert.deepEqual(enriched.visual_fields[field],base.visual_fields[field]);
        assert.deepEqual(enriched.provenance[field],base.provenance[field]);
      }
    }
    assert.equal((await pg.query<Row>('SELECT count(*)::integer n FROM curtainsuk_private.browse_projection_dirty')).rows[0].n,1);
    const browsePatched=sortedRows((await pg.query<Row>('SELECT * FROM curtainsuk_private.browse_eligible_set_v1')).rows);
    assert.equal(browsePatched.length,browseBefore.length);
    for(let i=0;i<browseBefore.length;i++) for(const key of Object.keys(browseBefore[i])) if(!visualColumns.has(key))
      assert.deepEqual(browsePatched[i][key],browseBefore[i][key]);
    return;
  }

  const beforeById=new Map(cache.map(row=>[row.fabric_id,row]));
  const valid=await patchPayload(pg,'pt-missing');
  await insertPatch(pg,valid);
  const changed=(await pg.query<Row>(`SELECT * FROM curtainsuk_private.fabric_visual_knowledge_enriched WHERE fabric_id='pt-missing'`)).rows[0];
  assert.equal(changed.knowledge_state,'PARTIAL_GOVERNED');
  assert.equal(changed.visual_fields.primaryColour.value,'pink');
  assert.deepEqual(changed.visual_fields.secondaryColours.value,['white']);
  assert.equal(changed.provenance.primaryColour,'BOTH');
  assert.equal(changed.provenance.secondaryColours,'IMAGE');
  for(const field of Object.keys(beforeById.get('pt-missing')!.visual_fields))
    if(!['primaryColour','secondaryColours'].includes(field)) {
      assert.deepEqual(changed.visual_fields[field],beforeById.get('pt-missing')!.visual_fields[field]);
      assert.equal(changed.provenance[field],beforeById.get('pt-missing')!.provenance[field]);
    }
  assert.equal((await pg.query<Row>(`SELECT count(*)::integer n FROM curtainsuk_private.browse_projection_dirty WHERE fabric_id='*'`)).rows[0].n,1);
  const browsePatched=sortedRows((await pg.query<Row>('SELECT * FROM curtainsuk_private.browse_eligible_set_v1')).rows);
  assert.equal(browsePatched.length,browseBefore.length);
  for(let i=0;i<browseBefore.length;i++) {
    for(const key of Object.keys(browseBefore[i])) if(!visualColumns.has(key))
      assert.deepEqual(browsePatched[i][key],browseBefore[i][key]);
  }
  assert.equal(browsePatched.find(row=>row.fabric_id==='pt-missing')!.visual_primary_colour,'pink');
  assert.deepEqual(browsePatched.find(row=>row.fabric_id==='pt-missing')!.visual_secondary_colours,['white']);
  assert.ok(customerIntelligence(mapVisualKnowledgeRow(changed as any))?.dimensions.some(d=>d.key==='colour'));
  assert.deepEqual(mapHciFabricKnowledge(changed as any).palette?.primary,'pink');

  const known=await patchPayload(pg,'pt-untouched',{requested_missing_fields:['primaryColour'],
    new_values_only:{primaryColour:'red'},confidence_per_new_field:{primaryColour:'HIGH'},
    provenance_per_new_field:{primaryColour:'IMAGE'}});
  await insertPatch(pg,known);
  const reviewed=await patchPayload(pg,'pt-reviewed',{requested_missing_fields:['primaryColour'],
    new_values_only:{primaryColour:'pink'},confidence_per_new_field:{primaryColour:'MEDIUM'},
    provenance_per_new_field:{primaryColour:'IMAGE'}});
  await insertPatch(pg,reviewed);
  for(const id of ['pt-untouched','pt-reviewed']) {
    const row=(await pg.query<Row>('SELECT * FROM curtainsuk_private.fabric_visual_knowledge_enriched WHERE fabric_id=$1',[id])).rows[0];
    assert.deepEqual(row.visual_fields,beforeById.get(id)!.visual_fields);
    assert.deepEqual(row.provenance,beforeById.get(id)!.provenance);
  }

  const complete=await patchPayload(pg,'pt-complete',{requested_missing_fields:['secondaryColours'],
    new_values_only:{secondaryColours:['white']},confidence_per_new_field:{secondaryColours:'HIGH'},
    provenance_per_new_field:{secondaryColours:'IMAGE'}});
  const pending=await patchPayload(pg,'sdg-pending');
  await insertPatch(pg,complete); await insertPatch(pg,pending);
  for(const id of ['pt-complete','sdg-pending']) {
    const row=(await pg.query<Row>('SELECT * FROM curtainsuk_private.fabric_visual_knowledge_enriched WHERE fabric_id=$1',[id])).rows[0];
    assert.deepEqual(row.visual_fields,beforeById.get(id)!.visual_fields);
    assert.equal(row.knowledge_state,beforeById.get(id)!.knowledge_state);
  }

  for(const id of ['pt-malformed','pt-absent']) {
    const malformed=await patchPayload(pg,id,{requested_missing_fields:['primaryColour'],
      new_values_only:{primaryColour:'pink'},confidence_per_new_field:{primaryColour:'HIGH'},
      provenance_per_new_field:{primaryColour:'IMAGE'}});
    await insertPatch(pg,malformed);
    const row=(await pg.query<Row>('SELECT * FROM curtainsuk_private.fabric_visual_knowledge_enriched WHERE fabric_id=$1',[id])).rows[0];
    assert.deepEqual(row.visual_fields,beforeById.get(id)!.visual_fields);
    assert.deepEqual(row.provenance,beforeById.get(id)!.provenance);
  }

  await pg.query(`UPDATE curtainsuk_private.fabric_visual_knowledge_patches
    SET base_visual_fields_hash=$1 WHERE fabric_id='pt-missing'`,['0'.repeat(64)]);
  let fail=(await pg.query<Row>(`SELECT * FROM curtainsuk_private.fabric_visual_knowledge_enriched WHERE fabric_id='pt-missing'`)).rows[0];
  assert.deepEqual(fail.visual_fields,beforeById.get('pt-missing')!.visual_fields);
  await pg.query(`UPDATE curtainsuk_private.fabric_visual_knowledge_patches
    SET base_visual_fields_hash=$1,base_provenance_hash=$2 WHERE fabric_id='pt-missing'`,[valid.base_visual_fields_hash,'0'.repeat(64)]);
  fail=(await pg.query<Row>(`SELECT * FROM curtainsuk_private.fabric_visual_knowledge_enriched WHERE fabric_id='pt-missing'`)).rows[0];
  assert.deepEqual(fail.visual_fields,beforeById.get('pt-missing')!.visual_fields);
  await pg.query(`UPDATE curtainsuk_private.fabric_visual_knowledge_patches
    SET base_provenance_hash=$1 WHERE fabric_id='pt-missing'`,[valid.base_provenance_hash]);

  for(const invalid of [
    {primaryColour:'pink'},
    {primaryColour:'unknown',secondaryColours:['white']},
    {primaryColour:['pink'],secondaryColours:['white']},
    {primaryColour:'pink',secondaryColours:['white'],patternClass:'stripe'},
    {primaryColour:'pink',secondaryColours:['white','white']},
  ]) await assert.rejects(pg.query(`UPDATE curtainsuk_private.fabric_visual_knowledge_patches
    SET new_values_only=$1::jsonb WHERE fabric_id='pt-missing'`,[JSON.stringify(invalid)]));
  const retained=(await pg.query<Row>(`SELECT new_values_only FROM curtainsuk_private.fabric_visual_knowledge_patches
    WHERE fabric_id='pt-missing'`)).rows[0].new_values_only;
  assert.deepEqual(retained,valid.new_values_only);
  assert.equal((await pg.query<Row>(`SELECT count(*)::integer n FROM curtainsuk_private.fabric_visual_knowledge_patches`)).rows[0].n,7);
});

test('manual empty-overlay rollback restores the previous Browse source',async(t)=>{
  const {pg}=await database();
  t.after(async()=>pg.close());
  const before=sortedRows((await pg.query<Row>('SELECT * FROM curtainsuk_private.browse_eligible_set_v1')).rows);
  await pg.exec(migration);
  await pg.exec(browseSourceMigration);
  await pg.exec(rollback);
  const after=sortedRows((await pg.query<Row>('SELECT * FROM curtainsuk_private.browse_eligible_set_v1')).rows);
  assert.deepEqual(after,before);
  const relations=(await pg.query<Row>(`SELECT
    to_regclass('curtainsuk_private.fabric_visual_knowledge_patches') AS patches,
    to_regclass('curtainsuk_private.fabric_visual_knowledge_enriched') AS enriched`)).rows[0];
  assert.equal(relations.patches,null);
  assert.equal(relations.enriched,null);
});
