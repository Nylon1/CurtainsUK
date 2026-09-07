import { emailEvidenceReady, summarizeEmailEvidence } from "./email-evidence";
import "server-only";
import { fabricIsConfigurationEligible } from "@/lib/fabric-master/projection";
import { fabricMasterRecordById } from "@/lib/fabric-master/repository";
import { SupplierIntelligenceService } from "@/lib/supplier-intelligence/service";
import { SupabaseSupplierIntelligenceRepository } from "@/lib/supplier-intelligence/supabase-repository";
import type { PublicSupplierAvailability } from "@/lib/supplier-intelligence/types";
import {
  createImmutableConfigurationSnapshot,
  evaluateCheckoutGate,
  prepareStagingCheckoutHandoff,
  type CheckoutBlocker,
} from "./checkout-gates";
import {
  getStaffReviewRequest,
  persistStagingCheckoutSnapshotAndHandoff,
} from "./review-operations-repository";
import { persistShopifyDraftOrderExecution } from "./shopify-draft-order-repository";
import { executeStagingShopifyDraftOrder } from "./shopify-draft-order-server";
import { loadStagingUkShippingRules } from "./shipping-repository";
import { quoteOwnerApprovedCurtainShipping } from "./shipping-owner-inputs";
import { normalizeAvailabilityState } from "./review-request";
import { verifyReviewAcceptanceToken } from "./review-acceptance-token";
import { stagingCheckoutIdentity } from "./checkout-idempotency";
import { calculateStagingPrice } from "./server-staging-pricing";
import {
  approvedReviewParcelClass,
  instantCurtainParcelClass,
  quoteUkShipping,
  type ShippingParcelClass,
} from "./shipping";
import type { StagingPriceRequest } from "./staging-pricing";

export interface ServerStagingCheckoutHandoffInput {
  configuration?: StagingPriceRequest;
  /** The configuration ID returned by the signed price response. */
  configurationId?: string;
  reviewRequestId?: string;
  reviewAcceptanceToken?: string;
  customerAccepted: boolean;
  shippingRegion: string;
  shippingPostcode?: string;
  parcelClass: ShippingParcelClass;
}

export type ServerStagingCheckoutHandoffResult = {
  prepared: false;
  action: "SUBMIT_FOR_REVIEW" | "SUBMIT_PROJECT" | "BLOCKED";
  blockers: readonly CheckoutBlocker[];
  paymentEnabled: false;
  shopifyWritePerformed: false;
  checkoutUrl: null;
  message: string;
} | {
  prepared: true;
  action: "STAGING_CHECKOUT_HANDOFF";
  blockers: readonly CheckoutBlocker[];
  handoffId: string;
  snapshotId: string;
  goodsPriceGrossAmountMinor: number;
  shippingGrossAmountMinor: number;
  currency: "GBP";
  paymentEnabled: false;
  shopifyWritePerformed: boolean;
  checkoutUrl: string | null;
  testCheckoutStatus: "DISABLED" | "CALCULATED" | "TEST_DRAFT_CREATED" | "EXISTING_TEST_DRAFT_REUSED";
  message: string;
};

function blocked(input: {
  action: "SUBMIT_FOR_REVIEW" | "SUBMIT_PROJECT" | "BLOCKED";
  blockers: readonly CheckoutBlocker[];
}): ServerStagingCheckoutHandoffResult {
  return {
    prepared: false,
    action: input.action,
    blockers: input.blockers,
    paymentEnabled: false,
    shopifyWritePerformed: false,
    checkoutUrl: null,
    message: input.blockers.includes("SHIPPING_NOT_READY")
      ? "Delivery must be confirmed before the staging checkout handoff"
      : "This configuration is not ready for checkout",
  };
}

function priceFromRevision(revision: Record<string, unknown>) {
  const netAmountMinor = Number(revision.final_net_amount_minor);
  const vatAmountMinor = Number(revision.final_vat_amount_minor);
  const grossAmountMinor = Number(revision.final_gross_amount_minor);
  const vatRateBasisPoints = Number(revision.final_vat_rate_basis_points);
  return {
    netAmountMinor: Number.isInteger(netAmountMinor) ? netAmountMinor : null,
    vatAmountMinor: Number.isInteger(vatAmountMinor) ? vatAmountMinor : null,
    grossAmountMinor: Number.isInteger(grossAmountMinor) ? grossAmountMinor : null,
    vatRateBasisPoints: Number.isInteger(vatRateBasisPoints) ? vatRateBasisPoints : null,
    currency: "GBP" as const,
  };
}

