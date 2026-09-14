import test from 'node:test';
import assert from 'node:assert/strict';
import { issueCustomerSession, verifyCustomerSession, customerOriginAllowed } from '../customer-hci-session';
const secret='test-only-secret-that-is-at-least-thirty-two-characters';
test('customer session is server-signed, expiring and isolated without staff credentials',()=>{
 const a=issueCustomerSession(secret,1000),b=issueCustomerSession(secret,1000);
 assert.notEqual(a.owner,b.owner);
 assert.equal(verifyCustomerSession(a.token,secret,1001),a.owner);
 assert.equal(verifyCustomerSession(a.token+'x',secret,1001),null);
 assert.equal(verifyCustomerSession(a.token,'different-secret-that-is-at-least-thirty-two-characters',1001),null);
 assert.equal(verifyCustomerSession(a.token,secret,1000+8*86400),null);
 assert.throws(()=>issueCustomerSession('',1000));
});
test('customer mutations require the exact configured HTTPS origin',()=>{
 const origin='https://curtainsuk-staging-gateway.vercel.app';
 assert.equal(customerOriginAllowed(origin,origin),true);
 for(const other of [null,'https://evil.test','null','http://curtainsuk-staging-gateway.vercel.app']) assert.equal(customerOriginAllowed(other,origin),false);
});
