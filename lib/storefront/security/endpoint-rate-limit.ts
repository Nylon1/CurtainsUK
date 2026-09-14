import "server-only";
import { createSupplierServiceClient } from "@/lib/supabase/supplier-service";

export interface EndpointRateLimitPolicy {
  limit: number;
  windowSeconds: number;
}

export class EndpointRateLimitError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super("ENDPOINT_RATE_LIMITED");
    this.name = "EndpointRateLimitError";
  }
}

export class EndpointRateLimitUnavailableError extends Error {
  constructor() {
    super("ENDPOINT_RATE_LIMIT_UNAVAILABLE");
    this.name = "EndpointRateLimitUnavailableError";
  }
}

interface EndpointRateLimitDecision {
  accepted: boolean;
  retry_after_seconds: number;
}

interface EndpointRateLimitHttpResponse {
  status: 429 | 503;
  message: string;
  headers: Record<string, string>;
}

export async function consumeEndpointRateLimit(
  fingerprintSha256: string,
  policy: EndpointRateLimitPolicy,
) {
  if (!/^[a-f0-9]{64}$/.test(fingerprintSha256)
    || !Number.isInteger(policy.limit) || policy.limit < 1 || policy.limit > 5_000
    || !Number.isInteger(policy.windowSeconds) || policy.windowSeconds < 10 || policy.windowSeconds > 3_600) {
    throw new EndpointRateLimitUnavailableError();
  }
  const { data, error } = await createSupplierServiceClient().rpc("consume_staging_endpoint_slot", {
    p_fingerprint_sha256: fingerprintSha256,
    p_limit: policy.limit,
    p_window_seconds: policy.windowSeconds,
  });
  if (error) {
    console.error("CURTAINSUK_RATE_LIMIT_RPC_FAILED", /^[A-Z0-9_]{1,20}$/.test(error.code ?? "") ? error.code : "TRANSPORT_OR_UNKNOWN");
  }
  const decision = data as EndpointRateLimitDecision | null;
  if (error || typeof decision?.accepted !== "boolean"
    || !Number.isInteger(decision.retry_after_seconds)
    || decision.retry_after_seconds < 1
    || decision.retry_after_seconds > policy.windowSeconds) {
    throw new EndpointRateLimitUnavailableError();
  }
  if (!decision.accepted) throw new EndpointRateLimitError(decision.retry_after_seconds);
}

export function endpointRateLimitResponse(error: unknown): EndpointRateLimitHttpResponse | null {
  if (error instanceof EndpointRateLimitError) {
    return {
      status: 429,
      message: "Too many requests. Please try again shortly.",
      headers: {
        "Retry-After": String(error.retryAfterSeconds),
        "X-CurtainsUK-Rejection-Reason": "RATE_LIMIT_EXCEEDED",
      },
    };
  }
  if (error instanceof EndpointRateLimitUnavailableError) {
    return {
      status: 503,
      message: "This service is temporarily unavailable.",
      headers: { "X-CurtainsUK-Rejection-Reason": "RATE_LIMIT_UNAVAILABLE" },
    };
  }
  return null;
}
