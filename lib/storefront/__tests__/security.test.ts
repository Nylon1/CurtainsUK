import assert from "node:assert/strict";
import test from "node:test";
import {
  canonicalShopifyAppProxyQuery,
  shopifyProxyRateLimitFingerprint,
  signShopifyAppProxyQuery,
  verifyShopifyAppProxyQuery,
} from "../security/shopify-app-proxy-core";
import {
  DeterministicTestMalwareScanner,
  UnavailableMalwareScanner,
  evidenceRetentionExpiry,
  planOrphanCleanup,
  planRetentionDeletion,
  scanEvidencePayload,
  verifyEvidencePayload,
} from "../security/evidence-core";
import {
  createEvidenceAccessTokenWithSecret,
  verifyEvidenceAccessTokenWithSecret,
} from "../security/evidence-access-token-core";
import {
  PRIVATE_NO_STORE_HEADERS,
  PUBLIC_NO_STORE_HEADERS,
  assertBoundedProxyRequest,
  assertSameOriginJsonMutation,
  readHardLimitedRequestBytes,
} from "../security/http";

const OFFICIAL_LOGGED_IN_QUERY = "extra=1&extra=2&shop=shop-name.myshopify.com&logged_in_customer_id=1&path_prefix=%2Fapps%2Fawesome_reviews&timestamp=1317327555&signature=4c68c8624d737112c91818c11017d24d334b524cb5c2b8ba08daa056f7395ddb";
const OFFICIAL_ANONYMOUS_QUERY = "extra=1&extra=2&shop=shop-name.myshopify.com&logged_in_customer_id=&path_prefix=%2Fapps%2Fawesome_reviews&timestamp=1317327555&signature=e072b6d7e6622d85912a5214b860d3100dc1e73d9bc29f43796ac8c9ff8093cb";

test("Shopify official app-proxy signature vectors canonicalize exactly", () => {
  assert.equal(
    canonicalShopifyAppProxyQuery(OFFICIAL_LOGGED_IN_QUERY),
    "extra=1,2logged_in_customer_id=1path_prefix=/apps/awesome_reviewsshop=shop-name.myshopify.comtimestamp=1317327555",
  );
  assert.equal(signShopifyAppProxyQuery(OFFICIAL_LOGGED_IN_QUERY, "hush"), "4c68c8624d737112c91818c11017d24d334b524cb5c2b8ba08daa056f7395ddb");
  assert.equal(signShopifyAppProxyQuery(OFFICIAL_ANONYMOUS_QUERY, "hush"), "e072b6d7e6622d85912a5214b860d3100dc1e73d9bc29f43796ac8c9ff8093cb");
});

function signedProxyQuery(input: { shop?: string; path?: string; timestamp?: number; customer?: string }) {
  const secret = "s".repeat(48);
  const query = new URLSearchParams({
    shop: input.shop ?? "carpetup.myshopify.com",
    logged_in_customer_id: input.customer ?? "",
    path_prefix: input.path ?? "/apps/curtainsuk-decision",
    timestamp: String(input.timestamp ?? 1_000),
  }).toString();
  return { secret, query: `${query}&signature=${signShopifyAppProxyQuery(query, secret)}` };
}

test("app-proxy auth verifies HMAC, shop, path and replay window independently of Origin", () => {
  const valid = signedProxyQuery({ timestamp: 1_000, customer: "42" });
  assert.deepEqual(verifyShopifyAppProxyQuery(valid.query, {
    secret: valid.secret,
    allowedShops: ["carpetup.myshopify.com"],
    allowedPathPrefixes: ["/apps/curtainsuk-decision"],
    nowSeconds: 1_050,
  }), {
    shop: "carpetup.myshopify.com",
    pathPrefix: "/apps/curtainsuk-decision",
    loggedInCustomerId: "42",
    timestamp: 1_000,
  });
  assert.throws(() => verifyShopifyAppProxyQuery(valid.query.replace(/.$/, "0"), {
    secret: valid.secret,
    allowedShops: ["carpetup.myshopify.com"],
    allowedPathPrefixes: ["/apps/curtainsuk-decision"],
    nowSeconds: 1_050,
  }), /SHOPIFY_PROXY_SIGNATURE_INVALID/);
  assert.throws(() => verifyShopifyAppProxyQuery(valid.query, {
    secret: valid.secret,
    allowedShops: ["carpetup.myshopify.com"],
    allowedPathPrefixes: ["/apps/curtainsuk-decision"],
    nowSeconds: 1_301,
  }), /SHOPIFY_PROXY_REQUEST_EXPIRED/);

  const wrongShop = signedProxyQuery({ shop: "other.myshopify.com", timestamp: 1_000 });
  assert.throws(() => verifyShopifyAppProxyQuery(wrongShop.query, {
    secret: wrongShop.secret,
    allowedShops: ["carpetup.myshopify.com"],
    allowedPathPrefixes: ["/apps/curtainsuk-decision"],
    nowSeconds: 1_000,
  }), /SHOPIFY_PROXY_SHOP_DENIED/);

  const wrongPath = signedProxyQuery({ path: "/apps/not-curtainsuk", timestamp: 1_000 });
  assert.throws(() => verifyShopifyAppProxyQuery(wrongPath.query, {
    secret: wrongPath.secret,
    allowedShops: ["carpetup.myshopify.com"],
    allowedPathPrefixes: ["/apps/curtainsuk-decision"],
    nowSeconds: 1_000,
  }), /SHOPIFY_PROXY_PATH_DENIED/);
});

