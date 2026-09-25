param(
  [ValidateSet('core', 'facets', 'identity')]
  [string]$Batch = 'core',
  [string]$Case,
  [switch]$RefreshCheck,
  [switch]$SafetyCheck,
  [switch]$KnowledgeCheck,
  [switch]$InstallCheck,
  [switch]$ReleaseMigration,
  [switch]$Benchmark,
  [switch]$BenchmarkDirect
)

$ErrorActionPreference = 'Stop'
$projectRef = 'hqysjumypgeapgmqkcrx'
$candidateDir = Join-Path $PSScriptRoot '..\sql-candidates\browse'
$stage1 = if ($ReleaseMigration) { '' } else {
  Get-Content -LiteralPath (Join-Path $candidateDir '20260925064738_browse_set_oriented_search.sql') -Raw
}
$stage2 = if ($ReleaseMigration) {
  Get-Content -LiteralPath (Join-Path $PSScriptRoot '..\supabase\migrations\20260925085155_browse_governed_projection_read_model.sql') -Raw
} else {
  Get-Content -LiteralPath (Join-Path $candidateDir '20260925070237_browse_read_projection.sql') -Raw
}

# Source-table triggers are installed only for the explicit transactional
# installation check. The scheduled job is never installed in a rehearsal.
if (-not $InstallCheck) {
  $stage2 = [regex]::Replace($stage2, '(?s)DO \$install\$.*?\$install\$;', '')
}
$stage2 = [regex]::Replace($stage2,
  "(?s)SELECT cron\.schedule\('curtainsuk-browse-projection-refresh-v1'.*?\);", '')

$caseGroups = @{
  core = @(
    "('default', '{}'::jsonb, 1, 24, NULL::integer, NULL::integer)",
    "('page_2', '{}'::jsonb, 2, 24, NULL::integer, NULL::integer)",
    "('price', '{}'::jsonb, 1, 24, 5000, 10000)",
    "('colour', '{`"colour`": [`"blue`"]}'::jsonb, 1, 24, NULL::integer, NULL::integer)",
    "('combined', '{`"colour`": [`"blue`"], `"pattern`": [`"geometric`"]}'::jsonb, 1, 24, 5000, 10000)"
  )
  facets = @(
    "('pattern', '{`"pattern`": [`"geometric`"]}'::jsonb, 1, 24, NULL::integer, NULL::integer)",
    "('texture', '{`"texture`": [`"boucle-like`"]}'::jsonb, 1, 24, NULL::integer, NULL::integer)",
    "('finish', '{`"finish`": [`"gentle`"]}'::jsonb, 1, 24, NULL::integer, NULL::integer)",
    "('character', '{`"character`": [`"calm`"]}'::jsonb, 1, 24, NULL::integer, NULL::integer)",
    "('multiple_colour', '{`"colour`": [`"blue`", `"green`"]}'::jsonb, 1, 24, NULL::integer, NULL::integer)"
  )
  identity = @(
    "('brand', '{`"brand`": `"Clarke & Clarke`"}'::jsonb, 1, 24, NULL::integer, NULL::integer)",
    "('collection', '{`"collection`": `"A Celebration of the National Trust`"}'::jsonb, 1, 24, NULL::integer, NULL::integer)",
    "('sample', '{`"sample`": `"AVAILABLE`"}'::jsonb, 1, 24, NULL::integer, NULL::integer)",
    "('availability', '{`"availability`": `"CURRENT`"}'::jsonb, 1, 24, NULL::integer, NULL::integer)",
    "('sku_search', '{`"query`": `"F1681/03`"}'::jsonb, 1, 24, NULL::integer, NULL::integer)"
  )
}
$caseSql = $caseGroups[$Batch] -join ",`n    "
if ($Case) {
  $selected = @($caseGroups[$Batch] | Where-Object { $_ -match "^\('$([regex]::Escape($Case))'" })
  if ($selected.Count -ne 1) { throw "Case '$Case' is not in batch '$Batch'." }
  $caseSql = $selected[0]
}

$checks = @'
SELECT curtainsuk_private.browse_projection_refresh_full() AS generation_proof;
WITH cases(label, filters, page_number, page_size, minimum, maximum) AS (
  VALUES
    __CASES__
), checked AS MATERIALIZED (
  SELECT label,
    curtainsuk_private.search_retail_fabrics(filters,page_number,page_size,minimum,maximum) AS current_result,
    curtainsuk_private.search_retail_fabrics_direct_v1(filters,page_number,page_size,minimum,maximum) AS direct_result,
    curtainsuk_private.search_retail_fabrics_prepared_v1(filters,page_number,page_size,minimum,maximum) AS prepared_result
  FROM cases
)
SELECT label, current_result = direct_result AS direct_json_parity,
  current_result = prepared_result AS prepared_json_parity,
  current_result->>'total' AS current_total,
  prepared_result->>'total' AS prepared_total
