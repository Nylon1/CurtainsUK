import "server-only";

import { timingSafeEqual, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { toDecisionEngineFabric } from "@/lib/fabric-master/decision-engine";
import { fabricMasterRecordById, verifiedSupplierCostMinor } from "@/lib/fabric-master/repository";
import { calculateProductionMtmPriceForRehearsal } from "@/lib/storefront/production-pricing";
import { dailyStockProjection } from "@/lib/storefront/daily-stock-server";
import { createSupplierServiceClient } from "@/lib/supabase/supplier-service";
import {
  asProductionDraftOrderContract,
  assertShopifyDraftOrderFinancials,
  buildShopifyDraftOrderContract,
  type ShopifyAttributeInput,
} from "@/lib/storefront/shopify-draft-order-core";
import { allocateVatInclusiveRetailTotal, prepareStagingCheckoutHandoff } from "@/lib/storefront/checkout-gates";
import type { ImmutableConfigurationSnapshot } from "@/lib/storefront/checkout-gates";
import { readBoundedJson } from "@/lib/storefront/staging-api";
import { PRIVATE_NO_STORE_HEADERS } from "@/lib/storefront/security/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A deliberately short-lived, deployment-operator rehearsal. It is not an app
 * proxy route, accepts no customer configuration, has no invoice mutation, and
 * is denied unless both a one-time Vercel secret and the release toggle exist.
 */
const APP_CLIENT_ID = "d18f79c0a0d1db2df7babeb26906443e";
const STORE = "carpetup.myshopify.com";
const TEST_TAG = "CUK_REHEARSAL_20260920";
const ACTION = "RUN_PRIVATE_PRODUCTION_DRAFT_REHEARSAL";
const CLEANUP_ACTION = "CLEANUP_PRIVATE_PRODUCTION_DRAFT_REHEARSAL";
const FIXTURE = {
  fabricMasterId: "pt-4262-770",
  supplierSku: "4262/770",
  shippingMinor: 1_295,
  widthCm: 180,
  dropCm: 210,
} as const;

type MoneyNode = {
  presentmentMoney: { amount: string; currencyCode: string };
};

type DraftNode = {
  id: string;
  name: string;
  status: string;
  tags: string[];
  customAttributes: ShopifyAttributeInput[];
  lineItems: { nodes: Array<{ sku: string | null; customAttributes: ShopifyAttributeInput[] }> };
  taxesIncluded: boolean;
  presentmentCurrencyCode: string;
  totalLineItemsPriceSet: MoneyNode;
  subtotalPriceSet: MoneyNode;
  totalShippingPriceSet: MoneyNode;
  totalTaxSet: MoneyNode;
  totalDiscountsSet: MoneyNode;
  totalPriceSet: MoneyNode;
};

const FINANCIALS = `
  taxesIncluded presentmentCurrencyCode
  totalLineItemsPriceSet{presentmentMoney{amount currencyCode}}
  subtotalPriceSet{presentmentMoney{amount currencyCode}}
  totalShippingPriceSet{presentmentMoney{amount currencyCode}}
  totalTaxSet{presentmentMoney{amount currencyCode}}
  totalDiscountsSet{presentmentMoney{amount currencyCode}}
  totalPriceSet{presentmentMoney{amount currencyCode}}
`;
const DRAFT_FIELDS = `id name status tags customAttributes{key value} lineItems(first:5){nodes{sku customAttributes{key value}}} ${FINANCIALS}`;

function sameSecret(received: string | null, expected: string | undefined) {
  if (!received || !expected) return false;
  const left = Buffer.from(received, "utf8");
  const right = Buffer.from(expected, "utf8");
  return left.length === right.length && timingSafeEqual(left, right);
}

function money(minor: number) {
  return `£${(minor / 100).toFixed(2)}`;
}

function response(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: PRIVATE_NO_STORE_HEADERS });
}

function mapAttributes(attributes: ShopifyAttributeInput[]) {
  return Object.fromEntries(attributes.map(({ key, value }) => [key, value]));
}

async function shopifyClient() {
  const secret = process.env.CURTAINSUK_SHOPIFY_APP_SECRET;
  if (!secret) throw new Error("REHEARSAL_SHOPIFY_SECRET_UNAVAILABLE");
  const auth = await fetch(`https://${STORE}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: APP_CLIENT_ID,
      client_secret: secret,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!auth.ok) throw new Error("REHEARSAL_SHOPIFY_TOKEN_FAILED");
  const body = await auth.json() as { access_token?: unknown };
  const accessToken = body.access_token;
  if (typeof accessToken !== "string" || !accessToken) throw new Error("REHEARSAL_SHOPIFY_TOKEN_INVALID");
  return async <T>(query: string, variables: Record<string, unknown> = {}) => {
    const result = await fetch(`https://${STORE}/admin/api/2026-07/graphql.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": accessToken },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!result.ok) throw new Error(`REHEARSAL_SHOPIFY_HTTP_${result.status}`);
    const json = await result.json() as { data?: T; errors?: unknown };
    if (json.errors || !json.data) throw new Error("REHEARSAL_SHOPIFY_GRAPHQL_FAILED");
    return json.data;
  };
}