test("ambiguous duplicate signatures are rejected", () => {
  const valid = signedProxyQuery({ timestamp: 1_000 });
  assert.throws(() => verifyShopifyAppProxyQuery(`${valid.query}&signature=${"0".repeat(64)}`, {
    secret: valid.secret,
    allowedShops: ["carpetup.myshopify.com"],
    allowedPathPrefixes: ["/apps/curtainsuk-decision"],
    nowSeconds: 1_000,
  }), /SHOPIFY_PROXY_SIGNATURE_MISSING/);
});

test("proxy rate keys bind the signed shop, operation and client address", () => {
  const input = { shop: "carpetup.myshopify.com", clientAddress: "203.0.113.5", operation: "price", secret: "s".repeat(48) };
  assert.equal(shopifyProxyRateLimitFingerprint(input), shopifyProxyRateLimitFingerprint(input));
  assert.notEqual(shopifyProxyRateLimitFingerprint(input), shopifyProxyRateLimitFingerprint({ ...input, operation: "review-request" }));
  assert.notEqual(shopifyProxyRateLimitFingerprint(input), shopifyProxyRateLimitFingerprint({ ...input, clientAddress: "203.0.113.6" }));
});

function pngBytes(suffix = "") {
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from(suffix)]);
}

test("evidence verification uses magic bytes, MIME, extension and hard size limits", () => {
  const verified = verifyEvidencePayload({
    kind: "PHOTO",
    fileName: "window.png",
    claimedContentType: "image/png",
    bytes: pngBytes("safe test image"),
  });
  assert.equal(verified.detectedContentType, "image/png");
  assert.match(verified.sha256Hex, /^[a-f0-9]{64}$/);
  assert.throws(() => verifyEvidencePayload({
    kind: "PHOTO",
    fileName: "window.jpg",
    claimedContentType: "image/jpeg",
    bytes: pngBytes(),
  }), /REVIEW_EVIDENCE_INVALID/);
  assert.throws(() => verifyEvidencePayload({
    kind: "PHOTO",
    fileName: "..\\window.png",
    claimedContentType: "image/png",
    bytes: pngBytes(),
  }), /REVIEW_EVIDENCE_INVALID/);
  assert.throws(() => verifyEvidencePayload({
    kind: "PHOTO",
    fileName: "drawing.pdf",
    claimedContentType: "application/pdf",
    bytes: Buffer.from("%PDF-1.7\n"),
  }), /REVIEW_EVIDENCE_INVALID/);
  assert.throws(() => verifyEvidencePayload({
    kind: "DRAWING",
    fileName: "huge.png",
    claimedContentType: "image/png",
    bytes: new Uint8Array(3 * 1024 * 1024 + 1).fill(0x89),
  }), /REVIEW_EVIDENCE_INVALID/);
});

test("malware scanning is fail-closed and never promotes unavailable scans", async () => {
  const clean = verifyEvidencePayload({ kind: "PHOTO", fileName: "clean.png", claimedContentType: "image/png", bytes: pngBytes("ordinary") });
  const malicious = verifyEvidencePayload({ kind: "PHOTO", fileName: "bad.png", claimedContentType: "image/png", bytes: pngBytes("EICAR-STANDARD-ANTIVIRUS-TEST-FILE") });
  assert.equal((await scanEvidencePayload(new DeterministicTestMalwareScanner(), clean)).state, "CLEAN");
  assert.equal((await scanEvidencePayload(new DeterministicTestMalwareScanner(), malicious)).state, "REJECTED");
  assert.equal((await scanEvidencePayload(new UnavailableMalwareScanner(), clean)).state, "QUARANTINED");
  assert.equal((await scanEvidencePayload({ scan: async () => { throw new Error("offline"); } }, clean)).state, "QUARANTINED");
});

