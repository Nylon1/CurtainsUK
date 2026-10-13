import test from 'node:test';
import assert from 'node:assert/strict';
import {createPerConsultationBudget} from '../evaluation-budget.mjs';

test('per-consultation ceiling includes in-flight reservations and settles actual usage',async()=>{
  let next=0;
  const ledger={reserve:async()=>String(++next),settle:async()=>{}};
  const budget=createPerConsultationBudget({ledger,limitUsd:1});
  const first=await budget.reserve(.7);
  await assert.rejects(budget.reserve(.31),{code:'CONSULTATION_BUDGET_EXCEEDED'});
  await budget.settle(first,.2);
  const second=await budget.reserve(.79);
  await assert.rejects(budget.reserve(.02),{code:'CONSULTATION_BUDGET_EXCEEDED'});
  await budget.settle(second,null);
  await assert.rejects(budget.reserve(.02),{code:'CONSULTATION_BUDGET_EXCEEDED'});
});

test('failed durable reservation never consumes the local ceiling',async()=>{
  let failOnce=true;
  const ledger={reserve:async()=>{if(failOnce){failOnce=false;throw Error('durable failure');}return 'ok';},settle:async()=>{}};
  const budget=createPerConsultationBudget({ledger,limitUsd:1});
  await assert.rejects(budget.reserve(.9));
  assert.equal(await budget.reserve(.9),'ok');
  await assert.rejects(budget.settle('other',0),{code:'INVALID_BUDGET_RECEIPT'});
});
