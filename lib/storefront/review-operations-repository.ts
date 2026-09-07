import "server-only";
import { randomUUID } from "node:crypto";
import type {
  ReviewDetail,
  ReviewEvidence,
  ReviewListItem,
  ReviewListResponse,
  ReviewRevision,
} from "@/app/admin/reviews/contracts";
import { createSupplierServiceClient } from "@/lib/supabase/supplier-service";
import type { ImmutableConfigurationSnapshot } from "./checkout-gates";
import { STOREFRONT_WINDOWS_BY_SLUG } from "./window-catalog";
import { REVIEW_STATES, type ReviewState } from "./review-workflow";

const REVIEW_REQUEST_COLUMNS = "request_id,configuration_id,window_type_slug,measurement_basis,measurements,fabric_id,supplier_id,supplier_sku,heading,lining,interlining,construction,stack_direction,fixing_position,availability_state,pricing_outcome,provisional_gross_price_minor,calculated_fabric_metres,currency,calculation_version,evidence,customer_name,customer_email,customer_phone,notes,review_state,submitted_at,updated_at";
const REVIEW_REVISION_COLUMNS = "revision_id,request_id,revision_number,previous_revision_id,revision_kind,specification,final_net_amount_minor,final_vat_amount_minor,final_gross_amount_minor,final_vat_rate_basis_points,currency,pricing_rule_version,actor_type,actor_id,reason,created_at";
const REVIEW_EVIDENCE_COLUMNS = "evidence_id,request_id,kind,file_name,claimed_content_type,detected_content_type,size_bytes,security_state,scanned_at,rejection_reason,retention_expires_at,deletion_requested_at,deleted_at,created_at,updated_at";

type Row = Record<string, unknown>;

export interface StaffReviewListItem {
  request_id: string;
  configuration_id: string;
  window_type_slug: string;
  measurement_basis: string | null;
  measurements: Record<string, unknown>;
  fabric_id: string;
  supplier_id: string;
  supplier_sku: string;
  heading: string;
  lining: string;
  interlining: string;
  construction: "PAIR" | "SINGLE";
  stack_direction: string;
  fixing_position: string | null;
  availability_state: string;
  pricing_outcome: "PRICE_WITH_REVIEW" | "MANUAL_QUOTE";
  provisional_gross_price_minor: number | null;
  calculated_fabric_metres: number | null;
  currency: "GBP";
  calculation_version: string | null;
  evidence: unknown[];
  customer_name: string | null;
  customer_email: string;
  customer_phone: string | null;
  notes: string | null;
  review_state: ReviewState;
  submitted_at: string;
  updated_at: string;
}

export interface StaffReviewDetail {
  request: StaffReviewListItem;
  revisions: Record<string, unknown>[];
  events: Record<string, unknown>[];
  evidence: Record<string, unknown>[];
}

interface StaffFabricMetadata {
  fabricId: string;
  supplierId: string;
  supplierName: string;
  supplierSku: string;
  brand: string | null;
  collection: string | null;
  design: string;
  colour: string;
  configurationEligible: boolean;
}

interface ReviewPageCursor {
  submittedAt: string;
  requestId: string;
}

interface EffectiveReviewSpecification {
  specification: Row;
  windowTypeSlug: string;
  fabricId: string;
  supplierId: string;
  supplierSku: string;
  availabilityState: string;
}

function assertReviewState(value: unknown): asserts value is ReviewState {
  if (typeof value !== "string" || !REVIEW_STATES.includes(value as ReviewState)) {
    throw new Error("REVIEW_PERSISTED_STATE_INVALID");
  }
}

function normalizeRequest(row: Record<string, unknown>): StaffReviewListItem {
  assertReviewState(row.review_state);
  if (row.currency !== "GBP") throw new Error("REVIEW_PERSISTED_CURRENCY_INVALID");
  if (!Array.isArray(row.evidence)
      || !["PRICE_WITH_REVIEW", "MANUAL_QUOTE"].includes(String(row.pricing_outcome))
      || typeof row.measurements !== "object"
      || row.measurements === null
      || Array.isArray(row.measurements)) {
    throw new Error("REVIEW_PERSISTED_REQUEST_INVALID");
  }
  return row as unknown as StaffReviewListItem;
}

