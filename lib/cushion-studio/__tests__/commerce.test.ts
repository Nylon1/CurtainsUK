import assert from "node:assert/strict";
import test from "node:test";
import { createHmac } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { PGlite } from "@electric-sql/pglite";
import { createLocalCushionRepository, specDigest } from "../repository";
import {
  prepareCushionCheckout,
  type CushionCheckoutServices,
} from "../checkout";
import {
  processCushionPaidOrder,
  verifyPersistedCushionPayment,
} from "../paid-order";
import { quoteCushionSet } from "../pricing";
import { calibrationForFabric } from "../catalogue";
import { buildMixedDraftContract, customerCushionQuote } from "../commerce";
import type {
  CushionDesign,
  CushionSpec,
  CushionPricingRules,
  FabricCuttingFacts,
} from "../domain";

// Explicit synthetic test-only rates; never used by the review application.
const spec: CushionSpec = {
  version: 1,
  id: "test-square",
  sizeId: "square-50",
  fabricId: "test-fabric",
  filling: "cover",
  edge: "unpiped",
  placementMm: { x: 100, y: 100 },
  quantity: 1,
};
const fabric: FabricCuttingFacts = {
  id: "test-fabric",
  fullWidthMm: 1400,
  usableWidthMm: null,
  pattern: { kind: "plain", horizontalRepeatMm: 0, verticalRepeatMm: 0 },
  directional: false,
  calibration: {
    imageUrl: "https://example.invalid/original.jpg",
    physicalWidthMm: 1400,
    physicalHeightMm: 1000,
    evidence: "Synthetic test only",
    orientation: "upright",
    tileable: false,
  },
  supplierCostMinorPerMetre: 2000,
  orderIncrementMetres: 0.01,
  minimumOrderMetres: 0,
  availableMetres: 100,
};
const rules: CushionPricingRules = {
  version: "test",
  construction: {
    version: "test",
    seamAllowanceMm: 20,
    confirmed: true,
    pipingStripWidthMm: 40,
    pipingJoinAllowanceMm: 20,
    pipingCut: "straight",
    pipingConfirmed: true,
  },
  marginBasisPoints: 5000,
  vatBasisPoints: 2000,
  supplierCarriageMinor: 0,
  carriageMinor: 500,
};
const design: CushionDesign = {
  version: 1,
  id: "test-design",
  name: "Living room",
  scene: "sofa-2",
  colours: { furniture: "#123456", wall: "#eeeeee", floor: "#eeeeee" },
  pieces: [
    { spec, position: { slot: 0, offsetX: 0, offsetY: 0, rotation: 0 } },
  ],
};

