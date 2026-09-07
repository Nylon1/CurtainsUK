import { createHash } from "node:crypto";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function deterministicUuid(label: string, configurationId: string) {
  if (!UUID_PATTERN.test(configurationId)) throw new Error("CHECKOUT_CONFIGURATION_ID_INVALID");
  const hex = createHash("sha256")
    .update(`curtainsuk:staging-checkout:${label}:${configurationId.toLowerCase()}`, "utf8")
    .digest("hex");
  // UUIDv5/variant bits make the deterministic identifier valid for Postgres UUID columns.
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

/** Stable IDs make customer retries and ambiguous Shopify responses recoverable. */
export function stagingCheckoutIdentity(configurationId: string) {
  return Object.freeze({
    snapshotId: deterministicUuid("snapshot", configurationId),
    handoffId: deterministicUuid("handoff", configurationId),
  });
}
