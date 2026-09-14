import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {allowedCheckoutStore} from '../checkout-store-policy';
test('browser accepts only an activated, same-mode, verified-store checkout capability',()=>{
 const script=readFileSync('shopify-theme/curtainsuk-dawn-16/assets/curtainsuk-storefront.js','utf8');
 const fn=script.slice(script.indexOf('  function checkoutUrlFor('),script.indexOf('  function renderHandoffConfirmation('));
 const checkout=runInNewContext(fn+';checkoutUrlFor',{URL});
 const root={dataset:{purchaseControlsEnabled:'true',productionCheckout:'true',stagingCheckoutHost:'curtainsuk-dev.myshopify.com'}};
 const result={paymentEnabled:true,testCheckoutStatus:'PRODUCTION_DRAFT_CREATED',shopifyWritePerformed:true,checkoutUrl:'https://www.curtainsuk.com/invoices/fixture'};
 assert.equal(checkout(root,result),result.checkoutUrl);
 assert.equal(checkout({...root,dataset:{...root.dataset,purchaseControlsEnabled:'false'}},result),null);
 assert.equal(checkout(root,{...result,paymentEnabled:false}),null);
 assert.equal(checkout(root,{...result,shopifyWritePerformed:false}),null);
 assert.equal(checkout(root,{...result,testCheckoutStatus:'EXISTING_PRODUCTION_DRAFT_REUSED',shopifyWritePerformed:false}),result.checkoutUrl);
 for(const url of ['https://evil.example/invoices/fixture','https://curtainsuk-dev.myshopify.com/invoices/fixture','https://www.curtainsuk.com:444/invoices/fixture','https://user@www.curtainsuk.com/invoices/fixture']) assert.equal(checkout(root,{...result,checkoutUrl:url}),null);
 assert.equal(checkout({...root,dataset:{...root.dataset,productionCheckout:'false'}},result),null);
});
test('live checkout requires explicit production approval and the exact production store',()=>{
 assert.equal(allowedCheckoutStore('carpetup.myshopify.com','CREATE_PRODUCTION_DRAFT'),false);
 assert.equal(allowedCheckoutStore('carpetup.myshopify.com','CREATE_PRODUCTION_DRAFT',true),false);
 assert.equal(allowedCheckoutStore('carpetup.myshopify.com','CREATE_PRODUCTION_DRAFT',false,true),true);
 assert.equal(allowedCheckoutStore('curtainsuk-dev.myshopify.com','CREATE_PRODUCTION_DRAFT',false,true),false);
 assert.equal(allowedCheckoutStore('other.myshopify.com','CREATE_PRODUCTION_DRAFT',false,true),false);
 assert.equal(allowedCheckoutStore('carpetup.myshopify.com','INVALID',true,true),false);
});
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
test('production indexing can be enabled while every purchase control stays disabled',()=>{
 const base='shopify-theme/curtainsuk-dawn-16/';
 const settings=JSON.parse(readFileSync(base+'config/settings_data.json','utf8')).current;
 assert.equal(settings.curtainsuk_staging_mode,false);
 assert.equal(settings.curtainsuk_purchase_controls_enabled,false);
 const header=readFileSync(base+'sections/header.liquid','utf8');
 assert.doesNotMatch(header,/settings\.curtainsuk_staging_mode/);
 assert.match(header,/settings\.curtainsuk_purchase_controls_enabled/);
 const config=readFileSync(base+'sections/curtainsuk-configurator.liquid','utf8');
 assert.match(config,/data-purchase-controls-enabled/);
 const script=readFileSync(base+'assets/curtainsuk-storefront.js','utf8');
 assert.match(script,/root\.dataset\.purchaseControlsEnabled !== "true"/);
});
