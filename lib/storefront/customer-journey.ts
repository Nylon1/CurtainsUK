const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NAME = /^(VISIT_START|PAGE_VIEW|NAVIGATE|CART_ADD|CART_VIEW|CHECKOUT_START|API_FAILURE|BROWSER_ERROR|ASSET_FAILURE|PAGE_SLOW|API_SLOW)$/;
const CODE = /^[A-Z][A-Z0-9_]{1,63}$/;
const SAFE_PATH = /^\/[a-z0-9/_-]{0,159}$/i;

export type JourneyEvent = {
  event_id: string;
  journey_id: string;
  kind: "PAGE" | "ACTION" | "ERROR" | "PERFORMANCE";
  page_path: string;
  name: string;
  code: string | null;
  status: number | null;
  release: string;
  browser: "Chrome" | "Edge" | "Firefox" | "Safari" | "Other";
  channel: "Direct" | "Search" | "Social" | "Paid" | "Email" | "Referral" | "Unknown" | null;
  source: "STOREFRONT";
};

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}

export function browserFamily(userAgent: string): JourneyEvent["browser"] {
  if (/Edg\//.test(userAgent)) return "Edge";
  if (/Firefox\//.test(userAgent)) return "Firefox";
  if (/Chrome\//.test(userAgent)) return "Chrome";
  if (/Safari\//.test(userAgent)) return "Safari";
  return "Other";
}

export function parseJourneyBatch(input: unknown, userAgent: string): JourneyEvent[] {
  const body = object(input);
  if (!body || !UUID.test(String(body.journeyId ?? "")) || !Array.isArray(body.events)
      || body.events.length < 1 || body.events.length > 12) throw Error("JOURNEY_INPUT_INVALID");
  const journeyId = String(body.journeyId);
  const browser = browserFamily(userAgent);
  return body.events.map((value: unknown) => {
    const item = object(value);
    if (!item) throw Error("JOURNEY_INPUT_INVALID");
    const eventId = String(item.eventId ?? "");
    const kind = item.kind;
    const name = String(item.name ?? "");
    const pagePath = String(item.pagePath ?? "");
    const code = item.code == null ? null : String(item.code);
    const status = item.status == null ? null : item.status;
    const release = String(item.release ?? "");
    const channel = item.channel == null ? null : String(item.channel);
    if (!UUID.test(eventId) || !["PAGE", "ACTION", "ERROR", "PERFORMANCE"].includes(String(kind))
      || !NAME.test(name) || !SAFE_PATH.test(pagePath)
      || /(?:^|\/)(?:account|checkout|orders|apps)(?:\/|$)/i.test(pagePath)
      || !/^[A-Za-z0-9:_-]{1,80}$/.test(release)
      || (code !== null && !CODE.test(code))
      || (kind === "ERROR" && code === null)
      || (kind === "PERFORMANCE" && code === null)
      || (kind === "PAGE" && !["VISIT_START", "PAGE_VIEW"].includes(name))
      || (kind === "ACTION" && !["NAVIGATE", "CART_ADD", "CART_VIEW", "CHECKOUT_START"].includes(name))
      || (kind === "ERROR" && !["API_FAILURE", "BROWSER_ERROR", "ASSET_FAILURE"].includes(name))
      || (kind === "PERFORMANCE" && !["PAGE_SLOW", "API_SLOW"].includes(name))
      || (channel !== null && (!["Direct", "Search", "Social", "Paid", "Email", "Referral", "Unknown"].includes(channel) || name !== "VISIT_START"))
      || (status !== null && (!Number.isInteger(status) || Number(status) < 100 || Number(status) > 599))) {
      throw Error("JOURNEY_INPUT_INVALID");
    }
    return { event_id: eventId, journey_id: journeyId,
      kind: kind as JourneyEvent["kind"], page_path: pagePath, name, code,
      status: status as number | null, release, browser, channel: channel as JourneyEvent["channel"], source: "STOREFRONT" as const };
  });
}
