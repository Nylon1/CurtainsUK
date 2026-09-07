import assert from "node:assert/strict";
import test from "node:test";
import { hasStagingReviewRole } from "../review-authz";
import { hasSupplierAdminRole } from "../../supplier-intelligence/authz";
import { STAGING_UK_SHIPPING_RULES, quoteUkShipping } from "../shipping";
import { STAGING_SHIPPING_OWNER_INPUTS, shippingPolicyBlockers, resolveOwnerShipping, type ShippingOwnerInputs } from "../shipping-owner-inputs";

test("the review-only identity is denied outside staging, for customers and for anonymous users", () => {
  const input = { appMetadata: { roles: ["CURTAINSUK_STAGING_REVIEWER"], curtainsuk_environment: "STAGING" }, authUrl: "https://hqysjumypgeapgmqkcrx.supabase.co", environment: "preview" };
  assert.equal(hasStagingReviewRole(input), true);
  assert.equal(hasSupplierAdminRole(input.appMetadata), false);
  assert.equal(hasStagingReviewRole({ ...input, environment: "production" }), false);
  assert.equal(hasStagingReviewRole({ ...input, authUrl: "https://other.supabase.co" }), false);
  assert.equal(hasStagingReviewRole({ ...input, anonymous: true }), false);
  assert.equal(hasStagingReviewRole({ ...input, appMetadata: { roles: ["CUSTOMER"] } }), false);
  assert.equal(hasStagingReviewRole({ ...input, appMetadata: null }), false);
});

test("all nine owner rate cells remain null, and specialist is a manual override", () => {
  assert.equal(STAGING_UK_SHIPPING_RULES.length, 9);
  assert.equal(STAGING_SHIPPING_OWNER_INPUTS.rates.length, 9);
  for (const rule of STAGING_UK_SHIPPING_RULES) {
    assert.equal(rule.grossAmountMinor, null);
    assert.notEqual(quoteUkShipping(rule).status, "READY");
  }
  assert.deepEqual([...new Set(STAGING_UK_SHIPPING_RULES.map(rule => rule.parcelClass))], ["STANDARD", "LARGE", "OVERSIZE"]);
  assert.ok(shippingPolicyBlockers().includes("POSTCODE_MAPPING_REQUIRED"));
  assert.notEqual(quoteUkShipping({ region: "UK_MAINLAND", parcelClass: "SPECIALIST", rules: [{ region: "UK_MAINLAND", parcelClass: "SPECIALIST", enabled: true, grossAmountMinor: 100, currency: "GBP", status: "VALIDATED" }] }).status, "READY");
});

test("postcode and packed-parcel rules reject unmapped, ambiguous and oversized deliveries", () => {
  // Synthetic test-only policy; never saved or promoted to owner configuration.
  const policy: ShippingOwnerInputs = structuredClone(STAGING_SHIPPING_OWNER_INPUTS);
  Object.assign(policy, { status: "VALIDATED", approvedBy: "test-only", approvedAt: "2026-09-07T00:00:00Z" });
  policy.postcodeMapping = { status: "VALIDATED", rules: [{ outwardCode: "SW1A", region: "UK_MAINLAND" }], unmatchedPostcode: "BLOCKED", conflictingMatches: "BLOCKED" };
  policy.parcelThresholds.status = "VALIDATED";
  for (const [index, key] of (["STANDARD", "LARGE", "OVERSIZE"] as const).entries()) {
    policy.parcelThresholds[key] = { maxLengthMm: 100 * (index + 1), maxWidthMm: 100, maxHeightMm: 100, maxWeightGrams: 1000 * (index + 1) };
  }
  policy.maximumParcel = { ...policy.parcelThresholds.OVERSIZE };
  const input = { policy, postcode: "SW1A 1AA", parcel: { lengthMm: 150, widthMm: 90, heightMm: 80, weightGrams: 1500 } };
  assert.deepEqual(resolveOwnerShipping(input), { region: "UK_MAINLAND", parcelClass: "LARGE" });
  assert.throws(() => resolveOwnerShipping({ ...input, postcode: "BT1 1AA" }), /UNMAPPED/);
  assert.throws(() => resolveOwnerShipping({ ...input, parcel: { ...input.parcel, weightGrams: 3001 } }), /MANUAL_OVERRIDE_REQUIRED/);
  policy.postcodeMapping.rules.push({ outwardCode: "SW1A", region: "HIGHLANDS_ISLANDS" });
  assert.throws(() => resolveOwnerShipping(input), /AMBIGUOUS/);
  assert.throws(() => resolveOwnerShipping({ ...input, policy: STAGING_SHIPPING_OWNER_INPUTS }), /NOT_CONFIRMED/);
});
