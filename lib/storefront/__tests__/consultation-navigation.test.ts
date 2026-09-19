import test from 'node:test';
import assert from 'node:assert/strict';
import { isPremiumConsultationPath, shopifyConsultationHandoff } from '../consultation-navigation';
import { fullUrl } from '../../sitemap-utils';

test('only the premium consultation omits the secondary storefront frame', () => {
  assert.equal(isPremiumConsultationPath('/curtain-consultation-premium'), true);
  assert.equal(isPremiumConsultationPath('/curtain-consultation-premium/'), true);
  for (const path of ['/', '/fabrics', '/configure', '/curtain-consultation'])
    assert.equal(isPremiumConsultationPath(path), false);
});

test('consultation exits use the Shopify origin and preserve exact fabric context', () => {
  const context = {
    sessionId: '11111111-1111-4111-8111-111111111111', profileSummary: 'Calm, textured curtains',
    fabricMasterId: 'fabric-master-123', supplierSku: '4262/770', strategyId: 'tonal', commerceToken: 'signed-token',
  };
  assert.equal(fullUrl('/'), 'https://www.curtainsuk.com/');
  assert.equal(fullUrl('/pages/fabric-library'), 'https://www.curtainsuk.com/pages/fabric-library');
  for (const sample of [true, false]) {
    const url = new URL(shopifyConsultationHandoff({ ...context, sample }));
    assert.equal(url.origin, 'https://www.curtainsuk.com');
    assert.equal(url.pathname, sample ? '/pages/fabric-library' : '/pages/curtain-visualiser');
    assert.equal(url.searchParams.get('fabric'), context.fabricMasterId);
    assert.equal(url.searchParams.get('intent'), sample ? 'sample' : null);
    const handoff = JSON.parse(decodeURIComponent(url.hash.slice('#cuk_hci='.length)));
    assert.deepEqual(handoff, context);
    assert.equal(JSON.stringify(handoff).includes('vercel.app'), false);
  }
});

test('PT and SDG complete, partial and pending exact identities survive both commerce exits',()=>{
 for(const [fabricMasterId,supplierSku] of [['pt-1223-374','1223/374'],['pt-1204-212','1204/212'],['sdg-aarc520004','AARC520004'],['sdg-ccf0865-01','CCF0865-01']]) {
  for(const sample of [true,false]) {
   const u=new URL(shopifyConsultationHandoff({sample,fabricMasterId,supplierSku,sessionId:'11111111-1111-4111-8111-111111111111',profileSummary:'',strategyId:'overall',commerceToken:'test-token'}));
   assert.equal(u.origin,'https://www.curtainsuk.com');
   assert.equal(u.searchParams.get('fabric'),fabricMasterId);
   assert.equal(u.searchParams.get('view'),sample?'browse-fabrics':null);
   const context=JSON.parse(decodeURIComponent(u.hash.slice('#cuk_hci='.length)));
   assert.equal(context.fabricMasterId,fabricMasterId);assert.equal(context.supplierSku,supplierSku);
  }
 }
});
