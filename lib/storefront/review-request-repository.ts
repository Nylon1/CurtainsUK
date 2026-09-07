import "server-only";
import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import { fabricMasterRecordById } from "@/lib/fabric-master/repository";
import { createSupplierServiceClient } from "@/lib/supabase/supplier-service";
import { SupplierIntelligenceService } from "@/lib/supplier-intelligence/service";
import { SupabaseSupplierIntelligenceRepository } from "@/lib/supplier-intelligence/supabase-repository";
import type { PublicSupplierAvailability } from "@/lib/supplier-intelligence/types";
import { getPrimaryMaster, STOREFRONT_WINDOWS_BY_SLUG } from "./window-catalog";
import { calculateStagingPrice, classifyServerSpecialistReview } from "./server-staging-pricing";
import type { SpecialistReviewRequest, StagingPriceRequest } from "./staging-pricing";
import {
  normalizeAvailabilityState,
  normalizeReviewContact,
  reviewProvisionalPrice,
  validConfigurationId,
  type ReviewEvidenceReference,
  type ReviewConfiguration,
  type ReviewRequestReceipt,
} from "./review-request";
import { verifyReviewSubmission } from "./review-token";

const EVIDENCE_BUCKET = "curtainsuk-review-evidence-staging";
const MAX_FILE_BYTES = 3 * 1024 * 1024;
const MAX_TOTAL_EVIDENCE_BYTES = 3_800_000;
const MAX_PHOTOS = 8;
const PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
const DRAWING_TYPES = new Set([...PHOTO_TYPES, "application/pdf"]);

export interface ReviewSubmissionFiles {
  photos: File[];
  drawing: File | null;
}

function isSpecialistConfiguration(input: ReviewConfiguration): input is SpecialistReviewRequest {
  return "measurements" in input;
}

function validatedFile(file: File, kind: ReviewEvidenceReference["kind"]) {
  const allowed = kind === "PHOTO" ? PHOTO_TYPES : DRAWING_TYPES;
  if (!file.name || file.size <= 0 || file.size > MAX_FILE_BYTES || !allowed.has(file.type)) {
    throw new Error("REVIEW_EVIDENCE_INVALID");
  }
  return file;
}

function safeExtension(file: File) {
  const byType: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/heic": ".heic",
    "image/heif": ".heif",
    "application/pdf": ".pdf",
  };
  return byType[file.type] ?? extname(file.name).toLowerCase();
}

