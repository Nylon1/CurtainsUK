/** Read-only: 1,000 real identities for loopback QA; never changes browse readiness. */
import { loadEnvConfig } from "@next/env";
import { readFile, writeFile } from "node:fs/promises";
import { createSupplierServiceClient } from "../lib/supabase/supplier-service";
import { fabricMasterRecordsByIds } from "../lib/fabric-master/repository";
import { assertCustomerSafeProjection, projectCustomerSafeFabric } from "../lib/fabric-master/projection";
import { retailMetadata } from "../lib/fabric-master/retail";
import type { searchRetailFabrics } from "../lib/fabric-master/retail-repository";
async function main() {
  loadEnvConfig(process.cwd());
  if (new URL(process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname !== "hqysjumypgeapgmqkcrx.supabase.co") throw new Error("STAGING_REQUIRED");
  const db = createSupplierServiceClient();
  const manifest: {fabric_id: string}[] = JSON.parse(await readFile("artifacts/phase5h/prestigious-scale-manifest.json", "utf8"));
  const ids = manifest.map(r => r.fabric_id);
  for (const brand of ["sanderson", "morris-co", "harlequin", "zoffany", "scion", "clarke-clarke"]) {
    const result = await db.from("fabric_colourways").select("fabric_id").eq("brand_id", `sdg-${brand}`).order("fabric_id").limit(125);
    if (result.error || result.data.length !== 125) throw new Error("SCALE_IDENTITIES_UNAVAILABLE");
    ids.push(...result.data.map(r => r.fabric_id));
  }
  if (new Set(ids).size !== 1000) throw new Error("SCALE_IDENTITIES_INVALID");
  const media = JSON.parse(await readFile("artifacts/phase5f/checkpoints/supplier-media.json", "utf8"));
  const fabrics: Awaited<ReturnType<typeof searchRetailFabrics>>["fabrics"] = [], timings: number[] = [];
  for (let start = 0; start < ids.length; start += 24) {
    const selected = ids.slice(start, start + 24), time = performance.now();
    const records = await fabricMasterRecordsByIds(selected);
    const profiles = await db.from("fabric_retail_profiles").select("fabric_id,description,description_validated,colour_families,patterns,characters,styles").in("fabric_id", selected);
    if (profiles.error || records.length !== selected.length) throw new Error("SCALE_READ_FAILED");
    timings.push(Math.round(performance.now() - time));
    for (const r of records) {
      const safe = projectCustomerSafeFabric(r), p = profiles.data.find(v => v.fabric_id === r.fabric_id), m = media.mappings[r.fabric_id];
      if (!r.supplier_sku || !r.brand_name || !r.design_name || !r.colour_name) throw new Error("SCALE_IDENTITY_INCOMPLETE");
      const images = m && m.mappingState === "VERIFIED" && m.rightsState === "APPROVED" && /^https:\/\/cdn\.shopify\.com\//.test(m.shopifyCdnUrl) ? [{ imageType: "MAIN", url: m.shopifyCdnUrl, width: m.width, height: m.height, approved: true }] : [];
      fabrics.push({ id: safe.id, supplier: safe.supplier, brand: safe.brand, collection: safe.collection, design: safe.design, colour: safe.colour, composition: safe.composition, usableWidthMm: safe.usableWidthMm, fullWidthMm: safe.fullWidthMm, verticalRepeatMm: safe.verticalRepeatMm, horizontalRepeatMm: safe.horizontalRepeatMm, patternMatchType: safe.patternMatchType, sampleAvailable: safe.sampleAvailable, availability: safe.availability, configurable: false, configurationMessage: "Price and availability to be confirmed", browseReady: false, orderReady: false, launchReady: false, feedEligible: false, description: p?.description_validated ? p.description : "Editorial and current supplier verification pending. Internal scale-test record only.", colourFamilies: p?.colour_families ?? ["UNKNOWN"], patterns: p?.patterns ?? ["UNKNOWN"], characters: p?.characters ?? ["UNKNOWN"], styles: p?.styles ?? ["UNKNOWN"], images, imageReferences: images.map(i => i.url), metadata: retailMetadata(r), headings: [], windowTypes: [], linings: [], rooms: [], careInstructions: [], weightGsm: r.weight_gsm });
    }
  }
  // Approved Prestigious images first so lazy loading is exercised, followed by real SDG identities.
  fabrics.sort((a,b) => Number(b.images.length > 0) - Number(a.images.length > 0) || `${a.brand} ${a.design} ${a.colour} ${a.id}`.localeCompare(`${b.brand} ${b.design} ${b.colour} ${b.id}`));
  assertCustomerSafeProjection(fabrics);
  await writeFile("artifacts/phase5h/private/scale-fixture-1000.json", JSON.stringify(fabrics));
  await writeFile("artifacts/phase5h/scale-fixture-manifest.json", JSON.stringify({ records: fabrics.length, ids, byBrand: Object.fromEntries([...new Set(fabrics.map(f=>f.brand))].map(b=>[b,fabrics.filter(f=>f.brand===b).length])), approvedImageRecords: fabrics.filter(f=>f.images.length).length, preparationReadBatchMs: timings, publicVisibilityWrites: 0, allPricingDisabled: true, missingImageryIsNotSubstituted: true }, null, 2) + "\n");
  console.log(JSON.stringify({ records: fabrics.length, withImages: fabrics.filter(f=>f.images.length).length, databaseWrites: 0 }));
}
main().catch(e => { console.error(e instanceof Error && /^[A-Z_]+$/.test(e.message) ? e.message : "SCALE_PREPARATION_FAILED"); process.exitCode = 1; });