test("retention and orphan cleanup plans preserve held, current and referenced evidence", () => {
  assert.equal(evidenceRetentionExpiry("2026-01-01T00:00:00.000Z", 30), "2026-01-31T00:00:00.000Z");
  const deletable = planRetentionDeletion([
    { objectPath: "expired", state: "CLEAN", retentionExpiresAt: "2026-01-01T00:00:00.000Z" },
    { objectPath: "held", state: "CLEAN", retentionExpiresAt: "2026-01-01T00:00:00.000Z", legalHold: true },
    { objectPath: "current", state: "CLEAN", retentionExpiresAt: "2027-01-01T00:00:00.000Z" },
  ], new Date("2026-09-07T00:00:00.000Z"));
  assert.deepEqual(deletable.map((item) => item.objectPath), ["expired"]);
  const orphans = planOrphanCleanup({
    objects: [
      { objectPath: "old-orphan", createdAt: "2026-09-01T00:00:00.000Z" },
      { objectPath: "referenced", createdAt: "2026-09-01T00:00:00.000Z" },
      { objectPath: "new-orphan", createdAt: "2026-09-06T23:00:00.000Z" },
    ],
    referencedObjectPaths: new Set(["referenced"]),
    now: new Date("2026-09-07T00:00:00.000Z"),
    graceHours: 48,
  });
  assert.deepEqual(orphans.map((item) => item.objectPath), ["old-orphan"]);
});

test("staff evidence tokens are short-lived and bound to evidence plus actor", () => {
  const claims = {
    evidenceId: "7fac22f6-f2bc-4f68-91ae-4bbc1542b39c",
    actorId: "be443d35-2581-4dc9-a93f-8906847bc967",
  };
  const secret = "e".repeat(48);
  const token = createEvidenceAccessTokenWithSecret(claims, secret, { nowSeconds: 1_000, ttlSeconds: 60, nonce: "0123456789abcdef" });
  assert.equal(verifyEvidenceAccessTokenWithSecret(token, claims, secret, 1_030), true);
  assert.equal(verifyEvidenceAccessTokenWithSecret(token, { ...claims, actorId: "d95441bd-a815-433e-ae6c-4ab37c27fc0a" }, secret, 1_030), false);
  assert.equal(verifyEvidenceAccessTokenWithSecret(token, claims, secret, 1_061), false);
});

test("gateway and staff responses are no-store and request envelopes are bounded", () => {
  assert.match(PUBLIC_NO_STORE_HEADERS["Cache-Control"], /no-store/);
  assert.match(PRIVATE_NO_STORE_HEADERS["Cache-Control"], /private/);
  assert.doesNotThrow(() => assertBoundedProxyRequest(new Request("https://example.test", {
    method: "POST",
    headers: { "content-type": "application/json", "content-length": "20" },
    body: JSON.stringify({ width: 100 }),
  }), { methods: ["POST"], maximumBytes: 100, acceptedContentTypes: ["application/json"] }));
  assert.throws(() => assertBoundedProxyRequest(new Request("https://example.test", {
    method: "POST",
    headers: { "content-type": "text/plain", "content-length": "20" },
    body: "not json",
  }), { methods: ["POST"], maximumBytes: 100, acceptedContentTypes: ["application/json"] }), /SHOPIFY_PROXY_CONTENT_TYPE_DENIED/);

  assert.doesNotThrow(() => assertSameOriginJsonMutation(new Request("https://admin.example.test/api/private", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://admin.example.test" },
    body: "{}",
  })));
  assert.throws(() => assertSameOriginJsonMutation(new Request("https://admin.example.test/api/private", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://attacker.example" },
    body: "{}",
  })), /PRIVATE_MUTATION_ORIGIN_DENIED/);
});

test("multipart bodies have a hard streaming cap without trusting Content-Length", async () => {
  const withoutDeclaredLength = new Request("https://example.test/review", {
    method: "POST",
    headers: { "content-type": "multipart/form-data; boundary=test" },
    body: Buffer.alloc(101, 1),
  });
  await assert.rejects(() => readHardLimitedRequestBytes(withoutDeclaredLength, 100), /SHOPIFY_PROXY_REQUEST_TOO_LARGE/);

  const misleadingLength = new Request("https://example.test/review", {
    method: "POST",
    headers: { "content-type": "multipart/form-data; boundary=test", "content-length": "1" },
    body: Buffer.alloc(101, 1),
  });
  assert.doesNotThrow(() => assertBoundedProxyRequest(misleadingLength, {
    methods: ["POST"],
    maximumBytes: 100,
    acceptedContentTypes: ["multipart/form-data"],
  }));
  await assert.rejects(() => readHardLimitedRequestBytes(misleadingLength, 100), /SHOPIFY_PROXY_REQUEST_TOO_LARGE/);
});
