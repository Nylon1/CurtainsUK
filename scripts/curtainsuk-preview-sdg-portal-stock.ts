/** Operator-run SDG portal stock read; Preview shadow import is opt-in and Production is denied. */
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { readSdgPortalStock, type SdgStockIdentity } from "../lib/supplier-sync/adapters/sanderson-design-group";

async function main() {
  const manifestPath = process.argv[2];
  if (!manifestPath) throw new Error("USAGE: tsx scripts/curtainsuk-preview-sdg-portal-stock.ts <exact-sku-manifest.json> [--apply-preview]");
  const identities: unknown = JSON.parse(await readFile(resolve(manifestPath), "utf8"));
  if (!Array.isArray(identities) || !identities.every((item): item is SdgStockIdentity => item && typeof item.supplierSku === "string" && typeof item.brandId === "string")) throw new Error("SDG_EXACT_IDENTITY_MANIFEST_REQUIRED");
  // Check the target before contacting the supplier or opening a database client.
  if (process.argv.includes("--apply-preview")) {
    const url = process.env.SUPABASE_URL;
    const ref = process.env.CURTAINSUK_SDG_PREVIEW_SUPABASE_REF;
    if (!url || !ref || process.env.CURTAINSUK_DEPLOYMENT_STAGE?.toLowerCase() !== "preview") throw new Error("SDG_PREVIEW_DATABASE_CONFIGURATION_REQUIRED");
    const host = new URL(url).hostname;
    if (ref === "hqysjumypgeapgmqkcrx" || host !== `${ref}.supabase.co`) throw new Error("SDG_PRODUCTION_DATABASE_BLOCKED");
    if (!process.env.SUPABASE_SECRET_KEY) throw new Error("SDG_PREVIEW_SERVICE_KEY_REQUIRED");
  }
  const token = process.env.SDG_PORTAL_BEARER_TOKEN;
  if (!token) throw new Error("SDG_PORTAL_BEARER_TOKEN_REQUIRED");
  const result = await readSdgPortalStock({ identities, bearerToken: token });
  const outputDir = resolve("artifacts/sdg-portal-private");
  await mkdir(outputDir, { recursive: true });
  const reportPath = resolve(outputDir, `read-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  await writeFile(reportPath, JSON.stringify({ retrievedAt: new Date().toISOString(), result }, null, 2), { mode: 0o600 });

  let previewShadowAppended = 0;
  let previewValidationRejected = 0;
  if (process.argv.includes("--apply-preview")) {
    const { SupabaseSupplierIntelligenceRepository } = await import("../lib/supplier-intelligence/supabase-repository");
    const { validateSupplierIntelligenceSnapshot } = await import("../lib/supplier-intelligence/validation");
    const { createValidationEvent } = await import("../lib/supplier-intelligence/promotion");
    const repo = new SupabaseSupplierIntelligenceRepository();
    const now = new Date();
    const items = [];
    for (const snapshot of result.snapshots) {
      const context = await repo.validationContext({ supplierId: snapshot.supplier_id, supplierSku: snapshot.supplier_sku, sourceType: snapshot.source.type, requiredPriceField: null });
      const validation = validateSupplierIntelligenceSnapshot(snapshot, context, now);
      if (validation.status !== "VALIDATED") {
        previewValidationRejected += 1;
        continue;
      }
      items.push({ snapshot, validation, validation_event: createValidationEvent(snapshot.snapshot_id, validation, now.toISOString()) });
    }
    for (let offset = 0; offset < items.length; offset += 100) {
      const batch = items.slice(offset, offset + 100);
      const run = { run_id: `sdg-portal-preview:${randomUUID()}`, supplier_id: "sanderson-design-group", adapter_id: "sdg-portal-product-detail", mode: "SHADOW" as const, source_type: "MANUAL_PORTAL", source_name: "SDG authenticated trade portal Product/detail", started_at: now.toISOString(), completed_at: now.toISOString(), status: "SUCCEEDED" as const, snapshots_received: batch.length, snapshots_appended: batch.length, error_code: null, shopify_writes: 0 as const, production_schedule_created: false as const };
      await repo.appendBulkValidatedSnapshots({ run, items: batch });
      previewShadowAppended += batch.length;
    }
  }
  console.log(JSON.stringify({ requested: result.requested, exactMetreObservations: result.snapshots.length, exceptions: result.exceptions.length, previewValidationRejected, previewShadowAppended, reportPath }));
}
main().catch((error) => { console.error(error instanceof Error ? error.message : "SDG_PORTAL_STOCK_READ_FAILED"); process.exitCode = 1; });
