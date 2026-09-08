import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeAvailabilityState,
  normalizeReviewContact,
  reviewProvisionalPrice,
  validConfigurationId,
} from "../review-request";
import { customerSafeApiError, readBoundedJson } from "../staging-api";
import {
  signReviewSubmissionWithSecret,
  stagingReviewFingerprintWithSecret,
  verifyReviewSubmissionWithSecret,
} from "../review-token-core";

const TEST_SIGNING_SECRET = "x".repeat(48);

test("review contact input is normalized without accepting an invalid email", () => {
  assert.deepEqual(normalizeReviewContact({
    name: "  Alex Curtain  ",
    email: " ALEX@EXAMPLE.COM ",
    phone: " 01234 567890 ",
    notes: " Bay window photo attached. ",
  }), {
    name: "Alex Curtain",
    email: "alex@example.com",
    phone: "01234 567890",
    notes: "Bay window photo attached.",
  });
  assert.throws(() => normalizeReviewContact({ email: "not-an-email" }), /REVIEW_CONTACT_INVALID/);
});

test("review availability accepts only the customer-safe vocabulary", () => {
  assert.equal(normalizeAvailabilityState("Fabric available"), "FABRIC_AVAILABLE");
  assert.equal(normalizeAvailabilityState("No longer available"), "NO_LONGER_AVAILABLE");
  assert.equal(normalizeAvailabilityState("27.4 metres in batch ABC"), "AVAILABILITY_TO_BE_CONFIRMED");
});

test("manual quote submissions cannot persist a numeric provisional price", () => {
  assert.equal(reviewProvisionalPrice({ outcome: "MANUAL_QUOTE", totalAmountMinor: 125_300 }), null);
  assert.equal(reviewProvisionalPrice({ outcome: "PRICE_WITH_REVIEW", totalAmountMinor: 125_300 }), 125_300);
  assert.equal(reviewProvisionalPrice({ outcome: "PRICE_WITH_REVIEW", totalAmountMinor: null }), null);
  assert.throws(() => reviewProvisionalPrice({ outcome: "INSTANT_PRICE", totalAmountMinor: 83_400 }), /REVIEW_ROUTE_REQUIRED/);
});

test("only canonical UUIDs are accepted as customer-safe configuration IDs", () => {
  const id = "7fac22f6-f2bc-4f68-91ae-4bbc1542b39c";
  assert.equal(validConfigurationId(id), id);
  assert.equal(validConfigurationId(`stage-${id}`), null);
  assert.equal(validConfigurationId(""), null);
});

test("review validation errors cross the public API as customer-safe guidance", () => {
  assert.equal(
    customerSafeApiError(new Error("REVIEW_EVIDENCE_REQUIRED"), "Unable to submit this project for review"),
    "Add at least one clear photo of the specialist window",
  );
  assert.equal(
    customerSafeApiError(new Error("REVIEW_DRAWING_REQUIRED"), "Unable to submit this project for review"),
    "Add a simple drawing of the unusual window",
  );
  assert.equal(
    customerSafeApiError(new Error("database password leaked here"), "Unable to submit this project for review"),
    "Unable to submit this project for review",
  );
});

test("review submission tokens bind canonical configuration, outcome and price", () => {
  const configuration = {
    windowSlug: "bay-window",
    measurementBasis: "TRACK_WIDTH" as const,
    dropCm: 220,
    bayTrackOrPoleFitted: true,
    bayNumberOfSections: 3,
    baySegmentWidthsCm: [80, 180, 80],
    fabricId: "pt-4270-147",
    heading: "WAVE" as const,
    lining: "BLACKOUT" as const,
    construction: "PAIR" as const,
    stackDirection: "SPLIT" as const,
  };
  const claims = {
    configuration,
    configurationId: "7fac22f6-f2bc-4f68-91ae-4bbc1542b39c",
    outcome: "PRICE_WITH_REVIEW" as const,
    totalAmountMinor: 115_600,
  };
  const token = signReviewSubmissionWithSecret(claims, TEST_SIGNING_SECRET, 1_000);
  assert.equal(verifyReviewSubmissionWithSecret(claims, token, TEST_SIGNING_SECRET, 1_001), true);
  assert.equal(verifyReviewSubmissionWithSecret({ ...claims, totalAmountMinor: 115_700 }, token, TEST_SIGNING_SECRET, 1_001), false);
  assert.equal(verifyReviewSubmissionWithSecret({ ...claims, outcome: "MANUAL_QUOTE", totalAmountMinor: null }, token, TEST_SIGNING_SECRET, 1_001), false);
  assert.equal(verifyReviewSubmissionWithSecret(claims, `${token.slice(0, -1)}x`, TEST_SIGNING_SECRET, 1_001), false);
  assert.equal(verifyReviewSubmissionWithSecret(claims, token, TEST_SIGNING_SECRET, 10_000), false);
});

