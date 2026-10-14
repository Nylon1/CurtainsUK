import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  createHostedCushionHandler,
  type HostedCushionServices,
} from "../hosted-server";
import { cushionOwnerHash } from "../hosted-repository";
import { createLocalCushionRepository } from "../repository";
import { quoteCushionSet } from "../pricing";
import {
  parseCushionSpec,
  type CushionDesign,
  type CushionPricingRules,
  type FabricCuttingFacts,
} from "../domain";
import {
  signShopifyAppProxyQuery,
  verifyShopifyAppProxyQuery,
} from "../../storefront/security/shopify-app-proxy-core";
import {
  EndpointRateLimitError,
  EndpointRateLimitUnavailableError,
} from "../../storefront/security/endpoint-rate-limit";

const secret = "synthetic-hosted-rehearsal-secret-never-live";
const nowSeconds = 1791982800;
const design: CushionDesign = {
  version: 1,
  id: "shared-name",
  name: "My sofa",
  scene: "sofa-2",
  colours: { furniture: "#123456", wall: "#eeeeee", floor: "#dddddd" },
  pieces: [
    {
      spec: {
        version: 1,
        id: "square-one",
        sizeId: "square-50",
        fabricId: "synthetic-plain",
        filling: "filled",
        edge: "unpiped",
        placementMm: { x: 100, y: 100 },
        quantity: 1,
      },
      position: { slot: 0, offsetX: 0, offsetY: 0, rotation: 0 },
    },
  ],
};
// Synthetic commercial/workroom facts only. Never loaded by production services.
const rules: CushionPricingRules = {
  version: "offline-hosted-rehearsal",
  marginBasisPoints: 4000,
  vatBasisPoints: 2000,
  carriageMinor: null,
  customerDeliveryGrossMinor: 495,
  supplierCarriageMinor: 0,
  construction: {
    version: "synthetic-confirmed",
    confirmed: true,
    seamAllowanceMm: 20,
    pipingStripWidthMm: null,
    pipingJoinAllowanceMm: null,
    pipingCut: null,
    pipingConfirmed: false,
  },
};
const fabric: FabricCuttingFacts = {
  id: "synthetic-plain",
  fullWidthMm: 1400,
  usableWidthMm: null,
  pattern: { kind: "plain", horizontalRepeatMm: 0, verticalRepeatMm: 0 },
  directional: false,
  calibration: {
    imageUrl: "https://example.invalid/synthetic.jpg",
    physicalWidthMm: 1400,
    physicalHeightMm: 1000,
    orientation: "upright",
    tileable: false,
    evidence: "Synthetic test",
  },
  supplierCostMinorPerMetre: 2000,
  minimumOrderMetres: 1,
  orderIncrementMetres: 0.01,
  availableMetres: 100,
};

