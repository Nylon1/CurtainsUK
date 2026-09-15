import test from 'node:test';
import assert from 'node:assert/strict';
import records from './commercial-records.json';
import type { FabricMasterRecord } from '../types';
import { toDecisionEngineFabric } from '../decision-engine';
import { fabricIsConfigurationEligible } from '../projection';
import { calculateStagingPriceForTest } from '../../storefront/staging-pricing';
import { fabricReadiness } from '../readiness';
import { dailyStockDecision, currentDailyStockAvailability } from '../../storefront/daily-stock';

const real = records as FabricMasterRecord[];
const sadira = real.find(r => r.fabric_id === 'pt-4262-770')!;
const request = {windowSlug:'standard-window',measurementBasis:'TRACK_WIDTH' as const,widthCm:180,dropCm:210,fabricId:sadira.fabric_id,heading:'PENCIL_PLEAT' as const,lining:'STANDARD' as const,construction:'PAIR' as const,stackDirection:'SPLIT' as const};
// Synthetic costs are isolated test inputs, never supplier evidence or database writes.
test('calculation always uses supplier fabric width, ignoring legacy usable width', () => {
  for (const [usable,full,expected] of [[1200,1400,1400],[null,1400,1400],[0,1400,1400]] as const) {
    const r={...sadira,usable_width_mm:usable,full_width_mm:full};
    const fabric=toDecisionEngineFabric(r,2000,'2026-09-15');
    assert.equal(fabric.usableWidthMm,expected);
    assert.equal(fabricIsConfigurationEligible(r),true);
    const result=calculateStagingPriceForTest(request,fabric);
    assert.ok(result.fabricWidths!>0);
    assert.ok(result.fabricMetres!>0);
    assert.equal(r.usable_width_mm,usable);
  }
});
test('one stock rule unlocks samples and curtains, never unknown stock or discontinued records',()=>{
  const now=new Date('2026-09-15T09:00:00Z');
  for(const record of real){
    for(const [date,quantity,expected] of [['2026-09-15T08:00:00Z',31,true],['2026-09-15T08:00:00Z',30,true],['2026-09-14T08:00:00Z',100,true],['2026-09-11T08:00:00Z',100,false],['2026-09-15T08:00:00Z',29,false],[null,null,false]] as const){
      const decision=dailyStockDecision({snapshotDate:null,checkedAt:date,aggregateMetres:quantity,confirmedUsageMetres:0,discontinued:record.lifecycle_state==='DISCONTINUED'},now);
      const readiness=fabricReadiness(record,{stock:currentDailyStockAvailability(decision),stale:decision.stale,priceConfirmed:true,shippingKnown:true});
      const visible=Boolean(record.staging_catalog_visible)&&record.lifecycle_state!=='DISCONTINUED';
      assert.equal(readiness.sampleReady,visible&&expected);
      assert.equal(readiness.purchasable,visible&&expected&&readiness.calculatorReady);
      assert.equal(readiness.recommendationEligible,visible);
    }
  }
  const evidence={stock:'FABRIC_AVAILABLE' as const,stale:false,priceConfirmed:true,shippingKnown:true};
  assert.equal(fabricReadiness({...sadira,sample_available:null},evidence).sampleReady,true);
  assert.equal(fabricReadiness({...sadira,sample_available:false},evidence).sampleReady,true);
  assert.equal(fabricReadiness(sadira,{...evidence,priceConfirmed:false}).sampleReady,true);
  assert.equal(fabricReadiness(sadira,{...evidence,priceConfirmed:false}).purchasable,false);
});
test('missing or invalid calculation width fails closed',()=>{
  for(const [usable,full] of [[null,null],[1400,null],[null,0],[1400,-1]] as const){
    const r={...sadira,usable_width_mm:usable,full_width_mm:full};
    assert.equal(fabricIsConfigurationEligible(r),false);
    assert.throws(()=>toDecisionEngineFabric(r,2000,'2026-09-15'),/INCOMPLETE/);
  }
});
test('all requested real identities retain their lifecycle and sample evidence',()=>{
  assert.equal(real.length,7);
  for(const r of real){
    const before=JSON.stringify(r);
    if(r.lifecycle_state==='DISCONTINUED') assert.equal(fabricIsConfigurationEligible(r),false);
    else if(r.staging_catalog_visible){
      const fabric=toDecisionEngineFabric(r,2000,'2026-09-15');
      const result=calculateStagingPriceForTest({...request,fabricId:r.fabric_id},fabric);
      assert.ok(result.fabricMetres!>0);
    }
    assert.equal(JSON.stringify(r),before);
  }
});
