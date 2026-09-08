/** Two exact portal identities only. No fuzzy media matches or commercial writes. */
import { loadEnvConfig } from "@next/env";
import { readFile, writeFile } from "node:fs/promises";
import { createSupplierServiceClient } from "../lib/supabase/supplier-service";
import { fabricMasterRecordsByIds } from "../lib/fabric-master/repository";
import { retailLaunchBlockers } from "../lib/fabric-master/retail";

async function main() {
  loadEnvConfig(process.cwd());
  if (!process.argv.includes("--confirm-project=hqysjumypgeapgmqkcrx") || new URL(process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname !== "hqysjumypgeapgmqkcrx.supabase.co") throw new Error("STAGING_REQUIRED");
  // Re-running this runbook must never turn a historical UI observation into a fresh check.
  const verifiedAt = "2026-09-08T05:00:51.187Z";
  if (Date.now() - Date.parse(verifiedAt) > 86400000 || Date.parse(verifiedAt) > Date.now()) throw new Error("FRESH_PORTAL_RECHECK_REQUIRED");
  const db = createSupplierServiceClient(), now = new Date().toISOString();
  const items = [
    { id: "sdg-dapgpa203", sku: "DAPGPA203", portalId: "SAF0034-01", designId: "sdg-sanderson-design-dapgpa", expectedRevision: "2026-09-07T11:57:09.609633+00:00", fields: { collection_id: "sdg-sanderson-collection-sanderson-one-sixty-fabrics" }, description: "Painters Garden in Violet/Crimson by Sanderson brings an airy garden scene to curtains: purple and crimson flowers, green stems and blue-and-white vases sit across a pale cream ground. Its painterly motifs give traditional or country living rooms and bedrooms a lively focal point. Part of Sanderson One Sixty Fabrics, this 100% cotton fabric has a 66 cm vertical repeat and 137 cm usable width. Order a sample to assess the colours and handle in your room.", colours: ["multicolour", "white/cream", "purple", "red"], pattern: "floral", character: "UNKNOWN", style: "country" },
    { id: "sdg-f1787-01", sku: "F1787/01", portalId: "CCF0795-01", designId: "sdg-clarke-clarke-design-catalogue-clarke-and-clarke-aqueous-performance-astraea", expectedRevision: "2026-09-07T20:33:43.581225+00:00", fields: { usable_width_mm: 1400, usage_suitability: ["Curtains", "Blinds", "Cushions"], weight_gsm: 332 }, description: "Astraea in Dove by Clarke & Clarke is a pale grey fabric with a softly mottled, woven appearance. The restrained colour and fine visual texture can sit comfortably alongside stronger patterns in contemporary living rooms or bedrooms. It belongs to the Aqueous Performance collection and is listed by the supplier for drapes, blinds and cushions. The usable width is 140 cm, with a 24 cm vertical repeat. Order a sample to judge the texture and colour before choosing your curtains.", colours: ["grey"], pattern: "UNKNOWN", character: "textured", style: "contemporary" },
  ];
  const report = [];
  const state = JSON.parse(await readFile("artifacts/phase5f/checkpoints/supplier-media.json", "utf8"));
  for (const item of items) {
    const current = await db.from("fabric_colourways").select("supplier_sku,design_id,updated_at,lifecycle_state,sample_available,staging_catalog_visible").eq("fabric_id", item.id).single();
    if (current.error || current.data.supplier_sku !== item.sku || current.data.design_id !== item.designId) throw new Error("EXACT_IDENTITY_CHANGED");
    const before = await db.from("fabric_designs").select("design_id,collection_id,usable_width_mm,usage_suitability,weight_gsm,updated_at").eq("design_id", item.designId).single();
    if (before.error) throw new Error("DESIGN_READ_FAILED");
    const complete = Object.entries(item.fields).every(([k,v]) => JSON.stringify(before.data[k as keyof typeof before.data]) === JSON.stringify(v));
    if (!complete) {
      if (before.data.updated_at !== item.expectedRevision) throw new Error("NEWER_SPECIFICATION_PROTECTED");
      const result = await db.from("fabric_designs").update({ ...item.fields, source_type: "MANUAL_PORTAL", source_name: "Phase 5H exact-SKU authorised SDG portal reconciliation", source_reference: `sdg-product:${item.sku}:${item.portalId}`, source_observed_at: verifiedAt, source_effective_date: verifiedAt.slice(0,10), updated_at: now }).eq("design_id", item.designId).eq("updated_at", before.data.updated_at).select("design_id");
      if (result.error || result.data.length !== 1) throw new Error("DESIGN_REVISION_CHANGED");
    }
    const lifecycle = await db.from("fabric_colourways").update({ lifecycle_state: "CURRENT", sample_available: true, source_type: "MANUAL_PORTAL", source_name: "Phase 5H exact-SKU authorised SDG lifecycle verification", source_reference: `sdg-product:${item.sku}:${item.portalId}`, source_effective_date: verifiedAt.slice(0,10), updated_at: now }).eq("fabric_id", item.id).eq("updated_at", current.data.updated_at).select("fabric_id");
    if (lifecycle.error || lifecycle.data.length !== 1) throw new Error("COLOURWAY_REVISION_CHANGED");
    const mapping = state.mappings[item.id];
    if (!mapping || mapping.supplierSku !== item.sku || mapping.mappingState !== "VERIFIED" || mapping.rightsState !== "APPROVED") throw new Error("EXACT_IMAGE_REQUIRED");
    const profile = { fabric_id: item.id, description: item.description, description_validated: true, colour_families: item.colours, patterns: [item.pattern], characters: [item.character], styles: [item.style], rooms: ["living room", "bedroom"], window_types: [], headings: [], linings: [], classification_evidence: JSON.stringify({ ruleVersion: "phase5h-sdg-exact-2", reviewer: "Codex operator under owner Phase 5H authority", source: `sdg-product:${item.sku}:${item.portalId}`, imageHash: mapping.contentHash }), updated_at: now };
    const saved = await db.from("fabric_retail_profiles").upsert(profile, { onConflict: "fabric_id", ignoreDuplicates: true });
    if (saved.error) throw new Error("EDITORIAL_WRITE_FAILED");
    const approved = await db.from("fabric_retail_profiles").select("*").eq("fabric_id", item.id).single();
    if (approved.error || approved.data.classification_evidence !== profile.classification_evidence) throw new Error("EXISTING_EDITORIAL_PROTECTED");
    const record = (await fabricMasterRecordsByIds([item.id]))[0];
    const blockers = retailLaunchBlockers(record, approved.data, [{ imageType: "MAIN", approved: true, url: mapping.shopifyCdnUrl, width: mapping.width, height: mapping.height }]);
    if (blockers.length) throw new Error("BROWSE_GATE_BLOCKED");
    const visible = await db.from("fabric_colourways").update({ staging_catalog_visible: true }).eq("fabric_id", item.id).eq("updated_at", now).select("fabric_id");
    if (visible.error || visible.data.length !== 1) throw new Error("VISIBILITY_REVISION_CHANGED");
    report.push({ fabricId: item.id, supplierSku: item.sku, portalId: item.portalId, before: before.data, specificationChanges: item.fields, checkedAt: verifiedAt, browseReady: true, commercialWrites: 0, orderWrites: 0, imageReused: true });
  }
  await writeFile("artifacts/phase5h/sanderson-reconciliation-applied.json", JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({ reconciled: report.length, browseReady: report.length, commercialWrites: 0, imageUploads: 0 }));
}
main().catch(e => { console.error(e instanceof Error && /^[A-Z_]+$/.test(e.message) ? e.message : "RECONCILIATION_FAILED"); process.exitCode = 1; });