function positiveMetres(value: unknown) {
  const metres = Number(value);
  return Number.isFinite(metres) && metres > 0 ? metres : null;
}

async function currentAvailability(input: {
  supplierId: string;
  supplierSku: string;
  metres: number;
}): Promise<PublicSupplierAvailability> {
  const projection = await new SupplierIntelligenceService(new SupabaseSupplierIntelligenceRepository()).projection({
    supplierId: input.supplierId,
    supplierSku: input.supplierSku,
    requirement: { quantity: input.metres, stock_unit: "METRE" },
  });
  return projection.availability;
}

/**
 * Signed-proxy controller. It recalculates instant prices or reads the immutable
 * approved staff revision; browser totals are never accepted. It writes only a
 * staging snapshot/handoff and can never create a Shopify checkout or payment.
 */
export async function prepareServerStagingCheckoutHandoff(
  input: ServerStagingCheckoutHandoffInput,
): Promise<ServerStagingCheckoutHandoffResult> {
  if (!input || typeof input !== "object"
      || typeof input.customerAccepted !== "boolean"
      || typeof input.shippingRegion !== "string"
      || !["STANDARD", "LARGE", "OVERSIZE", "SPECIALIST"].includes(input.parcelClass)
      || Boolean(input.reviewRequestId) === Boolean(input.configuration)
      || Boolean(input.configuration) !== Boolean(input.configurationId)
      || (input.configurationId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.configurationId))
      || (input.reviewRequestId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.reviewRequestId))) {
    throw new Error("CHECKOUT_REQUEST_INVALID");
  }
  const now = new Date().toISOString();

  let configurationId: string;
  let reviewRequestId: string | null = null;
  let reviewRevisionId: string | null = null;
  let outcome: "INSTANT_PRICE" | "PRICE_WITH_REVIEW" | "MANUAL_QUOTE";
  let windowType: string;
  let measurements: Record<string, unknown>;
  let fabricMasterId: string;
  let supplierSku: string;
  let heading: string;
  let lining: string;
  let construction: "PAIR" | "SINGLE";
  let calculatedFabricMetres: number;
  let pricingRuleVersion: string;
  let price: { netAmountMinor: number | null; vatAmountMinor: number | null; grossAmountMinor: number | null; vatRateBasisPoints: number | null; currency: "GBP" };
  let availability: PublicSupplierAvailability;
  let reviewState: import("./review-workflow").ReviewState | null = null;
  let fabricPricingEligible: boolean;
  let customerSummary: Record<string, unknown>;
  let shippingParcelClass: ShippingParcelClass;
  let customerEmail: string | null = null;
  let fabricLabel: string | null = null;

  if (input.reviewRequestId) {
    const detail = await getStaffReviewRequest(input.reviewRequestId);
    if (!detail) throw new Error("CHECKOUT_REVIEW_NOT_FOUND");
    const request = detail.request;
    const latest = detail.revisions.at(-1);
    if (!latest) throw new Error("CHECKOUT_REVIEW_REVISION_MISSING");
    const specification = latest.specification;
    if (!specification || typeof specification !== "object" || Array.isArray(specification)) {
      throw new Error("CHECKOUT_REVIEW_REVISION_INVALID");
    }
    const spec = specification as Record<string, unknown>;
    if (!emailEvidenceReady(summarizeEmailEvidence(detail.emailEvidenceEvents, String(latest.revision_id), request.window_type_slug, String(spec.window_type_slug ?? request.window_type_slug)))) throw new Error("CHECKOUT_REVIEW_NOT_READY");
    calculatedFabricMetres = positiveMetres(spec.calculated_fabric_metres)
      ?? positiveMetres((request as unknown as Record<string, unknown>).calculated_fabric_metres)
      ?? 0;
    price = priceFromRevision(latest);
    configurationId = request.configuration_id;
    reviewRequestId = request.request_id;
    reviewRevisionId = String(latest.revision_id);
    if (!verifyReviewAcceptanceToken(input.reviewAcceptanceToken, {
      reviewRequestId,
      reviewRevisionId,
    })) {
      throw new Error("CHECKOUT_REVIEW_ACCEPTANCE_INVALID");
    }
    outcome = request.pricing_outcome;
    windowType = String(spec.window_type_slug ?? request.window_type_slug);
    measurements = (spec.measurements && typeof spec.measurements === "object" && !Array.isArray(spec.measurements))
      ? spec.measurements as Record<string, unknown>
      : request.measurements;
    fabricMasterId = String(spec.fabric_id ?? request.fabric_id);
    supplierSku = String(spec.supplier_sku ?? request.supplier_sku);
    const supplierId = String(spec.supplier_id ?? request.supplier_id);
    const record = await fabricMasterRecordById(fabricMasterId);
    if (!record || record.supplier_id !== supplierId || record.supplier_sku !== supplierSku) {
      throw new Error("CHECKOUT_FABRIC_IDENTITY_INVALID");
    }
    heading = String(spec.heading ?? request.heading);
    lining = String(spec.lining ?? request.lining);
    construction = String(spec.construction ?? request.construction) as "PAIR" | "SINGLE";
    shippingParcelClass = approvedReviewParcelClass(spec.shipping_parcel_class);
    pricingRuleVersion = String(latest.pricing_rule_version ?? "");
    reviewState = request.review_state;
    customerEmail = request.customer_email;
    fabricPricingEligible = fabricIsConfigurationEligible(record);
    availability = calculatedFabricMetres > 0
      ? await currentAvailability({ supplierId: record.supplier_id, supplierSku: record.supplier_sku, metres: calculatedFabricMetres })
      : "AVAILABILITY_TO_BE_CONFIRMED";
    customerSummary = {
      windowType,
      measurements,
      fabric: { brand: record.brand_name, collection: record.collection_name, design: record.design_name, colour: record.colour_name },
      heading,
      lining,
      construction,
      availability,
      reviewState,
      vatIncluded: true,
      deliveryShownSeparately: true,
    };
    fabricLabel = [record.brand_name, record.design_name, record.colour_name].filter(Boolean).join(" — ");
  } else {
    if (!input.configuration) throw new Error("CHECKOUT_CONFIGURATION_REQUIRED");
    const calculation = await calculateStagingPrice(input.configuration);
    const record = await fabricMasterRecordById(input.configuration.fabricId);
    if (!record) throw new Error("CHECKOUT_FABRIC_IDENTITY_INVALID");
    configurationId = input.configurationId!;
    outcome = calculation.outcome;
    windowType = input.configuration.windowSlug;
    measurements = {
      measurement_basis: input.configuration.measurementBasis,
      coverage_width: calculation.totalCoverageWidthCm,
      finished_drop: input.configuration.dropCm,
      ...(input.configuration.baySegmentWidthsCm ? { bay_segment_widths: input.configuration.baySegmentWidthsCm } : {}),
    };
    fabricMasterId = record.fabric_id;
    supplierSku = record.supplier_sku;
    heading = calculation.heading;
    lining = calculation.lining;
    construction = calculation.construction;
    calculatedFabricMetres = calculation.fabricMetres;
    shippingParcelClass = instantCurtainParcelClass(calculation.fabricWidths);
    pricingRuleVersion = calculation.calculationVersion;
    price = {
      netAmountMinor: calculation.netAmountMinor,
      vatAmountMinor: calculation.vatAmountMinor,
      grossAmountMinor: calculation.totalAmountMinor,
      vatRateBasisPoints: calculation.vatRateBasisPoints,
      currency: "GBP",
    };
    fabricPricingEligible = fabricIsConfigurationEligible(record);
    availability = normalizeAvailabilityState(calculation.availability);
    customerSummary = {
      windowType,
      measurements,
      fabric: calculation.selectedFabric,
      heading,
      lining,
      construction,
      availability,
      vatIncluded: true,
      deliveryShownSeparately: true,
    };
    fabricLabel = [
      calculation.selectedFabric.supplier,
      calculation.selectedFabric.design,
      calculation.selectedFabric.colour,
    ].filter(Boolean).join(" — ");
  }

  const shipping = shippingParcelClass === "SPECIALIST"
    ? quoteUkShipping({ region: input.shippingRegion, parcelClass: "SPECIALIST" })
    : quoteOwnerApprovedCurtainShipping({
      selectedRegion: input.shippingRegion, postcode: input.shippingPostcode,
      fabricMetres: calculatedFabricMetres,
      maximumDropCm: Math.max(0, ...Object.entries(measurements)
        .filter(([key, value]) => /drop|height|vertical/i.test(key) && typeof value === "number")
        .map(([, value]) => Number(value))),
      rules: await loadStagingUkShippingRules(),
    });

  const gate = evaluateCheckoutGate({
    outcome,
    price,
    fabricPricingEligible,
    technicallyValid: calculatedFabricMetres > 0,
    availability,
    reviewState,
    customerAccepted: input.customerAccepted,
    shipping,
  });
  if (!gate.eligible) return blocked({ action: gate.action as "SUBMIT_FOR_REVIEW" | "SUBMIT_PROJECT" | "BLOCKED", blockers: gate.blockers });

  const checkoutIdentity = stagingCheckoutIdentity(configurationId);
  const snapshot = createImmutableConfigurationSnapshot({
    snapshotId: checkoutIdentity.snapshotId,
    configurationId,
    reviewRequestId,
    reviewRevisionId,
    outcome,
    windowType,
    measurements,
    fabricMasterId,
    supplierSku,
    heading,
    lining,
    construction,
    calculatedFabricMetres,
    pricingRuleVersion,
    customerPrice: {
      netAmountMinor: price.netAmountMinor!,
      vatAmountMinor: price.vatAmountMinor!,
      grossAmountMinor: price.grossAmountMinor!,
      vatRateBasisPoints: price.vatRateBasisPoints!,
      currency: "GBP",
    },
    availability,
    shipping,
    customerAcceptedAt: now,
    recordedAt: now,
    gate,
  });
  const handoff = prepareStagingCheckoutHandoff({ handoffId: checkoutIdentity.handoffId, snapshot, preparedAt: now });
  const persisted = await persistStagingCheckoutSnapshotAndHandoff({
    snapshot,
    customerSummary,
    handoffId: handoff.handoffId,
    preparedBy: "SHOPIFY_APP_PROXY_CUSTOMER",
  });
  const shopifyExecution = await executeStagingShopifyDraftOrder({
    handoff,
    customerEmail,
    fabricLabel,
  });
  if (shopifyExecution.status !== "DISABLED") {
    await persistShopifyDraftOrderExecution({
      handoff,
      execution: shopifyExecution,
      executedBy: "SHOPIFY_APP_PROXY_CUSTOMER",
    });
  }
  return {
    prepared: true,
    action: "STAGING_CHECKOUT_HANDOFF",
    blockers: [],
    handoffId: String(persisted.handoff_id ?? handoff.handoffId),
    snapshotId: snapshot.snapshotId,
    goodsPriceGrossAmountMinor: handoff.goodsPriceGrossAmountMinor,
    shippingGrossAmountMinor: handoff.shippingGrossAmountMinor,
    currency: "GBP",
    paymentEnabled: false,
    shopifyWritePerformed: shopifyExecution.shopifyWritePerformed,
    checkoutUrl: shopifyExecution.checkoutUrl,
    testCheckoutStatus: shopifyExecution.status,
    message: shopifyExecution.status === "TEST_DRAFT_CREATED"
      ? "Shopify test checkout is ready. Real payment remains disabled."
      : shopifyExecution.status === "EXISTING_TEST_DRAFT_REUSED"
        ? "Existing Shopify test checkout recovered. Real payment remains disabled."
        : shopifyExecution.status === "CALCULATED"
          ? "Shopify verified the exact staging total. Test checkout creation remains disabled."
          : "Staging checkout handoff prepared. Shopify test checkout remains disabled.",
  };
}
