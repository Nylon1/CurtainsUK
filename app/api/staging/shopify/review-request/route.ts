import { NextResponse } from "next/server";
import { createStagingReviewRequest } from "@/lib/storefront/review-request-repository";
import type { ReviewConfiguration } from "@/lib/storefront/review-request";
import { assertAllowedStagingMutation, customerSafeApiError, stagingApiHeaders, stagingOptions } from "@/lib/storefront/staging-api";
import { consumeStagingRequestSlot } from "@/lib/storefront/staging-rate-limit";
import { legacyStagingApiDisabledResponse } from "@/lib/storefront/security/legacy-staging-api";

export const runtime = "nodejs";
const MAX_REQUEST_BYTES = 4_000_000;
const ALLOWED_FIELDS = new Set(["configuration", "calculation", "contactName", "contactEmail", "contactPhone", "notes", "photos", "drawing"]);

export function OPTIONS(request: Request) {
  const disabled = legacyStagingApiDisabledResponse();
  if (disabled) return disabled;
  return stagingOptions(request);
}

function parseJsonField(form: FormData, name: string) {
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

function assertFormShape(form: FormData) {
  for (const key of form.keys()) if (!ALLOWED_FIELDS.has(key)) throw new Error("REVIEW_CONFIGURATION_INVALID");
  const scalarLimits: Record<string, number> = {
    configuration: 50_000,
    calculation: 50_000,
    contactName: 160,
    contactEmail: 320,
    contactPhone: 80,
    notes: 4_000,
  };
  for (const [name, limit] of Object.entries(scalarLimits)) {
    const values = form.getAll(name);
    if (values.length !== 1 || typeof values[0] !== "string" || values[0].length > limit) throw new Error("REVIEW_CONFIGURATION_INVALID");
  }
  if (form.getAll("drawing").filter((value) => value instanceof File && value.size > 0).length > 1) throw new Error("REVIEW_EVIDENCE_INVALID");
  if (form.getAll("photos").filter((value) => value instanceof File && value.size > 0).length > 8) throw new Error("REVIEW_EVIDENCE_INVALID");
  const totalFileBytes = [...form.values()].reduce((total, value) => total + (value instanceof File ? value.size : 0), 0);
  if (totalFileBytes > 3_800_000) throw new Error("REVIEW_EVIDENCE_INVALID");
}

export async function POST(request: Request) {
  const disabled = legacyStagingApiDisabledResponse();
  if (disabled) return disabled;
  try {
    assertAllowedStagingMutation(request);
    const rawDeclaredSize = request.headers.get("content-length");
    if (!rawDeclaredSize || !/^\d+$/.test(rawDeclaredSize)) throw new Error("REVIEW_CONFIGURATION_INVALID");
    const declaredSize = Number.parseInt(rawDeclaredSize, 10);
    if (declaredSize <= 0 || declaredSize > MAX_REQUEST_BYTES) throw new Error("REVIEW_EVIDENCE_INVALID");
    await consumeStagingRequestSlot({
      request,
      scope: "review",
      environmentVariable: "CURTAINSUK_STAGING_REVIEW_RATE_LIMIT",
      defaultLimit: 10,
    });
    const form = await request.formData();
    assertFormShape(form);
    const configuration = parseJsonField(form, "configuration") as ReviewConfiguration;
    const calculation = parseJsonField(form, "calculation") as Record<string, unknown>;
    const receipt = await createStagingReviewRequest({
      configuration,
      clientCalculation: calculation,
      contact: {
        name: form.get("contactName"),
        email: form.get("contactEmail"),
        phone: form.get("contactPhone"),
        notes: form.get("notes"),
      },
      files: {
        photos: files(form, "photos"),
        drawing: files(form, "drawing")[0] ?? null,
      },
    });
    return NextResponse.json(receipt, { status: 201, headers: stagingApiHeaders(request) });
  } catch (error) {
    return NextResponse.json(
      { error: customerSafeApiError(error, "Unable to submit this project for review") },
      { status: 400, headers: stagingApiHeaders(request) },
    );
  }
}
