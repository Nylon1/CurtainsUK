import test from 'node:test';
import assert from 'node:assert/strict';
import records from './commercial-records.json';
import type { FabricMasterRecord } from '../types';
import { toDecisionEngineFabric } from '../decision-engine';
import { fabricIsConfigurationEligible } from '../projection';
import { calculateStagingPriceForTest } from '../../storefront/staging-pricing';
import { fabricReadiness } from '../readiness';
import { dailyStockDecision, currentDailyStockAvailability, sampleStockAvailable, curtainStockSufficient } from '../../storefront/daily-stock';

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
test('curtain floor and positive-stock sample eligibility are separate',()=>{
  const now=new Date('2026-09-15T09:00:00Z');
  for(const record of real){
    for(const [date,quantity,expected] of [['2026-09-15T08:00:00Z',31,true],['2026-09-15T08:00:00Z',30,true],['2026-09-14T08:00:00Z',100,true],['2026-09-11T08:00:00Z',100,false],['2026-09-15T08:00:00Z',29,false],[null,null,false]] as const){
      const decision=dailyStockDecision({snapshotDate:null,checkedAt:date,aggregateMetres:quantity,confirmedUsageMetres:0,discontinued:record.lifecycle_state==='DISCONTINUED'},now);
      const sampleStock=sampleStockAvailable({snapshotDate:null,checkedAt:date,aggregateMetres:quantity,confirmedUsageMetres:0,discontinued:record.lifecycle_state==='DISCONTINUED'},now);
      const readiness=fabricReadiness(record,{stock:currentDailyStockAvailability(decision),stale:decision.stale,sampleStockAvailable:sampleStock,priceConfirmed:true,shippingKnown:true});
      const visible=Boolean(record.staging_catalog_visible)&&record.lifecycle_state!=='DISCONTINUED';
      assert.equal(readiness.sampleReady,visible&&sampleStock);
      assert.equal(readiness.purchasable,visible&&expected&&readiness.calculatorReady);
      assert.equal(readiness.recommendationEligible,visible);
    }
  }
  const evidence={stock:'FABRIC_AVAILABLE' as const,stale:false,sampleStockAvailable:true,priceConfirmed:true,shippingKnown:true};
  assert.equal(fabricReadiness({...sadira,sample_available:null},evidence).sampleReady,true);
  assert.equal(fabricReadiness({...sadira,sample_available:false},evidence).sampleReady,true);
  assert.equal(fabricReadiness(sadira,{...evidence,priceConfirmed:false}).sampleReady,true);
  assert.equal(fabricReadiness(sadira,{...evidence,priceConfirmed:false}).purchasable,false);
});
test('curtain orders require both 30m commercial stock and calculated metres',()=>{
  const now=new Date('2026-09-15T09:00:00Z');
  const position=(metres:number|null, checkedAt:string|null='2026-09-15T08:00:00Z')=>({
    snapshotDate:null,checkedAt,aggregateMetres:metres,confirmedUsageMetres:0,discontinued:false,
  });
  assert.equal(curtainStockSufficient(position(25),20,now),false);
  assert.equal(curtainStockSufficient(position(35),20,now),true);
  assert.equal(curtainStockSufficient(position(35),40,now),false);
  assert.equal(curtainStockSufficient(position(0),1,now),false);
  assert.equal(curtainStockSufficient(position(null),1,now),false);
  assert.equal(curtainStockSufficient(position(35,'2026-09-11T08:00:00Z'),20,now),false);
  assert.equal(curtainStockSufficient({...position(35),confirmedUsageMetres:16},20,now),false);
  assert.equal(curtainStockSufficient(position(35),NaN,now),false);
  assert.equal(sampleStockAvailable(position(25),now),true);
  assert.equal(sampleStockAvailable(position(0),now),false);
  assert.equal(sampleStockAvailable(position(null),now),false);
  assert.equal(sampleStockAvailable(position(35,'2026-09-11T08:00:00Z'),now),false);
  const belowCurtainFloor=fabricReadiness(sadira,{stock:'TEMPORARILY_UNAVAILABLE',stale:false,sampleStockAvailable:true});
  assert.equal(belowCurtainFloor.sampleReady,true);
  assert.equal(belowCurtainFloor.orderReady,false);
  assert.equal(belowCurtainFloor.stockMessage,'Sample available; curtains awaiting supplier stock');
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
