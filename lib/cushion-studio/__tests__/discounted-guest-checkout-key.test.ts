import assert from 'node:assert/strict';
import test from 'node:test';
import {createHostedCheckoutServices} from '../hosted-server';
import type {ShopifyDraftOrderExecutionContract} from '../../storefront/shopify-draft-order-core';

test('discounted guest checkout uses its persisted key for the draft receipt', async t => {
  const settings = {
    SUPABASE_URL: 'https://synthetic.invalid',
    SUPABASE_SECRET_KEY: 'synthetic-test-secret',
    CURTAINSUK_SHOPIFY_DRAFT_ORDER_MODE: 'CREATE_PRODUCTION_DRAFT',
    CURTAINSUK_DEPLOYMENT_STAGE: 'PRODUCTION',
    CURTAINSUK_SHOPIFY_CHECKOUT_STORE: 'carpetup.myshopify.com',
    CURTAINSUK_SHOPIFY_CLIENT_ID: 'synthetic-client-id',
    CURTAINSUK_SHOPIFY_APP_SECRET: 'synthetic-app-secret-long-enough',
    CURTAINSUK_SHOPIFY_PRODUCTION_TEST_MODE_VERIFIED: 'true',
    CURTAINSUK_PRODUCTION_PURCHASES_APPROVED: 'true',
    CUSHION_STUDIO_HOSTED_ENABLED: 'true',
    CUSHION_STUDIO_PURCHASES_ENABLED: 'true',
    CUSHION_STUDIO_WEBHOOK_ENABLED: 'true',
    CUSHION_STUDIO_COMMERCIAL_APPROVAL_REFERENCE: 'synthetic-approval',
  };
  const previous = Object.fromEntries(Object.keys(settings).map(name => [name, process.env[name]]));
  Object.assign(process.env, settings);
  t.after(() => {
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });

  const receiptKeys: string[] = [];
  t.mock.method(globalThis, 'fetch', async (input: Parameters<typeof fetch>[0]) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    assert.equal(url.hostname, 'synthetic.invalid');
    if (url.pathname.endsWith('/commit_cushion_checkout')) return new Response(null, {status: 204});
    if (url.pathname.endsWith('/my_home_draft_receipts')) {
      receiptKeys.push(url.searchParams.get('idempotency_key') ?? '');
      return Response.json({message: 'synthetic receipt stop'}, {status: 400});
    }
    throw new Error(`Unexpected request: ${url.pathname}`);
  });

  const context = {shop: 'carpetup.myshopify.com', pathPrefix: '/apps/curtainsuk-decision', loggedInCustomerId: null, timestamp: 123456};
  const attemptKey = '4d28b294-026e-4b44-a6f4-85493b56dd34';
  const persistedKey = 'welcome-synthetic-review-key';
  const checkout = createHostedCheckoutServices(context, attemptKey, {myHomeCheckout: true});
  await checkout.persist({key: persistedKey, snapshots: [], contract: {} as ShopifyDraftOrderExecutionContract});
  await assert.rejects(checkout.execute({idempotencyTag: 'synthetic-tag'} as ShopifyDraftOrderExecutionContract), /MY_HOME_DRAFT_RECEIPT_UNAVAILABLE/);
  assert.deepEqual(receiptKeys, [`eq.${persistedKey}`]);
});