export async function listStaffReviewRequests(input: {
  state?: ReviewState;
  query?: string;
  cursor?: string;
  limit?: number;
} = {}): Promise<{ requests: StaffReviewListItem[]; nextCursor: string | null }> {
  const limit = Math.min(Math.max(input.limit ?? 30, 1), 100);
  const cursor = input.cursor ? decodeReviewCursor(input.cursor) : null;
  let query = createSupplierServiceClient()
    .from("staging_review_requests")
    .select(REVIEW_REQUEST_COLUMNS)
    .order("submitted_at", { ascending: false })
    .order("request_id", { ascending: false })
    .limit(limit + 1);
  if (input.state) query = query.eq("review_state", input.state);
  if (input.query) {
    const term = input.query.trim();
    const filters = [
      `customer_name.ilike.%${term}%`,
      `customer_email.ilike.%${term}%`,
      `supplier_sku.ilike.%${term}%`,
      `window_type_slug.ilike.%${term}%`,
    ];
    if (/^[0-9a-f-]{36}$/i.test(term)) filters.push(`request_id.eq.${term}`, `configuration_id.eq.${term}`);
    query = query.or(filters.join(","));
  }
  if (cursor) {
    query = query.or(`submitted_at.lt.${cursor.submittedAt},and(submitted_at.eq.${cursor.submittedAt},request_id.lt.${cursor.requestId})`);
  }
  const { data, error } = await query;
  if (error) throw new Error("REVIEW_LIST_FAILED");
  const requests = (data ?? []).map((row) => normalizeRequest(row as Record<string, unknown>));
  const hasNext = requests.length > limit;
  const page = requests.slice(0, limit);
  const last = page.at(-1);
  return {
    requests: page,
    nextCursor: hasNext && last ? encodeReviewCursor({ submittedAt: last.submitted_at, requestId: last.request_id }) : null,
  };
}

export async function getStaffReviewRequest(requestId: string): Promise<StaffReviewDetail | null> {
  const database = createSupplierServiceClient();
  const [requestResult, revisionResult, eventResult, evidenceResult] = await Promise.all([
    database.from("staging_review_requests")
      .select(REVIEW_REQUEST_COLUMNS)
      .eq("request_id", requestId)
      .maybeSingle(),
    database.from("staging_review_request_revisions")
      .select(REVIEW_REVISION_COLUMNS)
      .eq("request_id", requestId)
      .order("revision_number", { ascending: true }),
    database.from("staging_review_request_events")
      .select("event_id,request_id,review_state,actor_type,actor_id,reason,created_at")
      .eq("request_id", requestId)
      .order("created_at", { ascending: true }),
    database.from("staging_review_evidence")
      .select(REVIEW_EVIDENCE_COLUMNS)
      .eq("request_id", requestId)
      .order("created_at", { ascending: true }),
  ]);
  if (requestResult.error || revisionResult.error || eventResult.error || evidenceResult.error) {
    throw new Error("REVIEW_DETAIL_FAILED");
  }
  if (!requestResult.data) return null;
  return {
    request: normalizeRequest(requestResult.data as Record<string, unknown>),
    revisions: (revisionResult.data ?? []) as Record<string, unknown>[],
    events: (eventResult.data ?? []) as Record<string, unknown>[],
    evidence: (evidenceResult.data ?? []) as Record<string, unknown>[],
  };
}

function firstRelation(value: unknown): Row | null {
  if (Array.isArray(value)) return value[0] && typeof value[0] === "object" ? value[0] as Row : null;
  return value && typeof value === "object" ? value as Row : null;
}

function encodeReviewCursor(cursor: ReviewPageCursor) {
  return Buffer.from(JSON.stringify({ v: 1, ...cursor }), "utf8").toString("base64url");
}

function decodeReviewCursor(value: string): ReviewPageCursor {
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Row;
    if (Object.keys(parsed).sort().join(",") !== "requestId,submittedAt,v"
        || parsed.v !== 1
        || typeof parsed.submittedAt !== "string"
        || !Number.isFinite(Date.parse(parsed.submittedAt))
        || typeof parsed.requestId !== "string"
        || !/^[0-9a-f-]{36}$/i.test(parsed.requestId)) throw new Error();
    return { submittedAt: parsed.submittedAt, requestId: parsed.requestId };
  } catch {
    throw new Error("REVIEW_CURSOR_INVALID");
  }
}

async function reviewCounts(): Promise<Record<ReviewState, number>> {
  const database = createSupplierServiceClient();
  const results = await Promise.all(REVIEW_STATES.map((state) => database
    .from("staging_review_requests")
    .select("request_id", { count: "exact", head: true })
    .eq("review_state", state)));
  const counts = {} as Record<ReviewState, number>;
  results.forEach((result, index) => {
    if (result.error) throw new Error("REVIEW_COUNTS_FAILED");
    counts[REVIEW_STATES[index]] = result.count ?? 0;
  });
  return counts;
}

