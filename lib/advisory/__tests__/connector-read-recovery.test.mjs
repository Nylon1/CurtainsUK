import test from 'node:test';
import assert from 'node:assert/strict';
import {connectorFailureCode} from '../connector-read-recovery.mjs';
import {runWithReadOnlyRecovery} from '../operator-recovery.mjs';
const read="begin read only;set local statement_timeout='3s';select 1;commit;";
const timeout='Failed to run sql query: ERROR:  57014: canceling statement due to statement timeout\n';
const result=message=>({isError:true,content:[{type:'text',text:JSON.stringify({error:{name:'HttpException',message}})}]});
test('only the confirmed statement timeout of a read-only request can recover',()=>{
 assert.equal(connectorFailureCode({query:read,result:result(timeout)}),'TRANSIENT_SQL_READ_TIMEOUT');
 for(const query of ['begin;select 1;commit;',"begin;insert into t values(1);commit;begin read only;select 1;commit;",read+'insert into t values(1);',"begin read only;set local statement_timeout='3s';set transaction read write;insert into t values(1);commit;",'select 1;'])assert.equal(connectorFailureCode({query,result:result(timeout)}),'CONNECTOR_ERROR');
 for(const message of ['permission denied','connection lost','57014','Failed to run sql query: ERROR:  57014: canceling statement due to user request',timeout+'try a write'])assert.equal(connectorFailureCode({query:read,result:result(message)}),'CONNECTOR_ERROR');
 for(const r of [{isError:false}, {isError:true,content:[]},{isError:true,content:[{type:'text',text:'malformed'}]}])assert.equal(connectorFailureCode({query:read,result:r}),'CONNECTOR_ERROR');
});
test('read timeout reconciles first, waits and re-enters all admission gates',async()=>{
 let time=0,calls=0;const order=[];
 const actual=await runWithReadOnlyRecovery({deadline:100000,now:()=>time,run:async()=>{order.push('fresh admission');if(++calls===1)throw Error(connectorFailureCode({query:read,result:result(timeout)}));return 'fresh success';},reconcile:async()=>{order.push('exact readback');},wait:async ms=>{assert.ok(ms<=15000);time+=ms;order.push('read-only wait');}});
 assert.equal(actual,'fresh success');assert.deepEqual(order,['fresh admission','exact readback','read-only wait','fresh admission']);assert.equal(time,15000);
});
test('ambiguous reconciliation and failed writes never enter a retry loop',async()=>{
 for(const initial of ['TRANSIENT_SQL_READ_TIMEOUT','CONNECTOR_ERROR']){let calls=0;await assert.rejects(runWithReadOnlyRecovery({deadline:100000,now:()=>0,run:async()=>{calls++;throw Error(initial);},reconcile:async()=>{throw Error('PENDING_WRITE_REQUIRES_REVIEW');},wait:async()=>{throw Error('MUST_NOT_WAIT');}}),initial==='CONNECTOR_ERROR'?/CONNECTOR_ERROR/:/PENDING_WRITE_REQUIRES_REVIEW/);assert.equal(calls,1);}
});
