export const PUBLIC_NO_STORE_HEADERS = Object.freeze({
  "Cache-Control": "no-store, max-age=0",
  Pragma: "no-cache",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
});

export const PRIVATE_NO_STORE_HEADERS = Object.freeze({
  ...PUBLIC_NO_STORE_HEADERS,
  "Cache-Control": "private, no-store, max-age=0",
});

export function assertBoundedProxyRequest(request: Request, input: {
  methods: readonly string[];
  maximumBytes: number;
  acceptedContentTypes?: readonly string[];
}) {
  if (!input.methods.includes(request.method.toUpperCase())) throw new Error("SHOPIFY_PROXY_METHOD_DENIED");
  const declared = request.headers.get("content-length");
  if (declared && (!/^\d+$/.test(declared) || Number.parseInt(declared, 10) > input.maximumBytes)) {
    throw new Error("SHOPIFY_PROXY_REQUEST_TOO_LARGE");
  }
  if (input.acceptedContentTypes && request.method !== "GET" && request.method !== "HEAD") {
    const contentType = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() ?? "";
    if (!input.acceptedContentTypes.includes(contentType)) throw new Error("SHOPIFY_PROXY_CONTENT_TYPE_DENIED");
  }
}

/**
 * Cookie-authenticated staff mutations must not be usable as cross-site form
 * posts. Requiring an exact same-origin JSON request provides a narrow CSRF
 * boundary in addition to the authenticated staff role check.
 */
export function assertSameOriginJsonMutation(request: Request) {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (contentType !== "application/json") throw new Error("PRIVATE_MUTATION_CONTENT_TYPE_DENIED");
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) throw new Error("PRIVATE_MUTATION_ORIGIN_DENIED");
}

/**
 * Reads a request body with a real streaming ceiling. Content-Length is only a
 * useful early rejection because it may be absent or misleading; callers must
 * use this before parsers such as formData() that otherwise buffer the body.
 */
export async function readHardLimitedRequestBytes(request: Request, maximumBytes: number) {
  if (!Number.isInteger(maximumBytes) || maximumBytes < 1) throw new Error("SHOPIFY_PROXY_REQUEST_TOO_LARGE");
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maximumBytes) {
        await reader.cancel().catch(() => undefined);
        throw new Error("SHOPIFY_PROXY_REQUEST_TOO_LARGE");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}
