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
    squareDrapeConfirmed: true,
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

test("the existing app proxy accepts only the configured development-store origin", async (t) => {
  const f = await fixture(t);
  const previousOrigin = process.env.CURTAINSUK_CUSHION_ALLOWED_ORIGIN;
  t.after(() => {
    if (previousOrigin === undefined) delete process.env.CURTAINSUK_CUSHION_ALLOWED_ORIGIN;
    else process.env.CURTAINSUK_CUSHION_ALLOWED_ORIGIN = previousOrigin;
  });
  process.env.CURTAINSUK_CUSHION_ALLOWED_ORIGIN = "https://curtainsuk-dev.myshopify.com";
  f.services.authenticate = async ({ request }) => verifyShopifyAppProxyQuery(
    new URL(request.url).search,
    {
      secret,
      allowedShops: ["curtainsuk-dev.myshopify.com"],
      allowedPathPrefixes: ["/apps/curtainsuk-decision"],
      nowSeconds,
    },
  );
  f.services.asset = async (_asset, options) => Response.json(options);
  const params = { shop: "curtainsuk-dev.myshopify.com" };
  const asset = await f.handler(request("index.html", "1001", undefined, params), ["index.html"]);
  assert.equal(asset.status, 200);
  assert.deepEqual(await asset.json(), {
    base: "/apps/curtainsuk-decision/cushion-studio/",
    apiBase: "/apps/curtainsuk-decision/cushion-studio/api",
    ownerPreview: false,
  });
  const save = request("designs", "1001", { design, expectedRevision: 0 }, params);
  save.headers.set("origin", "https://curtainsuk-dev.myshopify.com");
  assert.equal((await f.handler(save, ["api", "designs"])).status, 200);
  const wrongOrigin = request("designs", "1001", { design, expectedRevision: 0 }, params);
  assert.equal((await f.handler(wrongOrigin, ["api", "designs"])).status, 403);
  assert.equal((await f.handler(request("designs"), ["api", "designs"])).status, 403);
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

test("hosted quote keeps release permission separate from dispatch eligibility", async (t) => {
  const f = await fixture(t);
  f.state.purchase = true;
  const body = { specs: design.pieces.map((piece) => piece.spec) };
  const absent = await (await f.call("quote", "1001", body)).json();
  assert.equal(absent.setQuote.ready, true);
  assert.equal(absent.purchaseEnabled, true);
  assert.equal(absent.setQuote.purchaseReady, false);
  assert.equal(absent.quotes[0].purchaseReady, false);
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
  assert.equal(confirmed.setQuote.purchaseReady, true);
  assert.equal(confirmed.quotes[0].purchaseReady, true);
  assert.notEqual(confirmed.setQuote.quoteId, absent.setQuote.quoteId);
  assert.match(confirmed.setQuote.dispatchEstimate.message, /dispatch/);
  assert.doesNotMatch(
    JSON.stringify(confirmed),
    /approvalReference|confirmedAt/,
  );

  // An explicitly approved-production service still rejects missing dispatch
  // before persistence/transport, even when the global flag is open.
  f.state.rules.dispatchEstimate = null;
  f.state.facts.supplierId = "synthetic-supplier";
  f.state.facts.supplierSku = "synthetic-sku";
  await f.call("designs", "1001", { design, expectedRevision: 0 });
  let persistCalls = 0;
  const guarded = createHostedCushionHandler({
    ...f.services,
    checkoutServices: (...args) => ({
      ...f.services.checkoutServices(...args),
      mode: "APPROVED_PRODUCTION",
      persist: async () => { persistCalls++; },
    }),
  });
  const requoted = await (await f.call("quote", "1001", body)).json();
  const rejected = await guarded(request("checkout", "1001", {
    designId: design.id,
    specs: body.specs,
    expectedQuoteId: requoted.setQuote.quoteId,
    idempotencyKey: "offline-missing-dispatch",
  }), ["api", "checkout"]);
  assert.equal(rejected.status, 409);
  assert.equal((await rejected.json()).code, "CUSHION_DISPATCH_ESTIMATE_REQUIRED");
  assert.equal(persistCalls, 0);
  assert.equal(f.state.executions, 0);
});

test("hosted quote allows a ready individual beside a blocked set while the release flag remains independent", async (t) => {
  const f = await fixture(t);
  f.state.rules.dispatchEstimate = {
    version: "synthetic-scope-dispatch",
    status: "confirmed",
    unit: "calendar-weeks",
    minimumCalendarWeeks: 3,
    maximumCalendarWeeks: 4,
    startsFrom: "order-confirmation",
    confirmedAt: "2026-10-15",
    approvalReference: "SYNTHETIC-TEST-ONLY",
  };
  const readySpec = structuredClone(design.pieces[0].spec);
  const blockedSpec = { ...structuredClone(readySpec), id: "blocked-self-piped", edge: "self" as const };
  const body = { specs: [readySpec, blockedSpec] };
  const closed = await (await f.call("quote", "1001", body)).json();
  assert.equal(closed.purchaseEnabled, false);
  assert.equal(closed.quotes[0].ready, true);
  assert.equal(closed.quotes[0].purchaseReady, true);
  assert.equal(typeof closed.quotes[0].totalMinor, "number");
  assert.equal(closed.quotes[1].purchaseReady, false);
  assert.equal(closed.setQuote.purchaseReady, false);
  assert.equal(closed.setQuote.totalMinor, null);

  const input = {
    designId: design.id,
    specs: [readySpec],
    expectedQuoteId: closed.quotes[0].quoteId,
    idempotencyKey: "offline-selected-ready",
  };
  const disabled = await f.call("checkout", "1001", input);
  assert.equal(disabled.status, 409);
  assert.equal((await disabled.json()).code, "CUSHION_PURCHASE_DISABLED");
  assert.equal(f.state.executions, 0);

  f.state.purchase = true;
  const open = await (await f.call("quote", "1001", body)).json();
  assert.equal(open.purchaseEnabled, true);
  assert.deepEqual(open.quotes, closed.quotes);
  assert.deepEqual(open.setQuote, closed.setQuote);
  const mixedDesign = structuredClone(design);
  mixedDesign.pieces.push({ spec: blockedSpec, position: { slot: 2, offsetX: 0, offsetY: 0, rotation: 0 } });
  await f.call("designs", "1001", { design: mixedDesign, expectedRevision: 0 });
  const blocked = await f.call("checkout", "1001", {
    ...input, specs: body.specs,
    expectedQuoteId: open.setQuote.quoteId,
    idempotencyKey: "offline-blocked-whole-set",
  });
  assert.equal(blocked.status, 409);
  assert.equal((await blocked.json()).code, "CUSHION_CHECKOUT_REVALIDATION_REQUIRED");
  assert.equal(f.state.executions, 0);
  const selected = await f.call("checkout", "1001", input);
  assert.equal(selected.status, 200);
  assert.equal((await selected.json()).status, "CALCULATED");
  assert.equal(f.state.executions, 1);
});

test("My Home signed guest review is independent of the unpublished cushion gate and never loads saved designs",async(t)=>{
  const f=await fixture(t);
  const {homeFixture}=await import('../../../scripts/my-home-preview-fixtures');
  const home=await homeFixture();
  f.state.enabled=false;
  f.services.myHomeEnabled=()=>true;
  f.services.checkoutServices=()=>home.services.mixed.cushion;
  f.services.myHomeServices=()=>({...home.services,releases:{curtains:false,cushions:false,mixed:false}});
  const response=await f.call('my-home-review','',home.input);
  assert.equal(response.status,200);
  const review=await response.json();assert.equal(review.ready,true);assert.equal(review.purchaseEnabled,false);
  assert.equal(review.deliveryMinor,1295);assert.equal(home.effects.length,0);
  assert.doesNotMatch(JSON.stringify(review),/supplierCost|approvalReference/);
  const checkout=await f.call('my-home-checkout','',{...home.input,reviewId:review.reviewId,idempotencyKey:'test-disabled-checkout',measurementsConfirmed:true});
  assert.equal(checkout.status,409);assert.equal((await checkout.json()).code,'MY_HOME_PURCHASE_DISABLED');
  assert.equal(home.effects.length,0);
});
test("My Home invalid order input returns safe validation errors",async(t)=>{
  const f=await fixture(t);const {homeFixture}=await import('../../../scripts/my-home-preview-fixtures');const home=await homeFixture();
  f.services.checkoutServices=()=>home.services.mixed.cushion;f.services.myHomeServices=()=>home.services;
  const response=await f.call('my-home-review','1001',{...home.input,id:'not-an-order'});
  assert.equal(response.status,400);assert.equal((await response.json()).code,'CUSHION_INPUT_INVALID');assert.equal(home.effects.length,0);
});
