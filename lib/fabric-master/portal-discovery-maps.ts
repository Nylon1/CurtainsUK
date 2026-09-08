import { DISCOVERY_ROUTES, type DiscoveryRoute } from "./portal-discovery";

export const PORTAL_MAP_VERSION = "supplier-portals-2026-09-08-v1";
export interface PortalRecipe {
  location: string; status: "OBSERVED" | "PARTIALLY_OBSERVED" | "ACCESS_BLOCKED";
  steps: string[];
}
// Only observed entry points. Follow links present in the page; never manufacture a product URL.
// Capability links and login/session data deliberately have no representation here.
export const PORTAL_DISCOVERY_MAPS: Record<string, Record<DiscoveryRoute, PortalRecipe>> = {
  "sanderson-design-group": {
    EXACT_PRODUCT: {location:"sdg.product",status:"OBSERVED",steps:["Open a previously verified portal product link; compare displayed SKU, brand, design and Colour Variant.","Product slug identifier can differ from the displayed SKU: F1787/01 is CCF0795-01. Keep both identities; do not replace the master SKU."]},
    SKU_SEARCH: {location:"sdg.search",status:"OBSERVED",steps:["Fill textbox 'What are you looking for?' with exact SKU; click button 'Search'.","Read every result identity and product type. DARP222519 returned DARP222529: reject this result.","Use 'Viewing N of N' and 'View more' to exhaust pagination; preserve page progress."]},
    DESIGN: {location:"sdg.design",status:"PARTIALLY_OBSERVED",steps:["Search the exact design using the same search control; inspect exact matches only.","Follow any design links actually exposed by matched products. Search results are not identity evidence."]},
    COLOURWAY: {location:"sdg.variants",status:"OBSERVED",steps:["Inspect Colour Variant buttons on the product page; open the target variant and re-read SKU and colour.","Other variants' image URLs are present in the DOM. Never collect the entire page as one colourway gallery."]},
    COLLECTION: {location:"sdg.collection",status:"PARTIALLY_OBSERVED",steps:["Use /all-brands and the selected brand, then follow collection links actually shown.","Cross-check collection in Product Details and New Collection Details; collection-name similarity does not prove a colourway."]},
    FABRIC_LISTING: {location:"sdg.fabric-listing",status:"OBSERVED",steps:["Use /products/fabric or /products and the Fabric filter; inspect all relevant result pages.","Exclude wallpaper, even when the same design is offered as fabric. Pair It With includes wallpaper."]},
    GALLERY: {location:"sdg.gallery",status:"PARTIALLY_OBSERVED",steps:["Inspect images and any gallery controls associated with the selected product.","Exclude Key Details corporate images, Pair It With recommendations, and unselected variants.","Also inspect File Camp Media Store if the account grants access; separate login is currently required."]},
    LIFESTYLE: {location:"sdg.lifestyle",status:"PARTIALLY_OBSERVED",steps:["Inspect design/collection galleries and their digital design books for captions identifying room imagery.","Design-level associations may produce ROOM only. If colour is not established, never use as MAIN/SWATCH."]},
    RESOURCES: {location:"sdg.resources",status:"PARTIALLY_OBSERVED",steps:["Open /document-browser: General Documents > 4. New Collection Details and 5. Digital Design Books > exact brand.","Digital Design Books has folders for all six target brands. Product Data File is a separate identity resource.","Follow portal menu File Camp Media Store to clarkeandclarke.filecamp.com; do not persist its capability link. Separate login currently blocks inspection.","The route is not exhausted until both document folders and the media store have been checked for the target."]},
    DESIGN_COLOUR_SEARCH: {location:"sdg.design-colour-search",status:"PARTIALLY_OBSERVED",steps:["Search exact design plus exact colour using the global search. Check all result pages.","Accept only exact brand/design/colour with fabric identity and an explicit relationship to this image; record ambiguity otherwise."]},
  },
  "prestigious-textiles": {
    EXACT_PRODUCT: {location:"pt.product",status:"PARTIALLY_OBSERVED",steps:["Use verified product links and compare Product Code, design breadcrumb and title colour.","Webtex at prestigiousonline.co.uk requires sign-in; public product pages are an authorised fallback, not proof Webtex has been exhausted."]},
    SKU_SEARCH: {location:"pt.search",status:"ACCESS_BLOCKED",steps:["After authorised Webtex login, inspect available product/SKU search controls and verify exact returned Product Code.","Public /fabric-search has Filter by Fabric and Go, but the observed query did not narrow results. Do not treat unchanged listings as no exact result."]},
    DESIGN: {location:"pt.design",status:"OBSERVED",steps:["Follow the product's actual /fabrics/collection/design/ breadcrumb; inspect exact design colourways and media."]},
    COLOURWAY: {location:"pt.colourway",status:"OBSERVED",steps:["Follow actual /product/ links from design/collection pages and validate the full Product Code.","Keep genuine thumbnails if these are the usable supplier copy; do not invent high-resolution URLs."]},
    COLLECTION: {location:"pt.collection",status:"OBSERVED",steps:["Use /fabrics and actual collection links; inspect collection hero/gallery and links to designs.","Collection-only imagery is ADDITIONAL context, never an exact colourway MAIN."]},
    FABRIC_LISTING: {location:"pt.fabric-listing",status:"OBSERVED",steps:["Use /fabric-search/ and collection product lists; inspect filter results and all relevant pagination.","Retain observed product links, not guessed slugs. A non-working filter leaves discovery incomplete."]},
    GALLERY: {location:"pt.gallery",status:"PARTIALLY_OBSERVED",steps:["Inspect actual product/design/collection image elements and gallery links.","Product images appear under /wp-content/uploads/product_images/, including /thumbs/. Record each source location."]},
    LIFESTYLE: {location:"pt.lifestyle",status:"ACCESS_BLOCKED",steps:["Inspect design/collection room images and /blog inspiration with explicit captions.","Prestigious SharePoint Public > Lifestyle Imagery exists but requires a separate Microsoft login. Inspect after access is restored."]},
    RESOURCES: {location:"pt.resources",status:"PARTIALLY_OBSERVED",steps:["Use /brochures: seasonal collection brochures are listed from 2021 through Autumn/Winter 2026.","Inspect the relevant collection brochure and any Webtex download/media areas after sign-in.","Do not mark this route exhausted while the trade/download or SharePoint locations remain inaccessible."]},
    DESIGN_COLOUR_SEARCH: {location:"pt.design-colour-search",status:"PARTIALLY_OBSERVED",steps:["Use exact design plus colour in the authorised search, confirming results actually changed.","Validate exact design/colour and stable product identity; do not accept merely similar names."]},
  },
};
export function portalDiscoveryPlan(supplier: string, remaining: readonly DiscoveryRoute[] = DISCOVERY_ROUTES) {
  const map = PORTAL_DISCOVERY_MAPS[supplier];
  if (!map) throw new Error("PORTAL_MAP_NOT_AVAILABLE");
  return DISCOVERY_ROUTES.filter(route => remaining.includes(route)).map(route => ({route,...map[route]}));
}