async function fabricMetadata(fabricIds: readonly string[]): Promise<Map<string, StaffFabricMetadata>> {
  if (fabricIds.length === 0) return new Map();
  const { data, error } = await createSupplierServiceClient()
    .from("fabric_colourways")
    .select("fabric_id,supplier_id,supplier_sku,colour_name,lifecycle_state,price_verification_status,storefront_selectable,suppliers!inner(display_name),supplier_brands!inner(display_name),fabric_designs!inner(display_name,fabric_collections!inner(display_name))")
    .in("fabric_id", [...new Set(fabricIds)]);
  if (error) throw new Error("REVIEW_FABRIC_LOOKUP_FAILED");
  return new Map(((data ?? []) as Row[]).map((row) => {
    const supplier = firstRelation(row.suppliers);
    const brand = firstRelation(row.supplier_brands);
    const design = firstRelation(row.fabric_designs);
    const collection = firstRelation(design?.fabric_collections);
    const fabricId = String(row.fabric_id);
    return [fabricId, {
      fabricId,
      supplierId: String(row.supplier_id),
      supplierName: String(supplier?.display_name ?? row.supplier_id),
      supplierSku: String(row.supplier_sku),
      brand: brand?.display_name == null ? null : String(brand.display_name),
      collection: collection?.display_name == null ? null : String(collection.display_name),
      design: String(design?.display_name ?? "Unknown design"),
      colour: String(row.colour_name),
      configurationEligible: row.lifecycle_state === "CURRENT"
        && row.price_verification_status === "VERIFIED"
        && row.storefront_selectable === true,
    } satisfies StaffFabricMetadata];
  }));
}

function reviewReference(requestId: string) {
  return `CUK-R-${requestId.replaceAll("-", "").slice(0, 8).toUpperCase()}`;
}

function windowLabel(slug: string) {
  return STOREFRONT_WINDOWS_BY_SLUG.get(slug)?.name
    ?? slug.split("-").map((part) => part ? part[0].toUpperCase() + part.slice(1) : part).join(" ");
}

function publicAvailabilityLabel(value: string) {
  const labels: Record<string, string> = {
    FABRIC_AVAILABLE: "Fabric available",
    LIMITED_AVAILABILITY: "Limited availability",
    AVAILABLE_SOON: "Available soon",
    AVAILABILITY_TO_BE_CONFIRMED: "Availability to be confirmed",
    TEMPORARILY_UNAVAILABLE: "Temporarily unavailable",
    NO_LONGER_AVAILABLE: "No longer available",
  };
  return labels[value] ?? "Availability to be confirmed";
}

function assertPublicAvailability(value: string): asserts value is ReviewListItem["availabilityState"] {
  if (!["FABRIC_AVAILABLE", "LIMITED_AVAILABILITY", "AVAILABLE_SOON", "AVAILABILITY_TO_BE_CONFIRMED", "TEMPORARILY_UNAVAILABLE", "NO_LONGER_AVAILABLE"].includes(value)) {
    throw new Error("REVIEW_PERSISTED_AVAILABILITY_INVALID");
  }
}

function evidenceCount(rows: readonly Row[], expectedTotal: number) {
  const clean = rows.filter((row) => row.security_state === "CLEAN").length;
  const total = Math.max(rows.length, expectedTotal);
  return { total, clean, blocked: total - clean };
}

function latestRevision(rows: readonly Row[]) {
  return [...rows].sort((left, right) => Number(right.revision_number) - Number(left.revision_number))[0] ?? null;
}

function effectiveReviewSpecification(request: StaffReviewListItem, revisions: readonly Row[]): EffectiveReviewSpecification {
  const latest = latestRevision(revisions);
  const specification = latest?.specification && typeof latest.specification === "object" && !Array.isArray(latest.specification)
    ? latest.specification as Row
    : {};
  const stringOrFallback = (key: string, fallback: string) => {
    const value = specification[key];
    return typeof value === "string" && value.trim() ? value.trim() : fallback;
  };
  return {
    specification,
    windowTypeSlug: stringOrFallback("window_type_slug", request.window_type_slug),
    fabricId: stringOrFallback("fabric_id", request.fabric_id),
    supplierId: stringOrFallback("supplier_id", request.supplier_id),
    supplierSku: stringOrFallback("supplier_sku", request.supplier_sku),
    availabilityState: stringOrFallback("availability_state", request.availability_state),
  };
}

