import assert from "node:assert/strict";
import test from "node:test";
import { hasStagingReviewRole } from "../review-authz";
import { hasSupplierAdminRole } from "../../supplier-intelligence/authz";
import { STAGING_UK_SHIPPING_RULES, quoteUkShipping } from "../shipping";
import { STAGING_SHIPPING_OWNER_INPUTS, shippingPolicyBlockers, resolveOwnerShipping, quoteOwnerApprovedCurtainShipping, type ShippingOwnerInputs } from "../shipping-owner-inputs";

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

test("the approved nine-cell policy is configured while generic fallback rates stay blocked", () => {
  assert.equal(STAGING_UK_SHIPPING_RULES.length, 9);
  assert.equal(STAGING_SHIPPING_OWNER_INPUTS.rates.length, 9);
  for (const rule of STAGING_UK_SHIPPING_RULES) {
    assert.equal(rule.grossAmountMinor, null);
    assert.notEqual(quoteUkShipping(rule).status, "READY");
  }
  assert.deepEqual([...new Set(STAGING_UK_SHIPPING_RULES.map(rule => rule.parcelClass))], ["STANDARD", "LARGE", "OVERSIZE"]);
  assert.deepEqual(shippingPolicyBlockers(), []);
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

});


test("owner postcode ranges and inclusive packed length/weight boundaries", () => {
  const parcel = { lengthMm: 1200, widthMm: 400, heightMm: 300, weightGrams: 10000 };
  const resolve = (postcode: string, changes = {}) => resolveOwnerShipping({ postcode, parcel: {...parcel,...changes} });
  for (const postcode of ["HS1 1AA","IV1 1AA","KW1 1AA","ZE1 1AA","PA20 1AA","PA80 1AA","PH15 1AA","PH50 1AA","FK17 1AA","FK21 1AA","KA27 1AA","KA28 1AA"]) assert.equal(resolve(postcode).region,"HIGHLANDS_ISLANDS");
  for (const postcode of ["PA19 1AA","PA81 1AA","PH14 1AA","PH51 1AA","FK16 1AA","FK22 1AA","KA26 1AA","KA29 1AA","SW1A 1AA"]) assert.equal(resolve(postcode).region,"UK_MAINLAND");
  assert.equal(resolve("BT1 1AA").region,"NORTHERN_IRELAND");
  assert.equal(resolve("SW1A 1AA").parcelClass,"STANDARD");
  for (const changes of [{lengthMm:1201},{weightGrams:10001},{lengthMm:1800,weightGrams:20000}]) assert.equal(resolve("SW1A 1AA",changes).parcelClass,"LARGE");
  for (const changes of [{lengthMm:1801},{weightGrams:20001},{specialistHandling:true}]) assert.equal(resolve("SW1A 1AA",changes).parcelClass,"OVERSIZE");
  for (const postcode of ["", "BT", "not a postcode", "JE1 1AA", "GY1 1AA", "IM1 1AA"]) assert.throws(()=>resolve(postcode));
  for (const changes of [{lengthMm:0},{weightGrams:NaN},{weightGrams:-1}]) assert.throws(()=>resolve("SW1A 1AA",changes));
  assert.deepEqual(STAGING_SHIPPING_OWNER_INPUTS.rates.map(r=>r.grossAmountMinor),[1295,1995,2995,1995,2995,4495,1995,2995,4495]);
});


test("delivery uses trusted packed measurements and blocks missing or ambiguous classification", () => {
  const rules = STAGING_SHIPPING_OWNER_INPUTS.rates.map(r => ({...r,region:r.region as "UK_MAINLAND",parcelClass:r.parcelClass as "STANDARD",currency:"GBP" as const,enabled:true,status:"VALIDATED" as const}));
  const input = {postcode:"BT1 1AA",selectedRegion:"NORTHERN_IRELAND",fabricMetres:10.6,maximumDropCm:220,rules};
  assert.equal(quoteOwnerApprovedCurtainShipping(input).status,"RATE_REQUIRES_CONFIRMATION");
  const packedParcel = {lengthMm:1800,weightGrams:20000};
  assert.equal(quoteOwnerApprovedCurtainShipping({...input,packedParcel}).grossAmountMinor,2995);
  assert.equal(quoteOwnerApprovedCurtainShipping({...input,packedParcel,selectedRegion:"UK_MAINLAND"}).status,"RATE_REQUIRES_CONFIRMATION");
  assert.equal(quoteOwnerApprovedCurtainShipping({...input,packedParcel:{...packedParcel,weightGrams:0}}).status,"RATE_REQUIRES_CONFIRMATION");
  const policy=structuredClone(STAGING_SHIPPING_OWNER_INPUTS);policy.parcelThresholds.LARGE.maxLengthMm=100;
  assert.ok(shippingPolicyBlockers(policy).includes("PARCEL_THRESHOLDS_INVALID"));
});
