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

test("Dawn delegates decisions to the signed app proxy and exposes only a development-store test handoff with real payment disabled", () => {
  const script = read("assets", "curtainsuk-storefront.js");
  const section = read("sections", "curtainsuk-configurator.liquid");
  const settings = JSON.parse(read("config", "settings_data.json")) as { current: Record<string, unknown> };
  assert.match(script, /endpoint\(root\.dataset\.engineBase, "catalog"\)/);
  assert.match(script, /path = "specialist-review"/);
  assert.match(script, /endpoint\(root\.dataset\.engineBase, "checkout-handoff"\)/);
  assert.match(section, /settings\.curtainsuk_staging_api_base/);
  assert.equal(settings.current.curtainsuk_staging_api_base, "/apps/curtainsuk-decision");
  assert.equal(/cart\/add|checkout\.js|supplierCost|grossMargin|makeupCost/i.test(script + section), false);
  assert.match(section, /This flow cannot take real payment or release a job to manufacture/);
  assert.match(section, /Real payment and manufacture remain disabled/);
  assert.match(section, /data-staging-checkout-host/);
  assert.match(script, /checkoutUrl\.hostname\.toLowerCase\(\) !== allowedHost/);
  assert.match(script, /Continue to Shopify test checkout/);
});

test("the specialist workflow has no upload requirement and never renders a payment control", () => {
  const script = read("assets", "curtainsuk-storefront.js");
  const section = read("sections", "curtainsuk-configurator.liquid");
  assert.doesNotMatch(section, /type="file"/);
  assert.match(script, /This project must be reviewed before payment or manufacture/);
  assert.equal(/<(?:button|a)[^>]*>\s*(?:Add to cart|Buy now|Proceed to checkout)/i.test(section), false);
});

test("manual quote results suppress numeric prices and expose review submission without checkout", () => {
  const script = read("assets", "curtainsuk-storefront.js");
  const section = read("sections", "curtainsuk-configurator.liquid");
  assert.match(script, /response\.outcome === "MANUAL_QUOTE"/);
  assert.match(script, /isManualQuote\s*\?\s*response.commercialState === "PRICE_CONFIRMATION_REQUIRED" \? "Price confirmation required" : "Price confirmed after technical review"/);
  assert.match(script, /routeStatus\.textContent = isManualQuote \? "Manual quote"/);
  assert.match(script, /endpoint\(root\.dataset\.engineBase, root\.dataset\.reviewPath \|\| "review-request"\)/);
  assert.match(script, /payload\.set\("configuration", JSON\.stringify\(lastEvaluation\.configuration\)\)/);
  assert.doesNotMatch(script, /payload\.append\("photos", file\)/);
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
  assert.doesNotMatch(script, /drawing\.required/);
  assert.equal(/Map every edge[\s\S]{0,500}data-cuk-awkward/.test(section), false, "awkward route must not inherit apex-specific measurement copy");
});

