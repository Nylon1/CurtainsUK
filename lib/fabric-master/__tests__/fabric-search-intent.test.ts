import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildFabricSearchIntent, fabricProfileSearchFields, fabricProfileSearchPatch } from "../fabric-search-intent";
import type { FabricMasterRecord } from "../types";
import type { FabricVisualIntelligence } from "../visual-knowledge";

const canonical = "https://www.curtainsuk.com/pages/fabric/pt-1204-212-mellora-blush";
const master: FabricMasterRecord = {
  fabric_id: "pt-1204-212",
  supplier_id: "prestigious-textiles",
  supplier_name: "Prestigious Textiles",
  brand_id: "prestigious-textiles",
  brand_name: "Prestigious Textiles",
  collection_id: "mellora",
  collection_name: "Mellora Collection",
  supplier_collection_code: null,
  design_id: "mellora",
  supplier_design_code: null,
  design_name: "Mellora",
  supplier_sku: "1204/212",
  colourway_code: null,
  colour_name: "Blush",
  full_width_mm: 1380,
  usable_width_mm: 1360,
  vertical_repeat_mm: 580,
  horizontal_repeat_mm: null,
  pattern_match_type: "STRAIGHT_MATCH",
  composition: [
    { material: "LINEN", percentage: 52 },
    { material: "VISCOSE", percentage: 34 },
    { material: "POLY", percentage: 14 },
  ],
  weight_gsm: null,
  care_instructions: [],
  usage_suitability: [],
  imagery: ["https://cdn.shopify.com/s/files/1/test.jpg"],
  sample_available: true,
  lifecycle_state: "CURRENT",
  price_verification_status: "VERIFIED",
  storefront_selectable: true,
  staging_catalog_visible: true,
  source_type: "SUPPLIER",
  source_name: "Supplier",
  source_reference: null,
  source_effective_date: null,
};

const visual: FabricVisualIntelligence = {
  palette: { primary: "pink", secondary: ["white"] },
  pattern: { category: "geometric", motif: ["geometric"], activity: "balanced" },
  texture: ["subtle-texture", "visible-weave"],
  finish: "low",
  character: ["graphic", "refined"],
  visualWeight: "light",
};

test("deterministic governed copy preserves exact identity, canonical and sample price", () => {
  const a = buildFabricSearchIntent(master, visual, canonical);
  const b = buildFabricSearchIntent(master, visual, canonical);
  assert.deepEqual(a, b);
  assert.match(a.title, /^Blush Pink Geometric Linen Blend Curtain Fabric for Made-to-Measure Living Room Curtains/);
  assert.equal(a.merchant.id, "cuk-sample:pt-1204-212");
  assert.equal(a.merchant.link, canonical);
  assert.equal(a.canonicalUrl, canonical);
  assert.equal(a.merchant.price, "2.50 GBP");
  assert.equal(a.merchant.title, a.title);
  assert.equal(a.merchant.description, a.description);
  assert.equal(a.merchant.color, "Blush");
  assert.equal(a.merchant.brand, "Prestigious Textiles");
  assert.equal(a.merchant.material, "52% Linen, 34% Viscose, 14% Poly");
  assert.equal(a.merchant.pattern, "geometric");
  assert.ok(a.merchant.product_detail.some((item) => item.name === "Usable width" && item.value === "136 cm"));
  assert.match(a.description, /£2\.50 physical sample/);
  assert.match(a.description, /Finished curtains are priced separately/);
  assert.doesNotMatch(a.description, /not made-to-measure curtains|one physical fabric sample only/i);
  assert.ok(a.title.length <= 150);
  assert.ok(a.description.length <= 1500);
  assert.ok(a.seoTitle.length <= 70);
  assert.ok(a.seoDescription.length <= 160);
  const fields = fabricProfileSearchFields(a);
  assert.equal(fields.search_title, a.merchant.title);
  assert.equal(fields.search_description, a.merchant.description);
  assert.equal(fields.search_color, a.merchant.color);
  assert.match(fields.search_revision ?? "", /^search-v1-[a-f0-9]{24}$/);
  const patch = fabricProfileSearchPatch({ fabric_master_id: a.fabricId, canonical_url: canonical }, a);
  assert.ok(patch.some((field) => field.key === "search_title"));
  assert.deepEqual(fabricProfileSearchPatch({
    fabric_master_id: a.fabricId, canonical_url: canonical, ...fields,
  }, a), []);
});