function request(
  operation: string,
  customer = "1001",
  body?: unknown,
  params: Record<string, string> = {},
) {
  const query = new URLSearchParams({
    shop: "carpetup.myshopify.com",
    path_prefix: "/apps/curtainsuk-decision",
    logged_in_customer_id: customer,
    timestamp: String(nowSeconds),
    ...params,
  });
  query.set("signature", signShopifyAppProxyQuery(query.toString(), secret));
  return new Request(
    `https://example.invalid/api/cushion-studio/${operation}?${query}`,
    {
      method: body === undefined ? "GET" : "POST",
      ...(body === undefined
        ? {}
        : {
            headers: {
              "content-type": "application/json",
              origin: "https://www.curtainsuk.com",
            },
            body: JSON.stringify(body),
          }),
    },
  );
}
async function fixture(t: TestContext) {
  let networkCalls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    networkCalls++;
    throw new Error("OFFLINE_REHEARSAL_NETWORK_FORBIDDEN");
  });
  t.after(() => {
    assert.equal(
      networkCalls,
      0,
      "The hosted rehearsal must never reach the network",
    );
  });
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "cushion-hosted-journey-"),
  );
  t.after(() => rm(directory, { recursive: true, force: true }));
  const state = {
    enabled: true,
    purchase: false,
    facts: structuredClone(fabric),
    rules: structuredClone(rules),
    authenticationCalls: 0,
    executions: 0,
  };
  const repositories = new Map<
    string,
    ReturnType<typeof createLocalCushionRepository>
  >();
  const repository = (owner: string) => {
    if (!repositories.has(owner))
      repositories.set(
        owner,
        createLocalCushionRepository(path.join(directory, owner)),
      );
    return repositories.get(owner)!;
  };
  const unavailable = async (): Promise<never> => {
    throw new Error("UNEXPECTED_NETWORK_SERVICE");
  };
  const services: HostedCushionServices = {
    enabled: () => state.enabled,
    purchasesEnabled: () => state.purchase,
    authenticate: async ({ request }) => {
      state.authenticationCalls++;
      return verifyShopifyAppProxyQuery(new URL(request.url).search, {
        secret,
        allowedShops: ["carpetup.myshopify.com"],
        allowedPathPrefixes: ["/apps/curtainsuk-decision"],
        nowSeconds,
      });
    },
    repository,
    catalogue: unavailable,
    sample: unavailable,
    asset: unavailable,
    mixed: unavailable,
    quote: async (body) => {
      const specs = (body.specs as unknown[]).map(parseCushionSpec);
      const inputs = specs.map((spec) => ({ spec, facts: state.facts }));
      return {
        quotes: inputs.map((input) => quoteCushionSet([input], state.rules)),
        setQuote: quoteCushionSet(inputs, state.rules),
        audience: "owner-local-review",
        purchaseEnabled: false,
        source: "server",
        revalidatedAt: new Date(nowSeconds * 1000).toISOString(),
      };
    },
    checkoutServices: (context) => {
      const repo = repository(cushionOwnerHash(context));
      return {
        mode: "REVIEW",
        now: () => new Date(nowSeconds * 1000),
        facts: async () => structuredClone(state.facts),
        rules: async () => state.rules,
        identity: async (id) => ({
          id,
          brand: "Synthetic",
          design: "Plain",
          colour: "Test",
        }),
        persist: (input) => repo.appendCheckout(input),
        existing: (key) => repo.checkout(key),
        execute: async (contract) => {
          state.executions++;
          assert.equal(contract.paymentEnabled, false);
          return {
            status: "CALCULATED",
            paymentEnabled: false,
            shopifyWritePerformed: false,
            checkoutUrl: null,
            draftOrderId: null,
            draftOrderName: null,
          };
        },
      };
    },
  };
  const handler = createHostedCushionHandler(services);
  const call = (
    operation: string,
    customer = "1001",
    body?: unknown,
    params?: Record<string, string>,
  ) => handler(request(operation, customer, body, params), ["api", operation]);
  return { state, services, handler, call, repository };
}

test("hosted route stays inert when disabled and authenticates every enabled request", async (t) => {
  const f = await fixture(t);
  f.state.enabled = false;
  assert.equal((await f.call("designs")).status, 404);
  assert.equal(f.state.authenticationCalls, 0);
  f.state.enabled = true;
  const signed = request("designs");
  const url = new URL(signed.url);
  url.searchParams.set("logged_in_customer_id", "2002");
  assert.equal(
    (await f.handler(new Request(url), ["api", "designs"])).status,
    403,
  );
  for (const params of [
    { timestamp: String(nowSeconds - 301) },
    { shop: "other.myshopify.com" },
    { path_prefix: "/apps/other" },
  ] as Record<string, string>[]) {
    assert.equal(
      (await f.call("designs", "1001", undefined, params)).status,
      403,
    );
  }
  const crossOrigin = request("designs", "1001", {
    design,
    expectedRevision: 0,
  });
  crossOrigin.headers.set("origin", "https://other.example");
  assert.equal((await f.handler(crossOrigin, ["api", "designs"])).status, 403);
  assert.equal(f.state.executions, 0);
});

