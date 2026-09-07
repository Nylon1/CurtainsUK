import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { scanEvidencePayload, verifyEvidencePayload } from "../security/evidence-core";
import { evidenceAccessTokenSha256 } from "../security/evidence-access-token-core";
import { CloudmersiveAdvancedMalwareScanner } from "../security/malware-scanner-core";
import { SHOPIFY_PROXY_OPERATION_POLICY } from "../security/shopify-proxy-operations";
import { shopifyProxyReplayFingerprint } from "../security/shopify-app-proxy-core";
import {
  quoteUkShipping,
  shippingRuleFromVersion,
  STAGING_UK_SHIPPING_RULES,
} from "../shipping";

function pngPayload() {
  return verifyEvidencePayload({
    kind: "PHOTO",
    fileName: "window.png",
    claimedContentType: "image/png",
    bytes: Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.from("phase5d"),
    ]),
  });
}

function cloudmersiveResponse(overrides: Record<string, unknown> = {}) {
  return {
    CleanResult: true,
    ContainsExecutable: false,
    ContainsInvalidFile: false,
    ContainsScript: false,
    ContainsPasswordProtectedFile: false,
    ContainsRestrictedFileFormat: false,
    ContainsMacros: false,
    ContainsXmlExternalEntities: false,
    ContainsInsecureDeserialization: false,
    ContainsHtml: false,
    ContainsUnsafeArchive: false,
    ContainsOleEmbeddedObject: false,
    ContainsUnwantedAction: false,
    FoundViruses: [],
    ...overrides,
  };
}

test("Cloudmersive advanced adapter sends an allowlisted private file scan and fails closed", async () => {
  let inspected = false;
  const cleanScanner = new CloudmersiveAdvancedMalwareScanner(
    "https://api.cloudmersive.test/virus/scan/file/advanced",
    "test-key-never-logged",
    1_000,
    async (_url, init) => {
      const headers = new Headers(init?.headers);
      assert.equal(headers.get("Apikey"), "test-key-never-logged");
      assert.equal(headers.get("restrictFileTypes"), ".jpg,.jpeg,.png,.webp,.heic,.heif,.pdf");
      assert.equal(headers.get("allowExecutables"), "false");
      assert.equal(headers.get("allowHtml"), "false");
      assert.equal(headers.get("allowUnsafeArchives"), "false");
      assert.equal(init?.cache, "no-store");
      assert.equal(init?.redirect, "error");
      inspected = true;
      return Response.json(cloudmersiveResponse());
    },
  );
  assert.equal((await cleanScanner.scan(pngPayload())).verdict, "CLEAN");
  assert.equal(inspected, true);

  const maliciousScanner = new CloudmersiveAdvancedMalwareScanner(
    "https://api.cloudmersive.test/virus/scan/file/advanced",
    "test-key-never-logged",
    1_000,
    async () => Response.json(cloudmersiveResponse({ ContainsScript: true })),
  );
  assert.equal((await maliciousScanner.scan(pngPayload())).verdict, "MALICIOUS");

  const malformedScanner = new CloudmersiveAdvancedMalwareScanner(
    "https://api.cloudmersive.test/virus/scan/file/advanced",
    "test-key-never-logged",
    1_000,
    async () => Response.json({ CleanResult: true }),
  );
  assert.deepEqual(await malformedScanner.scan(pngPayload()), {
    verdict: "UNAVAILABLE",
    provider: "cloudmersive-advanced",
    reference: null,
    failureCode: "INVALID_RESPONSE",
  });
});

test("an unexpected malware-provider exception remains quarantined with an auditable failure code", async () => {
  const result = await scanEvidencePayload({
    async scan() {
      throw new Error("test provider failure");
    },
  }, pngPayload());
  assert.equal(result.state, "QUARANTINED");
  assert.deepEqual(result.result, {
    verdict: "UNAVAILABLE",
    provider: "unavailable",
    reference: null,
    failureCode: "PROVIDER_ERROR",
  });
});

test("one-time evidence grants store only a non-reversible token digest", () => {
  const token = "v1.1000.evidence.actor.nonce.signature";
  assert.match(evidenceAccessTokenSha256(token), /^[a-f0-9]{64}$/);
  assert.notEqual(evidenceAccessTokenSha256(token), token);
  assert.notEqual(evidenceAccessTokenSha256(`${token}-changed`), evidenceAccessTokenSha256(token));
});

test("UK shipping defaults remain owner-blocked and database versions parse fail closed", () => {
  assert.equal(STAGING_UK_SHIPPING_RULES.length, 9);
  assert.ok(STAGING_UK_SHIPPING_RULES.every((rule) => rule.status === "AWAITING_OWNER_CONFIRMATION"));
  assert.equal(quoteUkShipping({ region: "UK_MAINLAND", parcelClass: "STANDARD" }).status, "RATE_REQUIRES_CONFIRMATION");

  const validated = shippingRuleFromVersion({
    rate_version_id: "rate-v1",
    region: "UK_MAINLAND",
    parcel_class: "STANDARD",
    gross_amount_minor: 1_800,
    currency: "GBP",
    status: "VALIDATED",
    effective_from: "2026-09-07T20:00:00.000Z",
    created_at: "2026-09-07T20:00:00.000Z",
  });
  assert.equal(validated.grossAmountMinor, 1_800);
  assert.equal(quoteUkShipping({ region: "UK_MAINLAND", parcelClass: "STANDARD", rules: [validated] }).status, "READY");
  assert.throws(() => shippingRuleFromVersion({
    rate_version_id: "rate-bad",
    region: "UK_MAINLAND",
    parcel_class: "STANDARD",
    gross_amount_minor: null,
    currency: "GBP",
    status: "VALIDATED",
    effective_from: "2026-09-07T20:00:00.000Z",
    created_at: "2026-09-07T20:00:00.000Z",
  }), /SHIPPING_RATE_RECORD_INVALID/);
});