test("unknown factual data is omitted; unvalidated room claims do not override FI", () => {
  const unknown = buildFabricSearchIntent(
    { ...master, composition: [], usable_width_mm: null, full_width_mm: null, vertical_repeat_mm: null, pattern_match_type: null },
    {},
    canonical,
    { description_validated: false, rooms: ["bedroom"], styles: ["luxury"], headings: ["wave"], linings: ["blackout"] },
  );
  assert.deepEqual(unknown.rooms, []);
  assert.deepEqual(unknown.styles, []);
  assert.deepEqual(unknown.headings, ["pencil pleat", "wave", "double pinch pleat"]);
  assert.deepEqual(unknown.linings, ["standard", "blackout", "thermal"]);
  assert.equal(unknown.merchant.material, undefined);
  assert.equal(unknown.merchant.pattern, undefined);
  assert.doesNotMatch(unknown.title + unknown.description, /bedroom|luxury/i);
  assert.doesNotMatch(unknown.description, /Composition:|usable width|pattern match/i);
});

test("validated room and options are qualified as curtain choices, not face-fabric properties", () => {
  const intent = buildFabricSearchIntent(master, visual, canonical, {
    description_validated: true,
    rooms: ["bedroom"],
    styles: ["contemporary"],
    headings: ["wave"],
    linings: ["blackout", "thermal"],
  });
  assert.match(intent.title, /Bedroom Curtains/);
  assert.match(intent.description, /validated profile suggests bedroom interiors/);
  assert.match(intent.description, /Made-to-measure curtains are available with blackout and thermal lining options where compatible/);
  assert.doesNotMatch(intent.description, /blackout fabric|thermal fabric/i);
});

test("editorial room and style guidance derives from governed FI when explicit rooms are absent", () => {
  const intent = buildFabricSearchIntent(master, visual, canonical);
  assert.deepEqual(intent.rooms, ["living room", "home office"]);
  assert.equal(intent.roomSource, "EDITORIAL_FI");
  assert.deepEqual(intent.styles, ["modern"]);
  assert.equal(intent.styleSource, "EDITORIAL_FI");
  assert.match(intent.title, /Living Room Curtains/);
});

test("appearance never creates a linen composition claim", () => {
  const intent = buildFabricSearchIntent(
    { ...master, composition: [], colour_name: "Natural" },
    { ...visual, texture: ["linen-look", "visible-weave"] },
    canonical,
  );
  assert.equal(intent.merchant.material, undefined);
  assert.doesNotMatch(intent.title, /Linen Blend|100% Linen/i);
  assert.match(intent.description, /linen-look/);
});

test("canonical and Fabric Master mismatches fail closed", () => {
  assert.throws(() => buildFabricSearchIntent(master, visual, "https://example.com/pages/fabric/pt-1204-212-mellora-blush"), /CANONICAL_INVALID/);
  assert.throws(() => buildFabricSearchIntent(master, visual, "https://www.curtainsuk.com/pages/fabric/pt-999-mellora-blush"), /IDENTITY_MISMATCH/);
  const intent = buildFabricSearchIntent(master, visual, canonical);
  assert.throws(() => fabricProfileSearchPatch({ fabric_master_id: "pt-999", canonical_url: canonical }, intent), /PROFILE_IDENTITY_MISMATCH/);
});

test("the shared Fabric Profile uses the same search fields for visible copy, metadata and Product JSON-LD", () => {
  const theme = resolve(process.cwd(), "shopify-theme/curtainsuk-dawn-16");
  const section = readFileSync(resolve(theme, "sections/curtainsuk-metaobject-fabric-discovery.liquid"), "utf8");
  const layout = readFileSync(resolve(theme, "layout/theme.liquid"), "utf8");
  const meta = readFileSync(resolve(theme, "snippets/meta-tags.liquid"), "utf8");
  assert.match(section, /assign search_intro = metaobject\.search_intro\.value/);
  assert.match(section, /assign structured_title = metaobject\.search_title\.value/);
  assert.match(section, /assign structured_copy = search_description/);
  assert.match(section, /"sku":\{\{ 'cuk-sample:' \| append: metaobject\.fabric_master_id\.value \| json \}\}/);
  assert.match(section, /"url":\{\{ canonical \| json \}\}/);
  assert.match(section, /"price":\{\{ sample_price \| json \}\}/);
  assert.match(layout, /metaobject\.seo_title\.value/);
  assert.match(layout, /metaobject\.seo_description\.value/);
  assert.match(meta, /assign og_title = metaobject\.seo_title\.value/);
  assert.match(meta, /assign og_description = metaobject\.seo_description\.value/);
});
