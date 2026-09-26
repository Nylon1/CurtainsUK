import { createClient } from '@supabase/supabase-js';
import { mkdir, writeFile } from 'node:fs/promises';

const url = process.env.SDG_STOCK_SUPABASE_URL;
const secret = process.env.SDG_STOCK_SUPABASE_SECRET_KEY;
if (url !== 'https://hqysjumypgeapgmqkcrx.supabase.co' || !secret) throw Error('AUDIT_CONFIGURATION_INVALID');
const database = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  db: { schema: 'curtainsuk_private' },
});
const levels = [
  ['MID_RANGE', 0, 5_000],
  ['LUXURY', 5_000, 15_000],
  ['PREMIUM_LUXURY', 15_000, 25_000],
  ['SUPER_LUXURY', 25_000, null],
];
const output = {};
for (const [level, minimum, maximum] of levels) {
  const { data, error } = await database.rpc('retail_guide_price_level_fabric_ids', {
    p_guide_min: minimum,
    p_guide_max: maximum,
  });
  if (error) throw error;
  const ids = (data ?? []).map((row) => row.fabric_id);
  const rows = [];
  for (let from = 0; from < ids.length; from += 400) {
    const page = await database.from('fabric_colourways').select('fabric_id,supplier_id,design_id').in('fabric_id', ids.slice(from, from + 400));
    if (page.error) throw page.error;
    rows.push(...page.data);
  }
  output[level] = {
    eligibleFabrics: ids.length,
    rowsLoaded: rows.length,
    distinctDesigns: new Set(rows.map((row) => `${row.supplier_id}\0${row.design_id}`)).size,
    prestigiousTextiles: rows.filter((row) => row.supplier_id === 'prestigious-textiles').length,
  };
}
await mkdir('artifacts/hci-price-tier-audit', { recursive: true });
await writeFile('artifacts/hci-price-tier-audit/tier-counts.json', `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output));
