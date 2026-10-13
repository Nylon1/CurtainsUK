import {fail} from './contracts.mjs';

// A second local ceiling sits beneath the durable run-wide SQL ceiling. Each
// evaluation session is unique and cannot be resumed after a runner crash.
export function createPerConsultationBudget({ledger,limitUsd=1}){
  if(!ledger?.reserve||!ledger?.settle||!Number.isFinite(limitUsd)||limitUsd<=0)fail('INVALID_BUDGET',500);
  let held=0;
  const reservations=new Map();
  return {
    async reserve(usd){
      if(!Number.isFinite(usd)||usd<=0)fail('INVALID_BUDGET',500);
      if(held+usd>limitUsd)fail('CONSULTATION_BUDGET_EXCEEDED',429);
      const id=await ledger.reserve(usd);
      held+=usd;reservations.set(id,usd);return id;
    },
    async settle(id,billed){
      if(!reservations.has(id))fail('INVALID_BUDGET_RECEIPT',500);
      await ledger.settle(id,billed);
      const reserved=reservations.get(id);
      held-=Math.max(0,reserved-(billed??reserved));
      reservations.delete(id);
    }
  };
}
