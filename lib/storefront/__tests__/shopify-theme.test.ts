import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const themeRoot = join(process.cwd(), "shopify-theme", "curtainsuk-dawn-16");
const read = (...parts: string[]) => readFileSync(join(themeRoot, ...parts), "utf8");

test("Dawn contains the 14 unique Window Type route definitions", () => {
  const manifest = JSON.parse(read("assets", "curtainsuk-routes.json")) as { routes: string[]; publishState: string };
  assert.equal(manifest.routes.length, 14);
  assert.equal(new Set(manifest.routes).size, 14);
  assert.ok(manifest.routes.includes("/pages/curtains-for-bay-window"));
  assert.ok(manifest.routes.includes("/pages/curtains-for-apex-window"));
  assert.equal(manifest.publishState, "UNPUBLISHED_STAGING_ONLY");
});

test("Dawn delegates all decisions to controlled endpoints and has no configurator checkout path", () => {
  const script = read("assets", "curtainsuk-storefront.js");
  const section = read("sections", "curtainsuk-configurator.liquid");
  assert.match(script, /endpoint\(root\.dataset\.engineBase, "catalog"\)/);
  assert.match(script, /path = "specialist-review"/);
  assert.match(section, /settings\.curtainsuk_staging_api_base/);
  assert.equal(/cart\/add|checkout\.js|supplierCost|grossMargin|makeupCost/i.test(script + section), false);
  assert.match(section, /This flow cannot add to cart, take payment or release a job to manufacture/);
});

test("the specialist workflow requires a photo and never renders a payment control", () => {
  const script = read("assets", "curtainsuk-storefront.js");
  const section = read("sections", "curtainsuk-configurator.liquid");
  assert.match(script, /photos\.required = isSpecialist/);
  assert.match(section, /Specialist jobs cannot bypass technical review/);
  assert.equal(/<(?:button|a)[^>]*>\s*(?:Add to cart|Buy now|Proceed to checkout)/i.test(section), false);
});

test("the Dawn header uses the task navigation instead of the production main menu", () => {
  const group = JSON.parse(read("sections", "header-group.json")) as { sections: Record<string, { type: string; settings: Record<string, unknown> }>; order: string[] };
  assert.equal(group.sections.header.settings.menu, "");
  assert.equal(group.sections["curtainsuk-task-nav"].type, "curtainsuk-task-nav");
  assert.ok(group.order.includes("curtainsuk-task-nav"));
});

test("Dawn renders database-projected multi-supplier imagery and preserves exact sample SKU without commercial fields", () => {
  const script = read("assets", "curtainsuk-storefront.js");
  const section = read("sections", "curtainsuk-fabric-browser.liquid");
  assert.match(script, /sku: fabric\.uniqueSku/);
  assert.match(script, /fabric\.imageReferences\?\.\[0\]/);
  assert.match(script, /fabric\.availability/);
  assert.match(section, /Real supplier fabric master/);
  assert.equal(/data-catalog-fallback/.test(section), false);
  assert.equal(/synthetic staging fixture/i.test(script + section), false);
  assert.equal(/supplierCost|tradePrice|stockMetres|batchReference/i.test(script + section), false);
});

test("Dawn staging mode hides commerce controls and fixes the preview market label without changing Shopify Markets", () => {
  const settings = JSON.parse(read("config", "settings_data.json")) as { current: Record<string, unknown> };
  const header = read("sections", "header.liquid");
  assert.equal(settings.current.curtainsuk_staging_mode, true);
  assert.equal(settings.current.curtainsuk_staging_market_label, "United Kingdom | GBP");
  assert.match(header, /unless settings\.curtainsuk_staging_mode/);
  assert.match(header, /settings\.curtainsuk_staging_mode == false/);
});