function dashboardListItem(input: {
  request: StaffReviewListItem;
  fabric: StaffFabricMetadata;
  evidence: readonly Row[];
  revisions: readonly Row[];
  effective: EffectiveReviewSpecification;
}): ReviewListItem {
  const latest = latestRevision(input.revisions);
  assertPublicAvailability(input.effective.availabilityState);
  return {
    requestId: input.request.request_id,
    configurationId: input.request.configuration_id,
    reference: reviewReference(input.request.request_id),
    reviewState: input.request.review_state,
    pricingOutcome: input.request.pricing_outcome,
    submittedAt: input.request.submitted_at,
    updatedAt: input.request.updated_at,
    customerName: input.request.customer_name,
    customerEmail: input.request.customer_email,
    windowTypeSlug: input.effective.windowTypeSlug,
    windowTypeLabel: windowLabel(input.effective.windowTypeSlug),
    fabric: {
      fabricId: input.fabric.fabricId,
      supplierId: input.fabric.supplierId,
      supplierName: input.fabric.supplierName,
      supplierSku: input.fabric.supplierSku,
      brand: input.fabric.brand,
      collection: input.fabric.collection,
      design: input.fabric.design,
      colour: input.fabric.colour,
    },
    availabilityState: input.effective.availabilityState,
    provisionalGrossPriceMinor: input.request.provisional_gross_price_minor,
    finalGrossPriceMinor: latest?.final_gross_amount_minor == null ? null : Number(latest.final_gross_amount_minor),
    currency: "GBP",
    evidenceCounts: evidenceCount(input.evidence, input.request.evidence.length),
  };
}

export async function listStaffReviewDashboard(input: {
  state?: ReviewState;
  query?: string;
  cursor?: string;
  limit?: number;
} = {}): Promise<ReviewListResponse> {
  const [page, counts] = await Promise.all([listStaffReviewRequests(input), reviewCounts()]);
  const requestIds = page.requests.map((request) => request.request_id);
  const database = createSupplierServiceClient();
  const [evidenceResult, revisionsResult] = await Promise.all([
    requestIds.length === 0
      ? Promise.resolve({ data: [] as Row[], error: null })
      : database.from("staging_review_evidence").select("request_id,security_state").in("request_id", requestIds),
    requestIds.length === 0
      ? Promise.resolve({ data: [] as Row[], error: null })
      : database.from("staging_review_request_revisions").select("request_id,revision_number,specification,final_gross_amount_minor").in("request_id", requestIds),
  ]);
  if (evidenceResult.error || revisionsResult.error) throw new Error("REVIEW_LIST_RELATION_FAILED");
  const evidence = (evidenceResult.data ?? []) as Row[];
  const revisions = (revisionsResult.data ?? []) as Row[];
  const effectiveByRequest = new Map(page.requests.map((request) => {
    const requestRevisions = revisions.filter((row) => row.request_id === request.request_id);
    return [request.request_id, effectiveReviewSpecification(request, requestRevisions)];
  }));
  const fabrics = await fabricMetadata([...effectiveByRequest.values()].map((effective) => effective.fabricId));
  return {
    reviews: page.requests.map((request) => {
      const effective = effectiveByRequest.get(request.request_id)!;
      const fabric = fabrics.get(effective.fabricId);
      if (!fabric) throw new Error("REVIEW_FABRIC_IDENTITY_MISSING");
      return dashboardListItem({
        request,
        fabric,
        evidence: evidence.filter((row) => row.request_id === request.request_id),
        revisions: revisions.filter((row) => row.request_id === request.request_id),
        effective,
      });
    }),
    counts,
    nextCursor: page.nextCursor,
  };
}

function dashboardRevision(row: Row): ReviewRevision {
  const hasPrice = row.final_gross_amount_minor != null;
  return {
    revisionId: String(row.revision_id),
    revisionNumber: Number(row.revision_number),
    previousRevisionId: row.previous_revision_id == null ? null : String(row.previous_revision_id),
    kind: row.revision_kind as ReviewRevision["kind"],
    specification: row.specification as ReviewRevision["specification"],
    finalPrice: hasPrice ? {
      netAmountMinor: Number(row.final_net_amount_minor),
      vatAmountMinor: Number(row.final_vat_amount_minor),
      grossAmountMinor: Number(row.final_gross_amount_minor),
      vatRateBasisPoints: Number(row.final_vat_rate_basis_points) as 2000,
      currency: "GBP",
    } : null,
    pricingRuleVersion: row.pricing_rule_version == null ? null : String(row.pricing_rule_version),
    actorLabel: row.actor_id == null ? null : String(row.actor_id),
    reason: String(row.reason),
    createdAt: String(row.created_at),
  };
}

