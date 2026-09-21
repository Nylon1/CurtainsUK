import type { StagingCheckoutHandoff } from "./checkout-gates";

export const SHOPIFY_DRAFT_ORDER_REQUIRED_SCOPES = [
  "write_draft_orders",
] as const;

export const SHOPIFY_DRAFT_ORDER_API_VERSION = "2026-07" as const;

export type ShopifyDraftOrderMode =
  | "DISABLED"
  | "CALCULATE_ONLY"
  | "CREATE_TEST_DRAFT"
  | "CREATE_PRODUCTION_DRAFT";

export interface ShopifyMoneyInput {
  amount: string;
  currencyCode: "GBP";
}

export interface ShopifyAttributeInput {
  key: string;
  value: string;
}

export interface ShopifyDraftOrderInput {
  acceptAutomaticDiscounts: false;
  allowDiscountCodesInCheckout: false;
  customAttributes: ShopifyAttributeInput[];
  email?: string;
  lineItems: Array<{
    title: string;
    quantity: 1;
    originalUnitPriceWithCurrency: ShopifyMoneyInput;
    requiresShipping: true;
    taxable: true;
    sku: string;
    customAttributes: ShopifyAttributeInput[];
  }>;
  note: string;
  presentmentCurrencyCode: "GBP";
  shippingLine: {
    title: string;
    priceWithCurrency: ShopifyMoneyInput;
  };
  shippingAddress: {
    countryCode: "GB";
    zip?: string;
  };
  tags: string[];
  taxExempt: false;
}

export interface ShopifyDraftOrderExpectedFinancials {
  currency: "GBP";
  goodsGrossAmountMinor: number;
  goodsVatAmountMinor: number;
  shippingGrossAmountMinor: number;
  shippingVatAmountMinor: number;
  orderGrossAmountMinor: number;
  orderVatAmountMinor: number;
}

export interface ShopifyDraftOrderContract {
  apiVersion: typeof SHOPIFY_DRAFT_ORDER_API_VERSION;
  environment: "STAGING" | "PRODUCTION";
  handoffId: string;
  snapshotId: string;
  configurationId: string;
  idempotencyTag: string;
  requiredScopes: typeof SHOPIFY_DRAFT_ORDER_REQUIRED_SCOPES;
  input: ShopifyDraftOrderInput;
  expected: ShopifyDraftOrderExpectedFinancials;
  paymentEnabled: boolean;
  completionMutationAllowed: false;
  invoiceSendAllowed: false;
}

type ShopifyMoneyBag = {
  presentmentMoney?: {
    amount?: unknown;
    currencyCode?: unknown;
  } | null;
} | null | undefined;

export interface ShopifyDraftOrderFinancialNode {
  taxesIncluded?: unknown;
  presentmentCurrencyCode?: unknown;
  currencyCode?: unknown;
  totalLineItemsPriceSet?: ShopifyMoneyBag;
  subtotalPriceSet?: ShopifyMoneyBag;
  totalShippingPriceSet?: ShopifyMoneyBag;
  totalTaxSet?: ShopifyMoneyBag;
  totalDiscountsSet?: ShopifyMoneyBag;
  totalPriceSet?: ShopifyMoneyBag;
}

export interface ShopifyDraftOrderNode extends ShopifyDraftOrderFinancialNode {
  id?: unknown;
  name?: unknown;
  invoiceUrl?: unknown;
  status?: unknown;
  tags?: unknown;
  customAttributes?: unknown;
}

export interface ValidatedShopifyDraftOrder {
  id: string;
  name: string;
  invoiceUrl: string;
  status: "OPEN";
}

const PRIVATE_FIELD_PATTERN = /(^|_)(supplier_?cost|standard_?trade_?price|cut_?trade_?price|gross_?margin|raw_?stock|batch_?reference|dye_?lot)($|_)/i;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MTM_LOCK_PROPERTY = "_curtainsuk_mtm_locked";

