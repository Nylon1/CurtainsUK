import type { PrestigiousPublicFabric } from "./types";

function normaliseSku(value: string) {
  return value.trim().replace(/\\/g, "/").toUpperCase();
}

export function parseDiscontinuedSkus(csv: string) {
  const lines = csv.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  if (!lines.length) return new Set<string>();
  const headers = lines[0].split(",").map((header) => header.replace(/^"|"$/g, "").trim().toLowerCase());
  const index = headers.findIndex((header) => ["sku", "product code", "productcode", "item", "item code", "code"].includes(header));
  if (index < 0) throw new Error("Discontinued export has no recognised SKU/code column");
  return new Set(lines.slice(1).map((line) => line.split(",")[index]?.replace(/^"|"$/g, "")).filter(Boolean).map(normaliseSku));
}

export function applyDiscontinuedExport(fabrics: PrestigiousPublicFabric[], csv: string) {
  const discontinued = parseDiscontinuedSkus(csv);
  return fabrics.map((fabric) => discontinued.has(normaliseSku(fabric.uniqueSku))
    ? { ...fabric, recordLifecycle: "RETIRED" as const, supplierAvailability: "DISCONTINUED" as const, customerAvailability: "No longer available" as const, googleFeedEligibility: { ...fabric.googleFeedEligibility, eligible: false, reason: "Prestigious discontinued item" } }
    : fabric);
}
