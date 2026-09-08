/** Operate the existing browse gate; never change commercial pricing eligibility. */
import { readFile, writeFile } from "node:fs/promises";
import { loadEnvConfig } from "@next/env";
import { listExistingCatalogueRecords } from "../lib/fabric-master/repository";
import { retailLaunchBlockers, type RetailProfile } from "../lib/fabric-master/retail";
import { createSupplierServiceClient } from "../lib/supabase/supplier-service";

async function main() {
  loadEnvConfig(process.cwd());
  if (new URL(process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname !== "hqysjumypgeapgmqkcrx.supabase.co" || !process.argv.includes("--confirm-project=hqysjumypgeapgmqkcrx")) throw new Error("STAGING_DATABASE_REQUIRED");
  const manifestPath = process.argv.find(arg => arg.startsWith("--manifest="))?.slice("--manifest=".length) ?? "artifacts/phase5g/prestigious-canary-50.json";
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as { fabric_id: string; supplier_sku: string }[];
  if (!manifest.length || manifest.length > 250 || new Set(manifest.map((r) => r.fabric_id)).size !== manifest.length) throw new Error("CANARY_MANIFEST_INVALID");
  const rows = await listExistingCatalogueRecords("prestigious-textiles");
  const db = createSupplierServiceClient();
  const ids = manifest.map((r) => r.fabric_id);
  const [profiles, mappings] = await Promise.all([
    db.from("fabric_retail_profiles").select("*").in("fabric_id", ids),
    db.from("fabric_media_mappings").select("fabric_id,image_type,fabric_media_assets!inner(shopify_cdn_url,width,height)").in("fabric_id", ids).eq("rights_state", "APPROVED").eq("mapping_state", "VERIFIED"),
  ]);
  if (profiles.error || mappings.error) throw new Error("CANARY_READ_FAILED");
  const report = [];
  for (const item of manifest) {
    const current = rows.find((r) => r.record.fabric_id === item.fabric_id && r.record.supplier_sku === item.supplier_sku);
    if (!current) throw new Error("CANARY_IDENTITY_MISMATCH");
    const images = mappings.data.filter((m) => m.fabric_id === item.fabric_id).map((m) => {
      const a = m.fabric_media_assets as unknown as { shopify_cdn_url: string; width: number; height: number };
      return { imageType: m.image_type, url: a.shopify_cdn_url, width: a.width, height: a.height, approved: true };
    });
    const profile = profiles.data.find((p) => p.fabric_id === item.fabric_id) as RetailProfile | undefined;
    const blockers = retailLaunchBlockers(current.record, profile ?? null, images);
    let activated = false;
    if (!blockers.length && process.argv.includes("--apply") && !current.record.staging_catalog_visible) {
      const result = await db.from("fabric_colourways").update({ staging_catalog_visible: true, updated_at: new Date().toISOString() }).eq("fabric_id", item.fabric_id).eq("updated_at", current.updated_at).eq("lifecycle_state", "CURRENT").select("fabric_id");
      if (result.error || result.data?.length !== 1) throw new Error("CANARY_REVISION_CHANGED");
      activated = true;
    }
    report.push({ fabricId: item.fabric_id, blockers, activated, browseReady: !blockers.length, lifecycleSourceDate: current.record.source_effective_date, previouslyVisible: current.record.staging_catalog_visible });
  }
  const reportPath = process.argv.find(arg => arg.startsWith("--report="))?.slice("--report=".length) ?? "artifacts/phase5g/browse-canary-report.json";
  await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n", "utf8");
  console.log(JSON.stringify({ browseReady: report.filter((r) => r.browseReady).length, newlyVisible: report.filter((r) => r.activated).length, blocked: report.filter((r) => r.blockers.length).length, commercialChanges: 0 }));
}
main().catch(() => { console.error("CANARY_ACTIVATION_FAILED"); process.exitCode = 1; });
