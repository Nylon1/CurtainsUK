import "./curtainsuk-server-script-loader.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import type { FabricMasterRecord } from "../lib/fabric-master/types";
import {
  assertFabricProfilePatchAllowed,
  buildFabricProfileCreateBase,
  buildFabricProfilePublication,
  buildFabricProfileSupplierFacts,
  fabricProfilePatch,
  fabricProfilePublicationRichEnough,
} from "../lib/fabric-master/fabric-profile-publication";


test("Fabric Profile creation derives stable public commerce fields from Fabric Master", () => {
  const record: FabricMasterRecord = {
    fabric_id: "sdg-dkh17a204",
    supplier_id: "sanderson-design-group",
    supplier_name: "Sanderson Design Group",
    brand_id: "sanderson",
    brand_name: "Sanderson",
    collection_id: "sanderson-one-sixty",
    collection_name: "Sanderson One Sixty Fabrics",
    supplier_collection_code: null,
    design_id: "avening",
    supplier_design_code: null,
    design_name: "Avening",
    supplier_sku: "DKH17A204",
    colourway_code: null,
    colour_name: "Neutral/Multi",
    full_width_mm: 1370,
    usable_width_mm: 1370,
    vertical_repeat_mm: 630,
    horizontal_repeat_mm: 1370,
    pattern_match_type: "STRAIGHT_MATCH",
    composition: [
      { material: "Linen", percentage: 53 },
      { material: "Cotton", percentage: 35 },
      { material: "Nylon", percentage: 12 },
    ],
    weight_gsm: 380,
    care_instructions: ["dry_clean"],
    usage_suitability: ["curtains", "blinds"],
    imagery: ["https://cdn.shopify.com/s/files/1/example/avening.jpg"],
    sample_available: true,
    lifecycle_state: "CURRENT",
    price_verification_status: "VERIFIED",
    storefront_selectable: true,
    staging_catalog_visible: true,
    source_type: "SUPPLIER_PORTAL",
    source_name: "Supplier",
    source_reference: null,
    source_effective_date: null,
  };

  const base = buildFabricProfileCreateBase(record);
  assert.ok(base);
  assert.equal(base.handle, "sdg-dkh17a204-avening-neutral-multi");
  assert.equal(base.fields.canonical_url, "https://www.curtainsuk.com/pages/fabric/sdg-dkh17a204-avening-neutral-multi");
  assert.equal(base.fields.sample_price, "2.50");
  assert.equal(base.fields.sample_offer_label, "Fabric sample — £2.50");
  assert.match(base.fields.supplier_facts, /Composition: 53% Linen, 35% Cotton, 12% Nylon/);
  assert.match(base.fields.supplier_facts, /Usage: curtains, blinds/);
  assert.match(base.fields.supplier_facts, /Care: dry clean/);
  assert.equal(buildFabricProfileSupplierFacts(record), base.fields.supplier_facts);
});

test("Fabric Profile publication richness requires colour, pattern, surface and character", () => {
  const rich = buildFabricProfilePublication({
    fabric_id: "pt-rich",
    knowledge_state: "COMPLETE",
    visual_fields: {
      primaryColour: { value: "green" },
      patternClass: { value: "botanical" },
      visualSurface: { value: ["visible-weave"] },
      character: { value: ["natural"] },
    },
  });
  assert.ok(rich);
  assert.equal(fabricProfilePublicationRichEnough(rich), true);

  const thin = buildFabricProfilePublication({
    fabric_id: "pt-thin",
    knowledge_state: "PARTIAL_GOVERNED",
    visual_fields: {
      primaryColour: { value: "green" },
      patternClass: { value: "plain" },
    },
  });
  assert.ok(thin);
  assert.equal(fabricProfilePublicationRichEnough(thin), false);
});

test("complete governed reading maps to the existing Fabric Profile field format", () => {
  const publication = buildFabricProfilePublication({
    fabric_id: "pt-4259-247",
    knowledge_state: "COMPLETE",
    visual_fields: {
      primaryColour: { value: "cream" },
      secondaryColours: { value: ["beige", "blue"] },
      patternClass: { value: "botanical" },
      motif: { value: ["flower", "leaf"] },
      visualActivity: { value: "busy" },
      visualSurface: { value: ["subtle-texture"] },
      sheenAppearance: { value: "matte" },
      visualWeight: { value: "light" },
      character: { value: ["decorative", "natural"] },
      lightness: { value: "light" },
    },
  });

  assert.ok(publication);
  assert.equal(publication.fields.knowledge_state, "COMPLETE");
  assert.equal(publication.fields.knowledge_colour, "Colour: cream, beige, blue");
  assert.equal(publication.fields.knowledge_pattern, "Pattern: botanical, flower, leaf");
  assert.equal(publication.fields.knowledge_activity, "Visual activity: busy");
  assert.equal(publication.fields.knowledge_surface, "Texture: subtle-texture");
  assert.equal(publication.fields.knowledge_finish, "Finish: matte");
  assert.equal(publication.fields.knowledge_weight, "Presence: light");
  assert.equal(publication.fields.knowledge_character, "Character: decorative, natural");
  assert.match(publication.fields.knowledge_advice ?? "", /SPACE:/);
  assert.match(publication.fields.knowledge_advice ?? "", /COLOUR:/);
  assert.match(publication.revision, /^fi-manual-[a-f0-9]{20}$/);
});

