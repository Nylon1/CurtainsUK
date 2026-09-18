import assert from "node:assert/strict";
import test from "node:test";
import { readSdgPortalStock, SDG_PORTAL_DETAIL_URL } from "../adapters/sanderson-design-group";
import { SdgPortalSession, SDG_PORTAL_LOGIN_URL, SDG_PORTAL_REFRESH_URL } from "../adapters/sdg-portal-session";
import { validateSupplierIntelligenceSnapshot } from "../../supplier-intelligence/validation";

const now = new Date("2026-09-18T14:00:00.000Z");
const identities = [
  { supplierSku: "F0063/02", brandId: "clarke-and-clarke" },
  { supplierSku: "F0650/12", brandId: "clarke-and-clarke" },
];

test("portal details become exact stock-only observations through the existing 72-hour validator", async () => {
  let request: RequestInit | undefined;
  const result = await readSdgPortalStock({
    identities,
    bearerToken: "test-token",
    clock: () => now,
    fetchImpl: async (url, init) => {
      assert.equal(url, SDG_PORTAL_DETAIL_URL);
      request = init;
      return Response.json([
        { productCode: "F0063/02", productDesignName: "Dotty Charcoal", productStockUnit: "Metres", stockInformation: { primaryStock: 385.6, offsiteStock: 12, futureStock: 50, primaryStockDescription: "Available Now", purchaseOrderData: { purchaseOrders: [{ dueStock: 50, dueDate: "2026-10-05" }] }, locations: [{ siteBatches: [{ batchId: "B1", batchQuantity: 20, batchPieces: [{ pieceId: "P1", pieceCurrentLength: 20 }] }] }] } },
        { productCode: "F0650/12", productStockUnit: "Metres", stockInformation: { primaryStock: 0 } },
      ]);
    },
  });
  assert.equal(request?.method, "POST");
  assert.deepEqual(JSON.parse(String(request?.body)).productCriteria.map((item: { productCode: string }) => item.productCode), identities.map((item) => item.supplierSku));
  assert.equal(result.snapshots.length, 2);
  assert.deepEqual(result.snapshots.map((item) => item.aggregate_available_quantity), [385.6, 0]);
  assert.equal(result.snapshots[0].standard_trade_price, null);
  assert.equal(result.snapshots[0].sample_available, null);
  assert.equal(result.exceptions.length, 0);
  assert.equal(result.details[0].productDesignName, "Dotty Charcoal");
  assert.deepEqual([result.details[0].primaryMetres, result.details[0].offsiteMetres, result.details[0].futureMetres], [385.6, 12, 50]);
  assert.deepEqual(result.details[0].purchaseOrders, [{ dueDate: "2026-10-05", dueMetres: 50 }]);
  assert.equal(result.details[0].batches[0].pieces[0].lengthMetres, 20);
  const validated = validateSupplierIntelligenceSnapshot(result.snapshots[0], {
    known_supplier: true, known_sku: true, allowed_currencies: ["GBP"], allowed_stock_units: ["METRE"], required_price_field: "CUT_TRADE_PRICE", freshness_policies: [],
  }, now);
  assert.equal(validated.status, "VALIDATED");
  assert.equal(validated.stock_expires_at, "2026-09-21T14:00:00.000Z");
});

test("missing, ambiguous and non-metre stock fail closed without converting absence to zero", async () => {
  const result = await readSdgPortalStock({
    identities: [...identities, { supplierSku: "F0419/04", brandId: "clarke-and-clarke" }], bearerToken: "test-token", clock: () => now,
    fetchImpl: async () => Response.json([
      { productCode: "F0063/02", productStockUnit: "Metres", stockInformation: {} },
      { productCode: "F0650/12", productStockUnit: "Roll", stockInformation: { primaryStock: 12 } },
    ]),
  });
  assert.equal(result.snapshots.length, 0);
  assert.deepEqual(result.exceptions.map((item) => item.reason), ["MISSING_STOCK_OR_NON_METRE_UNIT", "MISSING_STOCK_OR_NON_METRE_UNIT", "MISSING_PORTAL_SKU"]);
});

test("supplier authentication, throttling and unexpected identities stop the read", async () => {
  for (const [status, code] of [[401, "SDG_PORTAL_AUTH_FAILED"], [429, "SDG_PORTAL_RATE_LIMITED"]] as const) {
    await assert.rejects(readSdgPortalStock({ identities, bearerToken: "test-token", sleep: async () => {}, fetchImpl: async () => new Response(null, { status }) }), new RegExp(code));
  }
  await assert.rejects(readSdgPortalStock({ identities, bearerToken: "test-token", fetchImpl: async () => Response.json([{ productCode: "OTHER", productStockUnit: "Metres", stockInformation: { primaryStock: 100 } }]) }), /SDG_PORTAL_UNREQUESTED_SKU/);
});