async function run() {
  const rehearsalId = randomUUID();
  const database = createSupplierServiceClient();
  const { data: row, error } = await database
    .from("staging_configuration_snapshots")
    .select("*")
    .eq("fabric_master_id", FIXTURE.fabricMasterId)
    .eq("supplier_sku", FIXTURE.supplierSku)
    .eq("shipping_gross_amount_minor", FIXTURE.shippingMinor)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .single();
  if (error || !row) throw new Error("REHEARSAL_IMMUTABLE_SNAPSHOT_REQUIRED");

  const fabric = await fabricMasterRecordById(FIXTURE.fabricMasterId);
  if (!fabric || fabric.supplier_sku !== FIXTURE.supplierSku) throw new Error("REHEARSAL_FABRIC_IDENTITY_UNAVAILABLE");
  const supplierCostMinor = await verifiedSupplierCostMinor(fabric.supplier_id, fabric.supplier_sku);
  const pricedFabric = toDecisionEngineFabric(fabric, supplierCostMinor, fabric.source_effective_date ?? new Date().toISOString().slice(0, 10));
  const calculation = calculateProductionMtmPriceForRehearsal({
    windowSlug: "standard-window",
    measurementBasis: "TRACK_WIDTH",
    hardware: "TRACK",
    widthCm: FIXTURE.widthCm,
    dropCm: FIXTURE.dropCm,
    fabricId: FIXTURE.fabricMasterId,
    heading: "PENCIL_PLEAT",
    lining: "STANDARD",
    construction: "PAIR",
    stackDirection: "SPLIT",
  }, pricedFabric);
  const stock = await dailyStockProjection({
    supplierId: fabric.supplier_id,
    supplierSku: fabric.supplier_sku,
    requirement: { quantity: calculation.fabricMetres ?? 0, stock_unit: "METRE" },
  });
  if (stock.stale || stock.availability !== "FABRIC_AVAILABLE") throw new Error("REHEARSAL_FRESH_POSITIVE_STOCK_REQUIRED");

  const now = new Date().toISOString();
  const customerPrice = allocateVatInclusiveRetailTotal(calculation.total.amountMinor);
  const snapshot = {
    snapshotId: randomUUID(), configurationId: calculation.configurationId,
    reviewRequestId: null, reviewRevisionId: null,
    outcome: "INSTANT_PRICE" as const, windowType: "standard-window",
    measurements: {
      measurement_contract_version: "guided-measure-v1",
      hardware: "TRACK",
      raw_width_cm: FIXTURE.widthCm,
      raw_drop_cm: FIXTURE.dropCm,
      width_anchor: "TRACK_FULL_WIDTH",
      drop_anchor: "TRACK_TOP_TO_FINISH",
      desired_finish: "FLOOR",
    },
    fabricMasterId: FIXTURE.fabricMasterId, supplierSku: FIXTURE.supplierSku,
    fabricIdentity: { supplier: fabric.supplier_name, brand: fabric.brand_name, design: fabric.design_name, colour: fabric.colour_name },
    heading: "PENCIL_PLEAT", lining: "STANDARD", construction: "PAIR" as const, calculatedFabricMetres: calculation.fabricMetres,
    pricingRuleVersion: calculation.calculationVersion,
    customerPrice,
    availability: "FABRIC_AVAILABLE" as const,
    shipping: { region: row.shipping_region, parcelClass: row.shipping_parcel_class, status: "READY" as const, grossAmountMinor: Number(row.shipping_gross_amount_minor), currency: "GBP" as const, postcode: "SW1A1AA", shownSeparately: true as const, countsTowardGoodsMinimum: false as const, message: "Delivery" },
    customerAcceptedAt: now, recordedAt: now,
  } satisfies ImmutableConfigurationSnapshot;
  const base = buildShopifyDraftOrderContract({
    handoff: prepareStagingCheckoutHandoff({ handoffId: rehearsalId, snapshot, preparedAt: now }),
    fabricLabel: `${fabric.brand_name} — ${fabric.design_name} — ${fabric.colour_name}`,
  });
  const identified = asProductionDraftOrderContract(base, FIXTURE.fabricMasterId, {
    supplier: fabric.supplier_name, brand: fabric.brand_name, design: fabric.design_name,
    colour: fabric.colour_name, supplierSku: fabric.supplier_sku,
  });
  const contract = {
    ...identified,
    environment: "STAGING" as const,
    paymentEnabled: false,
    input: {
      ...identified.input,
      note: `CURTAINSUK PRIVATE REHEARSAL ${rehearsalId}. INTERNAL ONLY. DO NOT INVOICE, PAY OR FULFIL.`,
      tags: [TEST_TAG, "CURTAINSUK_PRIVATE_REHEARSAL", "DO_NOT_FULFIL", "NO_REAL_PAYMENT"],
      visibleToCustomer: false,
      lineItems: identified.input.lineItems.map((line) => ({
        ...line,
        customAttributes: [
          ...line.customAttributes,
          { key: "Hardware", value: "Track" },
          { key: "Width", value: `${FIXTURE.widthCm} cm` },
          { key: "Drop", value: `${FIXTURE.dropCm} cm` },
          { key: "Desired finish", value: "Floor" },
        ],
      })),
    },
  };
  const gql = await shopifyClient();
  const identity = await gql<{ shop: { id: string; myshopifyDomain: string; primaryDomain: { host: string } }; currentAppInstallation: { accessScopes: Array<{ handle: string }> } }>("{shop{id myshopifyDomain primaryDomain{host}} currentAppInstallation{accessScopes{handle}}}");
  if (identity.shop.id !== "gid://shopify/Shop/25645514861" || identity.shop.myshopifyDomain !== STORE || identity.shop.primaryDomain.host !== "www.curtainsuk.com") throw new Error("REHEARSAL_SHOP_IDENTITY_DENIED");
  if (!identity.currentAppInstallation.accessScopes.some(({ handle }) => handle === "write_draft_orders")) throw new Error("REHEARSAL_DRAFT_SCOPE_MISSING");
  const calculated = await gql<{ draftOrderCalculate: { calculatedDraftOrder: DraftNode; userErrors: Array<unknown> } }>(`mutation($input:DraftOrderInput!){draftOrderCalculate(input:$input){calculatedDraftOrder{${FINANCIALS}} userErrors{field message}}}`, { input: contract.input });
  if (calculated.draftOrderCalculate.userErrors.length) {
    const errors = calculated.draftOrderCalculate.userErrors.map((entry) => {
      const value = entry as { field?: unknown; message?: unknown };
      return `${Array.isArray(value.field) ? value.field.join(".") : "unknown"}:${typeof value.message === "string" ? value.message : "unknown"}`;
    });
    throw new Error(`REHEARSAL_CALCULATE_REJECTED:${errors.join("|")}`);
  }
  assertShopifyDraftOrderFinancials(calculated.draftOrderCalculate.calculatedDraftOrder, contract.expected);

  const created = await gql<{ draftOrderCreate: { draftOrder: DraftNode; userErrors: Array<unknown> } }>(`mutation($input:DraftOrderInput!){draftOrderCreate(input:$input){draftOrder{${DRAFT_FIELDS}} userErrors{field message}}}`, { input: contract.input });
  if (created.draftOrderCreate.userErrors.length || !created.draftOrderCreate.draftOrder) throw new Error("REHEARSAL_CREATE_REJECTED");
  const draft = created.draftOrderCreate.draftOrder;
  try {
    if (draft.status !== "OPEN" || !draft.tags.includes(TEST_TAG)) throw new Error("REHEARSAL_PRIVATE_DRAFT_INVALID");
    assertShopifyDraftOrderFinancials(draft, contract.expected);
    const orderIdentity = mapAttributes(draft.customAttributes);
    const lineIdentity = mapAttributes(draft.lineItems.nodes[0]?.customAttributes ?? []);
    const expectedLineIdentity = mapAttributes(contract.input.lineItems[0]?.customAttributes ?? []);
    const required = {
      fabricMaster: lineIdentity["Fabric Master ID"], sku: lineIdentity["Supplier SKU"],
      opening: lineIdentity["Window type"], hardware: lineIdentity.Hardware, heading: lineIdentity.Heading,
      lining: lineIdentity.Lining, pricingRuleset: orderIdentity.curtainsuk_pricing_rule_version,
    };
    const identityMismatches = Object.entries({
      fabricMaster: required.fabricMaster === expectedLineIdentity["Fabric Master ID"],
      sku: required.sku === expectedLineIdentity["Supplier SKU"],
      opening: required.opening === expectedLineIdentity["Window type"],
      hardware: required.hardware === expectedLineIdentity.Hardware,
      heading: required.heading === expectedLineIdentity.Heading,
      width: lineIdentity.Width === expectedLineIdentity.Width,
      drop: lineIdentity.Drop === expectedLineIdentity.Drop,
      lining: required.lining === expectedLineIdentity.Lining,
      pricingRuleset: required.pricingRuleset === calculation.calculationVersion,
    }).filter(([, pass]) => !pass).map(([key]) => key);
    if (identityMismatches.length) throw new Error(`REHEARSAL_ORDER_IDENTITY_MISMATCH:${identityMismatches.join(",")}`);
    const report = {
      rehearsalId, cleanup: "VERIFIED_AND_DELETED", invoiceUrlExposed: false,
      paymentCapabilityExposed: false, workroomRelease: false,
      financials: {
        curtainsuk: { goods: money(contract.expected.goodsGrossAmountMinor), vat: money(contract.expected.orderVatAmountMinor), delivery: money(contract.expected.shippingGrossAmountMinor), total: money(contract.expected.orderGrossAmountMinor) },
        shopify: { goods: money(contract.expected.goodsGrossAmountMinor), vat: money(contract.expected.orderVatAmountMinor), delivery: money(contract.expected.shippingGrossAmountMinor), total: money(contract.expected.orderGrossAmountMinor) },
      },
      identity: {
        fabricMaster: { expected: expectedLineIdentity["Fabric Master ID"], shopify: required.fabricMaster },
        sku: { expected: expectedLineIdentity["Supplier SKU"], shopify: required.sku },
        opening: { expected: expectedLineIdentity["Window type"], shopify: required.opening },
        hardware: { expected: expectedLineIdentity.Hardware, shopify: required.hardware },
        heading: { expected: expectedLineIdentity.Heading, shopify: required.heading },
        width: { expected: expectedLineIdentity.Width, shopify: lineIdentity.Width },
        drop: { expected: expectedLineIdentity.Drop, shopify: lineIdentity.Drop },
        lining: { expected: expectedLineIdentity.Lining, shopify: required.lining },
        pricingRuleset: { expected: calculation.calculationVersion, shopify: required.pricingRuleset },
      },
    };
    console.info(JSON.stringify({ event: "CURTAINSUK_PRIVATE_DRAFT_REHEARSAL", rehearsalId, cleanup: report.cleanup }));
    return report;
  } finally {
    const deleted = await gql<{ draftOrderDelete: { deletedId: string | null; userErrors: Array<unknown> } }>("mutation($input:DraftOrderDeleteInput!){draftOrderDelete(input:$input){deletedId userErrors{field message}}}", { input: { id: draft.id } });
    if (deleted.draftOrderDelete.userErrors.length || deleted.draftOrderDelete.deletedId !== draft.id) throw new Error("REHEARSAL_CLEANUP_FAILED");
    const absent = await gql<{ draftOrder: { id: string } | null }>("query($id:ID!){draftOrder(id:$id){id}}", { id: draft.id });
    if (absent.draftOrder !== null) throw new Error("REHEARSAL_CLEANUP_UNVERIFIED");
  }
}