function assertCustomerSafe(value: unknown, path = "draftOrder"): void {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (PRIVATE_FIELD_PATTERN.test(key)) {
      throw new Error(`SHOPIFY_DRAFT_ORDER_PRIVATE_FIELD:${path}.${key}`);
    }
    assertCustomerSafe(child, `${path}.${key}`);
  }
}

function assertUuid(value: string, code: string): void {
  if (!UUID_PATTERN.test(value)) throw new Error(code);
}

function moneyFromMinor(amountMinor: number): ShopifyMoneyInput {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) {
    throw new Error("SHOPIFY_DRAFT_ORDER_MONEY_INVALID");
  }
  return { amount: (amountMinor / 100).toFixed(2), currencyCode: "GBP" };
}

export function allocateVatFromGross(
  grossAmountMinor: number,
  vatRateBasisPoints: number,
): number {
  if (!Number.isSafeInteger(grossAmountMinor) || grossAmountMinor < 0
      || !Number.isSafeInteger(vatRateBasisPoints) || vatRateBasisPoints < 0
      || vatRateBasisPoints > 10_000) {
    throw new Error("SHOPIFY_DRAFT_ORDER_VAT_INVALID");
  }
  // Shopify rounds tax directly; subtracting rounded net differs at half pennies.
  return Math.round(grossAmountMinor * vatRateBasisPoints / (10_000 + vatRateBasisPoints));
}