FROM checked ORDER BY label;
ROLLBACK;
'@
$checks = $checks.Replace('__CASES__', $caseSql)
if ($ReleaseMigration) {
  $checks = @'
SELECT curtainsuk_private.browse_projection_refresh_full() AS generation_proof;
WITH cases(label, filters, page_number, page_size, minimum, maximum) AS (
  VALUES
    __CASES__
), checked AS MATERIALIZED (
  SELECT label,
    curtainsuk_private.search_retail_fabrics(filters,page_number,page_size,minimum,maximum) AS current_result,
    curtainsuk_private.search_retail_fabrics_prepared_v1(filters,page_number,page_size,minimum,maximum) AS prepared_result
  FROM cases
)
SELECT label, current_result = prepared_result AS prepared_json_parity,
  current_result->>'total' AS current_total,
  prepared_result->>'total' AS prepared_total
FROM checked ORDER BY label;
ROLLBACK;
'@
  $checks = $checks.Replace('__CASES__', $caseSql)
}
if ($InstallCheck) {
  if (-not $ReleaseMigration) { throw 'InstallCheck requires ReleaseMigration.' }
  $checks = @'
SELECT count(*) AS browse_trigger_count,
  count(*) FILTER (WHERE c.relkind='m') AS materialized_view_trigger_count,
  count(*) FILTER (WHERE c.relname IN
    ('supplier_snapshots','supplier_snapshot_prices','daily_stock_snapshots','daily_stock_usage')
    AND t.tgname LIKE 'browse_projection_knowledge%') AS supplier_knowledge_trigger_count
FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='curtainsuk_private' AND NOT t.tgisinternal
  AND t.tgname LIKE 'browse_projection_%';
ROLLBACK;
'@
}
if ($RefreshCheck) {
  $checks = @'
SELECT curtainsuk_private.browse_projection_refresh_full() AS generation_proof;
CREATE TEMP TABLE browse_dirty_probe(fabric_id text);
CREATE TEMP TABLE browse_refresh_evidence(label text, value text);
CREATE TRIGGER browse_dirty_probe_trigger AFTER INSERT OR UPDATE OR DELETE
  ON browse_dirty_probe FOR EACH ROW
  EXECUTE FUNCTION curtainsuk_private.browse_projection_mark_fabric_dirty();
INSERT INTO browse_dirty_probe(fabric_id)
  SELECT fabric_id FROM curtainsuk_private.browse_read_projection LIMIT 1;
INSERT INTO browse_refresh_evidence SELECT 'dirty_after_trigger', count(*)::text
  FROM curtainsuk_private.browse_projection_dirty;
SELECT curtainsuk_private.browse_projection_refresh_dirty(500) AS incremental_proof;
INSERT INTO browse_refresh_evidence SELECT 'dirty_after_incremental', count(*)::text
  FROM curtainsuk_private.browse_projection_dirty;
INSERT INTO browse_refresh_evidence SELECT 'projected_rows_after_incremental', count(*)::text
  FROM curtainsuk_private.browse_read_projection;
SELECT curtainsuk_private.browse_projection_refresh_full() AS full_reconciliation_proof;
INSERT INTO browse_refresh_evidence SELECT 'active_rows_after_full', count(*)::text
FROM curtainsuk_private.browse_read_projection p
JOIN curtainsuk_private.browse_projection_control c
  ON p.generation_id = c.active_generation;
SELECT label, value FROM browse_refresh_evidence ORDER BY label;
ROLLBACK;
'@
}
if ($SafetyCheck) {
  $checks = @'
SELECT curtainsuk_private.browse_projection_refresh_full();
CREATE TEMP TABLE browse_safety_evidence(label text, value text);
INSERT INTO browse_safety_evidence
  SELECT 'baseline_generation', active_generation::text
  FROM curtainsuk_private.browse_projection_control;
CREATE TEMP TABLE browse_safety_probe(fabric_id text);
CREATE TRIGGER browse_safety_probe_trigger AFTER INSERT OR UPDATE OR DELETE
  ON browse_safety_probe FOR EACH ROW
  EXECUTE FUNCTION curtainsuk_private.browse_projection_mark_fabric_dirty();
INSERT INTO browse_safety_probe(fabric_id)
  SELECT fabric_id FROM curtainsuk_private.browse_read_projection
  ORDER BY fabric_id LIMIT 2;
INSERT INTO browse_safety_evidence
  SELECT 'two_fabrics_queued', count(*)::text
  FROM curtainsuk_private.browse_projection_dirty;
SELECT curtainsuk_private.browse_projection_refresh_dirty(500);
INSERT INTO browse_safety_evidence
  SELECT 'queue_after_incremental', count(*)::text
  FROM curtainsuk_private.browse_projection_dirty;
INSERT INTO browse_safety_evidence
  SELECT 'second_refresh', curtainsuk_private.browse_projection_refresh_dirty(500)::text;
CREATE FUNCTION curtainsuk_private.browse_projection_fault_probe()
RETURNS trigger LANGUAGE plpgsql AS $fault$
BEGIN
  RAISE EXCEPTION 'INTENTIONAL_BROWSE_REHEARSAL_FAILURE';
END;
$fault$;
CREATE TRIGGER browse_projection_intentional_fault BEFORE INSERT
  ON curtainsuk_private.browse_read_projection FOR EACH ROW
  EXECUTE FUNCTION curtainsuk_private.browse_projection_fault_probe();
UPDATE browse_safety_probe SET fabric_id = fabric_id WHERE fabric_id =
  (SELECT fabric_id FROM browse_safety_probe ORDER BY fabric_id LIMIT 1);
DO $check$
BEGIN
  BEGIN
    PERFORM curtainsuk_private.browse_projection_refresh_full();
    RAISE EXCEPTION 'EXPECTED_REFRESH_FAILURE_DID_NOT_OCCUR';
  EXCEPTION WHEN others THEN
    IF SQLERRM <> 'INTENTIONAL_BROWSE_REHEARSAL_FAILURE' THEN
      RAISE;
    END IF;
    INSERT INTO browse_safety_evidence VALUES ('fault_caught', 'true');
  END;
END;
$check$;
INSERT INTO browse_safety_evidence
  SELECT 'generation_unchanged_after_fault',
    (c.active_generation::text = e.value)::text
  FROM curtainsuk_private.browse_projection_control c
  JOIN browse_safety_evidence e ON e.label = 'baseline_generation';
INSERT INTO browse_safety_evidence
  SELECT 'rows_after_fault', count(*)::text
  FROM curtainsuk_private.browse_read_projection p
  JOIN curtainsuk_private.browse_projection_control c
    ON p.generation_id = c.active_generation;
INSERT INTO browse_safety_evidence
  SELECT 'dirty_after_fault', count(*)::text
  FROM curtainsuk_private.browse_projection_dirty;
INSERT INTO browse_safety_evidence
  SELECT 'failed_refresh_fallback_equal',
    (curtainsuk_private.search_retail_fabrics_prepared_v1(
      '{"query":"F1681/03"}'::jsonb, 1, 24, NULL, NULL) =
     curtainsuk_private.search_retail_fabrics(
      '{"query":"F1681/03"}'::jsonb, 1, 24, NULL, NULL))::text;
SELECT label, value FROM browse_safety_evidence ORDER BY label;
ROLLBACK;
'@
}
if ($KnowledgeCheck) {
  if (-not $ReleaseMigration) { throw 'KnowledgeCheck requires ReleaseMigration.' }
  $checks = @'
CREATE TEMP TABLE browse_knowledge_source_probe(fabric_id text);
CREATE TRIGGER browse_knowledge_source_probe_trigger AFTER INSERT
  ON browse_knowledge_source_probe FOR EACH STATEMENT
  EXECUTE FUNCTION curtainsuk_private.browse_projection_mark_knowledge_dirty();
INSERT INTO browse_knowledge_source_probe VALUES ('rehearsal-only');
CREATE TEMP TABLE browse_knowledge_evidence(label text, value text);
INSERT INTO browse_knowledge_evidence
  SELECT 'source_change_queued', knowledge_cache_dirty::text
  FROM curtainsuk_private.browse_projection_control;
SELECT curtainsuk_private.browse_projection_refresh_dirty(500) AS knowledge_source_reconciliation;
INSERT INTO browse_knowledge_evidence
  SELECT 'source_change_cleared', (NOT knowledge_cache_dirty)::text
  FROM curtainsuk_private.browse_projection_control;
INSERT INTO browse_knowledge_evidence
  SELECT 'initial_count', count(*)::text FROM curtainsuk_private.browse_read_projection p
  JOIN curtainsuk_private.browse_projection_control c
    ON p.generation_id = c.active_generation;
INSERT INTO browse_knowledge_evidence
  SELECT 'cache_stamp_captured',
    (knowledge_cache_refreshed_at = (SELECT max(refreshed_at)
      FROM curtainsuk_private.fabric_visual_knowledge_read_cache))::text
  FROM curtainsuk_private.browse_projection_control;
UPDATE curtainsuk_private.browse_projection_control
  SET knowledge_cache_refreshed_at = knowledge_cache_refreshed_at - interval '1 second';
SELECT curtainsuk_private.browse_projection_refresh_dirty(500) AS knowledge_reconciliation;
INSERT INTO browse_knowledge_evidence
  SELECT 'cache_stamp_reconciled',
    (knowledge_cache_refreshed_at = (SELECT max(refreshed_at)
      FROM curtainsuk_private.fabric_visual_knowledge_read_cache))::text
  FROM curtainsuk_private.browse_projection_control;
INSERT INTO browse_knowledge_evidence
  SELECT 'reconciled_count', count(*)::text FROM curtainsuk_private.browse_read_projection p
  JOIN curtainsuk_private.browse_projection_control c
    ON p.generation_id = c.active_generation;
SELECT label,value FROM browse_knowledge_evidence ORDER BY label;
ROLLBACK;
'@
}
if ($Benchmark) {
  $checks = @'
SELECT curtainsuk_private.browse_projection_refresh_full() AS generation_proof;
CREATE TEMP TABLE browse_bench_result(label text, elapsed_ms numeric);
DO $bench$
DECLARE started timestamptz; n integer; response jsonb;
BEGIN
  FOR n IN 1..20 LOOP
    started := clock_timestamp();
    response := curtainsuk_private.search_retail_fabrics_prepared_v1('{}'::jsonb, 1, 24, NULL, NULL);
    INSERT INTO browse_bench_result VALUES ('default', extract(epoch FROM clock_timestamp()-started)*1000);
    started := clock_timestamp();
    response := curtainsuk_private.search_retail_fabrics_prepared_v1('{}'::jsonb, 2, 24, NULL, NULL);
    INSERT INTO browse_bench_result VALUES ('page_2', extract(epoch FROM clock_timestamp()-started)*1000);
    started := clock_timestamp();
    response := curtainsuk_private.search_retail_fabrics_prepared_v1('{"colour":["blue"],"pattern":["geometric"]}'::jsonb, 1, 24, 5000, 10000);
    INSERT INTO browse_bench_result VALUES ('combined', extract(epoch FROM clock_timestamp()-started)*1000);
  END LOOP;
END;
$bench$;
SELECT label, count(*) AS runs, round(avg(elapsed_ms),3) AS avg_ms,
  round(min(elapsed_ms),3) AS min_ms, round(max(elapsed_ms),3) AS max_ms
FROM browse_bench_result GROUP BY label ORDER BY label;
ROLLBACK;
'@
}
if ($BenchmarkDirect) {
  $checks = @'
CREATE TEMP TABLE browse_direct_bench(label text, elapsed_ms numeric);
DO $bench$
DECLARE started timestamptz; n integer; response jsonb;
BEGIN
  FOR n IN 1..3 LOOP
    started := clock_timestamp();
    response := curtainsuk_private.search_retail_fabrics('{}'::jsonb, 1, 24, NULL, NULL);
    INSERT INTO browse_direct_bench VALUES ('current_default', extract(epoch FROM clock_timestamp()-started)*1000);
    started := clock_timestamp();
    response := curtainsuk_private.search_retail_fabrics_direct_v1('{}'::jsonb, 1, 24, NULL, NULL);
    INSERT INTO browse_direct_bench VALUES ('set_oriented_default', extract(epoch FROM clock_timestamp()-started)*1000);
  END LOOP;
END;
$bench$;
SELECT label, count(*) AS runs, round(avg(elapsed_ms),3) AS avg_ms,
  round(min(elapsed_ms),3) AS min_ms, round(max(elapsed_ms),3) AS max_ms
FROM browse_direct_bench GROUP BY label ORDER BY label;
ROLLBACK;
'@
}

# A single transaction rolls back every object and row, even if parity fails.
# The generated temporary SQL file is removed after the CLI query completes.
$queryFile = [System.IO.Path]::GetTempFileName()
try {
  $sourceSql = if ($BenchmarkDirect) { $stage1 } else { "$stage1`n$stage2" }
  [System.IO.File]::WriteAllText($queryFile, "BEGIN;`n$sourceSql`n$checks")
  & npx --yes supabase db query --linked --project-ref $projectRef --file $queryFile
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally {
  Remove-Item -LiteralPath $queryFile -Force -ErrorAction SilentlyContinue
}
