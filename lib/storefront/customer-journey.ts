const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NAME = /^(VISIT_START|PAGE_VIEW|NAVIGATE|CART_ADD|CART_VIEW|CHECKOUT_START|API_FAILURE|BROWSER_ERROR|ASSET_FAILURE|PAGE_SLOW|API_SLOW)$/;
const CODE = /^[A-Z][A-Z0-9_]{1,63}$/;
const SAFE_PATH = /^\/[a-z0-9/_-]{0,159}$/i;
const ERROR_TYPES = new Set(["Error", "TypeError", "ReferenceError", "SyntaxError", "RangeError", "URIError",
  "EvalError", "SecurityError", "NetworkError", "AbortError", "TimeoutError", "NotFoundError",
  "DataError", "InvalidStateError", "DOMException", "ResourceError", "NonErrorRejection", "HttpError"]);
const MESSAGE_CODES = new Set(["MESSAGE_UNAVAILABLE", "NETWORK_REQUEST_FAILED", "PROPERTY_READ_UNDEFINED",
  "PROPERTY_READ_NULL", "PROPERTY_SET_UNDEFINED", "PROPERTY_SET_NULL", "NOT_A_FUNCTION",
  "UNDEFINED_IDENTIFIER", "UNEXPECTED_TOKEN", "REQUEST_ABORTED", "SCRIPT_ERROR", "MESSAGE_WITHHELD",
  "ASSET_LOAD_FAILED", "HTTP_SERVER_ERROR", "HTTP_REQUEST_REJECTED"]);
const ORIGINS = new Set(["THEME", "APP", "SHOPIFY", "EXTERNAL", "EXTENSION", "UNKNOWN"]);
const FEATURES = new Set(["FABRICS", "CUSHION_STUDIO", "ROOM_VISUALISER", "SMART_TRACK_STUDIO",
  "DESIGN_MY_HOME", "FITTING_GUIDE", "PRODUCT_PAGE", "POLICY_PAGE", "GENERAL",
  "JANE_ADVISOR", "SPECIALISTS", "FABRIC_INTELLIGENCE", "FABRIC_STOCK"]);
const API_OPERATIONS = new Set(["jane", "specialists", "catalog", "naila-catalog", "premium-catalog",
  "consultation", "premium-session", "premium-command", "hci-session", "hci-command",
  "price", "rooms", "sample-order", "checkout-handoff", "review-request", "review-acceptance",
  "room-visualiser", "cushion-studio", "smart-track", "my-home-checkout"]);
const SCRIPT = /^[a-z0-9][a-z0-9._-]{0,79}\.js$/;