export async function POST(request: Request) {
  if (process.env.CURTAINSUK_PRIVATE_REHEARSAL_ENABLED !== "true") return response({ error: "REHEARSAL_DISABLED" }, 404);
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
  if (!sameSecret(token, process.env.CURTAINSUK_PRIVATE_REHEARSAL_TOKEN)) return response({ error: "REHEARSAL_AUTH_REQUIRED" }, 401);
  try {
    const body = await readBoundedJson<{ action?: unknown }>(request, 512);
    if (body.action === CLEANUP_ACTION) {
      const gql = await shopifyClient();
      const found = await gql<{ draftOrders: { nodes: Array<{ id: string; status: string; tags: string[] }> } }>("query($query:String!){draftOrders(first:5,query:$query){nodes{id status tags}}}", { query: `tag:${TEST_TAG}` });
      const candidates = found.draftOrders.nodes.filter((draft) => draft.status === "OPEN" && draft.tags.includes(TEST_TAG));
      for (const draft of candidates) {
        const deleted = await gql<{ draftOrderDelete: { deletedId: string | null; userErrors: Array<unknown> } }>("mutation($input:DraftOrderDeleteInput!){draftOrderDelete(input:$input){deletedId userErrors{field message}}}", { input: { id: draft.id } });
        if (deleted.draftOrderDelete.userErrors.length || deleted.draftOrderDelete.deletedId !== draft.id) throw new Error("REHEARSAL_CLEANUP_FAILED");
      }
      return response({ cleanup: "VERIFIED_AND_DELETED", removed: candidates.length });
    }
    if (body.action !== ACTION) return response({ error: "REHEARSAL_ACTION_INVALID" }, 400);
    return response(await run());
  } catch (error) {
    const code = error instanceof Error ? error.message : "REHEARSAL_FAILED";
    console.error(JSON.stringify({ event: "CURTAINSUK_PRIVATE_DRAFT_REHEARSAL_FAILED", code }));
    return response({ error: "REHEARSAL_FAILED", code }, 409);
  }
}
