import "server-only";
import { createSupplierServiceClient } from "@/lib/supabase/supplier-service";
import { stagingReviewFingerprint } from "./review-token";

export async function consumeStagingRequestSlot(input: {
  request: Request;
  scope: "price" | "specialist" | "review";
  environmentVariable: string;
  defaultLimit: number;
}) {
  const configured = Number.parseInt(process.env[input.environmentVariable] ?? String(input.defaultLimit), 10);
  const limit = Number.isInteger(configured) && configured >= 1 && configured <= 100
    ? configured
    : input.defaultLimit;
  const { data, error } = await createSupplierServiceClient().rpc("consume_staging_review_submission_slot", {
    p_fingerprint_sha256: stagingReviewFingerprint(input.request, input.scope),
    p_limit: limit,
  });
  if (error) throw new Error("REVIEW_RATE_LIMIT_UNAVAILABLE");
  if (data !== true) throw new Error("REVIEW_RATE_LIMITED");
}
