import "server-only";
import { createHash } from "node:crypto";

const DEFAULT_PIXEL_ID = "6LN4GfrhY92CkQR6Uti2NH";
const EVENTS_ENDPOINT = "https://bzr.openai.com/v1/events";
const INTEGRATION_SOURCE = "curtainsuk";

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export type OpenAiOrderCreatedInput = {
  shopifyOrderId: string;
  paidAt: string;
  amountMinor: number;
  currency: string;
  sourceUrl?: string | null;
  oppref?: string | null;
  obref?: string | null;
  email?: string | null;
  contentId?: string | null;
  contentType?: string | null;
};

function boundedOpaque(value: string | null | undefined, maximum = 1024): string | undefined {
  if (typeof value !== "string") return undefined;
  const clean = value.trim();
  if (!clean || clean.length > maximum || /[\u0000-\u001f\u007f]/.test(clean)) return undefined;
  return clean;
}

function normaliseCurrency(value: string): string {
  const clean = value.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(clean)) throw new Error("OPENAI_ADS_CURRENCY_INVALID");
  return clean;
}

function normaliseSourceUrl(value?: string | null): string {
  const fallback = "https://www.curtainsuk.com/";
  if (!value) return fallback;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return fallback;
    return url.toString();
  } catch {
    return fallback;
  }
}

function sha256Email(value?: string | null): string | undefined {
  if (typeof value !== "string") return undefined;
  const email = value.trim().toLowerCase();
  if (!email || email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return undefined;
  return createHash("sha256").update(email).digest("hex");
}

export function buildOpenAiOrderCreatedEvent(input: OpenAiOrderCreatedInput) {
  if (!/^\d+$/.test(input.shopifyOrderId)) throw new Error("OPENAI_ADS_ORDER_ID_INVALID");
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor < 0) throw new Error("OPENAI_ADS_AMOUNT_INVALID");
  const timestampMs = Date.parse(input.paidAt);
  if (!Number.isSafeInteger(timestampMs)) throw new Error("OPENAI_ADS_TIMESTAMP_INVALID");

  const oppref = boundedOpaque(input.oppref);
  const obref = boundedOpaque(input.obref);
  const emailHash = sha256Email(input.email);
  const contentId = boundedOpaque(input.contentId, 255);
  const contentType = boundedOpaque(input.contentType, 64) ?? "curtain_order";

  return {
    id: `shopify_order_${input.shopifyOrderId}`,
    type: "order_created" as const,
    timestamp_ms: timestampMs,
    ...(oppref ? { oppref } : {}),
    source_url: normaliseSourceUrl(input.sourceUrl),
    action_source: "web" as const,
    ...(
      obref || emailHash
        ? {
            user: {
              ...(obref ? { obref } : {}),
              ...(emailHash ? { emails_sha256: [emailHash] } : {}),
              countries: ["GB"],
            },
          }
        : {}
    ),
    data: {
      type: "contents" as const,
      amount: input.amountMinor,
      currency: normaliseCurrency(input.currency),
      ...(contentId ? { contents: [{ id: contentId, content_type: contentType, quantity: 1 }] } : {}),
    },
  };
}

export async function sendOpenAiOrderCreated(
  input: OpenAiOrderCreatedInput,
  options: {
    apiKey?: string;
    pixelId?: string;
    validateOnly?: boolean;
    fetchImpl?: FetchLike;
  } = {},
): Promise<{ status: "sent" | "validated" | "disabled"; responseStatus?: number }> {
  const apiKey = options.apiKey ?? process.env.OPENAI_ADS_CONVERSIONS_API_KEY;
  if (!apiKey?.trim()) return { status: "disabled" };

  const pixelId = options.pixelId ?? process.env.OPENAI_ADS_PIXEL_ID ?? DEFAULT_PIXEL_ID;
  if (!/^[A-Za-z0-9_-]{6,128}$/.test(pixelId)) throw new Error("OPENAI_ADS_PIXEL_ID_INVALID");

  const fetchImpl = options.fetchImpl ?? fetch;
  const event = buildOpenAiOrderCreatedEvent(input);
  const validateOnly = options.validateOnly ?? process.env.OPENAI_ADS_CONVERSIONS_VALIDATE_ONLY === "true";
  const response = await fetchImpl(`${EVENTS_ENDPOINT}?pid=${encodeURIComponent(pixelId)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey.trim()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      validate_only: validateOnly,
      integration_source: INTEGRATION_SOURCE,
      events: [event],
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) throw new Error(`OPENAI_ADS_CAPI_FAILED_${response.status}`);
  return { status: validateOnly ? "validated" : "sent", responseStatus: response.status };
}
