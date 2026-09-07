import { createSupplierServiceClient } from "@/lib/supabase/supplier-service";
import { listFabricMasterRecords } from "@/lib/fabric-master/repository";
import { officialPrestigiousThumbnailUrl } from "@/lib/fabric-master/prestigious-imagery";

async function main() {
  const records = await listFabricMasterRecords({ supplierId: "prestigious-textiles" });
  const database = createSupplierServiceClient();
  let updated = 0;
  const rejected: Array<{ sku: string; status: number }> = [];

  for (const record of records) {
    const url = officialPrestigiousThumbnailUrl({
      supplierSku: record.supplier_sku,
      design: record.design_name,
      colour: record.colour_name,
    });
    const response = await fetch(url, { method: "HEAD", redirect: "follow" });
    if (!response.ok || !response.headers.get("content-type")?.startsWith("image/")) {
      rejected.push({ sku: record.supplier_sku, status: response.status });
      continue;
    }
    const { error } = await database
      .from("fabric_colourways")
      .update({ imagery: [url] })
      .eq("supplier_id", record.supplier_id)
      .eq("supplier_sku", record.supplier_sku);
    if (error) throw new Error(`PRESTIGIOUS_IMAGE_UPDATE_FAILED:${error.code ?? "UNKNOWN"}`);
    updated += 1;
  }

  console.log(JSON.stringify({ supplier: "prestigious-textiles", checked: records.length, updated, rejected }, null, 2));
  if (rejected.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "PRESTIGIOUS_IMAGE_REFRESH_FAILED");
  process.exitCode = 1;
});

