/** Apply the sampled Phase 5G editorial rules to the fixed 50-colourway canary. */
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import { factualRetailDescription, validTaxonomy } from "../lib/fabric-master/retail";
import { listExistingCatalogueRecords } from "../lib/fabric-master/repository";
import { createSupplierServiceClient } from "../lib/supabase/supplier-service";
import type { parsePrestigiousPublicProduct } from "../lib/fabric-master/prestigious-public";

const colours: Record<string, string> = {
  cream: "white/cream", white: "white/cream", cappuccino: "beige/taupe", bark: "brown", coffee: "brown", walnut: "brown", tan: "brown",
  flint: "grey", seagull: "grey", charcoal: "grey", black: "black", gold: "yellow/gold", mustard: "yellow/gold", lemon: "yellow/gold",
  emerald: "green", sage: "green", grass: "green", mint: "green", celedon: "green", royal: "blue", sky: "blue", blue: "blue",
  ruby: "red", crimson: "red", postbox: "red", pink: "pink", rose: "pink", orange: "orange", rust: "orange", purple: "purple", mauve: "purple",
};
async function main() {
  const reviewText = await readFile("artifacts/phase5g/editorial-design-review.json", "utf8");
  const review = JSON.parse(reviewText) as { ruleVersion: string; reviewer: string; designs: { designId: string; design: string; sampleFabricId: string; pattern: string; character: string; style: string; visualDescription: string }[] };
  const manifest = JSON.parse(await readFile("artifacts/phase5g/prestigious-canary-50.json", "utf8")) as { fabric_id: string; supplier_sku: string; content_hash: string }[];
  if (manifest.length !== 50 || new Set(manifest.map((r) => r.fabric_id)).size !== 50) throw new Error("CANARY_MANIFEST_INVALID");
  const source = JSON.parse(await readFile("artifacts/phase5f/checkpoints/pt-phaseg-canary.json", "utf8")) as { results: Record<string, ReturnType<typeof parsePrestigiousPublicProduct>> };
  const products = Object.values(source.results);
  const profiles = manifest.map((item) => {
    const product = products.find((p) => p.record.fabric_id === item.fabric_id);
    if (!product || product.record.supplier_sku !== item.supplier_sku) throw new Error("EDITORIAL_IDENTITY_MISMATCH");
    const r = product.record;
    const rule = review.designs.find((d) => d.designId === r.design_id && d.design === r.design_name);
    if (!rule || !r.usable_width_mm || !r.full_width_mm || r.usable_width_mm > r.full_width_mm || Math.abs(r.composition.reduce((sum, p) => sum + p.percentage, 0) - 100) > 0.1) throw new Error("EDITORIAL_SPECIFICATION_REVIEW_REQUIRED");
    const families = [...new Set(product.supplierColourClassification.split(",").map((v) => colours[v.trim().toLowerCase()]).filter(Boolean))];
    // Ambiguous colour terms remain unclassified; no guesses from colourway names.
    const familyCopy = families.length ? ` The supplier's colour grouping includes ${families.join(" and ")} tones.` : "";
    const repeatCopy = r.vertical_repeat_mm ? ` The vertical pattern repeats every ${r.vertical_repeat_mm / 10} cm; use this measurement to judge the scale across your window.` : "";
    const description = `${factualRetailDescription(r).split(". ")[0]}. ${rule.visualDescription}${familyCopy}${repeatCopy} The supplier lists this fabric for curtains. Consider it for ${rule.style} living rooms or bedrooms, and order a sample to check the colour and feel alongside your room's finishes before choosing a heading and lining.`;
    const profile = { fabric_id: r.fabric_id, description, description_validated: true, colour_families: families.length ? families : ["UNKNOWN"], patterns: [rule.pattern], characters: [rule.character], styles: [rule.style], rooms: ["living room", "bedroom"], window_types: [], headings: [], linings: [], classification_evidence: JSON.stringify({ ruleVersion: review.ruleVersion, reviewer: review.reviewer, sampleFabricId: rule.sampleFabricId, sourceCheckedAt: product.checkedAt, sourceHash: createHash("sha256").update(JSON.stringify(product)).digest("hex"), ruleHash: createHash("sha256").update(reviewText).digest("hex"), imageHash: item.content_hash }) };
    if (!validTaxonomy(profile) || /blackout|thermal|acoustic|stain.resistan|fire.retardan/i.test(description)) throw new Error("EDITORIAL_CLAIM_REJECTED");
    return profile;
  });
  await writeFile("artifacts/phase5g/editorial-canary-50.json", JSON.stringify(profiles, null, 2) + "\n", "utf8");
  if (!process.argv.includes("--apply")) { console.log(JSON.stringify({ prepared: profiles.length, applied: 0 })); return; }
  loadEnvConfig(process.cwd());
  if (new URL(process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname !== "hqysjumypgeapgmqkcrx.supabase.co" || !process.argv.includes("--confirm-project=hqysjumypgeapgmqkcrx")) throw new Error("STAGING_DATABASE_REQUIRED");
  const existing = await listExistingCatalogueRecords("prestigious-textiles");
  const db = createSupplierServiceClient();
  let approved = 0, unchanged = 0;
  const blocked: { fabricId: string; reason: string }[] = [];
  for (const profile of profiles) {
    const r = existing.find((v) => v.record.fabric_id === profile.fabric_id)?.record;
    const incoming = products.find((p) => p.record.fabric_id === profile.fabric_id)!.record;
    const keys = ["supplier_sku", "brand_name", "design_name", "colour_name", "collection_name", "usable_width_mm", "vertical_repeat_mm"] as const;
    const compositionKey = (parts: typeof incoming.composition) => JSON.stringify(parts.map((p) => [p.material.trim().toLowerCase(), p.percentage]).sort((a, b) => String(a[0]).localeCompare(String(b[0]))));
    if (!r || keys.some((k) => (typeof r[k] === "string" ? String(r[k]).trim().toLowerCase() : r[k]) !== (typeof incoming[k] === "string" ? String(incoming[k]).trim().toLowerCase() : incoming[k])) || compositionKey(r.composition) !== compositionKey(incoming.composition)) { blocked.push({ fabricId: profile.fabric_id, reason: "CANONICAL_SPECIFICATION_DIFFERS" }); continue; }
    const before = await db.from("fabric_retail_profiles").select("description_validated,classification_evidence,updated_at").eq("fabric_id", profile.fabric_id).single();
    if (before.error) throw new Error("EDITORIAL_PROFILE_MISSING");
    if (before.data.description_validated) {
      if (before.data.classification_evidence === profile.classification_evidence) unchanged++;
      else blocked.push({ fabricId: profile.fabric_id, reason: "EXISTING_EDITORIAL_APPROVAL_PROTECTED" });
      continue;
    }
    const result = await db.from("fabric_retail_profiles").update({ ...profile, updated_at: new Date().toISOString() }).eq("fabric_id", profile.fabric_id).eq("updated_at", before.data.updated_at).eq("description_validated", false).select("fabric_id");
    if (result.error || result.data?.length !== 1) throw new Error("EDITORIAL_REVISION_CHANGED");
    approved++;
  }
  const report = { approved, unchanged, blocked, visibilityChanges: 0, pricingChanges: 0 };
  await writeFile("artifacts/phase5g/editorial-apply-report.json", JSON.stringify(report, null, 2) + "\n", "utf8");
  console.log(JSON.stringify(report));
}
main().catch(() => { console.error("EDITORIAL_APPROVAL_FAILED"); process.exitCode = 1; });
