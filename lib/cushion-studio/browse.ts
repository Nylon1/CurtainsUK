import { governedBrowseFilters } from "../fabric-master/browse-filters";
import { BROWSE_PRICE_BANDS, browsePriceBand } from "../fabric-master/browse-price-guide";

// Cushion-only presentation names. Shared Browse boundaries remain authoritative.
const tierNames = ["Essential", "Premium", "Luxury", "Premium Luxury", "Super Luxury"];
export const CUSHION_FABRIC_TIERS = BROWSE_PRICE_BANDS.map((band, index) => ({
  value: band.value,
  label: tierNames[index],
  range: band.label,
}));

export function cushionBrowseParams(params: URLSearchParams) {
  const offset = Math.max(0, Number.parseInt(params.get("offset") ?? "0", 10) || 0);
  const filters = governedBrowseFilters(params);
  const band = browsePriceBand(params.get("guidePrice"));
  return new URLSearchParams({
    view: "retail", browseGuide: "1", page: String(Math.floor(offset / 24) + 1),
    query: (params.get("q") ?? "").trim().slice(0, 100),
    colour: (filters.colour as string[]).join(","),
    pattern: (filters.pattern as string[]).join(","),
    ...(band ? { guidePrice: band.value } : {}),
  });
}

/** Only public facet labels and counts cross this boundary, never commercial records. */
export function cushionBrowseFacets(source: unknown) {
  const facets = source as { discovery?: { key: string; options?: { value: string; label: string; count: number }[] }[] } | undefined;
  const discovery = Array.isArray(facets?.discovery) ? facets.discovery : [];
  return {
    priceTiers: CUSHION_FABRIC_TIERS,
    discovery: ["colour", "pattern"].map((key) => {
      const options = discovery.find((dimension) => dimension?.key === key)?.options;
      return {
      key,
      options: (Array.isArray(options) ? options : [])
        .filter((option) => option && typeof option.value === "string" && typeof option.label === "string" && Number.isSafeInteger(option.count) && option.count >= 0)
        .map(({ value, label, count }) => ({ value, label, count })),
    }; }),
  };
}