function dashboardEvidence(row: Row): ReviewEvidence {
  return {
    evidenceId: String(row.evidence_id),
    kind: row.kind as ReviewEvidence["kind"],
    fileName: String(row.file_name),
    contentType: String(row.detected_content_type ?? row.claimed_content_type),
    sizeBytes: Number(row.size_bytes),
    securityState: row.security_state as ReviewEvidence["securityState"],
    scannedAt: row.scanned_at == null ? null : String(row.scanned_at),
    retentionExpiresAt: String(row.retention_expires_at),
  };
}

export async function getStaffReviewDashboard(requestId: string): Promise<ReviewDetail | null> {
  const detail = await getStaffReviewRequest(requestId);
  if (!detail) return null;
  const effective = effectiveReviewSpecification(detail.request, detail.revisions);
  const fabric = (await fabricMetadata([effective.fabricId])).get(effective.fabricId);
  if (!fabric) throw new Error("REVIEW_FABRIC_IDENTITY_MISSING");
  assertPublicAvailability(effective.availabilityState);
  const revisions = detail.revisions.map(dashboardRevision);
  const latest = revisions.at(-1) ?? null;
  const evidence = detail.evidence.map(dashboardEvidence);
  const allEvidenceClean = evidence.length === detail.request.evidence.length
    && evidence.every((item) => item.securityState === "CLEAN");
  const availabilityAcceptable = ["FABRIC_AVAILABLE", "LIMITED_AVAILABILITY"].includes(effective.availabilityState);
  const fabricIdentityValid = fabric.fabricId === effective.fabricId
    && fabric.supplierId === effective.supplierId
    && fabric.supplierSku === effective.supplierSku;
  const blockedReasons: string[] = [];
  if (detail.request.review_state !== "APPROVED") blockedReasons.push(detail.request.review_state === "READY_FOR_CHECKOUT" ? "Checkout readiness is already recorded" : "Review approval is required");
  if (!latest?.finalPrice) blockedReasons.push("A final VAT-inclusive price is required");
  if (!latest?.pricingRuleVersion) blockedReasons.push("A pricing ruleset version is required");
  if (!allEvidenceClean) blockedReasons.push("All submitted evidence must pass security scanning");
  if (!availabilityAcceptable) blockedReasons.push("Fabric availability must be confirmed");
  if (!fabricIdentityValid) blockedReasons.push("The amended fabric identity is inconsistent");
  if (!fabric.configurationEligible) blockedReasons.push("Fabric is not pricing-eligible");
  const specification = effective.specification;
  const calculatedMetres = Number(specification.calculated_fabric_metres ?? detail.request.calculated_fabric_metres);
  if (!Number.isFinite(calculatedMetres) || calculatedMetres <= 0) {
    blockedReasons.push("Calculated fabric metres are required");
  }
  const shippingParcelClass = ["STANDARD", "OVERSIZE", "SPECIALIST"].includes(String(specification.shipping_parcel_class))
    ? String(specification.shipping_parcel_class) as ReviewDetail["configuration"]["shippingParcelClass"]
    : null;
  if (!shippingParcelClass) blockedReasons.push("A shipping parcel class is required");
  let previousState: ReviewState | null = null;
  const audit = detail.events.map((row) => {
    assertReviewState(row.review_state);
    const toState = row.review_state;
    const entry = {
      eventId: String(row.event_id),
      fromState: previousState,
      toState,
      actorLabel: row.actor_id == null ? String(row.actor_type ?? "System") : String(row.actor_id),
      reason: String(row.reason ?? "Review state recorded"),
      occurredAt: String(row.created_at),
    };
    previousState = toState;
    return entry;
  });
  const base = dashboardListItem({ request: detail.request, fabric, evidence: detail.evidence, revisions: detail.revisions, effective });
  return {
    ...base,
    customer: {
      name: detail.request.customer_name,
      email: detail.request.customer_email,
      phone: detail.request.customer_phone,
      notes: detail.request.notes,
    },
    configuration: {
      measurementBasis: specification.measurement_basis == null ? detail.request.measurement_basis : String(specification.measurement_basis),
      measurements: specification.measurements && typeof specification.measurements === "object" && !Array.isArray(specification.measurements)
        ? specification.measurements as ReviewDetail["configuration"]["measurements"]
        : detail.request.measurements as ReviewDetail["configuration"]["measurements"],
      heading: String(specification.heading ?? detail.request.heading),
      lining: String(specification.lining ?? detail.request.lining),
      interlining: String(specification.interlining ?? detail.request.interlining),
      construction: String(specification.construction ?? detail.request.construction),
      stackDirection: String(specification.stack_direction ?? detail.request.stack_direction),
      fixingPosition: specification.fixing_position == null ? detail.request.fixing_position : String(specification.fixing_position),
      shippingParcelClass,
      accessories: Array.isArray(specification.accessories) ? specification.accessories as ReviewDetail["configuration"]["accessories"] : [],
    },
    pricing: {
      outcome: detail.request.pricing_outcome,
      provisionalGrossPriceMinor: detail.request.provisional_gross_price_minor,
      finalPrice: latest?.finalPrice ?? null,
      calculationVersion: detail.request.calculation_version,
      pricingRuleVersion: latest?.pricingRuleVersion ?? null,
    },
    availability: {
      state: effective.availabilityState as ReviewDetail["availability"]["state"],
      label: publicAvailabilityLabel(effective.availabilityState),
      checkedAt: null,
    },
    evidence,
    revisions,
    audit,
    checkout: {
      eligible: detail.request.review_state === "APPROVED" && blockedReasons.length === 0,
      blockedReasons,
      reference: detail.request.review_state === "READY_FOR_CHECKOUT" ? `${reviewReference(detail.request.request_id)}-READY` : null,
    },
  };
}

