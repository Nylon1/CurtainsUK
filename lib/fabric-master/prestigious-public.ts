import { load } from "cheerio";
import { stableSlug } from "./catalogue-normalization";
import type { FabricMasterRecord } from "./types";

/** Only accepts links actually present in the authorised public supplier page. */
export function prestigiousProductLinks(html: string): string[] {
  const $ = load(html);
  return [...new Set($("a[href]").map((_, e) => $(e).attr("href")!).get()
    .filter((url) => /^https:\/\/www\.prestigious\.co\.uk\/product\/[a-z0-9-]+\/$/.test(url)))];
}

export function parsePrestigiousPublicProduct(html: string, sourceReference: string, checkedAt: string) {
  const $ = load(html);
  const field = (label: string) => $("div").filter((_, e) => $(e).children().length === 0 && $(e).text().trim() === label).first().parent().next();
  const text = (label: string) => field(label).text().replace(/\s+/g, " ").trim();
  const sku = text("Product Code:");
  if (!/^\d{4}\/\d{3}$/.test(sku)) throw new Error("STABLE_SKU_NOT_FOUND");
  const [designCode, colourCode] = sku.split("/");
  const collection = text("Collection:");
  const designLink = $("a[href]").filter((_, e) => /^https:\/\/www\.prestigious\.co\.uk\/fabrics\/[^/]+\/[^/]+\/$/.test($(e).attr("href")!)).last();
  const design = designLink.text().trim();
  const title = $("h1").first().text().trim().replace(/\s+\(pts\d+\)$/i, "");
  if (!design || !collection || !title.toLowerCase().startsWith(design.toLowerCase() + " ")) throw new Error("IDENTITY_UNRESOLVED");
  const colour = title.slice(design.length).trim();
  const usage = field("Usage:").find("img[alt]").map((_, e) => $(e).attr("alt")!).get();
  if (!usage.includes("Curtains")) throw new Error("CURTAIN_SUITABILITY_UNCONFIRMED");
  const mm = (label: string) => { const raw = text(label); const n = Number.parseFloat(raw); return raw && Number.isFinite(n) && n >= 0 ? Math.round(n * 10) : null; };
  const composition = [...text("Composition:").matchAll(/(\d+(?:\.\d+)?)\s*%\s*([a-z][a-z -]*?)(?=\d|$)/gi)]
    .map((m) => ({ percentage: Number(m[1]), material: m[2].trim().toLowerCase() }));
  const availableImages = [...new Set($("img").map((_, e) => $(e).attr("data-src") || $(e).attr("src") || "").get())]
    .filter((url) => url.startsWith("https://www.prestigious.co.uk/wp-content/uploads/product_images/") && decodeURIComponent(url).includes(`${designCode}-${colourCode} `));
  const fullImages = availableImages.filter(url => !url.includes("/thumbs/"));
  const images = fullImages.length ? fullImages : availableImages;
  const record: Omit<FabricMasterRecord, "supplier_name"> = {
    fabric_id: `pt-${designCode}-${colourCode}`, supplier_id: "prestigious-textiles", brand_id: "prestigious-textiles", brand_name: "Prestigious Textiles",
    collection_id: `pt-collection-${stableSlug(collection)}`, collection_name: collection, supplier_collection_code: null,
    design_id: `pt-design-${designCode}`, supplier_design_code: designCode, design_name: design, supplier_sku: sku, colourway_code: colourCode, colour_name: colour,
    full_width_mm: mm("Width:"), usable_width_mm: mm("Usable Width:"), vertical_repeat_mm: mm("Vertical Pattern Repeat:"), horizontal_repeat_mm: mm("Horizontal Pattern Repeat:"),
    pattern_match_type: null, composition, weight_gsm: null, care_instructions: [], usage_suitability: usage,
    imagery: [], sample_available: $("[data-product_sku]").filter((_, e) => $(e).attr("data-product_sku") === sku).text().includes("Order a Sample") ? true : null,
    // A page being present is not proof that the supplier currently supplies it.
    lifecycle_state: "UNKNOWN", price_verification_status: "PRICE_REQUIRES_VERIFICATION", storefront_selectable: false, staging_catalog_visible: false,
    source_type: "AUTHORISED_PUBLIC_PRODUCT", source_name: "Prestigious current public product specification", source_reference: sourceReference, source_effective_date: checkedAt.slice(0, 10),
  };
  return { record, images, availableImages, checkedAt, supplierColourClassification: text("Colour:"), supplierFabricCharacter: text("Fabric:"), careCodes: field("Care Instructions:").find("img[alt]").map((_, e) => $(e).attr("alt")!).get() };
}
