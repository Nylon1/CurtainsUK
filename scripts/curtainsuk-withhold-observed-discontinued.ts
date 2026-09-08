/** Apply only explicit supplier exclusions encountered during media discovery. */
import { readFile, writeFile } from "node:fs/promises";
import { loadEnvConfig } from "@next/env";
import { createSupplierServiceClient } from "../lib/supabase/supplier-service";
import { fabricMasterRecordsByIds } from "../lib/fabric-master/repository";

async function main() {
  loadEnvConfig(process.cwd());
  if (!process.argv.includes("--confirm-project=hqysjumypgeapgmqkcrx") || new URL(process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname !== "hqysjumypgeapgmqkcrx.supabase.co") throw new Error("STAGING_REQUIRED");
  const apply = process.argv.includes("--apply");
  const observed = JSON.parse(await readFile("artifacts/portal-discovery/sdg-explicit-discontinued.json", "utf8")) as {observedDate:string;brand:string;supplierLabel:string;productType:string;source:string;rows:[string,string][]};
  if (observed.observedDate !== new Date().toISOString().slice(0,10) || observed.supplierLabel !== "Discontinued" || observed.productType !== "Fabric" || observed.rows.length > 48) throw new Error("FRESH_EXPLICIT_EVIDENCE_REQUIRED");
  const db = createSupplierServiceClient();
  const current = await db.from("fabric_colourways").select("fabric_id,supplier_sku,lifecycle_state,staging_catalog_visible,updated_at").eq("supplier_id","sanderson-design-group").in("supplier_sku", observed.rows.map(r=>r[0]));
  if (current.error) throw new Error("MASTER_READ_FAILED");
  const records = await fabricMasterRecordsByIds(current.data.map(r=>r.fabric_id));
  const normal = (value:string) => value.normalize("NFKC").trim().replace(/\s+/g," ").toLowerCase();
  const report: Record<string,unknown>[] = [];
  const reportPath = `artifacts/portal-discovery/discontinued-${apply?"applied":"preview"}.json`;
  for (const [sku,title] of observed.rows) {
    const record = records.find(r=>r.supplier_sku===sku), row = current.data.find(r=>r.supplier_sku===sku);
    if (!record || !row || normal(record.brand_name)!==normal(observed.brand) || normal(`${record.design_name} ${record.colour_name}`)!==normal(title)) { report.push({sku,resolution:"IDENTITY_RECONCILIATION_REQUIRED"}); continue; }
    const entry = {fabricId:record.fabric_id,sku,observedTitle:title,source:observed.source,observedDate:observed.observedDate,actor:"Codex operator under owner catalogue activation rule",before:{lifecycle:row.lifecycle_state,visible:row.staging_catalog_visible,revision:row.updated_at},resolution:apply?"PENDING":"VERIFIED_DISCONTINUED",commercialChanges:0};
    report.push(entry);
    // Persist before-image and evidence before the guarded mutation; no price,
    // stock, approved configuration, media or specification fields are changed.
    await writeFile(reportPath,JSON.stringify(report,null,2));
    if (apply) {
      const result=await db.from("fabric_colourways").update({lifecycle_state:"DISCONTINUED",staging_catalog_visible:false,updated_at:new Date().toISOString()}).eq("fabric_id",record.fabric_id).eq("updated_at",row.updated_at).select("fabric_id");
      if(result.error || result.data.length!==1) throw new Error("CANONICAL_REVISION_CHANGED");
      entry.resolution="DISCONTINUED_HIDDEN";
      await writeFile(reportPath,JSON.stringify(report,null,2));
    }
  }
  await writeFile(reportPath,JSON.stringify(report,null,2));
  console.log(JSON.stringify({observed:observed.rows.length,verified:report.filter(r=>r.resolution!=="IDENTITY_RECONCILIATION_REQUIRED").length,applied:apply,commercialChanges:0}));
}
main().catch(()=>{console.error("EXPLICIT_DISCONTINUED_OPERATION_FAILED");process.exitCode=1;});