export async function appendStaffReviewRevision(input: {
  requestId: string;
  specification: Record<string, unknown>;
  actorId: string;
  reason: string;
  finalPrice?: {
    netAmountMinor: number;
    vatAmountMinor: number;
    grossAmountMinor: number;
    vatRateBasisPoints: 2000;
  } | null;
  pricingRuleVersion?: string | null;
  expectedState: ReviewState;
  expectedLatestRevisionId: string;
}) {
  const { data, error } = await createSupplierServiceClient().rpc("append_staging_review_revision", {
    p_revision: {
      revision_id: randomUUID(),
      request_id: input.requestId,
      specification: input.specification,
      actor_id: input.actorId,
      reason: input.reason,
      final_net_amount_minor: input.finalPrice?.netAmountMinor ?? null,
      final_vat_amount_minor: input.finalPrice?.vatAmountMinor ?? null,
      final_gross_amount_minor: input.finalPrice?.grossAmountMinor ?? null,
      final_vat_rate_basis_points: input.finalPrice?.vatRateBasisPoints ?? null,
      pricing_rule_version: input.pricingRuleVersion ?? null,
      expected_state: input.expectedState,
      expected_latest_revision_id: input.expectedLatestRevisionId,
    },
  });
  if (error) throwReviewRepositoryError(error, "REVIEW_AMENDMENT_FAILED");
  return data as Record<string, unknown>;
}

export async function transitionStaffReviewRequest(input: {
  requestId: string;
  state: Exclude<ReviewState, "PENDING">;
  actorId: string;
  reason: string;
  expectedState: ReviewState;
  expectedLatestRevisionId: string;
}) {
  const { data, error } = await createSupplierServiceClient().rpc("transition_staging_review_request", {
    p_request_id: input.requestId,
    p_review_state: input.state,
    p_actor_id: input.actorId,
    p_reason: input.reason,
    p_expected_state: input.expectedState,
    p_expected_latest_revision_id: input.expectedLatestRevisionId,
  });
  if (error) throwReviewRepositoryError(error, "REVIEW_TRANSITION_FAILED");
  return data as Record<string, unknown>;
}

function throwReviewRepositoryError(error: { code?: string; message?: string }, fallback: string): never {
  const message = error.message ?? "";
  if (message.includes("changed since it was loaded")) throw new Error("REVIEW_CONFLICT");
  if (message.includes("Unknown review request")) throw new Error("REVIEW_NOT_FOUND");
  if (message.includes("Review must be open before amendment")) throw new Error("REVIEW_CONFLICT");
  if (message.includes("Invalid review state transition") || message.includes("Review state is unchanged")) throw new Error("REVIEW_TRANSITION_INVALID");
  if (message.includes("evidence must be clean")) throw new Error("REVIEW_EVIDENCE_NOT_CLEAN");
  if (message.includes("final price")) throw new Error("REVIEW_FINAL_PRICE_REQUIRED");
  if (message.includes("availability must be acceptable")
      || message.includes("not pricing-eligible")
      || message.includes("Calculated fabric metres are required")) {
    throw new Error("REVIEW_CHECKOUT_BLOCKED");
  }
  throw new Error(fallback);
}

