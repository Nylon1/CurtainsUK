import test from 'node:test';
import assert from 'node:assert/strict';
import {dailyStockDecision,currentDailyStockAvailability} from '../daily-stock';
test('purchase availability requires the current UK date even before the morning refresh', () => {
  for (const now of [new Date('2026-09-14T00:00:00Z'), new Date('2026-01-14T05:00:00Z')]) {
    const today = now.toISOString().slice(0,10);
    const base = {aggregateMetres:100,confirmedUsageMetres:0,discontinued:false,snapshotDate:today};
    assert.equal(currentDailyStockAvailability(dailyStockDecision(base,now)), 'FABRIC_AVAILABLE');
    for (const snapshotDate of [null, '2026-01-13', '2026-09-15']) {
      const decision = dailyStockDecision({...base,snapshotDate},now);
      assert.equal(decision.stale,true);
      assert.equal(currentDailyStockAvailability(decision),'AVAILABILITY_TO_BE_CONFIRMED');
    }
    assert.equal(currentDailyStockAvailability(dailyStockDecision({...base,refreshFailed:true},now)), 'AVAILABILITY_TO_BE_CONFIRMED');
  }
});
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
