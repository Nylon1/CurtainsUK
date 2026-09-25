param(
  [ValidateSet('core', 'facets', 'identity')]
  [string]$Batch = 'core',
  [string]$Case,
  [switch]$RefreshCheck,
  [switch]$Benchmark,
  [switch]$BenchmarkDirect
)

$ErrorActionPreference = 'Stop'
$projectRef = 'hqysjumypgeapgmqkcrx'
$candidateDir = Join-Path $PSScriptRoot '..\sql-candidates\browse'
$stage1 = Get-Content -LiteralPath (Join-Path $candidateDir '20260925064738_browse_set_oriented_search.sql') -Raw
$stage2 = Get-Content -LiteralPath (Join-Path $candidateDir '20260925070237_browse_read_projection.sql') -Raw

# Never install source-table triggers or a scheduler in a production rehearsal.
$stage2 = [regex]::Replace($stage2, '(?s)DO \$install\$.*?\$install\$;', '')
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