export async function persistCheckoutSnapshot(input: {
  snapshot: Readonly<ImmutableConfigurationSnapshot>;
  customerSummary: Record<string, unknown>;
}) {
  const snapshot = input.snapshot;
  if (snapshot.shipping.status !== "READY" || snapshot.shipping.grossAmountMinor === null) {
    throw new Error("CHECKOUT_SHIPPING_NOT_READY");
  }
  const { data, error } = await createSupplierServiceClient().rpc("create_staging_configuration_snapshot", {
    p_snapshot: {
      snapshot_id: snapshot.snapshotId,
      configuration_id: snapshot.configurationId,
      review_request_id: snapshot.reviewRequestId,
      review_revision_id: snapshot.reviewRevisionId,
      pricing_outcome: snapshot.outcome,
      window_type_slug: snapshot.windowType,
      measurements: snapshot.measurements,
      fabric_master_id: snapshot.fabricMasterId,
      supplier_sku: snapshot.supplierSku,
      heading: snapshot.heading,
      lining: snapshot.lining,
      construction: snapshot.construction,
      calculated_fabric_metres: snapshot.calculatedFabricMetres,
      pricing_rule_version: snapshot.pricingRuleVersion,
      net_amount_minor: snapshot.customerPrice.netAmountMinor,
      vat_amount_minor: snapshot.customerPrice.vatAmountMinor,
      vat_rate_basis_points: snapshot.customerPrice.vatRateBasisPoints,
      customer_price_minor: snapshot.customerPrice.grossAmountMinor,
      availability_state: snapshot.availability,
      shipping_region: snapshot.shipping.region,
      shipping_parcel_class: snapshot.shipping.parcelClass,
      shipping_gross_amount_minor: snapshot.shipping.grossAmountMinor,
      customer_summary: input.customerSummary,
      approval_reference: snapshot.reviewRequestId,
    },
  });
  if (error) throw new Error("CHECKOUT_SNAPSHOT_PERSISTENCE_FAILED");
  return data as Record<string, unknown>;
}

export async function persistStagingCheckoutHandoff(input: {
  snapshotId: string;
  preparedBy: string;
}) {
  const { data, error } = await createSupplierServiceClient().rpc("prepare_staging_checkout_handoff", {
    p_snapshot_id: input.snapshotId,
    p_handoff_id: randomUUID(),
    p_prepared_by: input.preparedBy,
  });
  if (error) throw new Error("CHECKOUT_HANDOFF_PERSISTENCE_FAILED");
  return data as Record<string, unknown>;
}

