import test from "node:test";
import assert from "node:assert/strict";
import { cushionBrowseParams, cushionBrowseFacets, CUSHION_FABRIC_TIERS } from "../browse";
import { BROWSE_PRICE_BANDS } from "../../fabric-master/browse-price-guide";

test("cushion search forwards governed filters and shared Browse price IDs before pagination", () => {
  const query = cushionBrowseParams(new URLSearchParams("q=Bird&colour=BLUE,white/cream&pattern=stripe&guidePrice=150-250&offset=24&supplierCost=1&candidateIds=restricted"));
  assert.deepEqual(Object.fromEntries(query), {
    view: "retail", browseGuide: "1", page: "2", query: "Bird", colour: "blue,white/cream", pattern: "stripe", guidePrice: "150-250",
  });
  assert.throws(() => cushionBrowseParams(new URLSearchParams("guidePrice=cheap")), /BROWSE_PRICE_BAND_INVALID/);
  assert.equal(cushionBrowseParams(new URLSearchParams("colour=unknown,<script>&pattern=UNKNOWN")).get("colour"), "");
  assert.deepEqual(CUSHION_FABRIC_TIERS.map((tier) => tier.value), BROWSE_PRICE_BANDS.map((band) => band.value));
});

test("facet projection preserves zero-result selections safely without exposing source records", () => {
  const result = cushionBrowseFacets({ supplierCost: 123, discovery: [
    { key: "colour", options: [{ value: "blue", label: "Blue", count: 0, supplierCost: 123 }] },
    { key: "pattern", options: [{ value: "stripe", label: "Stripe", count: 8 }, { value: "invalid", label: "Invalid", count: -1 }] },
    { key: "private", options: [{ value: "cost", label: "Cost", count: 1 }] },
  ] });
  assert.deepEqual(result.discovery, [
    { key: "colour", options: [{ value: "blue", label: "Blue", count: 0 }] },
    { key: "pattern", options: [{ value: "stripe", label: "Stripe", count: 8 }] },
  ]);
  assert.equal(JSON.stringify(result).includes("supplierCost"), false);
  assert.deepEqual(cushionBrowseFacets(undefined).discovery.map((facet) => facet.options), [[], []]);
  assert.deepEqual(cushionBrowseFacets({ discovery: "invalid" }).discovery.map((facet) => facet.options), [[], []]);
  assert.deepEqual(cushionBrowseFacets({ discovery: [null, { key: "colour", options: [null] }] }).discovery.map((facet) => facet.options), [[], []]);
});