export function sanitizeErrorMessage(value: unknown): string | null {
  if (typeof value !== 'string' || !value || value.length > 2048) return null;
  const clean = value.replace(/[\r\n\t]+/g, ' ').replace(/https?:\/\/[^\s<>"']+/gi, '[URL]')
    .replace(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, '[EMAIL]')
    .replace(/\b(?:\+?\d[\d ()-]{7,}\d)\b/g, '[NUMBER]')
    .replace(/\b(?:eyJ[a-z0-9_-]{20,}|[a-f0-9]{32,})\b/gi, '[TOKEN]')
    .replace(/\b(?:sk-[a-z0-9_-]{8,}|shpat_[a-z0-9_-]{8,}|Bearer\s+[a-z0-9._-]{8,})\b/gi, '[TOKEN]')
    .replace(/\b(?:token|key|secret|password|authorization|session|capability)=[^\s&]+/gi, '[REDACTED]')
    .replace(/(['"`])[^'"`]{1,100}\1/g, "'[value]'")
    .replace(/[^\x20-\x7e]/g, '?').replace(/\s{2,}/g, ' ').trim();
  return clean ? clean.slice(0, 180) : null;
}

export function safeOperationalDiagnostic(cause: unknown) {
  const error = object(cause);
  if (!error) return null;
  const type = ERROR_TYPES.has(String(error.name)) ? String(error.name) : 'Error';
  const messageText = sanitizeErrorMessage(error.message);
  const stack = typeof error.stack === 'string' ? error.stack.slice(0, 4096) : '';
  const found = stack.match(/(?:^|[\\/])([a-z0-9][a-z0-9._-]{0,79}\.(?:js|mjs|ts)):(\d+):(\d+)/im);
  const line = found ? Number(found[2]) : null;
  const column = found ? Number(found[3]) : null;
  return { type, messageText, script: found?.[1] ?? null,
    line: line && line <= 10_000_000 ? line : null,
    column: column && column <= 10_000_000 ? column : null };
}

function safeApiRoute(route: string): boolean {
  const proxy = route.match(/^\/apps\/curtainsuk-decision\/([a-z-]+)$/);
  const direct = route.match(/^\/api\/staging\/shopify-proxy\/([a-z-]+)$/);
  return Boolean((proxy && API_OPERATIONS.has(proxy[1])) || (direct && API_OPERATIONS.has(direct[1]))
    || route === '/api/curtain-consultation-premium');
}

export type JourneyErrorFrame = { script: string | null; line: number; column: number; origin: string };

export type JourneyErrorDetail = {
  type: string; message: string; script: string | null; line: number | null; column: number | null;
  origin: string; feature: string;
  messageText?: string | null; frames?: JourneyErrorFrame[]; reasonCode?: string | null;
  request?: { method: string; route: string } | null;
};

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
  error_detail: JourneyErrorDetail | null;
};

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}

function parseErrorDetail(value: unknown, kind: unknown): JourneyErrorDetail | null {
  if (value == null) return null;
  const detail = object(value);
  const keys = detail && Object.keys(detail).sort().join(',');
  if (!detail || kind !== "ERROR" || !['column,feature,line,message,origin,script,type',
    'column,feature,frames,line,message,messageText,origin,request,script,type',
    'column,feature,frames,line,message,messageText,origin,reasonCode,request,script,type'].includes(keys ?? '')
    || !ERROR_TYPES.has(String(detail.type)) || !MESSAGE_CODES.has(String(detail.message))
    || !ORIGINS.has(String(detail.origin)) || !FEATURES.has(String(detail.feature))
    || (detail.script !== null && (typeof detail.script !== 'string' || !SCRIPT.test(detail.script)))
    || [detail.line, detail.column].some((position) => position !== null
      && (!Number.isInteger(position) || Number(position) < 1 || Number(position) > 10_000_000))) {
    throw Error("JOURNEY_INPUT_INVALID");
  }
  if ('messageText' in detail) {
    if ('reasonCode' in detail && detail.reasonCode !== null
      && (typeof detail.reasonCode !== 'string' || !CODE.test(detail.reasonCode))) throw Error("JOURNEY_INPUT_INVALID");
    if (detail.messageText !== null && (typeof detail.messageText !== 'string'
      || sanitizeErrorMessage(detail.messageText) !== detail.messageText)) throw Error("JOURNEY_INPUT_INVALID");
    if (!Array.isArray(detail.frames) || detail.frames.length > 3 || !detail.frames.every((value) => {
      const frame = object(value);
      return frame && Object.keys(frame).sort().join(',') === 'column,line,origin,script'
        && ORIGINS.has(String(frame.origin))
        && (frame.script === null || (typeof frame.script === 'string' && SCRIPT.test(frame.script)))
        && [frame.line, frame.column].every((position) => Number.isInteger(position)
          && Number(position) >= 1 && Number(position) <= 10_000_000);
    })) throw Error("JOURNEY_INPUT_INVALID");
    const request = detail.request === null ? null : object(detail.request);
    if (detail.request !== null && (!request || Object.keys(request).sort().join(',') !== 'method,route'
      || !['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(String(request.method))
      || typeof request.route !== 'string' || !safeApiRoute(request.route))) throw Error("JOURNEY_INPUT_INVALID");
  }
  return detail as JourneyErrorDetail;
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
    const errorDetail = parseErrorDetail(item.detail, kind);
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
      status: status as number | null, release, browser, channel: channel as JourneyEvent["channel"],
      source: "STOREFRONT" as const, error_detail: errorDetail };
  });
}