test("review routes explain email evidence without file inputs", () => {
  const script = read("assets", "curtainsuk-storefront.js");
  const section = read("sections", "curtainsuk-configurator.liquid");
  assert.match(section, /class="cuk-step cuk-hidden" data-cuk-review-evidence/);
  assert.match(script, /const needsEvidence = isReview \|\| isSpecialist/);
  assert.doesNotMatch(section, /type="file"/);
  assert.match(script, /construction: form\.elements\.construction\.value/);
  assert.match(section, /unique reference/);
  assert.match(script, /mailto:/);
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

test("Dawn uses paginated retail imagery and retains canonical sample identity without commercial fields", () => {
  const script = read("assets", "curtainsuk-storefront.js");
  const section = read("sections", "curtainsuk-fabric-browser.liquid");
  assert.match(script, /fabricId: fabric\.id, supplier: fabric\.supplier, brand: fabric\.brand/);
  assert.match(script, /fabric\.imageReferences\?\.\[0\]/);
  assert.match(script, /fabric\.availability/);
  assert.match(script, /fabric\.browseReady \?/);
  assert.match(script, /price and availability must be confirmed/);
  assert.match(script, /Usable width to be confirmed/);
  assert.match(script, /addEventListener\("error"/);
  assert.match(section, /data-cuk-fabric-filters/);
  assert.match(script, /fabric\.brand \|\| fabric\.supplier/);
  assert.match(script, /url\.searchParams\.set\("view", "retail"\)/);
  assert.match(script, /data-cuk-next/);
  assert.match(section, /Find your fabric/);
  assert.equal(/data-catalog-fallback/.test(section), false);
  assert.equal(/synthetic staging fixture/i.test(script + section), false);
  assert.equal(/supplierCost|tradePrice|stockMetres|batchReference/i.test(script + section), false);
});

test("an unverified fabric deep link is explained instead of silently substituted", () => {
  const script = read("assets", "curtainsuk-storefront.js");
  assert.match(script, /Your selected fabric is saved/);
  assert.match(script, /fabricSelect\.value = requestedFabric/);
  assert.match(script, /fabricSelect\.value !== requestedFabric/);
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
  assert.match(script, /response\.delivery.*"Delivery shown separately"/);
  assert.match(script, /Shopify test checkout is available only when every launch gate passes; real payment remains disabled/);
  assert.match(section, /data-cuk-result-notice>Staging only\. Shopify test checkout remains gated; real payment is disabled/);
  for (const field of ["window", "dimensions", "fabric", "heading", "lining", "construction", "availability", "price", "delivery", "review"]) {
    assert.match(section, new RegExp(`data-cuk-summary-${field}`));
  }
});

test("reviewed configurations resume through a fragment capability and revalidate the exact revision server-side", () => {
  const script = read("assets", "curtainsuk-storefront.js");
  const section = read("sections", "curtainsuk-configurator.liquid");
  assert.match(script, /sessionStorage\.setItem\(REVIEW_RESUME_KEY/);
  assert.match(script, /cleanUrl\.hash = ""/);
  assert.match(script, /endpoint\(root\.dataset\.engineBase, "review-acceptance"\)/);
  assert.match(script, /reviewAcceptanceToken: resume\.capability\.reviewAcceptanceToken/);
  assert.match(script, /summary\.reviewState !== "READY_FOR_CHECKOUT"/);
  assert.doesNotMatch(script, /localStorage\.setItem\(REVIEW_RESUME_KEY/);
  assert.match(section, /data-cuk-reviewed-resume/);
  assert.match(section, /I accept this exact staff-reviewed specification and VAT-inclusive price/);
  assert.match(section, /No real payment can be taken/);
});

test("Dawn emits the launch funnel without supplier-commercial analytics fields", () => {
  const script = read("assets", "curtainsuk-storefront.js");
  for (const event of [
    "configurator_started", "window_type_selected", "measurement_completion", "fabric_selected",
    "sample_intent", "price_displayed", "review_submitted", "quote_accepted", "checkout_handoff_reached",
  ]) assert.match(script, new RegExp(`emit\\(\"${event}\"`));
  assert.equal(/supplier_cost|trade_price|gross_margin|batch_reference|stock_metres/i.test(script), false);
});

test("mobile controls meet the 44px staging target and avoid iOS input zoom", () => {
  const css = read("assets", "curtainsuk-storefront.css");
  assert.match(css, /\.cuk-fabric__actions \.cuk-button \{ min-height: 4\.4rem/);
  assert.match(css, /\.cuk-field input, \.cuk-field select, \.cuk-field textarea \{ font-size: 1\.6rem; \}/);
});

test("persistent task, logo and footer navigation meet the 44px staging target", () => {
  const css = read("assets", "curtainsuk-storefront.css");
  assert.match(css, /\.cuk-task-nav__list a \{[^}]*min-width: 4\.4rem;[^}]*min-height: 4\.4rem;/);
  assert.match(css, /\.header__heading-link \{[^}]*min-height: 4\.4rem;/);
  assert.match(css, /\.footer \.policies li a,[\s\S]{0,180}min-height: 4\.4rem;/);
});