function hasExpectedSignature(bytes: Buffer, contentType: string) {
  if (contentType === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (contentType === "image/png") return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (contentType === "image/webp") return bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  if (contentType === "application/pdf") return bytes.length >= 5 && bytes.toString("ascii", 0, 5) === "%PDF-";
  if (contentType === "image/heic" || contentType === "image/heif") {
    const brand = bytes.length >= 12 && bytes.toString("ascii", 4, 8) === "ftyp" ? bytes.toString("ascii", 8, 12) : "";
    return ["heic", "heix", "hevc", "hevx", "mif1", "msf1"].includes(brand);
  }
  return false;
}

function normalizedMeasurements(configuration: ReviewConfiguration) {
  if (isSpecialistConfiguration(configuration)) return configuration.measurements;
  const baySections = configuration.baySegmentWidthsCm ?? [];
  const cornerSections = configuration.cornerSectionWidthsCm ?? [];
  const sections = baySections.length ? baySections : cornerSections;
  return {
    coverage_width: sections.length
      ? sections.reduce((total, width) => total + width, 0)
      : configuration.widthCm,
    finished_drop: configuration.dropCm,
    ...(sections.length ? {
      bay_segment_widths: sections,
      number_of_sections: baySections.length ? configuration.bayNumberOfSections ?? sections.length : 2,
      ...(baySections.length ? { track_or_pole_fitted: configuration.bayTrackOrPoleFitted ?? null } : {}),
      ...(cornerSections.length ? { bay_angles_degrees: [configuration.cornerAngleDegrees] } : {}),
    } : {}),
    ...(configuration.windowSlug === "curved-bow-window" && typeof configuration.widthCm === "number"
      ? { curve_arc_length: configuration.widthCm }
      : {}),
  };
}

async function specialistAvailability(supplierId: string, supplierSku: string): Promise<PublicSupplierAvailability> {
  const projection = await new SupplierIntelligenceService(new SupabaseSupplierIntelligenceRepository()).projection({
    supplierId,
    supplierSku,
    requirement: null,
  });
  return projection.availability;
}

async function uploadEvidence(requestId: string, files: ReviewSubmissionFiles) {
  const database = createSupplierServiceClient();
  const uploadedPaths: string[] = [];
  const evidence: ReviewEvidenceReference[] = [];
  const candidates = [
    ...files.photos.map((file) => ({ file: validatedFile(file, "PHOTO"), kind: "PHOTO" as const })),
    ...(files.drawing ? [{ file: validatedFile(files.drawing, "DRAWING"), kind: "DRAWING" as const }] : []),
  ];
  if (candidates.reduce((total, candidate) => total + candidate.file.size, 0) > MAX_TOTAL_EVIDENCE_BYTES) {
    throw new Error("REVIEW_EVIDENCE_INVALID");
  }

  try {
    for (const candidate of candidates) {
      const objectPath = `${requestId}/${candidate.kind.toLowerCase()}-${randomUUID()}${safeExtension(candidate.file)}`;
      const bytes = Buffer.from(await candidate.file.arrayBuffer());
      if (!hasExpectedSignature(bytes, candidate.file.type)) throw new Error("REVIEW_EVIDENCE_INVALID");
      const { error } = await database.storage.from(EVIDENCE_BUCKET).upload(objectPath, bytes, {
        contentType: candidate.file.type,
        upsert: false,
        cacheControl: "0",
      });
      if (error) throw new Error("REVIEW_EVIDENCE_UPLOAD_FAILED");
      uploadedPaths.push(objectPath);
      evidence.push({
        kind: candidate.kind,
        file_name: candidate.file.name.slice(0, 255),
        object_path: objectPath,
        content_type: candidate.file.type,
        size_bytes: candidate.file.size,
      });
    }
    return { evidence, uploadedPaths };
  } catch (error) {
    if (uploadedPaths.length) await database.storage.from(EVIDENCE_BUCKET).remove(uploadedPaths);
    throw error;
  }
}

async function existingReviewRecord(configurationId: string): Promise<{ receipt: ReviewRequestReceipt; evidencePaths: Set<string> } | null> {
  const { data, error } = await createSupplierServiceClient()
    .from("staging_review_requests")
    .select("request_id,configuration_id,review_state,submitted_at,evidence")
    .eq("configuration_id", configurationId)
    .maybeSingle();
  if (error) throw new Error("REVIEW_REQUEST_PERSISTENCE_FAILED");
  if (!data) return null;
  const reviewState = String(data.review_state) as ReviewRequestReceipt["reviewState"];
  if (!["PENDING", "IN_REVIEW", "MORE_INFORMATION_REQUIRED", "APPROVED", "REJECTED"].includes(reviewState)) {
    throw new Error("REVIEW_REQUEST_PERSISTENCE_FAILED");
  }
  const evidence = Array.isArray(data.evidence) ? data.evidence : [];
  return {
    receipt: {
      requestId: String(data.request_id),
      configurationId: String(data.configuration_id),
      reviewState,
      submittedAt: String(data.submitted_at),
      message: "Your project is already saved for technical review. No duplicate request or payment was created.",
    },
    evidencePaths: new Set(evidence.flatMap((item) => {
      if (!item || typeof item !== "object" || !("object_path" in item) || typeof item.object_path !== "string") return [];
      return [item.object_path];
    })),
  };
}

async function existingReviewReceipt(configurationId: string) {
  return (await existingReviewRecord(configurationId))?.receipt ?? null;
}

export async function createStagingReviewRequest(input: {
  configuration: ReviewConfiguration;
  clientCalculation: Record<string, unknown>;
  contact: { name?: unknown; email?: unknown; phone?: unknown; notes?: unknown };
  files: ReviewSubmissionFiles;
}): Promise<ReviewRequestReceipt> {
  const contact = normalizeReviewContact(input.contact);
  if (input.files.photos.length > MAX_PHOTOS) throw new Error("REVIEW_EVIDENCE_INVALID");
  const storefrontWindow = STOREFRONT_WINDOWS_BY_SLUG.get(input.configuration.windowSlug);
  if (!storefrontWindow) throw new Error("REVIEW_CONFIGURATION_INVALID");
  const windowMaster = getPrimaryMaster(storefrontWindow);
  const specialistConfiguration = isSpecialistConfiguration(input.configuration) ? input.configuration : null;
  const standardConfiguration = specialistConfiguration ? null : input.configuration as StagingPriceRequest;
  if ((storefrontWindow.journey === "SPECIALIST") !== Boolean(specialistConfiguration)) throw new Error("REVIEW_CONFIGURATION_INVALID");
  if (windowMaster.photoRequired && input.files.photos.length === 0) throw new Error("REVIEW_EVIDENCE_REQUIRED");
  if (windowMaster.drawingRequired && !input.files.drawing) throw new Error("REVIEW_DRAWING_REQUIRED");

  const record = await fabricMasterRecordById(input.configuration.fabricId);
  if (!record || record.lifecycle_state === "DISCONTINUED") throw new Error("Window type or fabric is unavailable");

  const calculation = specialistConfiguration
    ? await classifyServerSpecialistReview(specialistConfiguration)
    : await calculateStagingPrice(standardConfiguration!);
  const outcome = calculation.outcome;
  const totalAmountMinor = "totalAmountMinor" in calculation ? calculation.totalAmountMinor : null;
  const provisionalPriceMinor = reviewProvisionalPrice({ outcome, totalAmountMinor });
  const clientConfigurationId = validConfigurationId(input.clientCalculation.configurationId);
  const clientOutcome = input.clientCalculation.outcome;
  const clientTotal = typeof input.clientCalculation.totalAmountMinor === "number"
    ? input.clientCalculation.totalAmountMinor
    : null;
  if (!clientConfigurationId
    || (clientOutcome !== "PRICE_WITH_REVIEW" && clientOutcome !== "MANUAL_QUOTE")
    || !verifyReviewSubmission({
      configuration: input.configuration,
      configurationId: clientConfigurationId,
      outcome: clientOutcome,
      totalAmountMinor: clientTotal,
    }, input.clientCalculation.reviewSubmissionToken)) {
    throw new Error("REVIEW_SUBMISSION_TOKEN_INVALID");
  }
  if (clientOutcome !== outcome || clientTotal !== provisionalPriceMinor) throw new Error("REVIEW_CONFIGURATION_CHANGED");
  const availabilityState = specialistConfiguration
    ? await specialistAvailability(record.supplier_id, record.supplier_sku)
    : normalizeAvailabilityState("availability" in calculation ? calculation.availability : null);
  const submittedAt = new Date().toISOString();
  const requestId = randomUUID();
  const configurationId = clientConfigurationId;
  const existing = await existingReviewReceipt(configurationId);
  if (existing) return existing;
  const { evidence, uploadedPaths } = await uploadEvidence(requestId, input.files);
  const database = createSupplierServiceClient();

  try {
    const { data, error } = await database.rpc("create_staging_review_request", {
      p_request: {
        request_id: requestId,
        event_id: randomUUID(),
        configuration_id: configurationId,
        window_type_slug: input.configuration.windowSlug,
        measurement_basis: standardConfiguration?.measurementBasis ?? null,
        measurements: normalizedMeasurements(input.configuration),
        fabric_id: record.fabric_id,
        supplier_id: record.supplier_id,
        supplier_sku: record.supplier_sku,
        heading: input.configuration.heading,
        lining: input.configuration.lining,
        interlining: "interlining" in input.configuration ? input.configuration.interlining ?? "NONE" : "NONE",
        construction: input.configuration.construction,
        stack_direction: input.configuration.stackDirection,
        fixing_position: specialistConfiguration?.fixingPosition ?? null,
        availability_state: availabilityState,
        pricing_outcome: outcome,
        provisional_gross_price_minor: provisionalPriceMinor,
        currency: "GBP",
        calculation_version: "calculationVersion" in calculation
          ? calculation.calculationVersion
          : calculation.rulesVersion,
        evidence,
        customer_name: contact.name,
        customer_email: contact.email,
        customer_phone: contact.phone,
        notes: contact.notes,
        submitted_at: submittedAt,
      },
    });
    if (error) throw new Error("REVIEW_REQUEST_PERSISTENCE_FAILED");
    const persisted = data as { request_id?: string; configuration_id?: string; review_state?: string; submitted_at?: string; created?: boolean } | null;
    const persistedState = persisted?.review_state as ReviewRequestReceipt["reviewState"] | undefined;
    if (!persisted?.request_id || !persistedState || !["PENDING", "IN_REVIEW", "MORE_INFORMATION_REQUIRED", "APPROVED", "REJECTED"].includes(persistedState)) {
      throw new Error("REVIEW_REQUEST_PERSISTENCE_FAILED");
    }
    if (persisted.created === false && uploadedPaths.length) await database.storage.from(EVIDENCE_BUCKET).remove(uploadedPaths);
    return {
      requestId: persisted.request_id,
      configurationId: persisted.configuration_id ?? configurationId,
      reviewState: persistedState,
      submittedAt: persisted.submitted_at ?? submittedAt,
      message: persisted.created === false
        ? "Your project is already saved for technical review. No duplicate request or payment was created."
        : "Your project is saved for technical review. We will contact you with the next steps before any payment or manufacture.",
    };
  } catch (error) {
    let persistedAfterFailure: Awaited<ReturnType<typeof existingReviewRecord>> = null;
    try {
      persistedAfterFailure = await existingReviewRecord(configurationId);
    } catch {
      // Preserve evidence when persistence is ambiguous; a later orphan-cleanup
      // policy may remove unreferenced objects without breaking a committed row.
      throw error;
    }
    const committedEvidence = persistedAfterFailure
      && uploadedPaths.every((objectPath) => persistedAfterFailure.evidencePaths.has(objectPath));
    if (!committedEvidence && uploadedPaths.length) await database.storage.from(EVIDENCE_BUCKET).remove(uploadedPaths);
    if (persistedAfterFailure) return persistedAfterFailure.receipt;
    throw error;
  }
}
