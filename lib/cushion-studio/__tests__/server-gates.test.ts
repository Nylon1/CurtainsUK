import assert from "node:assert/strict";
import test from "node:test";
import "../../../scripts/cushion-preview-register.mjs";

test("a discoverable noncurrent fabric returns an unpriced quote without supplier or stock authority", async () => {
  const { unconfirmedCuttingFacts } = await import("../catalogue");
  const { quoteCushion } = await import("../pricing");
  const { PREVIEW_PRICING_RULES } = await import("../domain");
  const record = {
    fabric_id: "unconfirmed-fabric",
    supplier_id: "sanderson-design-group",
    supplier_sku: "EXAMPLE/1",
    lifecycle_state: "UNKNOWN",
    full_width_mm: 1380,
    usable_width_mm: null,
    vertical_repeat_mm: 0,
    horizontal_repeat_mm: 0,
    pattern_match_type: null,
  } as Parameters<typeof unconfirmedCuttingFacts>[0];
  const facts = unconfirmedCuttingFacts(record);
  assert.equal(facts.fullWidthMm, 1380);
  assert.equal(facts.usableWidthMm, 1380);
  assert.equal(facts.usableWidthSource, "owner-single-width");
  assert.equal(facts.supplierCostMinorPerMetre, null);
  assert.equal(facts.availableMetres, null);
  const quote = quoteCushion(
    {
      version: 1,
      id: "unconfirmed-piece",
      sizeId: "square-45",
      fabricId: record.fabric_id,
      filling: "cover",
      edge: "unpiped",
      placementMm: { x: 100, y: 100 },
      quantity: 1,
    },
    facts,
    PREVIEW_PRICING_RULES,
  );
  assert.equal(quote.ready, false);
  assert.equal(quote.purchaseReady, false);
  assert.equal(quote.totalMinor, null);
  assert.ok(quote.issues.some((issue) => issue.includes("current-range status is not confirmed")));
  assert.ok(quote.issues.some((issue) => issue.includes("supplier net cost")));
});

test("local and hosted gates are off by default; cross-origin preview and checkout fail closed", async () => {
  const { handleCushionApi } = await import("../server");
  const { handleHostedCushionRequest } = await import("../hosted-server");
  const previous = process.env.CUSHION_STUDIO_LOCAL_PREVIEW;
  const hosted = process.env.CUSHION_STUDIO_HOSTED_ENABLED;
  try {
    delete process.env.CUSHION_STUDIO_LOCAL_PREVIEW;
    delete process.env.CUSHION_STUDIO_HOSTED_ENABLED;
    assert.equal(
      (
        await handleCushionApi(
          new Request("http://127.0.0.1/api/cushion-studio/catalogue"),
          "catalogue",
        )
      ).status,
      404,
    );
    assert.equal(
      (
        await handleHostedCushionRequest(
          new Request(
            "https://example.invalid/api/staging/shopify-proxy/cushion-studio",
          ),
          [],
        )
      ).status,
      404,
    );
    process.env.CUSHION_STUDIO_LOCAL_PREVIEW = "true";
    assert.equal(
      (
        await handleCushionApi(
          new Request("http://127.0.0.1/api/cushion-studio/checkout", {
            method: "POST",
            headers: { origin: "https://example.invalid" },
          }),
          "checkout",
        )
      ).status,
      403,
    );
    const response = await handleCushionApi(
      new Request("http://127.0.0.1/api/cushion-studio/checkout", {
        method: "POST",
      }),
      "checkout",
    );
    assert.equal(response.status, 409);
    assert.equal((await response.json()).purchaseEnabled, false);
    const malformed = await handleCushionApi(
      new Request("http://127.0.0.1/api/cushion-studio/quote", {
        method: "POST",
        body: "{",
      }),
      "quote",
    );
    assert.equal(malformed.status, 400);
  } finally {
    if (previous === undefined) delete process.env.CUSHION_STUDIO_LOCAL_PREVIEW;
    else process.env.CUSHION_STUDIO_LOCAL_PREVIEW = previous;
    if (hosted === undefined) delete process.env.CUSHION_STUDIO_HOSTED_ENABLED;
    else process.env.CUSHION_STUDIO_HOSTED_ENABLED = hosted;
  }
});

