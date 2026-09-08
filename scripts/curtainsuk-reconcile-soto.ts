/** One bounded, current-source correction; existing configurations are not rewritten. */
import { loadEnvConfig } from "@next/env";
import { writeFile } from "node:fs/promises";
import { createSupplierServiceClient } from "../lib/supabase/supplier-service";

async function main() {
  loadEnvConfig(process.cwd());
  if (!process.argv.includes("--confirm-project=hqysjumypgeapgmqkcrx") || new URL(process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname !== "hqysjumypgeapgmqkcrx.supabase.co") throw new Error("STAGING_REQUIRED");
  const db = createSupplierServiceClient();
  const before = await db.from("fabric_designs").select("design_id,vertical_repeat_mm,horizontal_repeat_mm,source_effective_date,updated_at").eq("design_id", "pt-design-4275").single();
  if (before.error) throw new Error("DESIGN_READ_FAILED");
  if (before.data.vertical_repeat_mm === 14 && before.data.horizontal_repeat_mm === 14) { console.log("SOTO_ALREADY_RECONCILED"); return; }
  if (before.data.updated_at !== "2026-09-07T12:15:12.566373+00:00" || before.data.vertical_repeat_mm !== 140) throw new Error("NEWER_DESIGN_PROTECTED");
  const evidence = { source: "prestigious-webtex:product:4275-130", checkedAt: "2026-09-08T04:56:11.361Z", operator: "Codex operator under owner Phase 5H authority", visibleVerticalRepeatCm: 1.4, visibleHorizontalRepeatCm: 1.4, corroboration: "Current public exact-SKU specifications for 4275/130, 4275/934 and 4275/975 also give 1.4 cm." };
  if (Date.now() - Date.parse(evidence.checkedAt) > 86400000) throw new Error("FRESH_PORTAL_RECHECK_REQUIRED");
  const updated = await db.from("fabric_designs").update({ vertical_repeat_mm: 14, horizontal_repeat_mm: 14, source_type: "MANUAL_PORTAL", source_name: "Phase 5H authorised Webtex specification reconciliation", source_reference: evidence.source, source_effective_date: evidence.checkedAt.slice(0,10), source_observed_at: evidence.checkedAt, updated_at: evidence.checkedAt }).eq("design_id", before.data.design_id).eq("updated_at", before.data.updated_at).select("design_id,vertical_repeat_mm,horizontal_repeat_mm,updated_at");
  if (updated.error || updated.data.length !== 1) throw new Error("DESIGN_REVISION_CHANGED");
  await writeFile("artifacts/phase5h/soto-specification-reconciliation.json", JSON.stringify({ before: before.data, after: updated.data[0], evidence, configurationWrites: 0 }, null, 2) + "\n");
  console.log("SOTO_REPEAT_RECONCILED_14MM");
}
main().catch(e => { console.error(e instanceof Error && /^[A-Z_]+$/.test(e.message) ? e.message : "RECONCILIATION_FAILED"); process.exitCode = 1; });
