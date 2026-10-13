import {randomUUID} from 'node:crypto';
import {fail} from './contracts.mjs';
// Single-process test budget. Cloud activation requires equivalent atomic,
// durable accounting; never treat this in-memory ledger as a fleet-wide cap.
export class PreviewSpendBudget {
  constructor({dailyUsd,sessionUsd,now=()=>Date.now()}){
    if(!Number.isFinite(dailyUsd)||!Number.isFinite(sessionUsd)||dailyUsd<=0||sessionUsd<=0)fail('INVALID_BUDGET',500);
    this.dailyLimit=Math.floor(dailyUsd*1e6);this.sessionLimit=Math.floor(sessionUsd*1e6);this.now=now;this.days=new Map();this.sessions=new Map();this.reservations=new Map();
  }
  forSession(id){
    return {
      reserve:async usd=>{
        if(!Number.isFinite(usd)||usd<=0)fail('INVALID_BUDGET',500);
        if(this.reservations.size>=500||(!this.sessions.has(id)&&this.sessions.size>=100))fail('BUDGET_EXHAUSTED',429);
        const day=new Date(this.now()).toISOString().slice(0,10),amount=Math.ceil(usd*1e6);
        if((this.days.get(day)??0)+amount>this.dailyLimit||(this.sessions.get(id)??0)+amount>this.sessionLimit)fail('BUDGET_EXHAUSTED',429);
        const key=randomUUID();this.days.set(day,(this.days.get(day)??0)+amount);this.sessions.set(id,(this.sessions.get(id)??0)+amount);this.reservations.set(key,{id,day,amount});return key;
      },
      settle:async(key,actualUsd)=>{
        const held=this.reservations.get(key);if(!held||held.id!==id)fail('INVALID_BUDGET_RECEIPT',500);
        // Unknown outcome consumes the full reserved amount, including retries.
        const billed=actualUsd===null?held.amount:Number.isFinite(actualUsd)&&actualUsd>=0?Math.ceil(actualUsd*1e6):null;
        if(billed===null)fail('INVALID_BUDGET_RECEIPT',500);
        this.reservations.delete(key);this.days.set(held.day,this.days.get(held.day)+billed-held.amount);this.sessions.set(id,this.sessions.get(id)+billed-held.amount);
      }
    };
  }
  summary(){const day=new Date(this.now()).toISOString().slice(0,10);return {day,estimatedUsd:(this.days.get(day)??0)/1e6,dailyLimitUsd:this.dailyLimit/1e6,pendingReservations:this.reservations.size};}
}
