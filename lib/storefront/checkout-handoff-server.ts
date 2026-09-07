import "server-only";
import { randomUUID } from "node:crypto";
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
import { normalizeAvailabilityState } from "./review-request";
import { verifyReviewAcceptanceToken } from "./review-acceptance-token";
import { calculateStagingPrice } from "./server-staging-pricing";
import {
  approvedReviewParcelClass,
  instantCurtainParcelClass,
  quoteUkShipping,
  STAGING_UK_SHIPPING_RULES,
  type ShippingParcelClass,
  type ShippingRule,
} from "./shipping";
import type { StagingPriceRequest } from "./staging-pricing";

export interface ServerStagingCheckoutHandoffInput {
  configuration?: StagingPriceRequest;
  reviewRequestId?: string;
  reviewAcceptanceToken?: string;
  customerAccepted: boolean;
  shippingRegion: string;
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
  shopifyWritePerformed: false;
  checkoutUrl: null;
  message: string;
};

function serverShippingRules(): readonly ShippingRule[] {
  const raw = process.env.CURTAINSUK_STAGING_SHIPPING_RATES_JSON;
  if (!raw) return STAGING_UK_SHIPPING_RULES;
  try {
    const configured = JSON.parse(raw) as Record<string, unknown>;
    return STAGING_UK_SHIPPING_RULES.map((rule) => {
      const value = configured[`${rule.region}:${rule.parcelClass}`];
      return Number.isInteger(value) && Number(value) > 0
        ? { ...rule, grossAmountMinor: Number(value), status: "VALIDATED" as const }
        : rule;
    });
  } catch {
    return STAGING_UK_SHIPPING_RULES;
  }
}

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
      || !["STANDARD", "OVERSIZE", "SPECIALIST"].includes(input.parcelClass)
      || Boolean(input.reviewRequestId) === Boolean(input.configuration)
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
  } else {
    if (!input.configuration) throw new Error("CHECKOUT_CONFIGURATION_REQUIRED");
    const calculation = await calculateStagingPrice(input.configuration);
    const record = await fabricMasterRecordById(input.configuration.fabricId);
    if (!record) throw new Error("CHECKOUT_FABRIC_IDENTITY_INVALID");
    configurationId = calculation.configurationId;
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
  }

  const shipping = quoteUkShipping({
    region: input.shippingRegion,
    parcelClass: shippingParcelClass,
    rules: serverShippingRules(),
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

  const snapshot = createImmutableConfigurationSnapshot({
    snapshotId: randomUUID(),
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
  const handoff = prepareStagingCheckoutHandoff({ handoffId: randomUUID(), snapshot, preparedAt: now });
  const persisted = await persistStagingCheckoutSnapshotAndHandoff({
    snapshot,
    customerSummary,
    handoffId: handoff.handoffId,
    preparedBy: "SHOPIFY_APP_PROXY_CUSTOMER",
  });
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
    shopifyWritePerformed: false,
    checkoutUrl: null,
    message: "Staging checkout handoff prepared. Payment remains disabled.",
  };
}
