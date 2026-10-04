import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const themeRoot = join(process.cwd(), "shopify-theme", "curtainsuk-dawn-16");
const read = (...parts: string[]) => readFileSync(join(themeRoot, ...parts), "utf8");
const readThemeJson = (...parts: string[]) => JSON.parse(read(...parts).replace(/^\s*\/\*[\s\S]*?\*\/\s*/, ""));

test("Dawn contains the 14 unique Window Type route definitions", () => {
  const manifest = JSON.parse(read("assets", "curtainsuk-routes.json")) as { routes: string[]; publishState: string };
  assert.equal(manifest.routes.length, 14);
  assert.equal(new Set(manifest.routes).size, 14);
  assert.ok(manifest.routes.includes("/pages/curtains-for-bay-window"));
  assert.ok(manifest.routes.includes("/pages/curtains-for-apex-window"));
  assert.equal(manifest.publishState, "UNPUBLISHED_STAGING_ONLY");
});

test("Dawn delegates decisions to the signed app proxy and retains isolated test-checkout support", () => {
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
  assert.match(script, /!allowedHosts\.includes\(checkoutUrl\.hostname\.toLowerCase\(\)\)/);
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

test("Bay uses one fitted-track route width and drop without angles or segment controls", () => {
  const script = read("assets", "curtainsuk-storefront.js");
  const section = read("sections", "curtainsuk-configurator.liquid");
  assert.match(section, /name="widthCm"[^>]*required/);
  assert.match(section, /name="dropCm"[^>]*required/);
  assert.match(section, /For a bay, select fitted track and measure its full route/);
  assert.match(script, /if \(isBay && form\?\.elements\.measurementBasis\) form\.elements\.measurementBasis\.value = "TRACK_WIDTH"/);
  assert.match(script, /measurementBasis: isBay \? "TRACK_WIDTH" : form\.elements\.measurementBasis\.value/);
  assert.match(script, /widthCm: Number\(form\.elements\.widthCm\.value\)/);
  assert.match(script, /dropCm: Number\(form\.elements\.dropCm\.value\)/);
  assert.match(script, /\[data-cuk-bay\] input[^\n]*field\.disabled = true/);
  assert.doesNotMatch(section, /name="baySectionCount"|data-cuk-bay-sections/);
  assert.doesNotMatch(script, /bayNumberOfSections: isBay|bayAngles|BayAngles/);
});

test("Only supported automated windows are actionable and unsupported routes cannot price", () => {
  const script = read("assets", "curtainsuk-storefront.js");
  const allowlist = script.match(/const AUTOMATED_MTM_WINDOWS = new Set\(\[([\s\S]*?)\]\);/)?.[1];
  assert.ok(allowlist, "the actionable window set must be explicit");
  assert.deepEqual([...allowlist.matchAll(/"([^"]+)"/g)].map((match) => match[1]).sort(), [
    "standard-window", "bay-window", "french-doors", "patio-sliding-doors", "bifold-doors",
  ].sort());
  assert.match(script, /catalog\.windows\.filter\(\(item\) => AUTOMATED_MTM_WINDOWS\.has\(item\.slug\)\)/);
  assert.match(script, /windowSelect\.value = AUTOMATED_MTM_WINDOWS\.has\(requestedWindow\) \? requestedWindow : ""/);
  const guard = script.indexOf("if (!AUTOMATED_MTM_WINDOWS.has(selected.slug))");
  const reviewDispatch = script.indexOf('path = "specialist-review"', guard);
  assert.ok(guard > 0 && reviewDispatch > guard, "unsupported routes must stop before request dispatch");
  assert.match(script.slice(guard, reviewDispatch), /throw new Error\("This opening needs a curtain-team review and is not available for automated checkout\."\)/);
});

test("Review evidence appears only after a server review outcome, without uploads or premature checkout", () => {
  const script = read("assets", "curtainsuk-storefront.js");
  const section = read("sections", "curtainsuk-configurator.liquid");
  assert.match(section, /class="cuk-step cuk-hidden" data-cuk-review-evidence/);
  assert.match(script, /const needsEvidence = false/);
  assert.match(script, /\[data-cuk-review-evidence\][^\n]*classList\.toggle\("cuk-hidden", !needsEvidence\)/);
  assert.match(script, /\[data-cuk-review-evidence\] input[^\n]*field\.disabled = !needsEvidence/);
  assert.match(script, /const needsReview = isManualQuote \|\| isPriceWithReview/);
  assert.match(script, /if \(needsReview && evidence\) \{\s*evidence\.classList\.remove\("cuk-hidden"\)/);
  assert.match(section, /class="cuk-checkout-handoff cuk-hidden" data-cuk-checkout-form/);
  assert.match(section, /class="cuk-review-submit cuk-hidden" data-cuk-review-form/);
  assert.doesNotMatch(section, /type="file"/);
  assert.match(script, /catalog\.windows\.filter\(\(item\) => AUTOMATED_MTM_WINDOWS\.has\(item\.slug\)\)/);
});

test("task navigation uses resolvable theme-owned inspiration, help and sample anchors", () => {
  const nav = read("sections", "curtainsuk-task-nav.liquid");
  const support = read("sections", "curtainsuk-inspiration-help.liquid");
  const trustFooter = read("snippets", "curtainsuk-trust-footer.liquid");
  const helpFooter = read("sections", "curtainsuk-help-footer.liquid");
  const footerGroup = readThemeJson("sections", "footer-group.json") as { sections: Record<string, { type: string }>; order: string[] };
  const index = readThemeJson("templates", "index.json") as { sections: Record<string, { type: string }>; order: string[] };
  const samples = readThemeJson("templates", "page.samples.json") as { sections: Record<string, { type: string }>; order: string[] };
  const browse = readThemeJson("templates", "page.browse-fabrics.json") as { sections: Record<string, { type: string; disabled?: boolean }>; order: string[] };
  const basket = read("sections", "curtainsuk-sample-basket.liquid");
  assert.match(nav, /href="\/#curtainsuk-inspiration"/);
  assert.match(nav, /href="\/#curtainsuk-help"/);
  assert.match(nav, /href="\/pages\/samples"/);
  assert.match(nav, /href="\/pages\/how-to-measure"/);
  assert.match(nav, /href="\/pages\/how-to-fit"/);
  assert.equal(/\/blogs\/inspiration/.test(nav), false);
  assert.match(support, /id="curtainsuk-inspiration"/);
  assert.equal(index.sections["curtainsuk-inspiration-help"]?.type, "curtainsuk-inspiration-help");
  assert.ok(index.order.includes("curtainsuk-inspiration-help"));
  assert.match(trustFooter, /id="curtainsuk-help"/);
  assert.match(helpFooter, /\{% render 'curtainsuk-trust-footer' %\}/);
  assert.equal(footerGroup.sections["curtainsuk-help"]?.type, "curtainsuk-help-footer");
  assert.ok(footerGroup.order.includes("curtainsuk-help"));
  assert.equal(samples.sections.samples?.type, "curtainsuk-sample-basket");
  assert.ok(samples.order.includes("samples"));
  assert.equal(browse.sections.samples?.type, "curtainsuk-sample-basket");
  assert.notEqual(browse.sections.samples.disabled, true);
  assert.ok(browse.order.includes("samples"));
  assert.match(basket, /id="samples"[^>]*\{% if template\.suffix == 'browse-fabrics' %\} hidden\{% endif %\}/);
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
  assert.match(script, /fabric\.fabricProfileUrl/);
  assert.match(script, /data-cuk-view-fabric/);
  assert.match(script, /profileUrl \|\| legacyDetailUrl/);
  assert.match(script, /fabric\.availability/);
  assert.match(script, /fabric\.browseReady \?/);
  assert.match(script, /We couldn't confirm this fabric for made-to-measure curtains/);
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

test("a Fabric Master deep link is validated, hydrated through the catalogue, and fails closed when unresolved", () => {
  const script = read("assets", "curtainsuk-storefront.js");
  assert.match(script, /FABRIC_MASTER_ID/);
  assert.match(script, /We couldn't verify the fabric in this link/);
  assert.match(script, /catalog\.requestedFabric/);
  assert.match(script, /no price or checkout is available/);
  assert.match(script, /fabricSelect\.value = requestedFabric/);
  assert.match(script, /fabricSelect\.value !== requestedFabric/);
});

test("Dawn purchase controls stay off independently of production indexing and Shopify Markets", () => {
  const settings = JSON.parse(read("config", "settings_data.json")) as { current: Record<string, unknown> };
  const header = read("sections", "header.liquid");
  assert.equal(settings.current.curtainsuk_staging_mode, false);
  assert.equal(settings.current.curtainsuk_purchase_controls_enabled, false);
  assert.equal(settings.current.curtainsuk_staging_market_label, "United Kingdom | GBP");
  assert.doesNotMatch(header, /settings\.curtainsuk_staging_mode/);
  assert.match(header, /settings\.curtainsuk_purchase_controls_enabled == true/);
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
  for (const source of [cartFooter]) {
    assert.match(source, /name="checkout"[^>]*disabled|disabled[^>]*name="checkout"/);
  }
  // Drawer/notification route through the validated basket; neither can submit checkout.
  for (const source of [cartDrawer, cartNotification]) {
    assert.doesNotMatch(source, /name="checkout"/);
    assert.match(source, /href="\{\{ routes.cart_url \}\}"/);
    assert.doesNotMatch(source, /Checkout disabled in this staging preview/);
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
  assert.match(section, /data-cuk-result-notice>\{% if production_checkout %\}VAT is included\./);
  assert.match(section, /\{% else %\}Staging only\. Shopify test checkout remains gated; real payment is disabled/);
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
