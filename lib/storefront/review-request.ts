import type { PublicSupplierAvailability } from "@/lib/supplier-intelligence/types";
import type { SpecialistReviewRequest, StagingPriceRequest } from "./staging-pricing";
import type { ReviewState } from "./review-workflow";

export type ReviewConfiguration = StagingPriceRequest | SpecialistReviewRequest;

export interface ReviewContact {
  name: string | null;
  email: string;
  phone: string | null;
  notes: string | null;
}

export interface ReviewEvidenceReference {
  kind: "PHOTO" | "DRAWING";
  file_name: string;
  object_path: string;
  content_type: string;
  size_bytes: number;
}

export interface ReviewRequestReceipt {
  requestId: string;
  reference: string;
  configurationId: string;
  reviewState: ReviewState;
  submittedAt: string;
  message: string;
}

const AVAILABILITY_BY_LABEL: Record<string, PublicSupplierAvailability> = {
  "Fabric available": "FABRIC_AVAILABLE",
  "Limited availability": "LIMITED_AVAILABILITY",
  "Available soon": "AVAILABLE_SOON",
  "Availability to be confirmed": "AVAILABILITY_TO_BE_CONFIRMED",
  "Temporarily unavailable": "TEMPORARILY_UNAVAILABLE",
  "No longer available": "NO_LONGER_AVAILABLE",
};

function optionalText(value: unknown, maximum: number) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return null;
  if (text.length > maximum) throw new Error("REVIEW_CONTACT_INVALID");
  return text;
}

export function normalizeReviewContact(input: {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  notes?: unknown;
}): ReviewContact {
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  if (email.length < 3 || email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("REVIEW_CONTACT_INVALID");
  }
  return {
    name: optionalText(input.name, 160),
    email,
    phone: optionalText(input.phone, 80),
    notes: optionalText(input.notes, 4_000),
  };
}

export function normalizeAvailabilityState(value: string | null | undefined): PublicSupplierAvailability {
  return AVAILABILITY_BY_LABEL[value ?? ""] ?? "AVAILABILITY_TO_BE_CONFIRMED";
}

export function reviewProvisionalPrice(input: {
  outcome: "INSTANT_PRICE" | "PRICE_WITH_REVIEW" | "MANUAL_QUOTE";
  totalAmountMinor?: number | null;
}) {
  if (input.outcome === "INSTANT_PRICE") throw new Error("REVIEW_ROUTE_REQUIRED");
  if (input.outcome === "MANUAL_QUOTE") return null;
  const amount = input.totalAmountMinor;
  return typeof amount === "number" && Number.isInteger(amount) && amount > 0 ? amount : null;
}

export function validConfigurationId(value: unknown) {
  return typeof value === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
}