test("signed account save and restore isolate owners and retain revision conflict behavior", async (t) => {
  const f = await fixture(t);
  const anonymous = await f.call("designs", "");
  assert.equal(anonymous.status, 401);
  assert.equal((await anonymous.json()).signInUrl, "/account/login");
  const saved = await f.call("designs", "1001", {
    design,
    expectedRevision: 0,
  });
  assert.equal(saved.status, 200);
  assert.match(saved.headers.get("cache-control")!, /no-store, private/);
  assert.equal(saved.headers.get("set-cookie"), null);
  assert.equal((await saved.json()).saved.revision, 1);
  assert.equal(
    (await f.call("designs", "1001", { design, expectedRevision: 0 })).status,
    409,
  );
  assert.equal(
    (await (await f.call("designs", "2002")).json()).designs.length,
    0,
  );
  assert.equal(
    (
      await (
        await f.call("designs", "2002", undefined, { id: design.id })
      ).json()
    ).saved,
    null,
  );
  const other = { ...design, name: "Other account" };
  assert.equal(
    (await f.call("designs", "2002", { design: other, expectedRevision: 0 }))
      .status,
    200,
  );
  assert.equal(
    (
      await (
        await f.call("designs", "1001", undefined, { id: design.id })
      ).json()
    ).saved.design.name,
    design.name,
  );
  assert.equal(
    (
      await (
        await f.call("designs", "2002", undefined, { id: design.id })
      ).json()
    ).saved.design.name,
    other.name,
  );
});

test("hosted quote returns retail-only data including fixed delivery when goods need review", async (t) => {
  const f = await fixture(t);
  const specs = design.pieces.map((piece) => piece.spec);
  const response = await f.call("quote", "", { specs });
  assert.equal(response.status, 200);
  const ready = await response.json();
  assert.equal(ready.setQuote.ready, true);
  assert.equal(ready.setQuote.totalMinor, 8135);
  assert.equal(ready.purchaseEnabled, false);
  assert.doesNotMatch(
    JSON.stringify(ready),
    /supplierCost|carrierCost|staffPricing|cutPlan|knownCost|costLines|availableMetres/,
  );
  f.state.facts.supplierCostMinorPerMetre = null;
  const unready = await (await f.call("quote", "", { specs })).json();
  assert.equal(unready.setQuote.totalMinor, null);
  assert.equal(unready.setQuote.deliveryGrossMinor, 495);
  assert.equal(unready.setQuote.ready, false);
});

test("hosted checkout saves immutable evidence, revalidates stale pricing and reuses retry identities", async (t) => {
  const f = await fixture(t);
  const specs = design.pieces.map((piece) => piece.spec);
  const quoted = await (await f.call("quote", "1001", { specs })).json();
  const input = {
    designId: design.id,
    specs,
    expectedQuoteId: quoted.setQuote.quoteId,
    idempotencyKey: "offline-hosted-retry",
  };
  assert.equal((await f.call("checkout", "1001", input)).status, 409);
  f.state.purchase = true; // In-memory test seam only; production environment flags stay untouched.
  assert.equal((await f.call("checkout", "1001", input)).status, 409);
  await f.call("designs", "1001", { design, expectedRevision: 0 });
  assert.equal((await f.call("checkout", "2002", input)).status, 409);
  f.state.facts.supplierCostMinorPerMetre = 2100;
  const changed = await f.call("checkout", "1001", input);
  assert.equal(changed.status, 409);
  assert.equal((await changed.json()).code, "CUSHION_PRICE_OR_SPEC_CHANGED");
  assert.equal(f.state.executions, 0);
  f.state.facts.supplierCostMinorPerMetre = 2000;
  const first = await f.call("checkout", "1001", input);
  assert.equal(first.status, 200);
  assert.deepEqual(await first.json(), {
    checkoutUrl: null,
    purchaseEnabled: false,
    status: "CALCULATED",
  });
  const context = verifyShopifyAppProxyQuery(
    new URL(request("designs").url).search,
    {
      secret,
      allowedShops: ["carpetup.myshopify.com"],
      allowedPathPrefixes: ["/apps/curtainsuk-decision"],
      nowSeconds,
    },
  );
  const repo = f.repository(cushionOwnerHash(context));
  const persisted = (await repo.checkout(input.idempotencyKey))!;
  assert.equal(persisted.contract.expected.shippingGrossAmountMinor, 495);
  assert.equal(persisted.contract.expected.orderGrossAmountMinor, 8135);
  const changedDesign = structuredClone(design);
  changedDesign.pieces[0].spec.placementMm.x = 200;
  await f.call("designs", "1001", {
    design: changedDesign,
    expectedRevision: 1,
  });
  assert.equal((await f.call("checkout", "1001", input)).status, 200);
  assert.deepEqual(
    (await repo.checkout(input.idempotencyKey))!.snapshots,
    persisted.snapshots,
  );
  assert.equal(persisted.snapshots[0].spec.placementMm.x, 100);
  assert.equal(f.state.executions, 2);
});

