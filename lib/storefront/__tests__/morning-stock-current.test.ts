import test from 'node:test';
import assert from 'node:assert/strict';
import {dailyStockDecision,currentDailyStockAvailability} from '../daily-stock';
const now=new Date('2026-09-15T12:00:00Z');
const base={aggregateMetres:30,confirmedUsageMetres:0,discontinued:false,snapshotDate:null,checkedAt:'2026-09-12T12:00:00Z'};
test('genuine stock is valid through exactly 72 hours, regardless of UK date or failed retrieval',()=>{
 for(const checkedAt of ['2026-09-15T12:00:00Z','2026-09-14T06:00:00Z','2026-09-12T12:00:00Z']){
  const result=dailyStockDecision({...base,checkedAt,refreshFailed:true},now);
  assert.equal(result.stale,false);
  assert.equal(currentDailyStockAvailability(result),'FABRIC_AVAILABLE');
 }
});
test('expired, future or missing evidence requires confirmation, not an out-of-stock claim',()=>{
 for(const checkedAt of ['2026-09-12T11:59:59.999Z','2026-09-16T12:00:00Z','invalid',null]){
  const result=dailyStockDecision({...base,checkedAt},now);
  assert.equal(result.status,'CHECK_AVAILABILITY');
  assert.equal(currentDailyStockAvailability(result),'AVAILABILITY_TO_BE_CONFIRMED');
 }
});
test('30 is available; below 30 is unavailable; discontinued overrides all freshness and quantities',()=>{
 assert.equal(dailyStockDecision({...base,aggregateMetres:29.99},now).status,'OUT_OF_STOCK');
 assert.equal(dailyStockDecision({...base,aggregateMetres:100,confirmedUsageMetres:70},now).status,'AVAILABLE');
 assert.equal(dailyStockDecision({...base,discontinued:true,checkedAt:null},now).status,'DISCONTINUED');
 assert.equal(dailyStockDecision({...base,aggregateMetres:NaN},now).status,'CHECK_AVAILABILITY');
});
