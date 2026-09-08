/** Five observed exact identities, passed to the existing supplier-neutral importer. */
import { loadEnvConfig } from "@next/env";
import { writeFile } from "node:fs/promises";
import { fabricMasterRecordsByIds } from "../lib/fabric-master/repository";
const observed = [
  { code: "02", colour: "Ebony", image: "F1787_02_2068.jpg", ean: "5060040058824" },
  { code: "03", colour: "Espresso", image: "F1787_03_2a8d.jpg", ean: "5060040058831" },
  { code: "04", colour: "Midnight", image: "F1787_04_a227.jpg", ean: "5060040058848" },
  { code: "05", colour: "Parchment", image: "F1787_05_829d.jpg", ean: "5060040058855" },
  { code: "06", colour: "Teal", image: "F1787_06_2814.jpg", ean: "5060040058862" },
];
async function main() {
  loadEnvConfig(process.cwd());
  if (new URL(process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname !== "hqysjumypgeapgmqkcrx.supabase.co") throw new Error("STAGING_REQUIRED");
  const records = await fabricMasterRecordsByIds(observed.map(o=>`sdg-f1787-${o.code}`));
  const checkedAt = "2026-09-08T05:20:18.558Z";
  if (Date.now()-Date.parse(checkedAt)>86400000 || Date.parse(checkedAt)>Date.now()) throw new Error("FRESH_PORTAL_RECHECK_REQUIRED");
  const results: Record<string,unknown> = {}, evidence = [];
  for (const o of observed) {
    const r = records.find(r=>r.fabric_id===`sdg-f1787-${o.code}`);
    if (!r || r.supplier_sku!==`F1787/${o.code}` || r.brand_name!=="Clarke & Clarke" || r.design_name!=="Astraea" || r.colour_name!==o.colour || r.collection_name!=="Aqueous Performance" || r.usable_width_mm!==1400 || r.vertical_repeat_mm!==240 || r.horizontal_repeat_mm!==350 || !r.usage_suitability.includes("Curtains")) throw new Error("EXACT_IDENTITY_OR_SPECIFICATION_MISMATCH");
    results[r.fabric_id] = { record: r, images: [`https://trade.sandersondesigngroup.com/static/media/catalog/product/F/1/${o.image}`], checkedAt };
    evidence.push({ master_id:r.fabric_id, workbook_sku:r.supplier_sku, portal_sku:r.supplier_sku, portal_product_id:`CCF0795-${o.code}`, brand:r.brand_name, design:r.design_name, colourway:o.colour, portal_collection:r.collection_name, product_type:"Performance Fabrics", ean:o.ean, match_method:"EXACT_SKU_AND_PRODUCT_DETAILS", confidence:"HIGH", resolution:"EXACT_CURRENT_IDENTITY", lifecycle:"CURRENT", sampleAvailable:true, verified_at:checkedAt });
  }
  await writeFile("artifacts/phase5f/checkpoints/sdg-astraea-phase5h.json",JSON.stringify({results},null,2));
  await writeFile("artifacts/phase5h/sanderson-astraea-exact-batch.json",JSON.stringify(evidence,null,2)+"\n");
  await writeFile("artifacts/phase5h/private/sdg-additional-media-pending.json",JSON.stringify([{fabricId:"sdg-f1787-04",source:"https://trade.sandersondesigngroup.com/static/media/catalog/product/F/1/F1787_04_1_CCF0795_04_CLARKE_And_CLARKE_Astraea_FABRICS_e513.jpg",state:"ADDITIONAL_IMAGE_ROLE_REVIEW_PENDING",reason:"Main image canary uses one unambiguous main image; additional gallery image retained for later review."}],null,2));
  console.log(JSON.stringify({ exactMatches:evidence.length,commercialWrites:0,databaseWrites:0 }));
}
main().catch(e=>{console.error(e instanceof Error && /^[A-Z_]+$/.test(e.message)?e.message:"BATCH_PREPARATION_FAILED");process.exitCode=1;});
