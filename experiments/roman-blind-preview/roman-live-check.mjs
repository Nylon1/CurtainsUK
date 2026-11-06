// Explicit read-only integration check. Requires the preview server and its existing private environment.
// Run with the repository's server-script loader and tsx. Never served to the browser.
import assert from 'node:assert/strict';
import {fabricMasterRecordById,verifiedSupplierCostMinor} from '../../lib/fabric-master/repository.ts';
import {toDecisionEngineFabric} from '../../lib/fabric-master/decision-engine.ts';
import {dailyStockProjection} from '../../lib/storefront/daily-stock-server.ts';
import {MTM_PRODUCTION_PRICING_RULE_SET as rules} from '../../lib/decision-engine/seed/production-pricing-rules.ts';
import {romanEstimate} from './roman-price-core.mjs';
for(const fabricId of ['pt-1224-002','sdg-f1325-01']){
 const input={fabricId,width:139,drop:140,lining:'STANDARD',fold:'stacked'};
 const record=await fabricMasterRecordById(fabricId);
 const cost=await verifiedSupplierCostMinor(record.supplier_id,record.supplier_sku);
 const estimate=romanEstimate(input,toDecisionEngineFabric(record,cost,record.source_effective_date??''),rules);
 const stock=await dailyStockProjection({supplierId:record.supplier_id,supplierSku:record.supplier_sku,requirement:{quantity:estimate._fabricMetres,stock_unit:'METRE'}});
 const response=await fetch('http://127.0.0.1:4318/roman-api/price',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
 assert.equal(response.status,200);const result=await response.json();
 assert.equal(result.totalMinor,estimate.totalMinor);assert.equal(result.availabilityCode,stock.availability);assert.equal(result.stockSnapshotStale,stock.stale);assert.equal(result.sampleStockAvailable,stock.sampleStockAvailable);
 assert.equal('_fabricMetres' in result,false);assert.equal('supplierCostPerMetre' in result,false);
 console.log(`${fabricId}: price and shared curtain stock projection agree; private inputs excluded.`);
}
for(const file of ['roman-api.ts','roman-price-core.mjs','roman-live-check.mjs'])assert.equal((await fetch(`http://127.0.0.1:4318/${file}`)).status,404);
console.log('Private module routes are not served.');
