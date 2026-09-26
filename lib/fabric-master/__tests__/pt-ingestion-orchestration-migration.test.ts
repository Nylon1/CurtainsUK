import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const migrationPath = path.resolve("supabase/migrations/20260926113327_pt_ingestion_orchestration.sql");

test("PT orchestration migration keeps durable private claims and append-only attempts", async () => {
  const sql = await readFile(migrationPath, "utf8");
  for (const fragment of [
    "create table curtainsuk_private.pt_ingestion_runs",
    "create table curtainsuk_private.pt_ingestion_items",
    "create table curtainsuk_private.pt_ingestion_attempts",
    "enable row level security",
    "for update skip locked",
    "pg_advisory_xact_lock(4252026, 20260926)",
    "STALE_CLAIM_RELEASED",
    "CLAIM_RETRY_EXHAUSTED",
    "commit_pt_ingestion_stage",
    "retry_pt_ingestion_item",
    "exception_pt_ingestion_item",
    "start_pt_ingestion_run",
    "initial_stage",
    "committed_fingerprints",
    "exception_code",
    "return query",
    "revoke all on function",
  ]) assert.match(sql, new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  assert.doesNotMatch(sql, /security definer/i);
});
