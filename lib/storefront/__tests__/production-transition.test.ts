import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {allowedCheckoutStore} from '../checkout-store-policy';
test('production checkout stays non-payable unless its own payment safety is confirmed',()=>{
 assert.equal(allowedCheckoutStore('carpetup.myshopify.com','CALCULATE_ONLY'),true);
 assert.equal(allowedCheckoutStore('carpetup.myshopify.com','CREATE_TEST_DRAFT'),false);
 assert.equal(allowedCheckoutStore('carpetup.myshopify.com','CREATE_TEST_DRAFT',true),true);
 assert.equal(allowedCheckoutStore('other.myshopify.com','CREATE_TEST_DRAFT',true),false);
 assert.equal(allowedCheckoutStore('curtainsuk-dev.myshopify.com','CREATE_TEST_DRAFT'),true);
});
test('production theme canonical and preview exclusion are explicit',()=>{
 const html=readFileSync('shopify-theme/curtainsuk-dawn-16/layout/theme.liquid','utf8');
 assert.match(html,/theme.role != 'main'/);
 assert.match(html,/https:\/\/www.curtainsuk.com/);
});
