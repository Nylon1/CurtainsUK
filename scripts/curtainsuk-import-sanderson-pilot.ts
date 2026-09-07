import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { buildCatalogueImport, sha256 } from "@/lib/fabric-master/catalogue-normalization";
import { applyFabricCatalogueBatch, existingSupplierSkus } from "@/lib/fabric-master/repository";
import { normalizeSandersonRows, type SandersonTradeRow } from "@/lib/fabric-master/sanderson";

async function main() {
  const sourcePath = resolve(process.argv[2] ?? "fixtures/suppliers/sanderson/painters-garden-DAPGPA203.public.json");
  const bytes = await readFile(sourcePath);
  const source = JSON.parse(bytes.toString("utf8")) as SandersonTradeRow;
  const records = normalizeSandersonRows([source]);
  const existing = await existingSupplierSkus("sanderson-design-group");
  const batch = buildCatalogueImport({
    supplierId: "sanderson-design-group",
    sourceType: source.sourceType ?? "AUTHORISED_PDF_PORTAL",
    sourceName: source.sourceName ?? "Official Sanderson source",
    sourceReference: source.sourceReference ?? basename(sourcePath),
    sourceSha256: sha256(bytes),
    sourceEffectiveDate: source.sourceEffectiveDate ?? null,
    existingSupplierSkus: existing,
    records,
  });
  const result = await applyFabricCatalogueBatch(batch.metadata, batch.items);
  console.log(JSON.stringify({ supplier: "sanderson-design-group", colourways: 1, designs: 1, collections: 1, database: result, shopifyWrites: 0 }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "SANDERSON_PILOT_IMPORT_FAILED");
  process.exitCode = 1;
});
