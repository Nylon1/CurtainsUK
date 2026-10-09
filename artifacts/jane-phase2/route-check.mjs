// lib/advisory/contracts.mjs
var UUID = "^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$";
var FABRIC_ID = "^[a-zA-Z0-9][a-zA-Z0-9-]{0,149}$";
var string = (maxLength = 500, extra = {}) => ({ type: "string", maxLength, ...extra });
var object = (properties) => ({ type: "object", properties, required: Object.keys(properties), additionalProperties: false });
var array = (items, maxItems = 6) => ({ type: "array", items, maxItems });
var nullable = (schema) => ({ anyOf: [schema, { type: "null" }] });
var contextSchema = object({
  version: string(3, { enum: ["1"] }),
  source: string(30, { enum: ["room-visualiser", "fabric-intelligence", "customer-notes"] }),
  consent: { type: "boolean", enum: [true] },
  room: nullable(string(12, { enum: ["living", "bedroom", "lounge", "office"] })),
  fabricIds: array(string(150, { pattern: FABRIC_ID })),
  colours: array(string(60), 8),
  heading: nullable(string(60)),
  lighting: nullable(string(12, { enum: ["daylight", "evening", "inspection"] })),
  curtainPosition: nullable({ type: "integer", minimum: 0, maximum: 100 }),
  preferences: array(string(200), 8),
  references: array(string(100), 5),
  feedback: string(1200)
});
var requestSchema = object({
  requestId: string(36, { pattern: UUID }),
  sessionId: nullable(string(36, { pattern: UUID })),
  revision: nullable({ type: "integer", minimum: 0, maximum: 1e4 }),
  action: string(16, { enum: ["start", "message", "context", "summary", "save", "resume", "recover", "delete"] }),
  text: nullable(string(2e3, { minLength: 1 })),
  context: nullable(contextSchema),
  consent: { type: "boolean" },
  recoveryToken: nullable(string(100, { pattern: "^[0-9a-f-]{36}\\.[A-Za-z0-9_-]{43}$" }))
});
var responseSchema = object({
  text: string(3e3, { minLength: 1 }),
  stage: string(20, { enum: ["understand", "investigate", "recommend", "refine", "conclude"] }),
  palette: array(string(60), 5),
  patternDirection: string(220),
  textureDirection: string(220),
  alternatives: array(string(250), 3),
  questions: array(string(220), 3),
  nextSteps: array(string(250), 4),
  evidenceIds: array(string(100), 12),
  fabricIds: array(string(150, { pattern: FABRIC_ID }), 4)
});
var tools = [
  { type: "function", name: "get_tool_guidance", description: "Verified current customer controls and limitations. Consult before teaching a CurtainsUK tool.", strict: true, parameters: object({ tool: string(30, { enum: ["fabric-intelligence", "room-visualiser", "curtain-style", "samples"] }) }) },
  { type: "function", name: "lookup_fabric_knowledge", description: "Read exact identities anywhere in Fabric Master; knowledge is NOT proof of purchase availability.", strict: true, parameters: object({ ids: array(string(150, { pattern: FABRIC_ID })) }) },
  { type: "function", name: "find_fabric_identities", description: "Bounded indexed Fabric Master ID-prefix lookup, including unpublished identities; no availability claim.", strict: true, parameters: object({ prefix: string(40, { minLength: 3, pattern: "^[A-Za-z0-9-]+$" }) }) },
  { type: "function", name: "search_retail_fabrics", description: "Optional approved retail search when customer asks for specific fabrics. No prices or stock promises.", strict: true, parameters: object({ query: string(100), colour: string(50), pattern: string(50) }) }
];

// lib/advisory/security.mjs
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
function equal(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}
function previewEnabled(env) {
  return env.VERCEL_ENV === "preview" && env.CURTAINSUK_ADVISORY_PREVIEW === "true" && typeof env.ADVISORY_PREVIEW_KEY === "string" && env.ADVISORY_PREVIEW_KEY.length >= 32;
}

// lib/advisory/http.mjs
var headers = { "Cache-Control": "no-store", "Content-Type": "application/json", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" };
function deploymentGate(request, env) {
  if (!previewEnabled(env)) return new Response(null, { status: 404, headers });
  if (!equal(request.headers.get("x-advisory-preview-key") ?? "", env.ADVISORY_PREVIEW_KEY)) return new Response(null, { status: 404, headers });
  return null;
}

// app/api/advisory/consultation/route.js
var runtime = "nodejs";
var dynamic = "force-dynamic";
async function POST(request) {
  const blocked = deploymentGate(request, process.env);
  if (blocked) return blocked;
  return Response.json({ error: "ADVISORY_PERSISTENCE_NOT_CONNECTED" }, { status: 503, headers: { "Cache-Control": "no-store" } });
}
export {
  POST,
  dynamic,
  runtime
};