function humanize(value: string): string {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function safeText(value: unknown, maximum = 240): string {
  const text = String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  if (!text) return "Not recorded";
  return text.length <= maximum ? text : `${text.slice(0, maximum - 1)}…`;
}

function measurementValue(key: string, value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((item) => measurementValue(key, item)).join(" / ");
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return /(width|drop|height|vertical|slope|coverage)/i.test(key)
      ? `${value} cm`
      : String(value);
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return safeText(value, 80);
}

export function customerMeasurementSummary(
  measurements: Readonly<Record<string, unknown>>,
): string {
  const summary = Object.entries(measurements)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${humanize(key)}: ${measurementValue(key, value)}`)
    .join("; ");
  return safeText(summary, 240);
}

function positiveCentimetres(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  return value;
}

function formatCentimetres(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(1)));
}

/**
 * Customer checkout needs only the physical dimensions they gave us. The raw
 * snapshot retains its measurement anchors and rule version for CurtainsUK;
 * neither belongs in the buyer-facing line-item summary.
 */
export function customerDimensionSummary(
  measurements: Readonly<Record<string, unknown>>,
): string {
  const width = positiveCentimetres(measurements.raw_width_cm)
    ?? positiveCentimetres(measurements.coverage_width)
    ?? positiveCentimetres(measurements.width_cm);
  const drop = positiveCentimetres(measurements.raw_drop_cm)
    ?? positiveCentimetres(measurements.finished_drop)
    ?? positiveCentimetres(measurements.drop_cm);
  if (width !== null && drop !== null) return `${formatCentimetres(width)} × ${formatCentimetres(drop)} cm`;
  if (width !== null) return `${formatCentimetres(width)} cm wide`;
  if (drop !== null) return `${formatCentimetres(drop)} cm drop`;
  return "Not recorded";
}

function internalMeasurementAttributes(
  measurements: Readonly<Record<string, unknown>>,
): ShopifyAttributeInput[] {
  const fields: Array<[string, string]> = [
    ["measurement_contract_version", "measurement_contract_version"],
    ["hardware", "hardware"],
    ["raw_width_cm", "raw_width_cm"],
    ["raw_drop_cm", "raw_drop_cm"],
    ["width_anchor", "width_anchor"],
    ["drop_anchor", "drop_anchor"],
    ["desired_finish", "desired_finish"],
  ];
  return fields.flatMap(([attributeKey, measurementKey]) => {
    const value = measurements[measurementKey];
    if (value === undefined || value === null || String(value).trim() === "") return [];
    return [{ key: `curtainsuk_${attributeKey}`, value: safeText(value) }];
  });
}

function optionalEmail(value: string | null | undefined): string | undefined {
  if (value == null || value.trim() === "") return undefined;
  const email = value.trim().toLowerCase();
  if (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("SHOPIFY_DRAFT_ORDER_EMAIL_INVALID");
  }
  // Reserved synthetic review contacts cannot receive mail and Shopify rejects
  // their domain even during calculation. Keep them only in our staging review.
  if (email.endsWith(".invalid")) return undefined;
  return email;
}

function immutableClone<T>(value: T): Readonly<T> {
  const clone = structuredClone(value);
  const freeze = (item: unknown): void => {
    if (!item || typeof item !== "object" || Object.isFrozen(item)) return;
    for (const child of Object.values(item)) freeze(child);
    Object.freeze(item);
  };
  freeze(clone);
  return clone;
}

/**
 * Builds the only Shopify payload allowed by the staging handoff. Prices come
 * exclusively from the immutable Phase 5C snapshot. The contract deliberately
 * excludes DraftOrderComplete and invoice-send operations.
 */
export function buildShopifyDraftOrderContract(input: {
  handoff: Readonly<StagingCheckoutHandoff>;
  customerEmail?: string | null;
  fabricLabel?: string | null;
}): Readonly<ShopifyDraftOrderContract> {
  const handoff = input.handoff;
  const snapshot = handoff.snapshot;
  assertCustomerSafe(handoff, "handoff");
  assertUuid(handoff.handoffId, "SHOPIFY_DRAFT_ORDER_HANDOFF_ID_INVALID");
  assertUuid(snapshot.snapshotId, "SHOPIFY_DRAFT_ORDER_SNAPSHOT_ID_INVALID");
  assertUuid(snapshot.configurationId, "SHOPIFY_DRAFT_ORDER_CONFIGURATION_ID_INVALID");
  if (handoff.environment !== "STAGING"
      || handoff.mode !== "SHOPIFY_DRAFT_ORDER_EXACT_PRICE"
      || handoff.paymentEnabled !== false
      || handoff.shopifyWritePerformed !== false
      || handoff.checkoutUrl !== null) {
    throw new Error("SHOPIFY_DRAFT_ORDER_HANDOFF_UNSAFE");
  }
  if (snapshot.shipping.status !== "READY"
      || snapshot.shipping.grossAmountMinor === null
      || snapshot.shipping.currency !== "GBP"
      || snapshot.customerPrice.currency !== "GBP"
      || snapshot.customerPrice.grossAmountMinor !== handoff.goodsPriceGrossAmountMinor
      || snapshot.shipping.grossAmountMinor !== handoff.shippingGrossAmountMinor) {
    throw new Error("SHOPIFY_DRAFT_ORDER_HANDOFF_INCONSISTENT");
  }
  if (snapshot.customerPrice.netAmountMinor + snapshot.customerPrice.vatAmountMinor
      !== snapshot.customerPrice.grossAmountMinor) {
    throw new Error("SHOPIFY_DRAFT_ORDER_PRICE_INVALID");
  }

  const customerEmail = optionalEmail(input.customerEmail);
  const idempotencyTag = `CUK_H_${handoff.handoffId.replaceAll("-", "")}`;
  const shippingVatAmountMinor = allocateVatFromGross(
    snapshot.shipping.grossAmountMinor,
    snapshot.customerPrice.vatRateBasisPoints,
  );
  const fabricLabel = safeText(input.fabricLabel || "Approved curtain fabric");
  const lineAttributes: ShopifyAttributeInput[] = [
    { key: "Fabric", value: fabricLabel },
    { key: "Opening", value: humanize(snapshot.windowType) },
    { key: "Heading", value: humanize(snapshot.heading) },
    { key: "Width × drop", value: customerDimensionSummary(snapshot.measurements) },
    { key: "Lining", value: humanize(snapshot.lining) },
    { key: "Pair / single", value: humanize(snapshot.construction) },
    { key: "Made to measure", value: "This configuration is fixed. To change it, remove it and configure your curtains again." },
    { key: MTM_LOCK_PROPERTY, value: "true" },
  ];
  const orderAttributes: ShopifyAttributeInput[] = [
    { key: "curtainsuk_handoff_id", value: handoff.handoffId },
    { key: "curtainsuk_snapshot_id", value: snapshot.snapshotId },
    { key: "curtainsuk_configuration_id", value: snapshot.configurationId },
    { key: "curtainsuk_review_request_id", value: snapshot.reviewRequestId ?? "" },
    { key: "curtainsuk_review_revision_id", value: snapshot.reviewRevisionId ?? "" },
    { key: "curtainsuk_pricing_rule_version", value: safeText(snapshot.pricingRuleVersion) },
    { key: "curtainsuk_window_type", value: snapshot.windowType },
    { key: "curtainsuk_heading", value: snapshot.heading },
    { key: "curtainsuk_lining", value: snapshot.lining },
    { key: "curtainsuk_construction", value: snapshot.construction },
    { key: "curtainsuk_customer_dimension_summary", value: customerDimensionSummary(snapshot.measurements) },
    { key: "curtainsuk_calculated_fabric_metres", value: String(snapshot.calculatedFabricMetres) },
    ...internalMeasurementAttributes(snapshot.measurements),
  ];
  const draftInput: ShopifyDraftOrderInput = {
    acceptAutomaticDiscounts: false,
    allowDiscountCodesInCheckout: false,
    customAttributes: orderAttributes,
    ...(customerEmail ? { email: customerEmail } : {}),
    lineItems: [{
      title: `Made-to-measure curtains — ${humanize(snapshot.windowType)}`,
      quantity: 1,
      originalUnitPriceWithCurrency: moneyFromMinor(snapshot.customerPrice.grossAmountMinor),
      requiresShipping: true,
      taxable: true,
      // Supplier SKU remains in the private snapshot, joined by configuration ID.
      sku: `CUK-${snapshot.configurationId}`,
      customAttributes: lineAttributes,
    }],
    note: `STAGING TEST ONLY — do not fulfil or collect live payment. CurtainsUK configuration ${snapshot.configurationId}.`,
    presentmentCurrencyCode: "GBP",
    shippingLine: {
      title: `CurtainsUK ${humanize(snapshot.shipping.region)} delivery`,
      priceWithCurrency: moneyFromMinor(snapshot.shipping.grossAmountMinor),
    },
    // Draft order tax calculation needs an explicit UK jurisdiction before
    // checkout collects the customer's full delivery address.
    shippingAddress: { countryCode: "GB", ...(snapshot.shipping.postcode ? { zip: snapshot.shipping.postcode } : {}) },
    tags: [
      "CURTAINSUK_STAGING",
      "DO_NOT_FULFIL",
      "NO_REAL_PAYMENT",
      idempotencyTag,
    ],
    taxExempt: false,
  };
  const contract: ShopifyDraftOrderContract = {
    apiVersion: SHOPIFY_DRAFT_ORDER_API_VERSION,
    environment: "STAGING",
    handoffId: handoff.handoffId,
    snapshotId: snapshot.snapshotId,
    configurationId: snapshot.configurationId,
    idempotencyTag,
    requiredScopes: SHOPIFY_DRAFT_ORDER_REQUIRED_SCOPES,
    input: draftInput,
    expected: {
      currency: "GBP",
      goodsGrossAmountMinor: snapshot.customerPrice.grossAmountMinor,
      goodsVatAmountMinor: snapshot.customerPrice.vatAmountMinor,
      shippingGrossAmountMinor: snapshot.shipping.grossAmountMinor,
      shippingVatAmountMinor,
      orderGrossAmountMinor: snapshot.customerPrice.grossAmountMinor
        + snapshot.shipping.grossAmountMinor,
      orderVatAmountMinor: snapshot.customerPrice.vatAmountMinor
        + shippingVatAmountMinor,
    },
    paymentEnabled: false,
    completionMutationAllowed: false,
    invoiceSendAllowed: false,
  };
  assertCustomerSafe(contract);
  return immutableClone(contract);
}

/** Promote execution only; the approved configuration and all financial inputs stay immutable. */
export function asProductionDraftOrderContract(
  contract: Readonly<ShopifyDraftOrderContract>,
  fabricMasterId: string,
  fabricIdentity?: Readonly<{ supplier: string; brand: string; design: string; colour: string; supplierSku: string }>,
): Readonly<ShopifyDraftOrderContract> {
  if (!/^[a-zA-Z0-9_-]{1,200}$/.test(fabricMasterId)) throw new Error("SHOPIFY_FABRIC_ID_INVALID");
  const identity = fabricIdentity ?? { supplier: "Not recorded", brand: "Not recorded", design: "Not recorded", colour: "Not recorded", supplierSku: "Not recorded" };
  return immutableClone({
    ...contract,
    environment: "PRODUCTION" as const,
    paymentEnabled: true,
    input: {
      ...contract.input,
      note: `CurtainsUK made-to-measure configuration ${contract.configurationId}. Payment enters CurtainsUK review before any workroom release. Change requests: enquiries@curtainsuk.com within 2 hours; requests are reviewed, not guaranteed.`,
      tags: ["CURTAINSUK_PRODUCTION", contract.idempotencyTag],
      customAttributes: [
        ...contract.input.customAttributes,
        {key:"curtainsuk_fabric_master_id",value:fabricMasterId},
        {key:"curtainsuk_supplier_sku",value:identity.supplierSku},
        {key:"curtainsuk_supplier",value:safeText(identity.supplier)},
        {key:"curtainsuk_brand",value:safeText(identity.brand)},
        {key:"curtainsuk_design",value:safeText(identity.design)},
        {key:"curtainsuk_colour",value:safeText(identity.colour)},
        {key:"curtainsuk_post_payment_state",value:"PAID_TO_CURTAINSUK_REVIEW"},
        {key:"curtainsuk_change_request_window",value:"Email enquiries@curtainsuk.com within 2 hours; requests are reviewed, not guaranteed."},
      ],
      lineItems: contract.input.lineItems.map((line) => ({
        ...line,
      })),
    },
  });
}

export function parseShopifyMoneyMinor(value: unknown): number {
  if (typeof value !== "string" || !/^\d+(?:\.\d{1,2})?$/.test(value)) {
    throw new Error("SHOPIFY_DRAFT_ORDER_MONEY_RESPONSE_INVALID");
  }
  const [whole, fraction = ""] = value.split(".");
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(amount)) {
    throw new Error("SHOPIFY_DRAFT_ORDER_MONEY_RESPONSE_INVALID");
  }
  return amount;
}

function presentmentAmount(
  bag: ShopifyMoneyBag,
  expectedCurrency: "GBP",
): number {
  const money = bag?.presentmentMoney;
  if (!money || money.currencyCode !== expectedCurrency) {
    throw new Error("SHOPIFY_DRAFT_ORDER_CURRENCY_MISMATCH");
  }
  return parseShopifyMoneyMinor(money.amount);
}

/** Fails closed unless Shopify reproduces the approved gross, VAT and delivery. */
export function assertShopifyDraftOrderFinancials(
  node: ShopifyDraftOrderFinancialNode,
  expected: ShopifyDraftOrderExpectedFinancials,
): void {
  const currency = node.presentmentCurrencyCode ?? node.currencyCode;
  if (currency !== expected.currency || node.taxesIncluded !== true) {
    throw new Error("SHOPIFY_DRAFT_ORDER_TAX_BASIS_MISMATCH");
  }
  const goods = presentmentAmount(
    node.totalLineItemsPriceSet ?? node.subtotalPriceSet,
    expected.currency,
  );
  const shipping = presentmentAmount(node.totalShippingPriceSet, expected.currency);
  const vat = presentmentAmount(node.totalTaxSet, expected.currency);
  const discounts = presentmentAmount(node.totalDiscountsSet, expected.currency);
  const total = presentmentAmount(node.totalPriceSet, expected.currency);
  if (discounts !== 0
      || goods !== expected.goodsGrossAmountMinor
      || shipping !== expected.shippingGrossAmountMinor
      || vat !== expected.orderVatAmountMinor
      || total !== expected.orderGrossAmountMinor) {
    throw new Error("SHOPIFY_DRAFT_ORDER_EXACT_PRICE_MISMATCH");
  }
}

function attributes(value: unknown): ShopifyAttributeInput[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const key = (item as { key?: unknown }).key;
    const attributeValue = (item as { value?: unknown }).value;
    return typeof key === "string" && typeof attributeValue === "string"
      ? [{ key, value: attributeValue }]
      : [];
  });
}

export function validateShopifyDraftOrderNode(
  node: ShopifyDraftOrderNode,
  contract: ShopifyDraftOrderContract,
): ValidatedShopifyDraftOrder {
  assertShopifyDraftOrderFinancials(node, contract.expected);
  if (typeof node.id !== "string" || !node.id.startsWith("gid://shopify/DraftOrder/")) {
    throw new Error("SHOPIFY_DRAFT_ORDER_ID_INVALID");
  }
  if (typeof node.name !== "string" || !node.name.trim() || node.status !== "OPEN") {
    throw new Error("SHOPIFY_DRAFT_ORDER_STATE_INVALID");
  }
  if (!Array.isArray(node.tags) || !node.tags.includes(contract.idempotencyTag)) {
    throw new Error("SHOPIFY_DRAFT_ORDER_IDEMPOTENCY_MISMATCH");
  }
  const handoffAttribute = attributes(node.customAttributes)
    .find((attribute) => attribute.key === "curtainsuk_handoff_id");
  if (handoffAttribute?.value !== contract.handoffId) {
    throw new Error("SHOPIFY_DRAFT_ORDER_IDEMPOTENCY_MISMATCH");
  }
  if (contract.environment === "PRODUCTION") {
    if (!node.tags.includes("CURTAINSUK_PRODUCTION") || node.tags.some(tag => ["CURTAINSUK_STAGING","DO_NOT_FULFIL","NO_REAL_PAYMENT"].includes(String(tag)))) {
      throw new Error("SHOPIFY_DRAFT_ORDER_ENVIRONMENT_MISMATCH");
    }
    for (const expected of contract.input.customAttributes) {
      if (!attributes(node.customAttributes).some(actual => actual.key === expected.key && actual.value === expected.value)) throw new Error("SHOPIFY_DRAFT_ORDER_IDEMPOTENCY_MISMATCH");
    }
  }
  if (typeof node.invoiceUrl !== "string") {
    throw new Error("SHOPIFY_DRAFT_ORDER_CHECKOUT_URL_INVALID");
  }
  let checkoutUrl: URL;
  try {
    checkoutUrl = new URL(node.invoiceUrl);
  } catch {
    throw new Error("SHOPIFY_DRAFT_ORDER_CHECKOUT_URL_INVALID");
  }
  if (checkoutUrl.protocol !== "https:" || checkoutUrl.username || checkoutUrl.password || checkoutUrl.port
      || (contract.environment === "PRODUCTION" && !["www.curtainsuk.com","carpetup.myshopify.com"].includes(checkoutUrl.hostname))) {
    throw new Error("SHOPIFY_DRAFT_ORDER_CHECKOUT_URL_INVALID");
  }
  return Object.freeze({
    id: node.id,
    name: node.name,
    invoiceUrl: checkoutUrl.toString(),
    status: "OPEN" as const,
  });
}
