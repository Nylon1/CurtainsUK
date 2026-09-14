import test from "node:test";
import assert from "node:assert/strict";
import {signHciCommerceContext,verifyHciCommerceContext} from "../hci-commerce-context";
import {integrationCommand} from "../hci-integration-contract";
import {acceptedHciFeedback} from "../hci-feedback";
const secret="staging-test-signing-secret-32-characters";
const context={sessionId:"d8052224-4554-428c-9873-c94fefc665d4",fabricMasterId:"pt-4262-770",strategyId:"overall",policyVersion:"41a9f3f",recommendationVersion:"sha256:fixed-test"};
test("exact recommendation identity survives signed commerce handoff; tampering, substitution and expiry fail",()=>{
  const token=signHciCommerceContext(context,secret,1000);
  assert.deepEqual(verifyHciCommerceContext(token,context.fabricMasterId,secret,2000),context);
  assert.throws(()=>verifyHciCommerceContext(token,"another-fabric",secret,2000));
  assert.throws(()=>verifyHciCommerceContext(token+"a",context.fabricMasterId,secret,2000));
  assert.throws(()=>verifyHciCommerceContext(token,context.fabricMasterId,secret,8*86400000));
});
test("browser outcomes cannot claim a purchase or an ordered sample",()=>{
  for(const event of ["PURCHASE_COMPLETED","SAMPLE_ORDERED"]){
    assert.throws(()=>integrationCommand({requestId:context.sessionId,sessionId:context.sessionId,revision:1,action:{type:"outcome",event,fabricMasterId:context.fabricMasterId,strategyId:context.strategyId}}));
  }
});
test("refinement feedback resolves HCI reaction IDs to exact Fabric Master IDs without changing the input",()=>{
  const action={type:"refine",feedback:[{strategyId:"overall",fabricId:"canonical-reaction",strategyReaction:"LOVE",fabricReaction:"LIKE"}]};
  const original=JSON.stringify(action);
  const events=acceptedHciFeedback({...context,timestamp:"2026-09-14T00:00:00Z",action,directions:[{id:"overall",cards:[{fabricMasterId:context.fabricMasterId,reactionId:"canonical-reaction"}]}]});
  assert.equal(events.length,2);
  assert.ok(events.every(e=>e.fabricMasterId===context.fabricMasterId && e.policyVersion==="41a9f3f"));
  assert.equal(JSON.stringify(action),original);
  assert.throws(()=>acceptedHciFeedback({...context,timestamp:"2026-09-14T00:00:00Z",action,directions:[]}),/IDENTITY_INVALID/);
});