test("hosted errors retain rate-limit retry guidance and safe client error statuses", async (t) => {
  const f = await fixture(t);
  for (const [error, status] of [
    [new EndpointRateLimitError(12), 429],
    [new EndpointRateLimitUnavailableError(), 503],
  ] as const) {
    const handler = createHostedCushionHandler({
      ...f.services,
      authenticate: async () => {
        throw error;
      },
    });
    const response = await handler(request("designs"), ["api", "designs"]);
    assert.equal(response.status, status);
    if (status === 429) assert.equal(response.headers.get("retry-after"), "12");
  }
  const malformed = request("designs", "1001", { design, expectedRevision: 0 });
  assert.equal(
    (
      await f.handler(
        new Request(malformed.url, {
          method: "POST",
          headers: malformed.headers,
          body: "{",
        }),
        ["api", "designs"],
      )
    ).status,
    400,
  );
  malformed.headers.set("content-length", "131073");
  assert.equal((await f.handler(malformed, ["api", "designs"])).status, 413);
  const broken = createHostedCushionHandler({
    ...f.services,
    quote: async () => {
      throw new Error("private supplier-cost credential-detail");
    },
  });
  const error = await broken(request("quote", "1001", {}), ["api", "quote"]);
  assert.equal(error.status, 503);
  assert.doesNotMatch(await error.text(), /private|supplier|credential/);
});

test("hosted purchase flag requires a confirmed dispatch estimate while price exploration stays available", async (t) => {
  const f = await fixture(t);
  f.state.purchase = true;
  const body = { specs: design.pieces.map((piece) => piece.spec) };
  const absent = await (await f.call("quote", "1001", body)).json();
  assert.equal(absent.setQuote.ready, true);
  assert.equal(absent.purchaseEnabled, false);
  assert.equal(absent.setQuote.dispatchEstimate, null);
  f.state.rules.dispatchEstimate = {
    version: "synthetic-only",
    status: "confirmed",
    minimumWorkingDays: 12,
    maximumWorkingDays: 17,
    startsFrom: "order-confirmation",
    confirmedAt: "2026-10-14T12:00:00Z",
    approvalReference: "SYNTHETIC-TEST-ONLY",
  };
  const confirmed = await (await f.call("quote", "1001", body)).json();
  assert.equal(confirmed.purchaseEnabled, true);
  assert.notEqual(confirmed.setQuote.quoteId, absent.setQuote.quoteId);
  assert.match(confirmed.setQuote.dispatchEstimate.message, /dispatch/);
  assert.doesNotMatch(
    JSON.stringify(confirmed),
    /approvalReference|confirmedAt/,
  );
});
