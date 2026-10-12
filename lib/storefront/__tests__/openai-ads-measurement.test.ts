import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (...parts: string[]) => readFileSync(join(root, ...parts), "utf8");

test("website analytics always receives CurtainsUK funnel events", () => {
  const analytics = read("lib", "storefront", "analytics.ts");
  assert.match(analytics, /window\.dataLayer = window\.dataLayer \|\| \[\]/);
  assert.match(analytics, /window\.dataLayer\.push\(payload\)/);
  assert.match(analytics, /"checkout_intent"/);
});

test("OpenAI Pixel uses standard events only after the matching customer action", () => {
  const theme = read("shopify-theme", "curtainsuk-dawn-16", "layout", "theme.liquid");

  assert.match(theme, /eventName === "review_submitted"[\s\S]*sendLeadCreated\(detail\)/);
  assert.match(theme, /eventName === "sample_ordered_intended"[\s\S]*sendItemsAdded\(detail\)/);
  assert.match(theme, /detail\.cart_add_confirmed !== true/);
  assert.match(theme, /window\.oaiq\("measure", "items_added"/);

  const handoff = theme.indexOf('eventName === "checkout_handoff_reached"');
  const opened = theme.indexOf('eventName === "checkout_opened"');
  assert.ok(handoff > 0 && opened > handoff);
  assert.match(theme.slice(handoff, opened), /sendCustomEvent\([\s\S]*"checkout_handoff_reached"/);
  assert.doesNotMatch(theme.slice(handoff, opened), /sendCheckoutStarted/);
  assert.match(theme.slice(opened, opened + 220), /sendCheckoutStarted\(detail\)/);

  assert.match(theme, /eventName === "sample_intent"[\s\S]*sendCustomEvent\("sample_intent"/);
  assert.match(theme, /eventName === "quote_accepted"[\s\S]*sendCustomEvent\("quote_accepted"/);
});

test("sample events distinguish intent, confirmed cart addition and checkout", () => {
  const sample = read("shopify-theme", "curtainsuk-dawn-16", "assets", "curtainsuk-sample-checkout.js");
  const addRequest = sample.indexOf("fetch('/cart/add.js'");
  const confirmedEvent = sample.indexOf("emitAnalytics('sample_ordered_intended'");
  assert.ok(addRequest > 0 && confirmedEvent > addRequest);
  assert.match(sample.slice(addRequest, confirmedEvent + 600), /cart_add_confirmed: true/);
  const checkoutEvent = sample.indexOf("emitAnalytics('checkout_started'");
  const redirect = sample.indexOf("location.assign('/checkout')", checkoutEvent);
  assert.ok(checkoutEvent > confirmedEvent && redirect > checkoutEvent);
  assert.match(sample.slice(checkoutEvent, redirect), /order_kind: 'sample'/);
});

test("blocked staging CTA is diagnostic intent, not checkout_started", () => {
  const configurator = read("components", "configurator", "CurtainConfigurator.tsx");
  assert.match(configurator, /trackStorefrontEvent\("checkout_intent"[\s\S]{0,220}staging_blocked: true/);
  assert.doesNotMatch(configurator, /trackStorefrontEvent\("checkout_started"[\s\S]{0,220}staging_blocked: true/);
});

test("curtain purchase CAPI is server-only, stable and fail-open at the paid-order webhook", () => {
  const capi = read("lib", "storefront", "openai-ads-conversions.ts");
  const webhook = read("app", "api", "webhooks", "shopify", "orders-paid", "route.ts");

  assert.match(capi, /https:\/\/bzr\.openai\.com\/v1\/events/);
  assert.match(capi, /type: "order_created"/);
  assert.match(capi, /id: `shopify_order_\$\{input\.shopifyOrderId\}`/);
  assert.match(capi, /OPENAI_ADS_CONVERSIONS_API_KEY/);
  assert.match(capi, /integration_source: INTEGRATION_SOURCE/);
  assert.match(capi, /validate_only: options\.validateOnly === true/);
  assert.match(capi, /emails_sha256/);
  assert.match(capi, /oppref/);
  assert.match(capi, /obref/);

  const record = webhook.indexOf("await recordVerifiedMtmPaidOrder");
  const send = webhook.indexOf("await sendOpenAiOrderCreated", record);
  const response = webhook.indexOf("return new NextResponse(null, { status: 200 })", send);
  assert.ok(record > 0 && send > record && response > send);
  assert.match(webhook.slice(send, response), /catch \(conversionError\)/);
});
