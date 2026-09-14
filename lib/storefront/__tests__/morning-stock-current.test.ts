import test from 'node:test';
import assert from 'node:assert/strict';
import {dailyStockDecision,currentDailyStockAvailability} from '../daily-stock';
test('failed or stale refresh preserves private position but cannot authorize checkout as current stock',()=>{
  const now=new Date('2026-09-14T08:00:00Z');
  const base={aggregateMetres:295,confirmedUsageMetres:0,snapshotDate:'2026-09-14',discontinued:false};
  assert.equal(currentDailyStockAvailability(dailyStockDecision(base,now)),'FABRIC_AVAILABLE');
  for(const input of [{...base,snapshotDate:'2026-09-13'},{...base,refreshFailed:true}]){
    const result=dailyStockDecision(input,now);
    assert.equal(result.status,'AVAILABLE');
    assert.equal(currentDailyStockAvailability(result),'AVAILABILITY_TO_BE_CONFIRMED');
  }
  assert.equal(currentDailyStockAvailability(dailyStockDecision({...base,aggregateMetres:30},now)),'TEMPORARILY_UNAVAILABLE');
});
