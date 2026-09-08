import { createHash } from "node:crypto";
import type { SupplierImageType } from "./supplier-media";

export const DISCOVERY_ROUTES = ["EXACT_PRODUCT", "SKU_SEARCH", "DESIGN", "COLOURWAY", "COLLECTION", "FABRIC_LISTING", "GALLERY", "LIFESTYLE", "RESOURCES", "DESIGN_COLOUR_SEARCH"] as const;
export type DiscoveryRoute = typeof DISCOVERY_ROUTES[number];
// SDG's authenticated listings are the primary exact-colourway source.
// Optional lifestyle libraries never gate a verified listing image.
export function orderedDiscoveryRoutes(supplier: string): readonly DiscoveryRoute[] {
  return supplier === "sanderson-design-group"
    ? ["SKU_SEARCH", "FABRIC_LISTING", "EXACT_PRODUCT", "COLOURWAY", "COLLECTION", "DESIGN", "DESIGN_COLOUR_SEARCH", "GALLERY", "LIFESTYLE", "RESOURCES"]
    : DISCOVERY_ROUTES;
}
/** Display formatting only; use alongside an exact SKU and brand check. */
export function normalisePortalDisplay(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/g," ").replace(/[’'`]s\b/gi,"s").replace(/\s*\/\s*/g,"/").toLowerCase();
}
/** Remove only the verified row's redundant product code, never name tokens. */
export function normalisePortalSkuTitle(value:string,exactSku:string) {
  const code=exactSku.toLowerCase(), numeric=code.match(/\d{6}$/)?.[0];
  return normalisePortalDisplay(value.split(/\s+/).filter(token=>{
    const t=token.toLowerCase(); return t!==code && (!numeric || t!==numeric);
  }).join(" "));
}
/** Listing display formatting only; callers must independently verify exact SKU/brand.
 * Never sorts colour tokens, drops colour words, or tolerates spelling differences.
 */
export function portalTitleMatchesIdentity(design:string,colour:string,title:string,exactSku:string) {
  const display=(value:string)=>normalisePortalSkuTitle(value,exactSku).replace(/\s*&\s*/g," and ").replace(/\s+/g," ");
  const actual=display(title), d=display(design), c=display(colour);
  if(actual===`${d} ${c}`) return true;
  // Workbooks sometimes repeat the end of the design at the start of colour.
  const words=d.split(" "), colours=c.split(" ");
  for(let count=1;count<=Math.min(words.length,colours.length);count++) {
    if(words.slice(-count).join(" ")===colours.slice(0,count).join(" ") && actual===[...words,...colours.slice(count)].join(" ")) return true;
  }
  // Supplier listings move a fabric-format suffix after the exact colour.
  const suffix=d.match(/^(.*) \(?(velvet|weave|embroidery|print|sheer)\)?$/);
  // These format labels are also omitted in observed fabric listings. Exact
  // SKU, image filename, brand, base design and the full colour still agree.
  if(suffix && (actual===`${suffix[1]} ${c}` || actual===`${suffix[1]} ${c} ${suffix[2]}` || actual===`${suffix[1]} ${c} (${suffix[2]})`))return true;
  return ["velvet","weave","embroidery","print","sheer","jacquard"].some(format=>actual===`${d} ${c} ${format}` || actual===`${d} ${c} (${format})`);
}
export type MediaScope = "COLOURWAY" | "DESIGN" | "COLLECTION";
export interface DiscoveryIdentity {
  supplier: string; fabricId: string; sku: string; brand: string; design: string; colour: string; collection: string;
  verifiedPortalProductId?: string;
}
export interface ImageIdentityEvidence {
  sku?: string; brand: string; design: string; colour?: string; collection?: string;
  productType: "FABRIC" | "WALLPAPER" | "UNKNOWN"; portalProductId?: string;
  scope: MediaScope; imageType: SupplierImageType;
  /** Supplier page explicitly associates this particular image with the identity. */
  relationshipEstablished: boolean;
}
const normal = (s: string | undefined) => (s ?? "").normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-GB");
const brand = (s: string) => ({ "morris and co.": "morris & co.", "clarke and clarke": "clarke & clarke" })[normal(s)] ?? normal(s);
export function matchPortalImage(target: DiscoveryIdentity, evidence: ImageIdentityEvidence) {
  if (!["COLOURWAY", "DESIGN", "COLLECTION"].includes(evidence.scope)) return null;
  if (!evidence.relationshipEstablished || evidence.productType !== "FABRIC" || brand(evidence.brand) !== brand(target.brand)) return null;
  if (evidence.scope === "DESIGN") {
    return evidence.imageType === "ROOM" && normal(evidence.design) === normal(target.design) ? "DESIGN_ROOM" as const : null;
  }
  if (evidence.scope === "COLLECTION") {
    return evidence.imageType === "ADDITIONAL" && !!normal(target.collection) && normal(evidence.collection) === normal(target.collection) ? "COLLECTION_CONTEXT" as const : null;
  }
  // Conflicting identifiers cannot be rescued by a similar name or search rank.
  if (evidence.sku && normal(evidence.sku) !== normal(target.sku)) return null;
  if (evidence.design && normal(evidence.design) !== normal(target.design)) return null;
  if (evidence.colour && normal(evidence.colour) !== normal(target.colour)) return null;
  if (evidence.sku && normal(evidence.sku) === normal(target.sku)) return "EXACT_SKU" as const;
  if (normal(evidence.design) === normal(target.design) && !!normal(evidence.colour) && normal(evidence.colour) === normal(target.colour)) return "EXACT_DESIGN_COLOUR" as const;
  if (target.verifiedPortalProductId && evidence.portalProductId === target.verifiedPortalProductId) return "STABLE_PRODUCT_ID" as const;
  return null;
}

export interface RouteObservation {
  route: DiscoveryRoute;
  state: "EXHAUSTED" | "IN_PROGRESS" | "ACCESS_BLOCKED" | "NOT_APPLICABLE";
  /** Opaque map location, never a portal URL, shared-link capability or credential. */
  location: string;
  checkedAt: string; pagesVisited: number; paginationExhausted: boolean;
  productFound: boolean; exactSkuFound: boolean; colourwayMedia: number; designMedia: number;
  ambiguous: boolean;
  reason?: "NO_EXACT_SKU_RESULT" | "PRODUCT_FOUND_NO_MEDIA" | "MEDIA_ONLY_AT_DESIGN_LEVEL" | "AMBIGUOUS_COLOURWAY" | "AUTHENTICATION_ACCESS_ISSUE" | "LOCATION_NOT_EXPOSED";
}
export interface DiscoveryCheckpoint {
  version: 1; mapVersion: string; identityKey: string; fabricId: string;
  observations: RouteObservation[];
}
const safeRef = (s: string) => /^[a-zA-Z0-9_.:-]{1,160}$/.test(s) && !/https?|cookie|token|password|authorization|secret/i.test(s);
export function validateRouteObservation(o: RouteObservation) {
  if (!DISCOVERY_ROUTES.includes(o.route) || !safeRef(o.location) || !Number.isFinite(Date.parse(o.checkedAt))
    || !["EXHAUSTED", "IN_PROGRESS", "ACCESS_BLOCKED", "NOT_APPLICABLE"].includes(o.state)
    || ![o.pagesVisited,o.colourwayMedia,o.designMedia].every(n => Number.isSafeInteger(n) && n >= 0)
    || typeof o.productFound !== "boolean" || typeof o.exactSkuFound !== "boolean" || typeof o.ambiguous !== "boolean" || typeof o.paginationExhausted !== "boolean") throw new Error("DISCOVERY_OBSERVATION_INVALID");
  if (o.state === "EXHAUSTED" && (!o.paginationExhausted || o.pagesVisited < 1)) throw new Error("DISCOVERY_ROUTE_NOT_EXHAUSTED");
  if (o.state === "NOT_APPLICABLE" && (o.reason !== "LOCATION_NOT_EXPOSED" || o.pagesVisited < 1)) throw new Error("DISCOVERY_ROUTE_EVIDENCE_REQUIRED");
  if (o.state === "ACCESS_BLOCKED" && o.reason !== "AUTHENTICATION_ACCESS_ISSUE") throw new Error("DISCOVERY_ACCESS_REASON_REQUIRED");
}
export function newDiscoveryCheckpoint(identity: DiscoveryIdentity, mapVersion: string): DiscoveryCheckpoint {
  if (!safeRef(mapVersion) || !safeRef(identity.fabricId)) throw new Error("DISCOVERY_IDENTITY_INVALID");
  return { version: 1, mapVersion, fabricId: identity.fabricId, identityKey: createHash("sha256").update(JSON.stringify(identity)).digest("hex"), observations: [] };
}
export function recordDiscoveryObservation(checkpoint: DiscoveryCheckpoint, observation: RouteObservation): DiscoveryCheckpoint {
  validateRouteObservation(observation);
  // Construct the persisted shape explicitly: unknown properties are never copied.
  const {route,state,location,checkedAt,pagesVisited,paginationExhausted,productFound,exactSkuFound,colourwayMedia,designMedia,ambiguous,reason} = observation;
  if (reason && !["NO_EXACT_SKU_RESULT","PRODUCT_FOUND_NO_MEDIA","MEDIA_ONLY_AT_DESIGN_LEVEL","AMBIGUOUS_COLOURWAY","AUTHENTICATION_ACCESS_ISSUE","LOCATION_NOT_EXPOSED"].includes(reason)) throw new Error("DISCOVERY_REASON_INVALID");
  return { version: 1, mapVersion: checkpoint.mapVersion, identityKey: checkpoint.identityKey, fabricId: checkpoint.fabricId,
    observations: [...checkpoint.observations.filter(o => o.route !== route), {route,state,location,checkedAt,pagesVisited,paginationExhausted,productFound,exactSkuFound,colourwayMedia,designMedia,ambiguous,...(reason ? {reason} : {})}] };
}
export function discoverySummary(checkpoint: DiscoveryCheckpoint) {
  if (new Set(checkpoint.observations.map(o => o.route)).size !== checkpoint.observations.length) throw new Error("DISCOVERY_DUPLICATE_ROUTE");
  checkpoint.observations.forEach(validateRouteObservation);
  const finished = (route: DiscoveryRoute) => checkpoint.observations.some(o => o.route === route && ["EXHAUSTED","NOT_APPLICABLE"].includes(o.state));
  const remainingRoutes = DISCOVERY_ROUTES.filter(route => !finished(route));
  const observations = checkpoint.observations;
  const categories = new Set<string>(observations.flatMap(o => o.reason ? [o.reason] : []));
  let status: "NOT_YET_DISCOVERED" | "DISCOVERY_INCOMPLETE" | "AUTHENTICATION_ACCESS_ISSUE" | "FOUND_COLOURWAY_MEDIA" | "MEDIA_ONLY_AT_DESIGN_LEVEL" | "AMBIGUOUS_COLOURWAY" | "GENUINELY_NO_SUPPLIER_IMAGE_FOUND";
  if (observations.some(o => o.colourwayMedia > 0)) status = "FOUND_COLOURWAY_MEDIA";
  else if (observations.some(o => o.state === "ACCESS_BLOCKED")) status = "AUTHENTICATION_ACCESS_ISSUE";
  else if (!observations.length) status = "NOT_YET_DISCOVERED";
  else if (remainingRoutes.length) status = "DISCOVERY_INCOMPLETE";
  else if (observations.some(o => o.ambiguous)) status = "AMBIGUOUS_COLOURWAY";
  else if (observations.some(o => o.designMedia > 0)) status = "MEDIA_ONLY_AT_DESIGN_LEVEL";
  else status = "GENUINELY_NO_SUPPLIER_IMAGE_FOUND";
  return { status, discoveryComplete: remainingRoutes.length === 0, remainingRoutes, categories: [...categories], genuinelyMissing: status === "GENUINELY_NO_SUPPLIER_IMAGE_FOUND" };
}

/** The authenticated UI adapter executes map recipes; this scheduler never receives credentials. */
export async function discoverPortalMedia(identity: DiscoveryIdentity, mapVersion: string, ports: {
  load(): Promise<DiscoveryCheckpoint | null>;
  inspect(route: DiscoveryRoute, previous?: RouteObservation): Promise<RouteObservation>;
  save(checkpoint: DiscoveryCheckpoint): Promise<void>;
}, maxRoutes = 10) {
  if (!Number.isInteger(maxRoutes) || maxRoutes < 1 || maxRoutes > 10) throw new Error("DISCOVERY_BUDGET_INVALID");
  const fresh = newDiscoveryCheckpoint(identity, mapVersion), prior = await ports.load();
  let checkpoint = prior?.identityKey === fresh.identityKey && prior.mapVersion === mapVersion ? prior : fresh;
  const remaining = discoverySummary(checkpoint).remainingRoutes;
  const pending = orderedDiscoveryRoutes(identity.supplier).filter(route => remaining.includes(route));
  for (const route of pending.slice(0,maxRoutes)) {
    const observation = await ports.inspect(route, checkpoint.observations.find(o => o.route === route));
    if (observation.route !== route) throw new Error("DISCOVERY_ROUTE_MISMATCH");
    checkpoint = recordDiscoveryObservation(checkpoint, observation);
    await ports.save(checkpoint);
    // A route with remaining pages resumes before subsequent routes, retaining order.
    if (observation.state === "IN_PROGRESS") break;
  }
  return { checkpoint, ...discoverySummary(checkpoint) };
}
