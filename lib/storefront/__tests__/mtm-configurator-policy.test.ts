import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { join } from "node:path";

const root = process.cwd();
const storefront = readFileSync(join(root, "shopify-theme/curtainsuk-new-design-live-base/assets/curtainsuk-storefront.js"), "utf8");
const configurator = readFileSync(join(root, "shopify-theme/curtainsuk-new-design-live-base/sections/curtainsuk-configurator.liquid"), "utf8");
const cartItems = readFileSync(join(root, "shopify-theme/curtainsuk-new-design-live-base/sections/main-cart-items.liquid"), "utf8");
const cartDrawer = readFileSync(join(root, "shopify-theme/curtainsuk-new-design-live-base/snippets/cart-drawer.liquid"), "utf8");
const cartNotification = readFileSync(join(root, "shopify-theme/curtainsuk-new-design-live-base/snippets/cart-notification.liquid"), "utf8");

test("Make Curtains exposes only the approved automated opening and hardware-heading choices", () => {
  assert.match(storefront, /const AUTOMATED_MTM_WINDOWS = new Set\(\[\s*"standard-window", "patio-sliding-doors", "french-doors", "bifold-doors", "bay-window"/);
  assert.match(storefront, /windowType\?\.slug === "bay-window"\) return \["PENCIL_PLEAT", "DOUBLE_PINCH"\]/);
  assert.match(storefront, /POLE_USABLE_WIDTH"\s*\? \["PENCIL_PLEAT", "DOUBLE_PINCH", "EYELET"\]\s*: \["PENCIL_PLEAT", "DOUBLE_PINCH", "WAVE"\]/);
  assert.match(storefront, /catalog\.windows\.filter\(\(item\) => AUTOMATED_MTM_WINDOWS\.has\(item\.slug\)\)/);
});

test("Make Curtains directs raw hardware measurement to Guided Measure and shows the approved change-request wording", () => {
  assert.match(configurator, /Measure the fitted hardware, not the finished curtain/);
  assert.match(configurator, /href="\/pages\/how-to-measure">How to measure/);
  assert.match(configurator, /Need to request a change\? Email us within 2 hours of placing your order at enquiries@curtainsuk\.com\. We’ll review your request and get in touch\./);
});

test("MTM cart lines are immutable and route continued shopping to Browse Fabrics", () => {
  for (const source of [cartItems, cartDrawer]) {
    assert.match(source, /item\.properties\['_curtainsuk_mtm_locked'\] == 'true'/);
    assert.match(source, /This configuration is fixed\. To change it, remove it and configure your curtains again\./);
    assert.match(source, /Remove curtain/);
    assert.match(source, /cart-item--curtainsuk-mtm/);
  }
  for (const source of [cartItems, cartDrawer, cartNotification]) {
    assert.match(source, /\/pages\/fabric-library\?view=browse-fabrics/);
    assert.match(source, /Browse Fabrics/);
  }
  assert.match(configurator, /cannot be edited in cart or checkout; to change it, remove it and configure your curtains again/i);
});