test("staging shipping selection excludes future-effective rate versions", () => {
  const source = readFileSync(join(process.cwd(), "lib", "storefront", "shipping-repository.ts"), "utf8");
  assert.match(source, /\.lte\("effective_from", now\.toISOString\(\)\)/);
  assert.match(source, /\.order\("effective_from", \{ ascending: false \}\)/);
});

test("customer and staff endpoint policies separate browse, compute, upload and checkout pressure", () => {
  assert.deepEqual(SHOPIFY_PROXY_OPERATION_POLICY.catalog.rateLimit, { limit: 120, windowSeconds: 60 });
  assert.deepEqual(SHOPIFY_PROXY_OPERATION_POLICY.price.rateLimit, { limit: 60, windowSeconds: 60 });
  assert.deepEqual(SHOPIFY_PROXY_OPERATION_POLICY["review-request"].rateLimit, { limit: 6, windowSeconds: 3_600 });
  assert.ok(SHOPIFY_PROXY_OPERATION_POLICY["checkout-handoff"].rateLimit.limit > SHOPIFY_PROXY_OPERATION_POLICY["review-request"].rateLimit.limit);
});

test("signed mutation replay fingerprints are stable for identical requests and body-bound", () => {
  const input = {
    shop: "carpetup.myshopify.com",
    operation: "review-request" as const,
    signature: "a".repeat(64),
    bodySha256: "b".repeat(64),
    secret: "s".repeat(48),
  };
  assert.equal(shopifyProxyReplayFingerprint(input), shopifyProxyReplayFingerprint(input));
  assert.notEqual(shopifyProxyReplayFingerprint(input), shopifyProxyReplayFingerprint({ ...input, bodySha256: "c".repeat(64) }));
  assert.notEqual(shopifyProxyReplayFingerprint(input), shopifyProxyReplayFingerprint({ ...input, operation: "checkout-handoff" }));
});

test("Phase 5D security migration is private, append-only and never invents shipping rates", () => {
  const migration = readdirSync(join(process.cwd(), "supabase", "migrations"))
    .find((name) => name.endsWith("_phase5d_evidence_shipping_security.sql"));
  assert.ok(migration);
  const sql = readFileSync(join(process.cwd(), "supabase", "migrations", migration), "utf8");
  assert.match(sql, /staging_review_evidence_scan_attempts/);
  assert.match(sql, /verdict in \('CLEAN', 'MALICIOUS', 'UNAVAILABLE'\)/);
  assert.match(sql, /staging_review_evidence_access_grant_uses/);
  assert.match(sql, /on conflict \(grant_id\) do nothing/);
  assert.match(sql, /staging_shipping_rate_versions/);
  assert.match(sql, /AWAITING_OWNER_CONFIRMATION/);
  assert.match(sql, /gross_amount_minor, currency, status,[\s\S]{0,700}\n\s+null,/);
  assert.match(sql, /consume_staging_endpoint_slot/);
  assert.match(sql, /staging_shopify_proxy_replay_receipts/);
  assert.match(sql, /on conflict \(request_fingerprint_sha256\) do nothing/);
  assert.match(sql, /force row level security/);
  assert.match(sql, /revoke all on curtainsuk_private\.staging_review_evidence_scan_attempts/);
  assert.doesNotMatch(sql, /grant (insert|update|delete) on curtainsuk_private\.staging_review_evidence/);
});

test("signed proxy mutations claim replay receipts before processing customer content", () => {
  const route = readFileSync(join(process.cwd(), "app", "api", "staging", "shopify-proxy", "[operation]", "route.ts"), "utf8");
  assert.match(route, /selected === "review-request" \|\| selected === "checkout-handoff"/);
  assert.match(route, /readHardLimitedRequestBytes\(request\.clone\(\), policy\.maximumBytes\)/);
  assert.match(route, /claimShopifyMutationReplay/);
  assert.match(route, /SHOPIFY_PROXY_REPLAY_DETECTED/);
  assert.match(route, /REPLAY_DETECTED/);
});

test("scan failures are durably recorded and never promoted by application code", () => {
  const persistence = readFileSync(join(process.cwd(), "lib", "storefront", "security", "evidence-persistence.ts"), "utf8");
  assert.match(persistence, /record_staging_review_evidence_scan_attempt/);
  assert.match(persistence, /failure_code: scan\.result\.failureCode \?\? null/);
  assert.doesNotMatch(persistence, /verdict === "UNAVAILABLE"\) continue/);
});