test("rate-limit fingerprints are IP- and scope-bound, not user-agent-bound", () => {
  const first = new Request("https://staging.example", { headers: { "x-vercel-forwarded-for": "203.0.113.9", "user-agent": "Browser A" } });
  const second = new Request("https://staging.example", { headers: { "x-vercel-forwarded-for": "203.0.113.9", "user-agent": "Browser B" } });
  const otherAddress = new Request("https://staging.example", { headers: { "x-vercel-forwarded-for": "203.0.113.10", "user-agent": "Browser A" } });
  assert.equal(stagingReviewFingerprintWithSecret(first, "review", TEST_SIGNING_SECRET), stagingReviewFingerprintWithSecret(second, "review", TEST_SIGNING_SECRET));
  assert.notEqual(stagingReviewFingerprintWithSecret(first, "review", TEST_SIGNING_SECRET), stagingReviewFingerprintWithSecret(first, "price", TEST_SIGNING_SECRET));
  assert.notEqual(stagingReviewFingerprintWithSecret(first, "review", TEST_SIGNING_SECRET), stagingReviewFingerprintWithSecret(otherAddress, "review", TEST_SIGNING_SECRET));
});

test("JSON staging requests are bounded even when Content-Length is absent or misleading", async () => {
  const valid = new Request("https://staging.example", { method: "POST", body: JSON.stringify({ width: 200 }) });
  assert.deepEqual(await readBoundedJson<{ width: number }>(valid, 64), { width: 200 });

  const undeclaredOversize = new Request("https://staging.example", { method: "POST", body: JSON.stringify({ value: "x".repeat(128) }) });
  await assert.rejects(() => readBoundedJson(undeclaredOversize, 64), /STAGING_REQUEST_TOO_LARGE/);

  const invalid = new Request("https://staging.example", { method: "POST", body: "not-json" });
  await assert.rejects(() => readBoundedJson(invalid, 64), /STAGING_REQUEST_INVALID_JSON/);
});


test("instant checkout confirmation binds identity, measurements and the displayed price", () => {
  const configuration = {windowSlug:"standard-window",fabricId:"sdg-dapgpa203",measurementBasis:"TRACK_WIDTH" as const,widthCm:200,dropCm:220,heading:"PENCIL_PLEAT" as const,lining:"STANDARD" as const,construction:"PAIR" as const,stackDirection:"SPLIT" as const};
  const claims = {configuration,configurationId:"11111111-1111-4111-8111-111111111111",outcome:"INSTANT_PRICE" as const,totalAmountMinor:110500};
  const token = signReviewSubmissionWithSecret(claims,TEST_SIGNING_SECRET,1000);
  assert.equal(verifyReviewSubmissionWithSecret(claims,token,TEST_SIGNING_SECRET,1001),true);
  assert.equal(verifyReviewSubmissionWithSecret({...claims,totalAmountMinor:112400},token,TEST_SIGNING_SECRET,1001),false);
  assert.equal(verifyReviewSubmissionWithSecret({...claims,configuration:{...configuration,widthCm:300}},token,TEST_SIGNING_SECRET,1001),false);
  assert.equal(verifyReviewSubmissionWithSecret({...claims,configurationId:"22222222-2222-4222-8222-222222222222"},token,TEST_SIGNING_SECRET,1001),false);
  assert.equal(verifyReviewSubmissionWithSecret(claims,token,TEST_SIGNING_SECRET,8201),false);
});
