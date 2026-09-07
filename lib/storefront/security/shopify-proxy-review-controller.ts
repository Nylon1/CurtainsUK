import "server-only";
import type { ReviewConfiguration } from "@/lib/storefront/review-request";
import { readHardLimitedRequestBytes } from "./http";

const ALLOWED_FIELDS = new Set(["configuration", "calculation", "contactName", "contactEmail", "contactPhone", "notes", "photos", "drawing"]);
const MAX_PROXY_REVIEW_BYTES = 4_000_000;

function jsonField(form: FormData, name: string) {
  const value = form.get(name);
  if (typeof value !== "string" || !value) throw new Error("REVIEW_CONFIGURATION_INVALID");
  try {
    return JSON.parse(value) as unknown;
  } catch {
    throw new Error("REVIEW_CONFIGURATION_INVALID");
  }
}

function files(form: FormData, name: string) {
  return form.getAll(name).filter((value): value is File => value instanceof File && value.size > 0);
}

export interface ParsedProxyReviewRequest {
  configuration: ReviewConfiguration;
  clientCalculation: Record<string, unknown>;
  contact: { name: unknown; email: unknown; phone: unknown; notes: unknown };
  files: { photos: File[]; drawing: File | null };
}

/**
 * Parses a signed proxy upload before the review repository performs its
 * magic-byte validation, quarantine registration and configured malware scan.
 */
export async function parseProxyReviewRequest(request: Request): Promise<ParsedProxyReviewRequest> {
  const contentType = request.headers.get("content-type");
  if (!contentType) throw new Error("REVIEW_CONFIGURATION_INVALID");
  const bytes = await readHardLimitedRequestBytes(request, MAX_PROXY_REVIEW_BYTES);
  const form = await new Response(bytes, { headers: { "content-type": contentType } }).formData();
  for (const key of form.keys()) if (!ALLOWED_FIELDS.has(key)) throw new Error("REVIEW_CONFIGURATION_INVALID");
  const scalarLimits: Record<string, number> = {
    configuration: 50_000,
    calculation: 50_000,
    contactName: 160,
    contactEmail: 320,
    contactPhone: 80,
    notes: 4_000,
  };
  for (const [name, maximum] of Object.entries(scalarLimits)) {
    const values = form.getAll(name);
    if (values.length !== 1 || typeof values[0] !== "string" || values[0].length > maximum) {
      throw new Error("REVIEW_CONFIGURATION_INVALID");
    }
  }
  const photos = files(form, "photos");
  const drawings = files(form, "drawing");
  if (photos.length > 8 || drawings.length > 1) throw new Error("REVIEW_EVIDENCE_INVALID");
  const drawing = drawings[0] ?? null;
  return {
    configuration: jsonField(form, "configuration") as ReviewConfiguration,
    clientCalculation: jsonField(form, "calculation") as Record<string, unknown>,
    contact: {
      name: form.get("contactName"),
      email: form.get("contactEmail"),
      phone: form.get("contactPhone"),
      notes: form.get("notes"),
    },
    files: { photos, drawing },
  };
}
