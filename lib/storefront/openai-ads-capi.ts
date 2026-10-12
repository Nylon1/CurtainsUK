import "server-only";
import { createHash } from "node:crypto";

const DEFAULT_PIXEL_ID = "6LN4GfrhY92CkQR6Uti2NH";
const OPENAI_EVENTS_ENDPOINT = "https://bzr.openai.com/v1/events";

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

function normalizedEmailHash(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return null;
  return createHash("sha256").update(normalized).digest("hex");
}

function safeOpaque(value: string | null | undefined, maximum: number): string | undefined {
  if (typeof value !== "string" || value.length < 1 || value.length > maximum || /[\u0000-\u001f\u007f]/.test(value)) return undefined;
  return value;
}

export type OpenAiOrderCreatedInput = {
  orderId: string;
  paidAt: string;
  amountMinor: number;
  currency: "GBP";
  oppref?: string | null;
  obref?: string | null;
  email?: string | null;
  country?: string | null;
  postalCode?: string | null;
};

export async function sendOpenAiOrderCreated(
  input: OpenAiOrderCreatedInput,
  environment: NodeJS.ProcessEnv = process.env,
  fetchImpl: FetchLike = fetch,
): Promise<{ status: "DISABLED" | "VALIDATED" | "SENT"; eventId: string }> {
  const apiKey = environment.OPENAI_ADS_CONVERSIONS_API_KEY?.trim();
  const pixelId = (environment.OPENAI_ADS_PIXEL_ID?.trim() || DEFAULT_PIXEL_ID);
  const eventId = `shopify_order_${input.orderId}`;

  if (!apiKey) return { status: "DISABLED", eventId };
  if (!/^[A-Za-z0-9_-]{6,100}$/.test(pixelId)) throw new Error("OPENAI_ADS_PIXEL_ID_INVALID");
  if (!input.orderId || input.orderId.length > 128 || !Number.isFinite(Date.parse(input.paidAt))) {
    throw new Error("OPENAI_ADS_ORDER_EVENT_INVALID");
  }
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor < 0 || input.currency !== "GBP") {
    throw new Error("OPENAI_ADS_ORDER_VALUE_INVALID");
  }

  const emailHash = normalizedEmailHash(input.email);
  const obref = safeOpaque(input.obref, 512);
  const oppref = safeOpaque(input.oppref, 2048);
  const country = typeof input.country === "string" && /^[A-Za-z]{2}$/.test(input.country)
    ? input.country.toUpperCase()
    : null;
  const postalCode = typeof input.postalCode === "string" && /^[A-Za-z0-9 -]{1,32}$/.test(input.postalCode.trim())
    ? input.postalCode.trim()
    : null;

  const user = {
    ...(obref ? { obref } : {}),
    ...(emailHash ? { emails_sha256: [emailHash] } : {}),
    ...(country ? { countries: [country] } : {}),
    ...(postalCode ? { postal_codes: [postalCode] } : {}),
  };

  const validateOnly = environment.OPENAI_ADS_CONVERSIONS_VALIDATE_ONLY === "true";
  const body = {
    validate_only: validateOnly,
    integration_source: "curtainsuk_shopify_paid_order",
    events: [{
      id: eventId,
      type: "order_created",
      timestamp_ms: Date.parse(input.paidAt),
      ...(oppref ? { oppref } : {}),
      source_url: "https://www.curtainsuk.com/checkout/confirmation",
      action_source: "web",
      ...(Object.keys(user).length > 0 ? { user } : {}),
      data: {
        type: "contents",
        amount: input.amountMinor,
        currency: input.currency,
        contents: [{
          id: "made_to_measure_curtains",
          content_type: "product",
          quantity: 1,
        }],
      },
    }],
  };

  let response: Response;
  try {
    response = await fetchImpl(`${OPENAI_EVENTS_ENDPOINT}?pid=${encodeURIComponent(pixelId)}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    throw new Error("OPENAI_ADS_CAPI_FAILED");
  }
  if (!response.ok) throw new Error("OPENAI_ADS_CAPI_FAILED");
  return { status: validateOnly ? "VALIDATED" : "SENT", eventId };
}
