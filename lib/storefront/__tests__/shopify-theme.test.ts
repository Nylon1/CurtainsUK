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
  assert.match(script, /photos\.required = requiresPhoto/);
  assert.match(script, /This project must be reviewed before payment or manufacture/);
  assert.equal(/<(?:button|a)[^>]*>\s*(?:Add to cart|Buy now|Proceed to checkout)/i.test(section), false);
});

test("manual quote results suppress numeric prices and expose review submission without checkout", () => {
  const script = read("assets", "curtainsuk-storefront.js");
  const section = read("sections", "curtainsuk-configurator.liquid");
  assert.match(script, /response\.outcome === "MANUAL_QUOTE"/);
  assert.match(script, /isManualQuote\s*\?\s*"Price confirmed after technical review"/);
  assert.match(script, /endpoint\(root\.dataset\.engineBase, root\.dataset\.reviewPath \|\| "review-request"\)/);
  assert.match(script, /payload\.set\("configuration", JSON\.stringify\(lastEvaluation\.configuration\)\)/);
  assert.match(script, /payload\.append\("photos", file\)/);
  assert.match(section, /Submit project for review/);
  assert.match(section, /name="customerEmail"[^>]*required/);
  assert.equal(/cart\/add|checkout\.js/i.test(script + section), false);
});

test("Bay UI derives coverage from section widths and never asks for angles", () => {
  const script = read("assets", "curtainsuk-storefront.js");
  const section = read("sections", "curtainsuk-configurator.liquid");
  const guide = read("sections", "curtainsuk-measure-guide.liquid");
  assert.match(section, /name="trackOrPoleFitted"/);
  assert.match(section, /name="baySectionCount"[^>]*min="2"[^>]*max="8"/);
  assert.match(section, /data-cuk-bay-sections/);
  assert.match(script, /bayTrackOrPoleFitted/);
  assert.match(script, /bayNumberOfSections/);
  assert.match(script, /segments\.reduce\(\(total, width\) => total \+ width, 0\)/);
  assert.equal(/bayAngles|BayAngles|angles between segments/i.test(script + section + guide), false);
});

test("Curved, corner and awkward advertised routes collect their required review measurements", () => {
  const script = read("assets", "curtainsuk-storefront.js");
  const section = read("sections", "curtainsuk-configurator.liquid");
  assert.match(script, /selected\.slug === "curved-bow-window"/);
  assert.match(script, /isCurved \? "Track arc length \(cm\)"/);
  assert.match(section, /data-cuk-width-hint>Measure along the complete curved track/);
  assert.match(section, /name="cornerSectionOneCm"[^>]*min="10"[^>]*max="600"/);
  assert.match(section, /name="cornerSectionTwoCm"[^>]*min="10"[^>]*max="600"/);
  assert.match(section, /name="cornerAngleDegrees"[^>]*min="1"[^>]*max="359"/);
  assert.match(script, /cornerSectionWidthsCm: isCorner \? cornerSections : undefined/);
  assert.match(script, /cornerAngleDegrees: isCorner \? cornerAngle : undefined/);
  assert.match(section, /data-cuk-awkward/);
  assert.match(section, /name="roughWidthCm"/);
  assert.match(section, /name="roughDropCm"/);
  assert.match(script, /drawing\.required = isAwkward/);
  assert.equal(/Map every edge[\s\S]{0,500}data-cuk-awkward/.test(section), false, "awkward route must not inherit apex-specific measurement copy");
});

test("standard windows hide review evidence while reviewed and specialist routes can submit evidence", () => {
  const script = read("assets", "curtainsuk-storefront.js");
  const section = read("sections", "curtainsuk-configurator.liquid");
  assert.match(section, /class="cuk-step cuk-hidden" data-cuk-review-evidence/);
  assert.match(script, /const needsEvidence = isReview \|\| isSpecialist/);
  assert.match(script, /photos\.required = requiresPhoto/);
  assert.match(script, /construction: form\.elements\.construction\.value/);
  assert.match(section, /data-cuk-specialist-evidence/);
});

test("task navigation uses resolvable theme-owned inspiration, help and sample anchors", () => {
  const nav = read("sections", "curtainsuk-task-nav.liquid");
  const support = read("sections", "curtainsuk-inspiration-help.liquid");
  const index = read("templates", "index.json");
  const fabricTemplate = read("templates", "page.shop-by-fabric.json");
  assert.match(nav, /href="\/#curtainsuk-inspiration"/);
  assert.match(nav, /href="\/#curtainsuk-help"/);
  assert.match(nav, /href="\/pages\/fabric-library#samples"/);
  assert.equal(/\/blogs\/inspiration|\/pages\/contact/.test(nav), false);
  assert.match(support, /id="curtainsuk-inspiration"/);
  assert.match(support, /id="curtainsuk-help"/);
  assert.match(index, /"type": "curtainsuk-inspiration-help"/);
  assert.match(fabricTemplate, /"type": "curtainsuk-sample-basket"/);
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
  assert.match(script, /fabric\.configurable === true/);
  assert.match(script, /Price and availability to be confirmed/);
  assert.match(script, /Usable width to be confirmed/);
  assert.match(script, /addEventListener\("error"/);
  assert.match(section, /data-cuk-fabric-filters/);
  assert.match(script, /fabric\.brand \|\| fabric\.supplier/);
  assert.match(script, /fabric\.configurable === true : fabric\.configurable !== true/);
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

test("all inherited Dawn commerce controls are disabled in the unpublished staging theme", () => {
  const buyButtons = read("snippets", "buy-buttons.liquid");
  const cards = read("snippets", "card-product.liquid");
  const cartFooter = read("sections", "main-cart-footer.liquid");
  const cartDrawer = read("snippets", "cart-drawer.liquid");
  const cartNotification = read("snippets", "cart-notification.liquid");
  assert.match(buyButtons, /assign show_dynamic_checkout = false/);
  assert.equal(/assign show_dynamic_checkout = true/.test(buyButtons), false);
  assert.match(buyButtons, /name="add"[\s\S]{0,300}disabled/);
  assert.match(cards, /assign quick_add = false/);
  for (const source of [cartFooter, cartDrawer, cartNotification]) {
    assert.match(source, /name="checkout"[^>]*disabled|disabled[^>]*name="checkout"/);
  }
  assert.match(cartFooter, /if false and additional_checkout_buttons/);
});

test("results always show VAT, availability and delivery while standard results avoid specialist warnings", () => {
  const script = read("assets", "curtainsuk-storefront.js");
  const section = read("sections", "curtainsuk-configurator.liquid");
  assert.match(script, /"VAT included\."/);
  assert.match(script, /response\.availability \|\| "Availability to be confirmed"/);
  assert.match(script, /response\.delivery \|\| "Delivery shown separately\."/);
  assert.match(script, /Staging price only\. Checkout remains disabled until the launch gate is approved/);
  assert.match(section, /data-cuk-result-notice>Staging only\. Checkout remains disabled/);
});

test("mobile controls meet the 44px staging target and avoid iOS input zoom", () => {
  const css = read("assets", "curtainsuk-storefront.css");
  assert.match(css, /\.cuk-fabric__actions \.cuk-button \{ min-height: 4\.4rem/);
  assert.match(css, /\.cuk-field input, \.cuk-field select, \.cuk-field textarea \{ font-size: 1\.6rem; \}/);
});
