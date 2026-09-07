import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { loadEnvConfig } from "@next/env";
import { applyFabricCatalogueBatch, listExistingCatalogueRecords } from "../lib/fabric-master/repository";
import { buildCatalogueImport, sha256 } from "../lib/fabric-master/catalogue-normalization";
import { createSupplierServiceClient } from "../lib/supabase/supplier-service";
import { factualRetailDescription } from "../lib/fabric-master/retail";
import type { parsePrestigiousPublicProduct } from "../lib/fabric-master/prestigious-public";

async function main() {
  loadEnvConfig(process.cwd());
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (new URL(url).hostname !== "hqysjumypgeapgmqkcrx.supabase.co" || !process.argv.includes("--confirm-project=hqysjumypgeapgmqkcrx")) throw new Error("STAGING_DATABASE_REQUIRED");
  const root = resolve("artifacts/phase5f/checkpoints");
  const existing = await listExistingCatalogueRecords("prestigious-textiles");
  const seen = new Set(existing.map((e) => e.record.supplier_sku));
  const db = createSupplierServiceClient();
  let inserted = 0;
  for (const filename of (await readdir(root)).filter((f) => /^pt-[a-z-]+\.json$/.test(f)).sort()) {
    const source = JSON.parse(await readFile(resolve(root, filename), "utf8")) as { results: Record<string, ReturnType<typeof parsePrestigiousPublicProduct>> };
    // Existing verified master rows are not overwritten by this discovery run.
    const incoming = Object.values(source.results).filter((p) => !seen.has(p.record.supplier_sku));
    for (let start = 0; start < incoming.length; start += 100) {
      const chunk = incoming.slice(start, start + 100);
      const batch = buildCatalogueImport({ supplierId: "prestigious-textiles", sourceType: "AUTHORISED_PUBLIC_PRODUCT", sourceName: "Prestigious authorised public product specification", sourceReference: filename, sourceSha256: sha256(JSON.stringify(chunk)), sourceObservedAt: chunk.reduce((latest, p) => p.checkedAt > latest ? p.checkedAt : latest, ""), existingSupplierSkus: seen, records: chunk.map((p) => p.record) });
      const result = await applyFabricCatalogueBatch(batch.metadata, batch.items);
      if (result.rejected) throw new Error("CATALOGUE_MERGE_REJECTED");
      inserted += result.inserted;
      for (const product of chunk) seen.add(product.record.supplier_sku);
    }
    for (const product of Object.values(source.results)) {
      const profile = { fabric_id: product.record.fabric_id, description: factualRetailDescription(product.record), description_validated: false, classification_evidence: "Factual draft from current supplier page. Visual merchandising review pending." };
      const result = await db.from("fabric_retail_profiles").upsert(profile, { onConflict: "fabric_id", ignoreDuplicates: true });
      if (result.error) throw new Error("RETAIL_PROFILE_WRITE_FAILED");
      const checkpoint = await db.from("fabric_media_checkpoints").upsert({ supplier_id: product.record.supplier_id, supplier_sku: product.record.supplier_sku, fabric_id: product.record.fabric_id, state: product.images.length ? "FOUND" : "MISSING", failure_reason: product.images.length ? null : "MAIN_IMAGE_MISSING" }, { onConflict: "supplier_id,supplier_sku", ignoreDuplicates: true });
      if (checkpoint.error) throw new Error("MEDIA_CHECKPOINT_WRITE_FAILED");
    }
  }
  console.log(JSON.stringify({ inserted, existingValuesOverwritten: 0, pricesEnabled: 0, visibilityEnabled: 0 }));
}
main().catch((error) => { const message = error instanceof Error ? error.message : "PUBLIC_CATALOGUE_APPLY_FAILED"; console.error(/^[A-Z0-9_]+$/.test(message) ? message : "PUBLIC_CATALOGUE_APPLY_FAILED"); process.exitCode = 1; });
