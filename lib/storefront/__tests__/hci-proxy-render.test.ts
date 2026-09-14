import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {customerProxyHtml,customerProxyScript} from '../hci-proxy-render';
import {issueCustomerSession,verifyCustomerSession} from '../customer-hci-session';
test('same-origin presentation retains HCI decisions but removes staging destinations and copy',()=>{
  const html=customerProxyHtml(readFileSync('lib/storefront/hci/consultation.html','utf8'));
  const script=customerProxyScript(readFileSync('lib/storefront/hci/consultation.js','utf8'));
  assert.doesNotMatch(html,/staging|preview|vercel\.app|localhost|127\.0\.0\.1/i);
  assert.doesNotMatch(script,/\/api\/admin|preview_theme_id|vercel\.app|localhost/);
  assert.match(script,/proxyFetch\("\/apps\/curtainsuk-decision\/hci-command"/);
  assert.match(script,/\/catalog\?view=retail&fabric=/);
  assert.match(script,/\/consultation-asset\?name=/);
  assert.match(script,/type: "refine"/);
});
test('proxy visitor capabilities are distinct, expiring and reject modification',()=>{
  const secret='test-customer-session-secret-32-characters';
  const a=issueCustomerSession(secret,1000),b=issueCustomerSession(secret,1000);
  assert.notEqual(a.owner,b.owner);
  assert.equal(verifyCustomerSession(a.token,secret,1001),a.owner);
  assert.equal(verifyCustomerSession(a.token+'x',secret,1001),null);
  assert.equal(verifyCustomerSession(a.token,secret,1000+7*86400),null);
});