test("portal session uses first-party login cookies and refreshes the in-memory token", async () => {
  let current = new Date("2026-09-18T14:00:00.000Z");
  const requests: { url: string; cookie: string | null; body: string | null }[] = [];
  let refreshes = 0;
  const session = new SdgPortalSession({
    email: "test@example.invalid", password: "local-test-secret", clock: () => current,
    fetchImpl: async (url, init) => {
      const uri = String(url);
      const headers = new Headers(init?.headers);
      requests.push({ url: uri, cookie: headers.get("Cookie"), body: typeof init?.body === "string" ? init.body : null });
      if (uri === SDG_PORTAL_LOGIN_URL) return Response.json({ ok: true });
      if (uri.endsWith("/login")) return new Response("login", { status: 200, headers: { "Set-Cookie": "session=test-session; HttpOnly; Secure; Path=/" } });
      if (uri === SDG_PORTAL_REFRESH_URL) {
        refreshes += 1;
        return Response.json({ token: `in-memory-${refreshes}`, payload: { exp: Math.floor(current.getTime() / 1000) + 60 } });
      }
      throw new Error("unexpected URL");
    },
  });
  assert.equal(await session.getBearerToken(), "in-memory-1");
  assert.equal(requests[1].url, SDG_PORTAL_LOGIN_URL);
  assert.deepEqual(JSON.parse(requests[1].body!), { email: "test@example.invalid", password: "local-test-secret" });
  assert.equal(requests[1].cookie, "session=test-session");
  assert.equal(requests[2].cookie, "session=test-session");
  current = new Date("2026-09-18T14:00:51.000Z");
  assert.equal(await session.getBearerToken(), "in-memory-2");
  assert.equal(refreshes, 2);
  assert.equal(session.stats.refreshCount, 2);
  assert.equal(session.stats.initialTokenLifetimeSeconds, 60);
});

test("session stops on missing cookie or failed refresh without leaking credentials", async () => {
  const session = new SdgPortalSession({ email: "test@example.invalid", password: "secret-test-value", fetchImpl: async (url) => {
    if (String(url) === SDG_PORTAL_LOGIN_URL) return Response.json({ ok: true });
    if (String(url).endsWith("/login")) return new Response("login");
    return Response.json({ ok: true });
  } });
  await assert.rejects(session.login(), /SDG_PORTAL_SESSION_COOKIE_ABSENT/);
  const failedRefresh = new SdgPortalSession({ email: "test@example.invalid", password: "secret-test-value", fetchImpl: async (url) => {
    if (String(url) === SDG_PORTAL_LOGIN_URL) return Response.json({ ok: true });
    if (String(url).endsWith("/login")) return new Response("login", { headers: { "Set-Cookie": "session=one; Path=/" } });
    return new Response(null, { status: 401 });
  } });
  await assert.rejects(failedRefresh.login(), /SDG_PORTAL_SESSION_EXPIRED/);
});

test("429 retries respect Retry-After and do not turn absence into stock", async () => {
  const delays: number[] = [];
  let calls = 0;
  const result = await readSdgPortalStock({
    identities: identities.slice(0, 1), bearerToken: "test-token", clock: () => now,
    sleep: async (ms) => { delays.push(ms); },
    fetchImpl: async () => {
      calls += 1;
      if (calls === 1) return new Response(null, { status: 429, headers: { "Retry-After": "1" } });
      return Response.json([{ productCode: "F0063/02", productStockUnit: "Metres", stockInformation: { primaryStock: 0 } }]);
    },
  });
  assert.deepEqual(delays, [1000]);
  assert.equal(result.batches[0].throttled, 1);
  assert.equal(result.batches[0].retries, 1);
  assert.equal(result.snapshots[0].aggregate_available_quantity, 0);
});

test("a portal batch 404 leaves every requested SKU unknown and later batches continue", async () => {
  const many = Array.from({ length: 101 }, (_, index) => ({ supplierSku: `SKU-${index}`, brandId: "sdg" }));
  let calls = 0;
  const result = await readSdgPortalStock({
    identities: many, bearerToken: "test-token", clock: () => now,
    fetchImpl: async () => {
      calls += 1;
      return calls === 1
        ? new Response(null, { status: 404 })
        : Response.json([{ productCode: "SKU-100", productStockUnit: "Metres", stockInformation: { primaryStock: 49.4 } }]);
    },
  });
  assert.equal(result.exceptions.length, 100);
  assert.ok(result.exceptions.every((item) => item.reason === "PORTAL_BATCH_HTTP_404"));
  assert.equal(result.snapshots.length, 1);
  assert.equal(result.snapshots[0].supplier_sku, "SKU-100");
  assert.equal(result.snapshots[0].aggregate_available_quantity, 49.4);
  assert.equal(result.batches.length, 2);
});

test("portal requests are bounded to 100 exact SKUs per batch", async () => {
  const sizes: number[] = [];
  const many = Array.from({ length: 101 }, (_, index) => ({ supplierSku: `SKU-${index}`, brandId: "sdg" }));
  const result = await readSdgPortalStock({
    identities: many, bearerToken: "test-token", clock: () => now,
    fetchImpl: async (_url, init) => {
      const criteria = JSON.parse(String(init?.body)).productCriteria as { productCode: string }[];
      sizes.push(criteria.length);
      return Response.json(criteria.map((item) => ({ productCode: item.productCode, productStockUnit: "Metre", stockInformation: { primaryStock: 1 } })));
    },
  });
  assert.deepEqual(sizes, [100, 1]);
  assert.equal(result.snapshots.length, 101);
});
