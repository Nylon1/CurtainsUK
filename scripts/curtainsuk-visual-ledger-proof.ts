import { createSupplierServiceClient } from "../lib/supabase/supplier-service";
import { hciVisualModel, visualPromptVersion, visualSchemaVersion, visualVersion, visualVocabularyVersion } from "../lib/fabric-master/visual-enrichment";

const expectedProjectRef = "hqysjumypgeapgmqkcrx";
const runLabel = `visual-ledger-proof-${process.env.GITHUB_RUN_ID ?? "local"}-${new Date().toISOString()}`;

function assertProductionTarget() {
  const projectRef = process.env.CURTAINSUK_SUPABASE_PROJECT_REF;
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretPresent = Boolean(process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (projectRef !== expectedProjectRef) throw new Error("SUPABASE_PROJECT_REF_REJECTED");
  if (!url || !url.includes(`${expectedProjectRef}.supabase.co`)) throw new Error("SUPABASE_URL_REJECTED");
  if (!secretPresent) throw new Error("SUPABASE_SERVICE_CREDENTIAL_MISSING");
}

async function main() {
  assertProductionTarget();
  const db = createSupplierServiceClient();

  const { data: scopeRows, error: scopeError } = await db.rpc("fabric_visual_enrichment_scope", { p_scope: "CANONICAL_APPROVED_IMAGE" });
  if (scopeError) throw scopeError;
  const scopeCount = Array.isArray(scopeRows) ? scopeRows.length : 0;
  if (scopeCount !== 9248) throw new Error(`VISUAL_SCOPE_COUNT_REJECTED_${scopeCount}`);

  const { count: ledgerCount, error: ledgerError } = await db
    .from("fabric_visual_enrichment_ledger")
    .select("ledger_id", { count: "exact", head: true });
  if (ledgerError) throw ledgerError;

  const { data: run, error: insertError } = await db
    .from("fabric_visual_enrichment_runs")
    .insert({
      run_label: runLabel,
      scope: "CANONICAL_APPROVED_IMAGE",
      visual_version: visualVersion,
      vocabulary_version: visualVocabularyVersion,
      prompt_version: visualPromptVersion,
      schema_version: visualSchemaVersion,
      model_id: hciVisualModel,
      status: "DRY_RUN",
      checkpoint: { stage: "created", scopeCount, ledgerCount },
      summary: { proof: "ledger-only", inference: false },
    })
    .select("run_id")
    .single();
  if (insertError) throw insertError;

  const runId = run.run_id as string;
  const checkpoint = { stage: "checkpointed", scopeCount, ledgerCount, resumed: false };
  const { error: checkpointError } = await db
    .from("fabric_visual_enrichment_runs")
    .update({ checkpoint })
    .eq("run_id", runId);
  if (checkpointError) throw checkpointError;

  const { data: resumed, error: resumeError } = await db
    .from("fabric_visual_enrichment_runs")
    .select("run_id,run_label,status,checkpoint,summary")
    .eq("run_id", runId)
    .single();
  if (resumeError) throw resumeError;
  if (resumed.checkpoint?.stage !== "checkpointed") throw new Error("CHECKPOINT_RESUME_REJECTED");

  const { error: closeError } = await db
    .from("fabric_visual_enrichment_runs")
    .update({
      completed_at: new Date().toISOString(),
      checkpoint: { ...checkpoint, resumed: true, stage: "closed" },
      summary: { proof: "ledger-only", inference: false, scopeCount, ledgerCount, checkpointResume: "PASS" },
    })
    .eq("run_id", runId);
  if (closeError) throw closeError;

  console.log(JSON.stringify({
    supabaseAuth: "PASS",
    ledgerCheckpoint: "PASS",
    inference: false,
    scopeCount,
    ledgerCount,
    runId,
    runLabel,
  }, null, 2));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : "VISUAL_LEDGER_PROOF_FAILED");
  process.exitCode = 1;
});