export async function persistStagingCheckoutSnapshotAndHandoff(input: {
  snapshot: Readonly<ImmutableConfigurationSnapshot>;
  customerSummary: Record<string, unknown>;
  handoffId: string;
  preparedBy: string;
}) {
  const snapshot = input.snapshot;
  if (snapshot.shipping.status !== "READY" || snapshot.shipping.grossAmountMinor === null) {
    throw new Error("CHECKOUT_SHIPPING_NOT_READY");
  }
  const { data, error } = await createSupplierServiceClient().rpc("create_staging_checkout_snapshot_and_handoff", {
    p_snapshot: {
      snapshot_id: snapshot.snapshotId,
      configuration_id: snapshot.configurationId,
      review_request_id: snapshot.reviewRequestId,
      review_revision_id: snapshot.reviewRevisionId,
      pricing_outcome: snapshot.outcome,
      window_type_slug: snapshot.windowType,
      measurements: snapshot.measurements,
      fabric_master_id: snapshot.fabricMasterId,
      supplier_sku: snapshot.supplierSku,
      heading: snapshot.heading,
      lining: snapshot.lining,
      construction: snapshot.construction,
      calculated_fabric_metres: snapshot.calculatedFabricMetres,
      pricing_rule_version: snapshot.pricingRuleVersion,
      net_amount_minor: snapshot.customerPrice.netAmountMinor,
      vat_amount_minor: snapshot.customerPrice.vatAmountMinor,
      vat_rate_basis_points: snapshot.customerPrice.vatRateBasisPoints,
      customer_price_minor: snapshot.customerPrice.grossAmountMinor,
      availability_state: snapshot.availability,
      shipping_region: snapshot.shipping.region,
      shipping_parcel_class: snapshot.shipping.parcelClass,
      shipping_gross_amount_minor: snapshot.shipping.grossAmountMinor,
      customer_summary: input.customerSummary,
      approval_reference: snapshot.reviewRequestId,
    },
    p_handoff_id: input.handoffId,
    p_prepared_by: input.preparedBy,
  });
  if (error) {
    // The configuration ID and derived snapshot/handoff IDs are stable. If a
    // response was lost after commit, return the exact existing receipt only
    // after proving that every immutable customer-facing field still matches.
    const database = createSupplierServiceClient();
    const { data: existingSnapshot, error: snapshotError } = await database
      .from("staging_configuration_snapshots")
      .select("snapshot_id,configuration_id,review_request_id,review_revision_id,pricing_outcome,window_type_slug,measurements,fabric_master_id,supplier_sku,heading,lining,construction,calculated_fabric_metres,pricing_rule_version,net_amount_minor,vat_amount_minor,customer_price_minor,vat_rate_basis_points,currency,availability_state,shipping_region,shipping_parcel_class,shipping_gross_amount_minor,customer_summary")
      .eq("configuration_id", snapshot.configurationId)
      .maybeSingle();
    if (snapshotError || !existingSnapshot) throw new Error("CHECKOUT_HANDOFF_PERSISTENCE_FAILED");
    const canonical = (value: unknown): string => {
      if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
      if (value && typeof value === "object") {
        return `{${Object.entries(value as Record<string, unknown>)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([key, child]) => `${JSON.stringify(key)}:${canonical(child)}`)
          .join(",")}}`;
      }
      return JSON.stringify(value);
    };
    const text = (value: unknown) => value === null || value === undefined ? null : String(value);
    const matches = text(existingSnapshot.snapshot_id) === snapshot.snapshotId
      && text(existingSnapshot.configuration_id) === snapshot.configurationId
      && text(existingSnapshot.review_request_id) === snapshot.reviewRequestId
      && text(existingSnapshot.review_revision_id) === snapshot.reviewRevisionId
      && text(existingSnapshot.pricing_outcome) === snapshot.outcome
      && text(existingSnapshot.window_type_slug) === snapshot.windowType
      && canonical(existingSnapshot.measurements) === canonical(snapshot.measurements)
      && text(existingSnapshot.fabric_master_id) === snapshot.fabricMasterId
      && text(existingSnapshot.supplier_sku) === snapshot.supplierSku
      && text(existingSnapshot.heading) === snapshot.heading
      && text(existingSnapshot.lining) === snapshot.lining
      && text(existingSnapshot.construction) === snapshot.construction
      && Number(existingSnapshot.calculated_fabric_metres) === snapshot.calculatedFabricMetres
      && text(existingSnapshot.pricing_rule_version) === snapshot.pricingRuleVersion
      && Number(existingSnapshot.net_amount_minor) === snapshot.customerPrice.netAmountMinor
      && Number(existingSnapshot.vat_amount_minor) === snapshot.customerPrice.vatAmountMinor
      && Number(existingSnapshot.customer_price_minor) === snapshot.customerPrice.grossAmountMinor
      && Number(existingSnapshot.vat_rate_basis_points) === snapshot.customerPrice.vatRateBasisPoints
      && text(existingSnapshot.currency) === snapshot.customerPrice.currency
      && text(existingSnapshot.availability_state) === snapshot.availability
      && text(existingSnapshot.shipping_region) === snapshot.shipping.region
      && text(existingSnapshot.shipping_parcel_class) === snapshot.shipping.parcelClass
      && Number(existingSnapshot.shipping_gross_amount_minor) === snapshot.shipping.grossAmountMinor
      && canonical(existingSnapshot.customer_summary) === canonical(input.customerSummary);
    if (!matches) throw new Error("CHECKOUT_IDEMPOTENCY_CONFLICT");
    const { data: existingHandoff, error: handoffError } = await database
      .from("staging_checkout_handoffs")
      .select("handoff_id,snapshot_id")
      .eq("snapshot_id", snapshot.snapshotId)
      .maybeSingle();
    if (handoffError || !existingHandoff
        || text(existingHandoff.handoff_id) !== input.handoffId
        || text(existingHandoff.snapshot_id) !== snapshot.snapshotId) {
      throw new Error("CHECKOUT_IDEMPOTENCY_CONFLICT");
    }
    return {
      snapshot_id: snapshot.snapshotId,
      configuration_id: snapshot.configurationId,
      handoff_id: input.handoffId,
      idempotent_recovery: true,
    };
  }
  return data as Record<string, unknown>;
}
