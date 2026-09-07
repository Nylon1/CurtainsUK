import { loadEnvConfig } from "@next/env";
import { listFabricMasterRecords } from "@/lib/fabric-master/repository";

const ALLOWED_SUPPLIERS = new Set(["prestigious-textiles", "sanderson-design-group"]);

async function imageResolves(raw: string) {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return false;
    const response = await fetch(url, {
      method: "GET",
      headers: { Range: "bytes=0-0" },
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    const image = response.ok && (response.headers.get("content-type") ?? "").toLowerCase().startsWith("image/");
    await response.body?.cancel();
    return image;
  } catch {
    return false;
  }
}

async function main() {
  loadEnvConfig(process.cwd());
  const supplierId = process.argv[2];
  if (!supplierId || !ALLOWED_SUPPLIERS.has(supplierId)) {
    throw new Error("USAGE: tsx scripts/curtainsuk-audit-catalogue-images.ts <prestigious-textiles|sanderson-design-group>");
  }
  const records = await listFabricMasterRecords({ supplierId });
  const withReferences = records.filter((record) => record.imagery.length > 0);
  const batches = Array.from({ length: Math.ceil(withReferences.length / 10) }, (_, index) => (
    withReferences.slice(index * 10, (index + 1) * 10)
  ));
  let resolved = 0;
  for (const batch of batches) {
    const results = await Promise.all(batch.map((record) => imageResolves(record.imagery[0])));
    resolved += results.filter(Boolean).length;
  }
  console.log(JSON.stringify({
    supplier_id: supplierId,
    colourways: records.length,
    image_references_present: withReferences.length,
    images_resolved: resolved,
    images_unresolved: withReferences.length - resolved,
    records_without_image_reference: records.length - withReferences.length,
    database_writes: 0,
    shopify_writes: 0,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "CATALOGUE_IMAGE_AUDIT_FAILED");
  process.exitCode = 1;
});
