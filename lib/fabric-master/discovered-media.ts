import { createHash } from "node:crypto";
import { DISCOVERY_ROUTES, matchPortalImage, type DiscoveryIdentity, type DiscoveryRoute, type ImageIdentityEvidence } from "./portal-discovery";
import { sourceImageMatchesSku, validateMediaCandidate, type MediaCandidate, type ImportedMedia } from "./supplier-media";

/** Export only public image URLs or opaque local-cache references, never a portal session. */
export interface DiscoveredImage {
  url: string;
  route: DiscoveryRoute;
  location: string;
  evidence: ImageIdentityEvidence;
  rightsState: "APPROVED" | "PENDING" | "REJECTED";
}
export interface MediaJob { key: string; url: string; candidate: MediaCandidate }
export function discoveredMediaKey(fabricId: string, image: DiscoveredImage) {
  return `${fabricId}:${createHash("sha256").update(JSON.stringify([image.evidence.imageType,image.evidence.scope,image.url])).digest("hex").slice(0,24)}`;
}
export function approvedMediaJob(identity: DiscoveryIdentity, image: DiscoveredImage): MediaJob {
  if (!DISCOVERY_ROUTES.includes(image.route) || !/^[a-zA-Z0-9_.-]{1,70}$/.test(image.location)) throw new Error("MEDIA_LOCATION_INVALID");
  const match = matchPortalImage(identity, image.evidence);
  if (!match) throw new Error("IMAGE_IDENTITY_MISMATCH");
  const group = createHash("sha256").update(JSON.stringify([identity.supplier,identity.brand, image.evidence.scope === "COLLECTION" ? identity.collection : identity.design])).digest("hex").slice(0,24);
  const candidate: MediaCandidate = {
    supplier: identity.supplier, supplierSku: identity.sku, fabricId: identity.fabricId,
    imageType: image.evidence.imageType, mediaScope: image.evidence.scope,
    discoveryLocation: `${image.route}:${image.location}`,
    // Identity remains in dedicated columns. Location and scope survive the existing DB projection.
    sourceReference: `${image.evidence.scope}:${image.route}:${image.location}:${match}:${group}`,
    rightsState: image.rightsState, mappingState: "VERIFIED",
  };
  validateMediaCandidate(candidate);
  validateDownloadSource(image.url, identity.supplier);
  return { key: discoveredMediaKey(identity.fabricId,image), url:image.url, candidate };
}
export function legacyMediaJob(identity: DiscoveryIdentity, images: string[]): MediaJob {
  if (images.length !== 1) throw new Error(images.length ? "MAIN_IMAGE_AMBIGUOUS" : "DISCOVERY_INCOMPLETE");
  if (!sourceImageMatchesSku(images[0],identity.supplier,identity.sku)) throw new Error("IMAGE_SKU_MISMATCH");
  return approvedMediaJob(identity, { url: images[0],route:"EXACT_PRODUCT",location:`${identity.supplier === "prestigious-textiles" ? "pt" : "sdg"}.product`,rightsState:"APPROVED",
    evidence:{sku:identity.sku,brand:identity.brand,design:identity.design,colour:identity.colour,productType:"FABRIC",scope:"COLOURWAY",imageType:"MAIN",relationshipEstablished:true} });
}
export function validateDownloadSource(url: string, supplier: string) {
  // Authenticated library downloads are handed off by content hash, not shared URLs.
  if (/^local-sha256:[a-f0-9]{64}$/.test(url) && ["prestigious-textiles","sanderson-design-group"].includes(supplier)) return;
  const source = new URL(url);
  const allowed = supplier === "prestigious-textiles"
    ? source.origin === "https://www.prestigious.co.uk" && source.pathname.startsWith("/wp-content/uploads/")
    : supplier === "sanderson-design-group" && source.origin === "https://trade.sandersondesigngroup.com" && source.pathname.startsWith("/static/media/catalog/product/");
  if (!allowed || source.search || source.hash || source.username || source.password || /placeholder|no-image|default-image/i.test(url)) throw new Error("IMAGE_SOURCE_DENIED");
}
export function mediaJobAlreadyMapped(job: MediaJob, mappings: ImportedMedia[], knownHash?: string) {
  return !!knownHash && mappings.some(m => m.fabricId === job.candidate.fabricId && m.imageType === job.candidate.imageType && m.contentHash === knownHash && (m.mediaScope ?? "COLOURWAY") === job.candidate.mediaScope);
}
export function sharedMediaCanReuse(candidate: MediaCandidate, other: ImportedMedia) {
  // Both mappings independently passed exact design/collection evidence. Never reuse as colourway media.
  return candidate.supplier === other.supplier && candidate.mediaScope !== "COLOURWAY" && !!candidate.mediaScope && candidate.mediaScope === other.mediaScope && candidate.imageType === other.imageType && candidate.sourceReference.split(":").at(-1) === other.sourceReference.split(":").at(-1);
}
