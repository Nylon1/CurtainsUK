/** Read-only rehearsal: simulate newer supplier cost only in process memory. */
import { loadEnvConfig } from '@next/env';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { createSupplierServiceClient } from '../lib/supabase/supplier-service';
import { fabricMasterRecordById, verifiedCutCostMinor } from '../lib/fabric-master/repository';
import { toDecisionEngineFabric } from '../lib/fabric-master/decision-engine';
import { buildStagingRuleSet, prepareStagingConfiguration, type StagingPriceRequest } from '../lib/storefront/staging-pricing';
import { calculatePrice } from '../lib/decision-engine/pricing-engine';

async function main() {
  loadEnvConfig(process.cwd());
  assert.equal(new URL(process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname, 'hqysjumypgeapgmqkcrx.supabase.co');
  const readback = JSON.parse(await readFile('artifacts/phase5m/single-rate-fresh-readback.json', 'utf8'));
  const db = createSupplierServiceClient();
  const fabric = await fabricMasterRecordById('sdg-dapgpa203');
  assert.ok(fabric);
  const cost = await verifiedCutCostMinor(fabric.supplier_id, fabric.supplier_sku);
  assert.ok(cost);
  const originalFabric = toDecisionEngineFabric(fabric, cost, fabric.source_effective_date ?? '');
  const newerFabric = { ...originalFabric, supplierCostPerMetre: { amountMinor: cost + 100, currency: 'GBP' as const } };
  const routes = [];
  for (const name of ['#D6', '#D7', '#D8']) {
    const draft = readback.draftOrders.nodes.find((d: {name: string}) => d.name === name);
    assert.ok(draft);
    const configurationId = draft.customAttributes.find((a: {key: string}) => a.key === 'curtainsuk_configuration_id').value;
    const before = await db.from('staging_configuration_snapshots').select('*').eq('configuration_id', configurationId).single();
    assert.equal(before.error, null); assert.ok(before.data);
    const s = before.data;
    const m = s.measurements as Record<string, number | boolean | number[]>;
    const request: StagingPriceRequest = { windowSlug:s.window_type_slug, measurementBasis:'TRACK_WIDTH', widthCm:Number(m.coverage_width), dropCm:Number(m.finished_drop), fabricId:s.fabric_master_id, heading:s.heading, lining:s.lining, construction:s.construction, stackDirection:'SPLIT',
      ...(s.window_type_slug === 'bay-window' ? { bayTrackOrPoleFitted:true, bayNumberOfSections:Number(m.number_of_sections), baySegmentWidthsCm:m.bay_segment_widths as number[] } : {}) };
    const next = prepareStagingConfiguration(request, newerFabric);
    const priced = calculatePrice({ ...next, fabric:newerFabric, rules:buildStagingRuleSet(), mode:'CALIBRATION', shippingZone:'UK_MAINLAND' });
    assert.ok(priced.total.amountMinor > s.customer_price_minor);
    assert.notEqual(next.configuration.id, configurationId);
    const after = await db.from('staging_configuration_snapshots').select('*').eq('configuration_id', configurationId).single();
    assert.deepEqual(after, before);
    const line = draft.lineItems.nodes[0];
    const attrs = new Map(line.customAttributes.map((a: {key:string;value:string}) => [a.key,a.value]));
    assert.equal(draft.lineItems.nodes.length, 1);
    assert.equal(attrs.get('Configuration'), configurationId);
    assert.equal(attrs.get('Pricing rules'), s.pricing_rule_version);
    assert.equal(line.sku, `CUK-${configurationId}`);
    assert.equal(line.quantity, 1); assert.equal(line.taxable, true); assert.equal(line.requiresShipping, true);
    assert.equal(Number(draft.subtotalPriceSet.shopMoney.amount) * 100, s.customer_price_minor);
    assert.equal(Math.round(Number(draft.totalShippingPriceSet.shopMoney.amount) * 100), s.shipping_gross_amount_minor);
    assert.equal(Math.round(Number(draft.totalPriceSet.shopMoney.amount) * 100), s.customer_price_minor + s.shipping_gross_amount_minor);
    assert.doesNotMatch(JSON.stringify(line), /trade.?price|supplier.?cost|margin|dye.?lot|batch.?reference/i);
    routes.push({draft:name, configurationId, goodsMinor:s.customer_price_minor, deliveryMinor:s.shipping_gross_amount_minor, newSimulatedGoodsMinor:priced.total.amountMinor, immutableSnapshotHash:createHash('sha256').update(JSON.stringify(s)).digest('hex'), status:'PASS'});
  }
  await writeFile('artifacts/phase5m/final-immutability.json', JSON.stringify({checkedAt:new Date().toISOString(), supplierPriceWrites:0, supplierOrders:0, databaseWrites:0, simulatedChange:'In-memory only; not a supplier observation', routes},null,2)+'\n');
  console.log(JSON.stringify(routes));
}
main().catch(e=>{console.error(e instanceof Error ? e.message : 'IMMUTABILITY_FAILED'); process.exitCode=1;});