test("durable local save restores revisions and rejects lost updates and path traversal", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "cushion-repo-"));
  try {
    const repo = createLocalCushionRepository(directory);
    const first = await repo.save(design, 0);
    assert.equal(first.revision, 1);
    assert.deepEqual(
      (await createLocalCushionRepository(directory).load(design.id))?.design,
      design,
    );
    await assert.rejects(
      repo.save({ ...design, name: "Conflict" }, 0),
      /REVISION_CONFLICT/,
    );
    assert.equal(
      (await repo.save({ ...design, name: "Updated" }, 1)).revision,
      2,
    );
    await assert.rejects(repo.load("../private"), /ID_INVALID/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("revalidation, immutable shared-price snapshots, transport and paid mixed packets work end to end", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "cushion-checkout-"));
  try {
    const repo = createLocalCushionRepository(directory),
      now = new Date("2026-10-14T12:00:00Z");
    const specs = [spec, { ...spec, id: "second-square" }];
    const expected = quoteCushionSet(
      specs.map((spec) => ({ spec, facts: fabric })),
      rules,
    );
    assert.equal(expected.ready, true, expected.issues.join("; "));
    let transportCalls = 0;
    const services: CushionCheckoutServices = {
      facts: async () => structuredClone(fabric),
      rules: async () => rules,
      identity: async (id) => ({
        id,
        brand: "Test",
        design: "Test",
        colour: "Test",
      }),
      now: () => now,
      persist: (input) => repo.appendCheckout(input),
      execute: async (contract) => {
        transportCalls++;
        assert.equal(contract.paymentEnabled, false);
        assert.equal(contract.input.lineItems.length, 2);
        return {
          status: "CALCULATED",
          shopifyWritePerformed: false,
          checkoutUrl: null,
          draftOrderId: null,
          draftOrderName: null,
          paymentEnabled: false,
        };
      },
    };
    const input = {
      designId: design.id,
      specs,
      expectedQuoteId: expected.quoteId,
      idempotencyKey: "review-test-one",
    };
    const prepared = await prepareCushionCheckout(input, services);
    assert.equal(transportCalls, 1);
    assert.equal(
      prepared.contract.expected.orderGrossAmountMinor,
      expected.totalMinor,
    );
    assert.equal(
      prepared.snapshots.reduce(
        (sum, snapshot) => sum + snapshot.price.goodsGrossMinor,
        0,
      ),
      prepared.contract.expected.goodsGrossAmountMinor,
    );
    specs[0] = { ...spec, placementMm: { x: 300, y: 300 } };
    assert.equal(
      (await repo.snapshot(prepared.snapshots[0].id))!.spec.placementMm.x,
      100,
    );
    await assert.rejects(
      prepareCushionCheckout(
        { ...input, specs: [spec, { ...spec, id: "second-square" }] },
        services,
      ),
      /EEXIST/,
    );
    assert.equal(transportCalls, 1);
    await assert.rejects(
      prepareCushionCheckout(
        { ...input, idempotencyKey: "changed-test" },
        {
          ...services,
          facts: async () => ({ ...fabric, supplierCostMinorPerMetre: 2100 }),
        },
      ),
      /PRICE_OR_SPEC_CHANGED/,
    );
    const secret = "test-only-secret-01234567890123456789";
    const lines = prepared.contract.input.lineItems.map((line, index) => ({
      id: 100 + index,
      quantity: line.quantity,
      price: line.originalUnitPriceWithCurrency.amount,
      total_discount: "0.00",
      properties: line.customAttributes.map((p) => ({
        name: p.key,
        value: p.value,
      })),
    }));
    const productionContract = {
      ...prepared.contract,
      environment: "PRODUCTION" as const,
      paymentEnabled: true,
    };
    const amount = (value: number) => (value / 100).toFixed(2);
    const financialPayload = {
      currency: "GBP",
      taxes_included: true,
      total_price: amount(productionContract.expected.orderGrossAmountMinor),
      total_tax: amount(productionContract.expected.orderVatAmountMinor),
      total_discounts: "0.00",
      total_shipping_price_set: {
        presentment_money: {
          currency_code: "GBP",
          amount: amount(productionContract.expected.shippingGrossAmountMinor),
        },
      },
      line_items: structuredClone(lines),
    };
    const bindingManifest = {
      groups: {
        curtains: [],
        cushions: prepared.snapshots.map((snapshot, index) => ({
          productType: "CUSHION",
          snapshotId: snapshot.id,
          lineId: String(100 + index),
        })),
      },
    };
    verifyPersistedCushionPayment(financialPayload, bindingManifest, {
      snapshots: prepared.snapshots,
      contract: productionContract,
    });
    assert.throws(
      () =>
        verifyPersistedCushionPayment(
          { ...financialPayload, total_tax: "0.00" },
          bindingManifest,
          { snapshots: prepared.snapshots, contract: productionContract },
        ),
      /FINANCIAL_MISMATCH/,
    );
    assert.throws(
      () =>
        verifyPersistedCushionPayment(
          financialPayload,
          { groups: { curtains: [], cushions: [] } },
          { snapshots: prepared.snapshots, contract: productionContract },
        ),
      /BINDING_INVALID/,
    );
    lines.push({
      id: 999,
      quantity: 1,
      price: "50.00",
      total_discount: "0.00",
      properties: [{ name: "_curtainsuk_snapshot_id", value: "curtain-test" }],
    });
    const payload = {
      id: 123,
      name: "#TEST",
      currency: "GBP",
      financial_status: "paid",
      processed_at: now.toISOString(),
      line_items: lines,
    };
    const raw = Buffer.from(JSON.stringify(payload)),
      signature = createHmac("sha256", secret).update(raw).digest("base64");
    const paidServices = {
      secret,
      snapshot: repo.snapshot,
      curtainPacket: async (id: string) => ({
        productType: "CURTAIN",
        snapshotId: id,
      }),
      record: repo.recordPaidManifest,
      verifyOrder: async () => ({
        draftLink: "explicit test-only verified link",
      }),
    };
    const paid = await processCushionPaidOrder(raw, signature, paidServices);
    assert.equal(paid.duplicate, false);
    assert.equal(paid.manifest.groups.cushions.length, 2);
    assert.equal(paid.manifest.groups.curtains.length, 1);
    assert.equal(
      (await processCushionPaidOrder(raw, signature, paidServices)).duplicate,
      true,
    );
    await assert.rejects(
      processCushionPaidOrder(raw, "invalid", paidServices),
      /SIGNATURE_INVALID/,
    );
    lines[0].price = "0.01";
    const tampered = Buffer.from(JSON.stringify(payload));
    await assert.rejects(
      processCushionPaidOrder(
        tampered,
        createHmac("sha256", secret).update(tampered).digest("base64"),
        paidServices,
      ),
      /AMOUNT_MISMATCH/,
    );
    const mixed = buildMixedDraftContract({
      curtain: prepared.contract,
      cushion: prepared.contract,
      idempotencyKey: "mixed-test",
      shipping: { grossMinor: 600, vatMinor: 100, title: "One delivery" },
    });
    assert.equal(mixed.expected.shippingGrossAmountMinor, 600);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("customer quote excludes raw material rates, costs and manufacturing diagnostics", () => {
  const publicQuote = customerCushionQuote(
    quoteCushionSet([{ spec, facts: fabric }], rules),
  );
  for (const field of [
    "materials",
    "costLines",
    "fixedCostMinor",
    "supplierCarriageMinor",
    "knownCostMinor",
    "cutPlan",
    "issues",
    "staffPricing",
  ])
    assert.equal(field in publicQuote, false);
  assert.equal(publicQuote.ready, true);
});

test("checkout retry reuses original immutable identities after a transport timeout", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "cushion-retry-"));
  try {
    const repo = createLocalCushionRepository(directory),
      quote = quoteCushionSet([{ spec, facts: fabric }], rules);
    let attempts = 0;
    const contractIds: string[] = [];
    const services: CushionCheckoutServices = {
      facts: async () => fabric,
      rules: async () => rules,
      identity: async (id) => ({
        id,
        brand: "test",
        design: "test",
        colour: "test",
      }),
      now: () => new Date("2026-10-14T12:00:00Z"),
      persist: repo.appendCheckout,
      existing: repo.checkout,
      execute: async (contract) => {
        contractIds.push(contract.input.lineItems[0].sku);
        attempts++;
        if (attempts === 1) throw new Error("SIMULATED_TIMEOUT");
        return {
          status: "CALCULATED",
          shopifyWritePerformed: false,
          checkoutUrl: null,
          draftOrderId: null,
          draftOrderName: null,
          paymentEnabled: false,
        };
      },
    };
    const input = {
      designId: design.id,
      specs: [spec],
      expectedQuoteId: quote.quoteId,
      idempotencyKey: "retry-test-one",
    };
    await assert.rejects(prepareCushionCheckout(input, services), /TIMEOUT/);
    const result = await prepareCushionCheckout(input, services);
    assert.equal(contractIds[0], contractIds[1]);
    assert.equal(result.snapshots.length, 1);
    await assert.rejects(
      prepareCushionCheckout({ ...input, designId: "someone-else" }, services),
      /IDEMPOTENCY_CONFLICT/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("32-piece design checks out with immutable main and contrast procurement references", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "cushion-boundary-"));
  try {
    const repo = createLocalCushionRepository(directory);
    const main = {
      ...fabric,
      supplierId: "supplier-main",
      supplierSku: "MAIN-SKU",
    };
    const piping = {
      ...fabric,
      id: "piping-fabric",
      supplierId: "supplier-contrast",
      supplierSku: "CONTRAST-SKU",
    };
    const specs = Array.from({ length: 32 }, (_, i) => ({
      ...spec,
      id: `piece-${i}`,
    }));
    specs[0] = { ...specs[0], edge: "contrast", pipingFabricId: piping.id };
    const confirmedRules = {
      ...rules,
      makingRateCard: {
        "square-50": {
          unpiped: { amountMinor: 800, approval: "confirmed" as const },
          self: { amountMinor: 1100, approval: "confirmed" as const },
          contrast: { amountMinor: 1200, approval: "confirmed" as const },
        },
      },
    };
    const saved = await repo.save(
      {
        ...design,
        pieces: specs.map((spec, slot) => ({
          spec,
          position: { slot, offsetX: 0, offsetY: 0, rotation: 0 },
        })),
      },
      0,
    );
    assert.equal(saved.design.pieces.length, 32);
    const quote = quoteCushionSet(
      specs.map((spec) => ({
        spec,
        facts: main,
        pipingFacts: spec.edge === "contrast" ? piping : undefined,
      })),
      confirmedRules,
    );
    assert.equal(quote.ready, true, quote.issues.join("; "));
    const services: CushionCheckoutServices = {
      facts: async (id) => (id === piping.id ? piping : main),
      rules: async () => confirmedRules,
      identity: async (id) => ({
        id,
        brand: "test",
        design: "test",
        colour: "test",
      }),
      now: () => new Date("2026-10-14T12:00:00Z"),
      persist: repo.appendCheckout,
      execute: async () => ({
        status: "CALCULATED",
        shopifyWritePerformed: false,
        checkoutUrl: null,
        draftOrderId: null,
        draftOrderName: null,
        paymentEnabled: false,
      }),
    };
    const result = await prepareCushionCheckout(
      {
        designId: design.id,
        specs,
        expectedQuoteId: quote.quoteId,
        idempotencyKey: "boundary-test-32",
      },
      services,
    );
    assert.equal(result.contract.input.lineItems.length, 32);
    main.supplierSku = "CHANGED-LATER";
    piping.supplierSku = "CHANGED-LATER";
    const frozen = await repo.snapshot(result.snapshots[0].id);
    const sources = frozen!.manufacturing.fabricSources as FabricCuttingFacts[];
    assert.deepEqual(
      sources.map(({ supplierId, supplierSku }) => ({
        supplierId,
        supplierSku,
      })),
      [
        { supplierId: "supplier-main", supplierSku: "MAIN-SKU" },
        { supplierId: "supplier-contrast", supplierSku: "CONTRAST-SKU" },
      ],
    );
    assert.equal(
      (frozen!.commercial!.rules as CushionPricingRules).version,
      confirmedRules.version,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("calibration requires original evidence and uses independent 1000 mm Y extent", () => {
  assert.equal(calibrationForFabric({ full_width_mm: 1400 }), null);
  const c = calibrationForFabric(
    { full_width_mm: 1400 },
    {
      originalImageUrl: "https://example.invalid/original.jpg",
      evidence: "Owner full-width x 1m",
    },
  );
  assert.equal(c?.physicalHeightMm, 1000);
  assert.equal(c?.physicalWidthMm, 1400);
  assert.equal(c?.tileable, false);
  assert.equal(
    specDigest(spec),
    specDigest({ ...spec, placementMm: { y: 100, x: 100 } }),
  );
});

test("offline SQL keeps snapshots immutable, domains distinct, browser roles denied", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "create schema curtainsuk_private; create role anon; create role authenticated; create role service_role; create table curtainsuk_private.staging_configuration_snapshots(snapshot_id uuid primary key); create table curtainsuk_private.fabric_colourways(fabric_id text primary key,supplier_id text,supplier_sku text);",
    );
    await db.exec(
      await readFile(
        path.resolve(
          "supabase/migrations/20261014163749_cushion_studio_distinct_persistence.sql",
        ),
        "utf8",
      ),
    );
    await db.query(
      "insert into curtainsuk_private.cushion_designs(design_id,owner_session_hash,design) values ($1,$2,$3)",
      [design.id, "a".repeat(64), JSON.stringify(design)],
    );
    await db.exec(
      `insert into curtainsuk_private.cushion_order_snapshots(snapshot_id,design_id,spec_version,spec,spec_sha256,fabric_identity,manufacturing,rules_version,goods_gross_minor,goods_vat_minor,revalidated_at) values ('11111111-1111-4111-8111-111111111111','test-design',1,'{"version":1}','${"b".repeat(64)}','{}','{}','test',100,0,now());`,
    );
    await assert.rejects(
      db.exec(
        "update curtainsuk_private.cushion_order_snapshots set goods_gross_minor=1",
      ),
      /IMMUTABLE/,
    );
    await assert.rejects(
      db.exec("delete from curtainsuk_private.cushion_order_snapshots"),
      /IMMUTABLE/,
    );
    const grants = await db.query<{ allowed: boolean }>(
      "select has_table_privilege('anon','curtainsuk_private.cushion_designs','SELECT') as allowed",
    );
    assert.equal(grants.rows[0].allowed, false);
    await assert.rejects(
      db.exec(
        "insert into curtainsuk_private.mixed_order_manufacturing_lines(line_id,checkout_reference,product_type,cushion_snapshot_id) values ('22222222-2222-4222-8222-222222222222','test','CURTAIN','11111111-1111-4111-8111-111111111111')",
      ),
      /check constraint/,
    );
    await assert.rejects(
      db.query("select curtainsuk_private.save_cushion_design($1,$2,1)", [
        "c".repeat(64),
        JSON.stringify({ ...design, name: "Intruder" }),
      ]),
      /REVISION_CONFLICT/,
    );
    const updated = await db.query<{ result: { revision: number } }>(
      "select curtainsuk_private.save_cushion_design($1,$2,1) as result",
      ["a".repeat(64), JSON.stringify({ ...design, name: "Owner update" })],
    );
    assert.equal(updated.rows[0].result.revision, 2);
    await db.exec(
      "insert into curtainsuk_private.fabric_colourways values('test-fabric','test-supplier','test-sku')",
    );
    const packet = {
      productType: "CUSHION",
      snapshotId: "11111111-1111-4111-8111-111111111111",
      manufacturing: {
        setQuoteId: "test-set",
        fabricSources: [
          {
            id: "test-fabric",
            supplierId: "test-supplier",
            supplierSku: "test-sku",
          },
        ],
        cutPlan: {
          fabrics: [{ fabricId: "test-fabric", orderedMetres: 0.54 }],
        },
      },
    };
    const manifest = {
      paidAt: "2026-10-14T12:00:00Z",
      groups: {
        cushions: [
          {
            productType: "CUSHION",
            snapshotId: packet.snapshotId,
            lineId: "1",
          },
        ],
        curtains: [],
      },
      packets: [packet, packet],
    };
    const first = await db.query<{ result: { duplicate: boolean } }>(
      "select curtainsuk_private.record_cushion_paid_manifest($1,$2) as result",
      ["gid://shopify/Order/42", JSON.stringify(manifest)],
    );
    assert.equal(first.rows[0].result.duplicate, false);
    const again = await db.query<{ result: { duplicate: boolean } }>(
      "select curtainsuk_private.record_cushion_paid_manifest($1,$2) as result",
      ["gid://shopify/Order/42", JSON.stringify(manifest)],
    );
    assert.equal(again.rows[0].result.duplicate, true);
    const usage = await db.query<{ usage: number }>(
      "select curtainsuk_private.cushion_usage_since('test-supplier','test-sku','2026-10-14T11:00:00Z')::float8 as usage",
    );
    assert.equal(usage.rows[0].usage, 0.54);
    await db.exec(
      "create table curtainsuk_private.native_paid_test(id integer); create function curtainsuk_private.record_mtm_paid_order(jsonb) returns void language sql as 'insert into curtainsuk_private.native_paid_test values(1)';",
    );
    await assert.rejects(
      db.query(
        "select curtainsuk_private.record_cushion_paid_manifest($1,$2)",
        [
          "gid://shopify/Order/43",
          JSON.stringify({ ...manifest, nativeCurtainPayment: {} }),
        ],
      ),
      /unique constraint/,
    );
    const native = await db.query<{ count: number }>(
      "select count(*)::integer as count from curtainsuk_private.native_paid_test",
    );
    assert.equal(
      native.rows[0].count,
      0,
      "native curtain lifecycle and mixed manifest roll back together",
    );
  } finally {
    await db.close();
  }
});