test("hosted owners derive from the signed shop/customer and cannot be anonymous", async () => {
  const { cushionOwnerHash } = await import("../hosted-repository");
  const context = {
    shop: "carpetup.myshopify.com",
    pathPrefix: "/apps/curtainsuk-decision",
    loggedInCustomerId: "123",
    timestamp: 123456,
  };
  assert.notEqual(
    cushionOwnerHash(context),
    cushionOwnerHash({ ...context, loggedInCustomerId: "456" }),
  );
  assert.throws(
    () => cushionOwnerHash({ ...context, loggedInCustomerId: null }),
    /SIGN_IN_REQUIRED/,
  );
});

test("paid webhook link reads the server-created completed draft and rejects a copied order", async () => {
  const { verifyCushionPaidDraftLink } = await import(
    "../../storefront/shopify-draft-order-server"
  );
  const { buildCushionDraftContract } = await import("../commerce");
  const { specDigest } = await import("../repository");
  const spec = {
    version: 1 as const,
    id: "test",
    sizeId: "square-50",
    fabricId: "test-fabric",
    filling: "cover" as const,
    edge: "unpiped" as const,
    placementMm: { x: 100, y: 100 },
    quantity: 1,
  };
  const now = new Date();
  const snapshot = {
    version: 1 as const,
    productType: "CUSHION" as const,
    id: "11111111-1111-4111-8111-111111111111",
    designId: "test",
    createdAt: now.toISOString(),
    spec,
    specSha256: specDigest(spec),
    fabricIdentity: {
      id: spec.fabricId,
      brand: "Test",
      design: "Test",
      colour: "Test",
    },
    rulesVersion: "test",
    price: {
      currency: "GBP" as const,
      goodsGrossMinor: 1200,
      goodsVatMinor: 200,
    },
    manufacturing: {},
    revalidatedAt: now.toISOString(),
  };
  const base = buildCushionDraftContract({
    snapshots: [snapshot],
    idempotencyKey: "test-paid-binding",
    shipping: { grossMinor: 600, vatMinor: 100, title: "Test" },
    now,
  });
  const contract = {
    ...base,
    environment: "PRODUCTION" as const,
    paymentEnabled: true,
  };
  const config = {
    mode: "CREATE_PRODUCTION_DRAFT" as const,
    deploymentStage: "PRODUCTION" as const,
    shopDomain: "carpetup.myshopify.com",
    clientId: "test-only-client",
    clientSecret: "test-only-secret-never-live",
    realPaymentsDisabledConfirmed: false,
    productionApproved: true,
    requestTimeoutMs: 1000,
  };
  let linkedOrder = "gid://shopify/Order/123";
  let reads = 0;
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/admin/oauth/access_token"))
      return Response.json({
        access_token: "synthetic-test-token",
        scope: "write_draft_orders,read_orders",
        expires_in: 3600,
      });
    const request = JSON.parse(String(init?.body));
    if (request.query.includes("currentAppInstallation"))
      return Response.json({
        data: {
          currentAppInstallation: {
            accessScopes: [
              { handle: "write_draft_orders" },
              { handle: "read_orders" },
            ],
          },
        },
      });
    reads++;
    assert.match(request.query, /query CushionPaidDraftLink/);
    assert.doesNotMatch(request.query, /mutation/);
    return Response.json({
      data: {
        draftOrders: {
          nodes: [
            {
              id: "gid://shopify/DraftOrder/456",
              status: "COMPLETED",
              order: { id: linkedOrder },
              customAttributes: contract.input.customAttributes,
            },
          ],
        },
      },
    });
  };
  assert.equal(
    await verifyCushionPaidDraftLink({
      contract,
      config,
      orderGid: "gid://shopify/Order/123",
      fetchImpl,
    }),
    "gid://shopify/DraftOrder/456",
  );
  linkedOrder = "gid://shopify/Order/999";
  await assert.rejects(
    verifyCushionPaidDraftLink({
      contract,
      config,
      orderGid: "gid://shopify/Order/123",
      fetchImpl,
    }),
    /DRAFT_LINK_INVALID/,
  );
  assert.equal(reads, 2);
});