test("partial governed reading publishes known evidence without inventing unknown fields", () => {
  const publication = buildFabricProfilePublication({
    fabric_id: "pt-4227-192",
    knowledge_state: "PARTIAL_GOVERNED",
    visual_fields: {
      primaryColour: { value: "unknown" },
      patternClass: { value: "stripe" },
      visualActivity: { value: "balanced" },
      visualSurface: { value: ["visible-weave"] },
      sheenAppearance: { value: "low" },
      visualWeight: { value: "unknown" },
      character: { value: ["natural", "understated"] },
    },
  });

  assert.ok(publication);
  assert.equal(publication.fields.knowledge_state, "PARTIAL");
  assert.equal(publication.fields.knowledge_colour, undefined);
  assert.equal(publication.fields.knowledge_pattern, "Pattern: stripe");
  assert.equal(publication.fields.knowledge_weight, undefined);
});

test("pending external retry is not eligible for profile publication", () => {
  assert.equal(buildFabricProfilePublication({
    fabric_id: "pt-pending",
    knowledge_state: "PENDING_EXTERNAL_RETRY",
    visual_fields: {},
  }), null);
});

test("patch never clears known Shopify content because a new reading is unknown", () => {
  const publication = buildFabricProfilePublication({
    fabric_id: "pt-4227-192",
    knowledge_state: "PARTIAL_GOVERNED",
    visual_fields: {
      primaryColour: { value: "unknown" },
      patternClass: { value: "stripe" },
    },
  });
  assert.ok(publication);

  const patch = fabricProfilePatch({
    knowledge_state: "PARTIAL",
    knowledge_colour: "Colour: brown",
    knowledge_pattern: "Pattern: stripe",
    sync_revision: "old",
  }, publication);

  assert.ok(!patch.some((field) => field.key === "knowledge_colour"));
});

test("patch never downgrades a COMPLETE published profile to PARTIAL", () => {
  const publication = buildFabricProfilePublication({
    fabric_id: "pt-example",
    knowledge_state: "PARTIAL_GOVERNED",
    visual_fields: {
      patternClass: { value: "stripe" },
    },
  });
  assert.ok(publication);

  const patch = fabricProfilePatch({
    knowledge_state: "COMPLETE",
    knowledge_pattern: "Pattern: stripe",
    sync_revision: "old",
  }, publication);

  assert.ok(!patch.some((field) => field.key === "knowledge_state"));
  assert.equal(patch.length, 0);
});

test("sync revision changes only when customer-facing intelligence changes", () => {
  const publication = buildFabricProfilePublication({
    fabric_id: "pt-example",
    knowledge_state: "COMPLETE",
    visual_fields: {
      primaryColour: { value: "green" },
      patternClass: { value: "plain" },
    },
  });
  assert.ok(publication);

  const unchanged = fabricProfilePatch({
    knowledge_state: "COMPLETE",
    knowledge_colour: "Colour: green",
    knowledge_pattern: "Pattern: plain",
    knowledge_advice: publication.fields.knowledge_advice,
    sync_revision: "older-revision",
  }, publication);
  assert.equal(unchanged.length, 0);

  const changed = fabricProfilePatch({
    knowledge_state: "PARTIAL",
    knowledge_colour: "Colour: blue",
    knowledge_pattern: "Pattern: plain",
    knowledge_advice: publication.fields.knowledge_advice,
    sync_revision: "older-revision",
  }, publication);
  assert.deepEqual(changed.map((field) => field.key), [
    "knowledge_state",
    "knowledge_colour",
    "sync_revision",
  ]);
});

test("allowlist rejects any attempt to modify commerce or identity fields", () => {
  assert.doesNotThrow(() => assertFabricProfilePatchAllowed([
    { key: "knowledge_colour", value: "Colour: green" },
    { key: "sync_revision", value: "fi-manual-123" },
    { key: "supplier_facts", value: "Usage: curtains" },
  ]));
  assert.throws(
    () => assertFabricProfilePatchAllowed([{ key: "sample_price", value: "0.00" }]),
    /FABRIC_PROFILE_FIELD_NOT_ALLOWED:sample_price/,
  );
});
