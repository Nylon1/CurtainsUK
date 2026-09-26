import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const projectUrl = process.env.SDG_STOCK_SUPABASE_URL;
const secret = process.env.SDG_STOCK_SUPABASE_SECRET_KEY;
const expectedProject = 'https://hqysjumypgeapgmqkcrx.supabase.co';
if (projectUrl !== expectedProject || typeof secret !== 'string' || secret.length < 10) {
  throw new Error('HCI_CATALOGUE_EXPORT_CONFIGURATION_INVALID');
}

const selection =
  'fabric_id,supplier_id,brand_id,design_id,supplier_sku,colourway_code,colour_name,sample_available,lifecycle_state,price_verification_status,storefront_selectable,staging_catalog_visible,source_type,source_name,source_effective_date,updated_at,supplier_brands!inner(display_name),fabric_designs!inner(design_id,collection_id,supplier_design_code,display_name,full_width_mm,usable_width_mm,vertical_repeat_mm,horizontal_repeat_mm,pattern_match_type,composition,weight_gsm,care_instructions,usage_suitability,updated_at,fabric_collections!inner(display_name)),fabric_retail_profiles(colour_families,patterns,characters,styles,headings,linings,classification_evidence,updated_at),fabric_media_mappings(fabric_id,supplier_id,supplier_sku,content_hash,image_type,rights_state,mapping_state,fabric_media_assets!inner(shopify_cdn_url,width,height))';

function approvedImages(row) {
  return (row.fabric_media_mappings ?? []).filter((mapping) => {
    const asset = mapping.fabric_media_assets;
    return mapping.fabric_id === row.fabric_id &&
      mapping.supplier_id === row.supplier_id &&
      mapping.supplier_sku === row.supplier_sku &&
      mapping.rights_state === 'APPROVED' &&
      mapping.mapping_state === 'VERIFIED' &&
      asset && asset.width > 0 && asset.height > 0 &&
      /^https:\/\/cdn\.shopify\.com\/[^?#]+$/.test(asset.shopify_cdn_url);
  });
}

function isBrowsable(row) {
  return row.staging_catalog_visible === true && row.lifecycle_state !== 'DISCONTINUED' &&
    [row.supplier_sku, row.colour_name, row.supplier_brands?.display_name, row.fabric_designs?.display_name]
      .every((value) => typeof value === 'string' && value.trim()) &&
    approvedImages(row).length > 0;
}

async function scan() {
  const rows = [];
  let after;
  for (let page = 0; page < 100; page += 1) {
    const query = new URLSearchParams({
      select: selection,
      staging_catalog_visible: 'eq.true',
      lifecycle_state: 'neq.DISCONTINUED',
      order: 'fabric_id.asc',
      limit: '250',
    });
    if (after) query.set('fabric_id', `gt.${after}`);
    const response = await fetch(`${projectUrl}/rest/v1/fabric_colourways?${query}`, {
      headers: {
        apikey: secret,
        Authorization: `Bearer ${secret}`,
        'Accept-Profile': 'curtainsuk_private',
      },
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`HCI_CATALOGUE_EXPORT_HTTP_${response.status}`);
    const pageRows = await response.json();
    if (!Array.isArray(pageRows) || pageRows.length > 250) throw new Error('HCI_CATALOGUE_EXPORT_INVALID_PAGE');
    for (const row of pageRows) {
      if (after && row.fabric_id <= after) throw new Error('HCI_CATALOGUE_EXPORT_ORDER_INVALID');
      after = row.fabric_id;
      rows.push(row);
    }
    if (pageRows.length < 250) return rows;
  }
  throw new Error('HCI_CATALOGUE_EXPORT_PAGE_LIMIT');
}

const startedAt = new Date().toISOString();
const first = await scan();
const second = await scan();
const digest = (rows) => createHash('sha256').update(JSON.stringify(rows)).digest('hex');
if (digest(first) !== digest(second)) throw new Error('HCI_CATALOGUE_CHANGED_DURING_EXPORT');
const rows = second.filter(isBrowsable);
const snapshot = {
  rows,
  sourceRows: second.length,
  expectedTotal: rows.length,
  startedAt,
  completedAt: new Date().toISOString(),
  projectRef: 'hqysjumypgeapgmqkcrx',
};
const out = path.resolve(process.argv[2] ?? 'artifacts/hci-catalogue-export/source.json');
await mkdir(path.dirname(out), { recursive: true });
await writeFile(out, JSON.stringify(snapshot));
console.log(JSON.stringify({ sourceRows: snapshot.sourceRows, browsable: rows.length, digest: digest(rows) }));
