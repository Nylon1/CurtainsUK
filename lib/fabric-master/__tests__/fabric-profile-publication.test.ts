import "../../../scripts/curtainsuk-server-script-loader.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import {
  assertFabricProfilePatchAllowed,
  buildFabricProfilePublication,
  fabricProfilePatch,
} from "../fabric-profile-publication";

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
  ]));
  assert.throws(
    () => assertFabricProfilePatchAllowed([{ key: "sample_price", value: "0.00" }]),
    /FABRIC_PROFILE_FIELD_NOT_ALLOWED:sample_price/,
  );
});
